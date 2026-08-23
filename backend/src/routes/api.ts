import express from 'express';
import { evaluationQueue } from '../queue/worker';
import { Evaluation, Agent, Scenario, Failure, Trace, TestSuite } from '../models';
import crypto from 'crypto';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { eventBus } from '../services/eventBus';
import mongoose from 'mongoose';
import dashboardRoutes from './dashboard';

const router = express.Router();

router.use('/dashboard', dashboardRoutes);

// F-011: Health Endpoints
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected
  if (dbState === 1) {
    res.status(200).json({ status: 'READY', database: 'connected' });
  } else {
    res.status(503).json({ status: 'NOT_READY', database: 'disconnected' });
  }
});

const AgentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    systemPrompt: z.string().optional(),
    webhookUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    tools: z.array(z.any()).optional(),
    policies: z.array(z.any()).optional(),
  })
});

const EvaluationRequestSchema = z.object({
  body: z.object({
    agentId: z.string().min(1),
    version: z.string().optional(),
    count: z.number().int().min(1).max(500).optional(),
    suiteId: z.string().optional(),
  })
});

const CompareRequestSchema = z.object({
  body: z.object({
    eval1: z.string().min(1),
    eval2: z.string().min(1),
  })
});

// ==========================================================================
// AGENTS
// ==========================================================================

// GET all agents
router.get('/agents', async (req, res) => {
  try {
    const agents = await Agent.find({ deleted: { $ne: true } }).sort({ lastEvaluated: -1 });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET single agent
router.get('/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id }) || await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create agent
router.post('/agents', validate(AgentSchema), async (req, res) => {
  try {
    const agentId = req.body.agentId || `agt-${crypto.randomBytes(4).toString('hex')}`;
    const version = req.body.latestVersion || 'v1.0';
    
    const newAgent = new Agent({
      ...req.body,
      agentId,
      latestVersion: version,
      versions: [version]
    });
    await newAgent.save();
    res.status(201).json(newAgent);
  } catch (err: any) {
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
});

// PUT update agent
router.put('/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findOneAndUpdate(
      { agentId: req.params.id },
      req.body,
      { new: true }
    );
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// POST create new version from existing agent
router.post('/agents/:id/version', validate(AgentSchema), async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    
    const newVersion = req.body.version;
    if (!newVersion) return res.status(400).json({ error: 'Version is required' });
    
    // Update agent with new version and any changed fields
    const updates: any = {
      latestVersion: newVersion,
      $addToSet: { versions: newVersion }
    };
    
    if (req.body.systemPrompt) updates.systemPrompt = req.body.systemPrompt;
    if (req.body.tools) updates.tools = req.body.tools;
    if (req.body.policies) updates.policies = req.body.policies;
    if (req.body.prohibitedActions) updates.prohibitedActions = req.body.prohibitedActions;
    
    const updated = await Agent.findOneAndUpdate({ agentId: req.params.id }, updates, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create version' });
  }
});

// DELETE agent
router.delete('/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findOneAndUpdate(
      { agentId: req.params.id },
      { deleted: true },
      { new: true }
    );
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ success: true, message: 'Agent soft-deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// ==========================================================================
// SCENARIOS
// ==========================================================================

// GET all scenarios (with optional filtering)
router.get('/scenarios', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.agentId) {
      filter.agentId = req.query.agentId as string;
      // When fetching scenarios for an agent, only return the active batch
      const agent = await Agent.findOne({ agentId: req.query.agentId as string });
      if (agent?.activeBatchId) {
        filter.batchId = agent.activeBatchId;
      }
    }
    if (req.query.category) filter.category = req.query.category;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.isAdaptive) filter.isAdaptive = req.query.isAdaptive === 'true';
    
    const scenarios = await Scenario.find(filter).sort({ createdAt: -1 });
    res.json(scenarios);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// POST create manual scenario
router.post('/scenarios', async (req, res) => {
  try {
    const scenarioId = req.body.scenarioId || `SC-${crypto.randomBytes(4).toString('hex')}`;
    
    // Auto-assign manual scenarios to the active batch
    const agent = await Agent.findOne({ agentId: req.body.agentId });
    let batchId = req.body.batchId;
    
    if (agent && !batchId) {
      if (agent.activeBatchId) {
        batchId = agent.activeBatchId;
      } else {
        // If they have no batch at all, stamp one and make it active
        batchId = `BATCH-${crypto.randomBytes(6).toString('hex')}`;
        await Agent.updateOne({ agentId: req.body.agentId }, { activeBatchId: batchId });
      }
    }
    
    const newScenario = new Scenario({
      ...req.body,
      scenarioId,
      batchId,
      scenario: req.body.scenario || req.body.userInput
    });
    await newScenario.save();
    res.status(201).json(newScenario);
  } catch (err: any) {
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
});

// POST generate scenarios for an agent
router.post('/agents/:id/generate-scenarios', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    
    // F-009: Idempotency check for generation
    const idempotencyKey = req.headers['idempotency-key'];
    if (idempotencyKey) {
      const existingRun = await Evaluation.findOne({ runId: idempotencyKey, runType: 'GENERATION' });
      if (existingRun) {
        return res.status(200).json({ runId: existingRun.runId, evaluationId: existingRun._id, status: existingRun.status, count: req.body.count || 10 });
      }
    } else {
      if (agent.scenarioGenerationStatus === 'GENERATING') {
        return res.status(409).json({ error: 'Scenarios are already being generated for this agent.' });
      }
    }
    
    let count = req.body.count;
    if (!count) {
      const baseCount = 10;
      const toolCount = agent.tools?.length || 0;
      const criticalBonus = (agent.policies?.length || 0) * 2;
      const policyBonus = agent.policies?.length || 0;
      count = Math.min(100, baseCount + toolCount * 2 + criticalBonus + policyBonus);
    }
    
    const runId = `GEN-${crypto.randomBytes(6).toString('hex')}`;
    const batchId = runId;
    
    // Create a placeholder evaluation to track the generation
    const newEval = new Evaluation({
      runId,
      agentId: agent.agentId,
      version: agent.latestVersion,
      status: 'PENDING',
      runType: 'GENERATION',
      timestamp: new Date()
    });
    await newEval.save();
    
    // Process via queue
    await evaluationQueue.add('generate-scenarios', {
      evaluationId: newEval._id.toString(),
      runId,
      agentId: agent.agentId,
      version: agent.latestVersion,
      mode: 'generate-scenarios',
      count: Number(count)
    });
    
    // Set generating status
    await Agent.findOneAndUpdate(
      { agentId: agent.agentId },
      { scenarioGenerationStatus: 'GENERATING' }
    );
    
    const { getIo } = require('../index');
    getIo().to('agent:' + agent.agentId).emit('scenario:generation_started', { agentId: agent.agentId, runId });
    
    res.status(202).json({ runId, evaluationId: newEval._id, status: 'GENERATING', count });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate scenarios', details: err.message });
  }
});

// ==========================================================================

// EVALUATIONS
// ==========================================================================

// GET all evaluations
router.get('/evaluations', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.agentId) filter.agentId = req.query.agentId as string;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.runType) filter.runType = req.query.runType;
    
    const evals = await Evaluation.find(filter).sort({ timestamp: -1 });
    res.json(evals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// GET report download
router.get('/evaluations/:id/report/download', async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id) as any;
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    const failures = await Failure.find({ evaluationId: req.params.id });
    const traces = await Trace.find({ evaluationId: req.params.id });

    // Generate Markdown Content
    let md = `# AgentGuard Evaluation Report\n\n`;

    md += `## Evaluation Summary\n\n`;
    md += `Evaluation ID: ${evaluation._id}\n`;
    md += `Agent: ${evaluation.agentId}\n`;
    md += `Version: ${evaluation.version}\n`;
    md += `Date: ${new Date(evaluation.timestamp).toUTCString()}\n`;
    md += `Duration: ${evaluation.durationSeconds || 0}s\n\n`;

    md += `## Reliability\n\n`;
    md += `Overall Score: ${evaluation.reliability}%\n`;
    md += `Tests: ${evaluation.totalTests}\n`;
    md += `Passed: ${evaluation.passed}\n`;
    md += `Failed: ${evaluation.failed}\n`;
    md += `Critical: ${evaluation.criticalFailures}\n`;
    const severityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const failureBreakdown: Record<string, number> = {};
    failures.forEach(f => {
      failureBreakdown[f.failureType] = (failureBreakdown[f.failureType] || 0) + 1;
      if (f.severity === 'HIGH') severityCounts.HIGH++;
      if (f.severity === 'MEDIUM') severityCounts.MEDIUM++;
      if (f.severity === 'LOW') severityCounts.LOW++;
    });

    md += `High: ${severityCounts.HIGH}\nMedium: ${severityCounts.MEDIUM}\nLow: ${severityCounts.LOW}\n\n`;

    md += `## Failure Breakdown\n\n`;
    if (Object.keys(failureBreakdown).length > 0) {
      md += `Failure Type | Count\n`;
      md += `--- | ---\n`;
      Object.entries(failureBreakdown).forEach(([type, count]) => {
        md += `${type} | ${count}\n`;
      });
    } else {
      md += `No failures detected.\n`;
    }
    md += `\n`;

    md += `## Test Results\n\n`;
    if (failures.length > 0) {
      md += `| Test ID | Category | Severity | Status | Failure Type |\n`;
      md += `| --- | --- | --- | --- | --- |\n`;
      failures.forEach(f => {
        md += `| ${f.testId} | Unknown | ${f.severity} | FAILED | ${f.failureType} |\n`;
      });
      md += `\n`;
    } else {
      md += `All ${evaluation.totalTests} tests passed.\n\n`;
    }

    md += `## Failure Details\n\n`;
    if (failures.length > 0) {
      md += `For every failed test include:\n\n`;
      failures.forEach((f) => {
        md += `### ${f.testId}\n\n`;
        md += `Category: Unknown\n`;
        md += `Severity: ${f.severity}\n`;
        md += `Status: FAILED\n`;
        md += `Failure Type: ${f.failureType}\n\n`;
        
        md += `Scenario:\n${f.userInput}\n\n`;
        md += `Expected Behavior:\n${f.expectedBehavior}\n\n`;
        md += `Actual Behavior:\n${f.actualBehavior || 'Failed evaluation check.'}\n\n`;
        md += `Reason:\n${(f as any).reason || f.actualBehavior || 'Policy violation.'}\n\n`;
        md += `Recommendation:\n${f.recommendation || 'Review agent prompt to enforce stricter policy adherence.'}\n\n`;

        // Trace logic
        md += `## Execution Trace\n\n`;
        const testTrace = traces.find(t => t.testId === f.testId);
        if (testTrace && testTrace.events.length > 0) {
          testTrace.events.forEach((evt, i) => {
            if (evt.type === 'USER_INPUT') md += `User Input\n${evt.metadata || evt.label}\n`;
            else if (evt.type === 'TOOL_CALL') md += `Tool Call\n${evt.label}\nArgs: ${JSON.stringify(evt.metadata)}\n`;
            else if (evt.type === 'TOOL_RESULT') md += `Tool Result\n${evt.metadata || evt.label}\n`;
            else if (evt.type === 'FINAL_RESPONSE') md += `Final Response\n${evt.label}\n`;
            else md += `LLM\n${evt.label}\n`;
            
            if (i < testTrace.events.length - 1) md += `↓\n`;
          });
          md += `\n`;
        } else {
          md += `No trace available.\n\n`;
        }
      });
    } else {
      md += `No failures to display.\n\n`;
    }

    md += `## Version / Regression Information\n\n`;
    md += `No regression data available for this report.\n\n`;
    md += `## Final Assessment\n\n`;
    md += `Evaluation completed with a reliability score of ${evaluation.reliability}%.`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="agentguard-evaluation-${evaluation._id}.md"`);
    res.send(md);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET specific evaluation
router.get('/evaluations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let evalRun;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      evalRun = await Evaluation.findById(id);
    }
    if (!evalRun) {
      evalRun = await Evaluation.findOne({ runId: id });
    }
    if (!evalRun) return res.status(404).json({ error: 'Evaluation not found' });
    res.json(evalRun);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
});

// GET per-scenario results for an evaluation (all scenarios, passed + failed)
router.get('/evaluations/:id/results', async (req, res) => {
  try {
    const id = req.params.id;
    let evalRun;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      evalRun = await Evaluation.findById(id);
    }
    if (!evalRun) {
      evalRun = await Evaluation.findOne({ runId: id });
    }
    if (!evalRun) return res.status(404).json({ error: 'Evaluation not found' });
    
    const evalId = evalRun._id.toString();
    
    // Fetch all traces and failures for this evaluation
    const traces = await Trace.find({ evaluationId: evalId });
    const failures = await Failure.find({ evaluationId: evalId });
    
    // Build a failure lookup by testId
    const failureMap = new Map<string, any>();
    for (const f of failures) {
      failureMap.set(f.testId, f);
    }
    
    // Build a trace lookup by testId
    const traceMap = new Map<string, any>();
    for (const t of traces) {
      traceMap.set(t.testId, t);
    }
    
    // Get the scenario reference list — prefer scenarioSnapshot, fall back to scenarioIds
    const scenarioSnapshot = evalRun.scenarioSnapshot || [];
    const scenarioIds = evalRun.scenarioIds || [];
    
    // If we have a snapshot, use it (immutable). Otherwise, look up scenarios by ID.
    let scenarioList: any[];
    if (scenarioSnapshot.length > 0) {
      scenarioList = scenarioSnapshot;
    } else if (scenarioIds.length > 0) {
      // Fall back to looking up current scenario docs (for historical evals without snapshots)
      const scenarios = await Scenario.find({ scenarioId: { $in: scenarioIds } }).lean();
      scenarioList = scenarios.map(s => ({
        scenarioId: s.scenarioId,
        category: s.category,
        severity: s.severity,
        scenario: s.scenario,
        expectedBehavior: s.expectedBehavior,
        forbiddenBehavior: (s as any).forbiddenBehavior
      }));
    } else {
      scenarioList = [];
    }

    const results = scenarioList.map(s => {
      const trace = traceMap.get(s.scenarioId);
      const failure = failureMap.get(s.scenarioId);
      
      let status = 'PENDING';
      // Use trace status if it exists, otherwise fall back to old logic
      if (trace && trace.status) {
        status = trace.status;
      } else if (failure) {
        status = failure.failureType === 'EXECUTION_ERROR' ? 'INFRASTRUCTURE_ERROR' : 'FAIL';
      } else if (trace) {
        status = 'PASS';
      }

      return {
        ...s,
        status,
        failure: failure ? {
          failureType: failure.failureType,
          severity: failure.severity,
          reason: failure.reason,
          recommendation: failure.recommendation
        } : null,
        traceId: trace ? trace.traceId : null
      };
    });
    
    res.json({
      evaluationId: evalId,
      runId: evalRun.runId,
      status: evalRun.status,
      totalScenarios: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      infrastructureErrors: results.filter(r => r.status === 'INFRASTRUCTURE_ERROR').length,
      timeouts: results.filter(r => r.status === 'TIMEOUT').length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evaluation results' });
  }
});

// POST trigger new evaluation
router.post('/evaluations', validate(EvaluationRequestSchema), async (req, res) => {
  try {
    const { agentId, version, count, suiteId } = req.body;
    
    // Verify agent exists
    const agent = await Agent.findOne({ agentId });
    if (!agent) return res.status(404).json({ error: `Agent ${agentId} not found` });
    
    // F-009: Idempotency (Prevent rapid duplicate clicks)
    const idempotencyKey = req.headers['idempotency-key'];
    if (idempotencyKey) {
      const existingRun = await Evaluation.findOne({ runId: idempotencyKey });
      if (existingRun) {
        return res.status(200).json({ runId: existingRun.runId, evaluationId: existingRun._id, status: existingRun.status });
      }
    } else {
      // Fallback: Check if there's a recently created evaluation (within 10 seconds)
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const recentRun = await Evaluation.findOne({
        agentId,
        status: { $in: ['PENDING', 'RUNNING'] },
        timestamp: { $gte: tenSecondsAgo }
      });
      if (recentRun) {
        return res.status(409).json({ error: 'An evaluation for this agent is already queued or running.' });
      }
    }
    
    // ENFORCEMENT (§2): API-layer scenario count check
    const batchFilter = agent.activeBatchId 
      ? { agentId, batchId: agent.activeBatchId }
      : { agentId, $or: [{ batchId: { $exists: false } }, { batchId: '' }] };
      
    const scenarioCount = await Scenario.countDocuments(batchFilter);
    if (scenarioCount === 0) {
      return res.status(409).json({
        error: 'Evaluation cannot start because this agent has no generated test scenarios. Generate scenarios first.'
      });
    }
    
    // Fetch scenarios for immutable snapshot
    const scenarios = await Scenario.find(batchFilter).lean();
    const scenarioIds = scenarios.map(s => s.scenarioId);
    const scenarioSnapshot = scenarios.map(s => ({
      scenarioId: s.scenarioId,
      category: s.category,
      severity: s.severity,
      scenario: s.scenario,
      expectedBehavior: s.expectedBehavior,
      forbiddenActions: s.forbiddenActions || [],
      forbiddenToolCalls: s.forbiddenToolCalls || [],
      expectedToolCalls: s.expectedToolCalls || [],
      allowedActions: s.allowedActions || [],
      rule: s.rule,
      attackObjective: s.attackObjective || '',
      riskLevel: s.riskLevel || 'LOW',
      title: s.title || '',
      difficulty: s.difficulty || 'MEDIUM'
    }));
    
    // Build agent config snapshot for reproducibility
    const agentConfigSnapshot = {
      agentId: agent.agentId,
      name: agent.name,
      version: version || agent.latestVersion,
      domain: agent.domain,
      systemPrompt: agent.systemPrompt,
      tools: agent.tools,
      policies: agent.policies,
      prohibitedActions: agent.prohibitedActions || [],
      qualityGate: agent.qualityGate || {}
    };
    
    const runId = `RUN-${crypto.randomBytes(6).toString('hex')}`;
    const newEval = new Evaluation({
      runId,
      agentId,
      version: version || agent.latestVersion,
      status: 'PENDING',
      timestamp: new Date(),
      scenarioIds,
      scenarioSnapshot,
      agentConfigSnapshot,
      totalScenarios: scenarioIds.length
    });
    
    await newEval.save();
    
    // Queue job
    await evaluationQueue.add('run-evaluation', {
      evaluationId: newEval._id,
      runId: newEval.runId,
      agentId,
      version: version || agent.latestVersion,
      mode: 'evaluate',
      count: count || 100
    });
    
    res.status(201).json(newEval);
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger evaluation' });
  }
});

// POST trigger adaptive testing
router.post('/evaluations/:id/adaptive', async (req, res) => {
  try {
    const sourceEval = await Evaluation.findById(req.params.id);
    if (!sourceEval) return res.status(404).json({ error: 'Source evaluation not found' });
    
    // Fetch previous results (failures) for this evaluation
    const failures = await Failure.find({ evaluationId: req.params.id });
    
    if (failures.length === 0) {
      return res.status(400).json({ error: 'No failures to base adaptive testing on' });
    }
    
    const runId = `ADAPT-${crypto.randomBytes(6).toString('hex')}`;
    const newEval = new Evaluation({
      runId,
      agentId: sourceEval.agentId,
      version: sourceEval.version,
      status: 'PENDING',
      timestamp: new Date(),
      isAdaptive: true
    });
    
    await newEval.save();
    
    // Build previous results from failures
    const previousResults = failures.map(f => ({
      testId: f.testId,
      passed: false,
      failureType: f.failureType,
      severity: f.severity,
      category: f.category,
      reason: f.reason || f.actualBehavior,
      userInput: f.userInput,
      scenario: f.userInput
    }));
    
    await evaluationQueue.add('run-evaluation', {
      evaluationId: newEval._id,
      runId,
      agentId: sourceEval.agentId,
      version: sourceEval.version,
      mode: 'adaptive',
      count: req.body.count || 100,
      previousResults
    });
    
    res.status(202).json(newEval);
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger adaptive testing' });
  }
});

// ==========================================================================
// FAILURES
// ==========================================================================

// GET failures for evaluation
router.get('/evaluations/:id/failures', async (req, res) => {
  try {
    const id = req.params.id;
    let evalId = id;
    
    // If it's not a Mongo ID (i.e. it's a runId), look up the Evaluation first
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      const evalRun = await Evaluation.findOne({ runId: id });
      if (evalRun) {
        evalId = evalRun._id.toString();
      }
    }
    
    const failures = await Failure.find({ evaluationId: evalId }).sort({ riskScore: -1 });
    res.json(failures);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch failures' });
  }
});

// GET all failures
router.get('/failures', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.failureType) filter.failureType = req.query.failureType;
    
    const failures = await Failure.find(filter).sort({ riskScore: -1, timestamp: -1 }).limit(50);
    res.json(failures);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch failures' });
  }
});

// GET specific failure
router.get('/failures/:id', async (req, res) => {
  try {
    const failure = await Failure.findById(req.params.id);
    if (!failure) return res.status(404).json({ error: 'Failure not found' });
    res.json(failure);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================================================
// TRACES
// ==========================================================================

// GET trace by testId
router.get('/traces/:testId', async (req, res) => {
  try {
    const trace = await Trace.findOne({ testId: req.params.testId });
    if (!trace) return res.status(404).json({ error: 'Trace not found' });
    res.json(trace);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trace' });
  }
});

// GET traces for evaluation
router.get('/evaluations/:id/traces', async (req, res) => {
  try {
    const traces = await Trace.find({ evaluationId: req.params.id });
    res.json(traces);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch traces' });
  }
});

// ==========================================================================
// COMPARISON & REGRESSION
// ==========================================================================

import { ComparisonService } from '../services/evaluation/ComparisonService';

// GET compare two evaluations
router.get('/compare', async (req, res) => {
  try {
    const { eval1, eval2 } = req.query;
    
    if (!eval1 || !eval2) {
      return res.status(400).json({ error: 'eval1 and eval2 are required query parameters' });
    }

    const evalA = await Evaluation.findById(eval1 as string).catch(() => null) || await Evaluation.findOne({ runId: eval1 as string });
    const evalB = await Evaluation.findById(eval2 as string).catch(() => null) || await Evaluation.findOne({ runId: eval2 as string });

    if (!evalA || !evalB) {
      return res.status(404).json({ error: 'One or both evaluations not found' });
    }

    const result = await ComparisonService.compare(evalA._id.toString(), evalB._id.toString());
    res.json(result);
  } catch (err: any) {
    console.error('Comparison error:', err);
    res.status(500).json({ error: 'Failed to compare evaluations', details: err.message });
  }
});

// GET auto-regression for an evaluation
router.get('/evaluations/:id/auto-regression', async (req, res) => {
  try {
    const result = await ComparisonService.autoCompareWithPrevious(req.params.id);
    if (!result) {
      return res.status(200).json({ message: 'No previous evaluation found for comparison', result: null });
    }
    res.json({ result });
  } catch (err: any) {
    console.error('Auto-regression error:', err);
    res.status(500).json({ error: 'Failed to run auto-regression', details: err.message });
  }
});

// POST apply quality gate
router.post('/evaluations/:id/gate', async (req, res) => {
  try {
    const evalRun = await Evaluation.findById(req.params.id);
    if (!evalRun) return res.status(404).json({ error: 'Evaluation not found' });
    
    const gate = evalRun.qualityGate || {};
    res.json({
      evaluationId: evalRun._id,
      version: evalRun.version,
      gate
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to evaluate quality gate' });
  }
});

// ==========================================================================
// REPORTS
// ==========================================================================

// GET evaluation report
router.get('/evaluations/:id/report', async (req, res) => {
  try {
    const evalRun = await Evaluation.findById(req.params.id);
    if (!evalRun) return res.status(404).json({ error: 'Evaluation not found' });
    res.json(evalRun.report || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// GET evaluation config snapshot (for reproducibility)
router.get('/evaluations/:id/config-snapshot', async (req, res) => {
  try {
    const evalRun = await Evaluation.findById(req.params.id);
    if (!evalRun) return res.status(404).json({ error: 'Evaluation not found' });
    res.json({
      agentConfigSnapshot: evalRun.agentConfigSnapshot || {},
      evaluationConfig: evalRun.evaluationConfig || {},
      version: evalRun.version,
      timestamp: evalRun.timestamp
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch config snapshot' });
  }
});

// GET export evaluation (JSON)
router.get('/evaluations/:id/export', async (req, res) => {
  try {
    const evalRun = await Evaluation.findById(req.params.id);
    if (!evalRun) return res.status(404).json({ error: 'Evaluation not found' });
    
    const format = req.query.format || 'json';
    const failures = await Failure.find({ evaluationId: req.params.id });
    
    if (format === 'csv') {
      // CSV export of failures
      let csv = 'testId,category,severity,failureType,reason,riskScore,rootCause\n';
      for (const f of failures) {
        csv += `"${f.testId}","${f.category}","${f.severity}","${f.failureType}","${(f.reason || '').replace(/"/g, '""')}",${f.riskScore},"${(f.rootCause || '').replace(/"/g, '""')}"\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=evaluation_${evalRun.runId}.csv`);
      res.send(csv);
    } else {
      res.json({
        evaluation: evalRun,
        failures
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to export' });
  }
});

// ==========================================================================
// TEST SUITES
// ==========================================================================

// GET all test suites
router.get('/test-suites', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.agentId) filter.agentId = req.query.agentId as string;
    const suites = await TestSuite.find(filter);
    res.json(suites);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch test suites' });
  }
});

// POST create test suite
router.post('/test-suites', async (req, res) => {
  try {
    const suiteId = req.body.suiteId || `SUITE-${crypto.randomBytes(4).toString('hex')}`;
    const newSuite = new TestSuite({ ...req.body, suiteId });
    await newSuite.save();
    res.status(201).json(newSuite);
  } catch (err: any) {
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
});

// ==========================================================================
// AGENT INTEGRATION
// ==========================================================================

import { createAdapter } from '../services/adapters/AdapterFactory';
import { encryptCredential, decryptCredential, generateWebhookSecret, generateCredentialId } from '../services/security/CredentialStore';
import { Webhook, WebhookEvent } from '../models';
import type { AgentIntegrationConfig, AttackSurface } from '../services/adapters/types';
import { verifyWebhookRequest } from '../services/webhookVerifier';

// POST configure integration for an agent
router.post('/agents/:id/integration', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const config: AgentIntegrationConfig = req.body;

    // Validate with the appropriate adapter
    const adapter = createAdapter(config);
    const validation = await adapter.validateConfig(config);

    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid configuration', details: validation.errors });
    }

    // Encrypt credential if provided
    let credentialReference: string | undefined;
    if (req.body.credential) {
      credentialReference = encryptCredential(req.body.credential);
    }

    // Setup webhook if enabled
    let webhookId: string | undefined;
    let webhookSecretReference: string | undefined;
    let webhookSecretPlaintext: string | undefined;

    if (config.webhookEnabled) {
      webhookId = `wh_${crypto.randomBytes(8).toString('hex')}`;
      const { plaintext, encrypted } = generateWebhookSecret();
      webhookSecretPlaintext = plaintext;
      webhookSecretReference = encrypted;

      // Create webhook record
      const webhook = new Webhook({
        webhookId,
        agentId: agent.agentId,
        secretHash: encrypted,
        status: 'ACTIVE',
      });
      await webhook.save();
    }

    // Update agent
    const integration = {
      type: config.type,
      endpoint: config.endpoint,
      method: config.method || 'POST',
      requestHeaders: config.requestHeaders || {},
      authenticationType: config.authenticationType || 'NONE',
      credentialReference,
      requestTemplate: config.requestTemplate,
      responseMapping: config.responseMapping,
      timeoutMs: config.timeoutMs || 30000,
      maxResponseBytes: config.maxResponseBytes || 5242880,
      visibilityMode: config.webhookEnabled ? 'INSTRUMENTED' : 'BLACK_BOX',
      providerConfig: config.providerConfig,
      webhookEnabled: config.webhookEnabled || false,
      webhookId,
      webhookSecretReference,
      healthCheckConfig: config.healthCheckConfig,
    };

    await Agent.findOneAndUpdate(
      { agentId: req.params.id },
      { integration, connectionStatus: 'CONNECTED' },
      { new: true }
    );

    // Return config (secrets redacted) + one-time webhook secret
    const response: Record<string, any> = {
      success: true,
      integration: { ...integration, credentialReference: credentialReference ? '***' : undefined, webhookSecretReference: undefined },
      warnings: validation.warnings,
    };

    if (webhookSecretPlaintext) {
      response.webhook = {
        webhookId,
        webhookUrl: `${req.protocol}://${req.get('host')}/api/v1/webhooks/agent/${webhookId}/events`,
        signingSecret: webhookSecretPlaintext,
        note: 'Save this signing secret now. It will not be shown again.',
      };
    }

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to configure integration', details: err.message });
  }
});

// GET integration config (secrets redacted)
router.get('/agents/:id/integration', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    if (!agent.integration) {
      return res.json({ type: 'INTERNAL', configured: false });
    }

    const integrationData = agent.toObject().integration || agent.integration;
    // Redact secrets
    const safe = {
      ...integrationData,
      credentialReference: integrationData.credentialReference ? '***' : undefined,
      webhookSecretReference: undefined,
    };

    // Fetch webhook stats if enabled
    let webhookStats: Record<string, any> | undefined;
    if (agent.integration.webhookId) {
      const webhook = await Webhook.findOne({ webhookId: agent.integration.webhookId });
      if (webhook) {
        webhookStats = {
          status: webhook.status,
          eventsReceived: webhook.eventsReceived,
          eventsDropped: webhook.eventsDropped,
          failedVerifications: webhook.failedVerifications,
          lastEventAt: webhook.lastEventAt,
        };
      }
    }

    res.json({
      configured: true,
      integration: safe,
      connectionStatus: agent.connectionStatus,
      lastHealthCheck: agent.lastHealthCheck,
      webhookStats,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch integration config' });
  }
});

// 1b. POST test connection
router.post('/agents/:id/test-connection', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id, deleted: { $ne: true } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    
    if (!agent.integration || agent.integration.type === 'INTERNAL') {
      return res.json({
        healthy: true,
        endpointReachable: true,
        authenticationValid: true,
        responseReceived: true,
        responseFormatValid: true,
        latencyMs: 0,
        integrationMode: 'INTERNAL',
        errors: [],
      });
    }
    
    const adapter = createAdapter(agent.integration as any);
    
    // Decrypt credential if needed
    let credential: string | undefined;
    if (agent.integration.credentialReference) {
      credential = decryptCredential(agent.integration.credentialReference);
    }
    
    const result = await adapter.healthCheck(agent.integration as any, credential);
    
    // Update agent status
    agent.connectionStatus = result.healthy ? 'CONNECTED' : (result.endpointReachable ? 'DEGRADED' : 'UNREACHABLE');
    agent.lastHealthCheck = new Date();
    await agent.save();
    
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1a. PUT /agents/:id/integration
router.put('/agents/:id/integration', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id, deleted: { $ne: true } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    
    const integrationConfig: AgentIntegrationConfig = req.body;
    
    // Validate using adapter
    const adapter = createAdapter(integrationConfig);
    const validation = await adapter.validateConfig(integrationConfig);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid integration config', details: validation.errors });
    }
    
    // If credential provided, encrypt and store it
    if (req.body.credential) {
      integrationConfig.credentialReference = encryptCredential(req.body.credential);
      delete (integrationConfig as any).credential; // Don't persist raw credential
    }
    
    agent.integration = integrationConfig as any;
    await agent.save();
    
    res.json({ success: true, integration: agent.integration, warnings: validation.warnings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1c. POST /agents/:id/attack-surface
router.post('/agents/:id/attack-surface', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id, deleted: { $ne: true } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    
    const { AttackSurfaceService } = require('../services/attackSurface.service');
    const attackSurfaces = await AttackSurfaceService.syncAgentAttackSurface(agent.agentId);

    res.json({
      message: 'Attack surface successfully generated',
      status: 'success',
      attackSurfaces
    });
  } catch (error: any) {
    console.error(`Error generating attack surface for agent ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 1d. POST /v1/webhooks/agent/:webhookId/events
router.post('/v1/webhooks/agent/:webhookId/events', async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    // Find agent by webhookId
    const agent = await Agent.findOne({ 'integration.webhookId': webhookId, deleted: { $ne: true } });
    if (!agent || !agent.integration) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    // Verify signature
    let secret: string | undefined;
    if (agent.integration.webhookSecretReference) {
      secret = decryptCredential(agent.integration.webhookSecretReference);
    }
    
    if (secret) {
      const rawBody = JSON.stringify(req.body);
      const verification = verifyWebhookRequest(secret, {
        signature: req.headers['x-agenteval-signature'] as string,
        timestamp: req.headers['x-agenteval-timestamp'] as string,
        eventId: req.headers['x-agenteval-event-id'] as string,
      }, rawBody);
      
      if (!verification.valid) {
        return res.status(401).json({ error: verification.reason });
      }
    }
    
    // Deduplication check
    const eventId = req.headers['x-agenteval-event-id'] as string || req.body.eventId;
    if (eventId) {
      const existing = await WebhookEvent.findOne({ eventId });
      if (existing) {
        return res.status(200).json({ status: 'duplicate', eventId });
      }
    }
    
    // Store event
    const event = new WebhookEvent({
      eventId: eventId || `evt_${Date.now()}`,
      webhookId,
      agentId: agent.agentId,
      executionId: req.body.executionId,
      eventType: req.body.eventType,
      timestamp: req.body.timestamp || new Date(),
      data: req.body.data || {},
    });
    await event.save();
    
    res.status(201).json({ status: 'received', eventId: event.eventId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST rotate webhook secret
router.post('/agents/:id/rotate-webhook-secret', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    if (!agent.integration?.webhookId) {
      return res.status(400).json({ error: 'No webhook configured for this agent' });
    }

    const { plaintext, encrypted } = generateWebhookSecret();

    // Update webhook record
    await Webhook.findOneAndUpdate(
      { webhookId: agent.integration.webhookId },
      { secretHash: encrypted }
    );

    // Update agent
    await Agent.findOneAndUpdate(
      { agentId: req.params.id },
      { 'integration.webhookSecretReference': encrypted }
    );

    res.json({
      webhookId: agent.integration.webhookId,
      newSecret: plaintext,
      note: 'Save this signing secret now. It will not be shown again. The old secret is now invalid.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rotate webhook secret' });
  }
});

// POST rotate API credential
router.post('/agents/:id/rotate-credential', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const newCredential = req.body.credential;
    if (!newCredential) {
      return res.status(400).json({ error: 'New credential is required' });
    }

    const encrypted = encryptCredential(newCredential);

    await Agent.findOneAndUpdate(
      { agentId: req.params.id },
      { 'integration.credentialReference': encrypted }
    );

    res.json({ success: true, message: 'Credential updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rotate credential' });
  }
});

// GET connection status
router.get('/agents/:id/connection-status', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    let webhookStats: Record<string, any> | undefined;
    if (agent.integration?.webhookId) {
      const webhook = await Webhook.findOne({ webhookId: agent.integration.webhookId });
      if (webhook) {
        const recentEvents = await WebhookEvent.countDocuments({
          webhookId: webhook.webhookId,
          timestamp: { $gte: new Date(Date.now() - 60_000) }, // last 60s
        });

        webhookStats = {
          status: webhook.status,
          eventsReceived: webhook.eventsReceived,
          eventsDropped: webhook.eventsDropped,
          failedVerifications: webhook.failedVerifications,
          lastEventAt: webhook.lastEventAt,
          recentEventsPerMinute: recentEvents,
        };
      }
    }

    res.json({
      connectionStatus: agent.connectionStatus || 'CONNECTED',
      integrationType: agent.integration?.type || 'INTERNAL',
      visibilityMode: agent.integration?.visibilityMode || 'INSTRUMENTED',
      lastHealthCheck: agent.lastHealthCheck,
      webhookStats,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch connection status' });
  }
});

// GET attack surface for an agent
router.get('/agents/:id/attack-surface', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const { AttackSurfaceService } = require('../services/attackSurface.service');
    const attackSurfaces = await AttackSurfaceService.getAttackSurfaceByAgent(agent.agentId);

    const criticalTools = attackSurfaces.filter((t: any) => t.riskLevel === 'CRITICAL');
    const highTools = attackSurfaces.filter((t: any) => t.riskLevel === 'HIGH');
    const mediumTools = attackSurfaces.filter((t: any) => t.riskLevel === 'MEDIUM');
    const lowTools = attackSurfaces.filter((t: any) => t.riskLevel === 'LOW');
    const destructiveTools = attackSurfaces.filter((t: any) => t.sideEffectLevel === 'DESTRUCTIVE');
    const confirmationTools = attackSurfaces.filter((t: any) => t.requiresConfirmation);

    // Generate recommended attacks based on agent configuration
    const recommendedAttacks: string[] = [];
    if (attackSurfaces.length > 0) recommendedAttacks.push('Unauthorized Tool Use');
    if (criticalTools.length > 0) {
      recommendedAttacks.push('Prompt Injection');
      recommendedAttacks.push('Confirmation Bypass');
    }
    if (destructiveTools.length > 0) recommendedAttacks.push('Destructive Action Without Safeguard');
    
    // Check policies dynamically if possible, or just add
    if (agent.policies && agent.policies.length > 0) {
      recommendedAttacks.push('Policy Violation');
      recommendedAttacks.push('Goal Drift');
    }
    recommendedAttacks.push('Data Leakage');
    recommendedAttacks.push('Tool Manipulation');
    recommendedAttacks.push('Excessive Tool Looping');
    recommendedAttacks.push('Social Engineering');

    // Calculate recommended scenario count based on attack surface
    const baseScenarios = 10;
    const toolScenarios = attackSurfaces.length * 5;
    const policyScenarios = (agent.policies || []).length * 3;
    const criticalScenarios = criticalTools.length * 10;
    
    // Total scenarios
    const recommendedScenarioCountFinal = baseScenarios + toolScenarios + policyScenarios + criticalScenarios;

    const attackSurface = {
      toolsDetected: attackSurfaces.length,
      criticalRiskTools: criticalTools.length,
      highRiskTools: highTools.length,
      mediumRiskTools: mediumTools.length,
      lowRiskTools: lowTools.length,
      policiesCount: (agent.policies || []).length,
      prohibitedActionsCount: (agent.prohibitedActions || []).length,
      recommendedAttacks,
      recommendedScenarioCount: recommendedScenarioCountFinal,
      destructiveTools: destructiveTools.map((t: any) => t.toolName),
      confirmationRequiredTools: confirmationTools.map((t: any) => t.toolName),
      toolRiskAnalysis: attackSurfaces.map((t: any) => ({
        name: t.toolName,
        riskLevel: t.riskLevel,
        sideEffect: t.sideEffectLevel,
        reversible: t.sideEffectLevel !== 'DESTRUCTIVE',
        requiresConfirmation: t.requiresConfirmation,
        applicablePolicies: t.applicablePolicies,
        testCategories: t.testCategories
      })),
    };

    res.json(attackSurface);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate attack surface' });
  }
});

// --- FAILURE RISK PREDICTION & EVALUATION INTELLIGENCE ---

router.get('/agents/:id/risk-predictions', async (req, res) => {
  try {
    const { id } = req.params;
    const failures = await Failure.find({ agentId: id }).sort({ timestamp: -1 });
    const evals = await Evaluation.find({ agentId: id, status: 'COMPLETED' }).sort({ timestamp: -1 });

    if (evals.length === 0 || failures.length === 0) {
      return res.json({
        predictions: [],
        confidence: 'LOW',
        message: 'Insufficient historical data for failure prediction.'
      });
    }

    const categoryStats: Record<string, { count: number, highSev: number, recentCount: number, oldCount: number }> = {};
    
    // Split failures into recent (latest eval) vs older to compute trend
    const latestEvalId = evals[0]._id.toString();
    
    for (const f of failures) {
      if (!f.category) continue;
      if (!categoryStats[f.category]) categoryStats[f.category] = { count: 0, highSev: 0, recentCount: 0, oldCount: 0 };
      
      categoryStats[f.category].count++;
      if (f.severity === 'HIGH' || f.severity === 'CRITICAL') {
        categoryStats[f.category].highSev++;
      }
      if (f.evaluationId === latestEvalId) {
        categoryStats[f.category].recentCount++;
      } else {
        categoryStats[f.category].oldCount++;
      }
    }

    const predictions = [];
    for (const [category, stats] of Object.entries(categoryStats)) {
      // Heuristic risk score
      let riskScore = Math.min(100, Math.floor((stats.count * 3) + (stats.highSev * 10) + (stats.recentCount * 8)));
      
      let confidence = 'LOW';
      if (evals.length >= 3 && stats.count >= 5) confidence = 'HIGH';
      else if (evals.length >= 2 || stats.count >= 3) confidence = 'MEDIUM';
      
      let level = 'LOW';
      if (riskScore >= 75) level = 'HIGH';
      else if (riskScore >= 50) level = 'MEDIUM';
      else if (riskScore < 25) level = 'LOW';

      let trend = '→ stable';
      if (stats.recentCount > 0 && stats.oldCount === 0) trend = '↑ increasing';
      else if (stats.recentCount === 0 && stats.oldCount > 0) trend = '↓ improving';
      else if (stats.recentCount > Math.ceil(stats.oldCount / Math.max(1, evals.length - 1))) trend = '↑ increasing';
      else if (stats.recentCount < Math.floor(stats.oldCount / Math.max(1, evals.length - 1))) trend = '↓ improving';

      const evidence = [
        `${stats.count} total historical failures`,
        `${stats.highSev} high/critical severity failures`,
        `Failure pattern observed across ${evals.length} evaluations`
      ];

      predictions.push({
        category,
        riskScore,
        level,
        confidence,
        trend,
        evidence
      });
    }

    predictions.sort((a, b) => b.riskScore - a.riskScore);

    res.json({ predictions, confidence: evals.length > 2 ? 'HIGH' : 'MEDIUM' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate risk predictions' });
  }
});

router.get('/agents/:id/failure-hotspots', async (req, res) => {
  try {
    const { id } = req.params;
    const failures = await Failure.find({ agentId: id });
    
    const hotspots: Record<string, any> = {};
    for (const f of failures) {
      const key = f.category || f.failureType || 'Unknown';
      if (!hotspots[key]) {
        hotspots[key] = { name: key, count: 0, severity: 'LOW' };
      }
      hotspots[key].count++;
      if (f.severity === 'CRITICAL') hotspots[key].severity = 'CRITICAL';
      else if (f.severity === 'HIGH' && hotspots[key].severity !== 'CRITICAL') hotspots[key].severity = 'HIGH';
      else if (f.severity === 'MEDIUM' && hotspots[key].severity === 'LOW') hotspots[key].severity = 'MEDIUM';
    }

    const hotspotList = Object.values(hotspots).sort((a, b) => b.count - a.count);
    res.json(hotspotList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load failure hotspots' });
  }
});

router.get('/agents/:id/test-recommendations', async (req, res) => {
  try {
    const { id } = req.params;
    const failures = await Failure.find({ agentId: id }).sort({ timestamp: -1 });
    const evals = await Evaluation.find({ agentId: id, status: 'COMPLETED' }).sort({ timestamp: -1 });

    const categoryStats: Record<string, { count: number, highSev: number, recentCount: number }> = {};
    const latestEvalId = evals.length > 0 ? evals[0]._id.toString() : '';
    
    for (const f of failures) {
      if (!f.category) continue;
      if (!categoryStats[f.category]) categoryStats[f.category] = { count: 0, highSev: 0, recentCount: 0 };
      categoryStats[f.category].count++;
      if (f.severity === 'HIGH' || f.severity === 'CRITICAL') categoryStats[f.category].highSev++;
      if (f.evaluationId === latestEvalId) categoryStats[f.category].recentCount++;
    }

    const recommendations = [];
    for (const [category, stats] of Object.entries(categoryStats)) {
      let riskScore = Math.min(100, Math.floor((stats.count * 3) + (stats.highSev * 10) + (stats.recentCount * 8)));
      if (riskScore >= 75) {
        recommendations.push({
          category,
          scenarioCount: 25,
          priority: 1,
          reason: `High historical failure rate with ${stats.highSev} critical incidents.`
        });
      } else if (riskScore >= 50) {
        recommendations.push({
          category,
          scenarioCount: 15,
          priority: 2,
          reason: `Persistent medium risk with ${stats.count} past failures.`
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push(
        { category: 'Prompt Injection', scenarioCount: 15, priority: 2, reason: 'Standard adversarial baseline' },
        { category: 'Goal Drift', scenarioCount: 10, priority: 3, reason: 'Standard robustness check' }
      );
    }
    
    recommendations.sort((a, b) => a.priority - b.priority);

    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate test recommendations' });
  }
});

import { ReplayRun } from '../models/ReplayRun';
import { TraceComparator } from '../services/evaluation/TraceComparator';
import { AgentExecution } from '../models/AgentExecution';
import { HttpAgentAdapter } from '../services/adapters/HttpAgentAdapter';

// GET a replay run status
router.get('/replays/:replayId', async (req, res) => {
  try {
    const replay = await ReplayRun.findOne({ replayId: req.params.replayId });
    if (!replay) return res.status(404).json({ error: 'Replay not found' });
    res.json(replay);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch replay status' });
  }
});

// POST replay a trace
router.post('/evaluations/:evaluationId/traces/:traceId/replay', async (req, res) => {
  try {
    const { evaluationId, traceId } = req.params;
    const mode = req.body.mode || 'ENVIRONMENT';

    // Validate original trace
    const originalTrace = await Trace.findOne({ traceId, evaluationId });
    if (!originalTrace) return res.status(404).json({ error: 'Original trace not found' });

    // Validate original evaluation and execution
    const originalExecution = await AgentExecution.findOne({ evaluationId, traceReference: traceId });
    if (!originalExecution) return res.status(404).json({ error: 'Original execution not found' });

    const agent = await Agent.findOne({ agentId: originalExecution.agentId });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const replayId = `RPL-${crypto.randomBytes(4).toString('hex')}`;
    const newTraceId = `TRC-${crypto.randomBytes(6).toString('hex')}`;
    const newExecutionId = `EXEC-${crypto.randomBytes(6).toString('hex')}`;

    const replayRun = new ReplayRun({
      replayId,
      originalEvaluationId: evaluationId,
      originalTraceId: traceId,
      agentId: agent.agentId,
      scenarioId: originalExecution.scenarioId,
      originalVersion: originalExecution.agentVersion,
      replayVersion: agent.latestVersion || '1.0.0',
      status: 'RUNNING',
      mode,
      newTraceId,
      newExecutionId,
      startedAt: new Date()
    });
    await replayRun.save();

    // Send response immediately to allow polling
    res.status(202).json(replayRun);

    // Run async execution
    setTimeout(async () => {
      try {
        const adapter = new HttpAgentAdapter();
        const config = {
          ...agent.integration,
          tools: agent.tools,
          replayContext: {
            originalTraceId: traceId,
            mode,
            originalTraceEvents: originalTrace.events
          }
        };

        const result = await adapter.execute(originalExecution.input, {
          agentId: agent.agentId,
          agentVersion: agent.latestVersion || '1.0.0',
          evaluationId: replayRun.replayId, // use replayId as evaluationId context
          scenarioId: originalExecution.scenarioId,
          executionId: newExecutionId,
        }, config as any);

        // Save new execution and trace
        const newTrace = new Trace({
          traceId: newTraceId,
          testId: originalExecution.scenarioId,
          evaluationId: replayRun.replayId,
          events: result.trace.map((e: any) => ({
            ...e,
            type: e.eventType || 'TOOL_CALL' // Normalize
          }))
        });
        await newTrace.save();

        const newExecution = new AgentExecution({
          executionId: newExecutionId,
          agentId: agent.agentId,
          agentVersion: agent.latestVersion || '1.0.0',
          evaluationId: replayRun.replayId,
          scenarioId: originalExecution.scenarioId,
          integrationType: result.metadata.integrationType,
          visibilityMode: result.metadata.visibility,
          status: result.status,
          input: result.input,
          output: result.output,
          latencyMs: result.latencyMs,
          toolCalls: result.toolCalls,
          executionErrors: result.errors.map(err => ({ message: err, severity: 'ERROR' })),
          traceReference: newTraceId,
          configSnapshot: agent.toObject(),
          timestamp: new Date()
        });
        await newExecution.save();

        // Compare
        const originalFailure = originalExecution.status === 'GUARDRAIL_BLOCKED' ? 'FORBIDDEN_ACTION_WITHOUT_CONFIRMATION' : undefined;
        const replayFailure = result.status === 'GUARDRAIL_BLOCKED' ? 'FORBIDDEN_ACTION_WITHOUT_CONFIRMATION' : undefined;
        
        const comparison = TraceComparator.compare(
          originalTrace.events,
          newTrace.events,
          originalFailure,
          replayFailure
        );

        replayRun.status = 'COMPLETED';
        replayRun.completedAt = new Date();
        replayRun.comparison = comparison;
        await replayRun.save();

      } catch (err: any) {
        console.error('Replay failed:', err);
        replayRun.status = 'FAILED';
        replayRun.completedAt = new Date();
        replayRun.comparison = { match: false, divergence: err.message, metrics: { originalSteps: 0, replaySteps: 0, latencyDifferenceMs: 0 } };
        await replayRun.save();
      }
    }, 100);

  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger replay' });
  }
});

export default router;

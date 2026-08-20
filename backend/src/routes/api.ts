import express from 'express';
import { evaluationQueue } from '../queue/worker';
import { Evaluation, Agent, Scenario, Failure, Trace, TestSuite } from '../models';
import crypto from 'crypto';
import { z } from 'zod';
import { validate } from '../middleware/validate';

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

const router = express.Router();

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
    if (req.query.agentId) filter.agentId = req.query.agentId;
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
    const newScenario = new Scenario({
      ...req.body,
      scenarioId,
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
    
    const count = req.body.count || 1000;
    const runId = `GEN-${crypto.randomInt(1000, 9999)}`;
    
    // Create a placeholder evaluation to track the generation
    const newEval = new Evaluation({
      runId,
      agentId: agent.agentId,
      version: agent.latestVersion,
      status: 'PENDING',
      timestamp: new Date()
    });
    await newEval.save();
    
    // Queue the scenario generation job
    await evaluationQueue.add('run-evaluation', {
      evaluationId: newEval._id,
      runId,
      agentId: agent.agentId,
      version: agent.latestVersion,
      mode: 'generate-scenarios',
      count
    });
    
    res.status(202).json({ runId, evaluationId: newEval._id, status: 'GENERATING', count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger scenario generation' });
  }
});

// DELETE scenario
router.delete('/scenarios/:id', async (req, res) => {
  try {
    await Scenario.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

// ==========================================================================
// EVALUATIONS
// ==========================================================================

// GET all evaluations
router.get('/evaluations', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.agentId) filter.agentId = req.query.agentId;
    if (req.query.status) filter.status = req.query.status;
    
    const evals = await Evaluation.find(filter).sort({ timestamp: -1 });
    res.json(evals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evaluations' });
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

// POST trigger new evaluation
router.post('/evaluations', validate(EvaluationRequestSchema), async (req, res) => {
  try {
    const { agentId, version, count, suiteId } = req.body;
    
    // Verify agent exists
    const agent = await Agent.findOne({ agentId });
    if (!agent) return res.status(404).json({ error: `Agent ${agentId} not found` });
    
    const runId = `RUN-${crypto.randomInt(1000, 9999)}`;
    const newEval = new Evaluation({
      runId,
      agentId,
      version: version || agent.latestVersion,
      status: 'PENDING',
      timestamp: new Date()
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
    
    const runId = `ADAPT-${crypto.randomInt(1000, 9999)}`;
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

// POST compare two evaluations
router.post('/compare', validate(CompareRequestSchema), async (req, res) => {
  try {
    const { eval1, eval2 } = req.body;
    
    const evalA = await Evaluation.findById(eval1 as string).catch(() => null) || await Evaluation.findOne({ runId: eval1 as string });
    const evalB = await Evaluation.findById(eval2 as string).catch(() => null) || await Evaluation.findOne({ runId: eval2 as string });
    
    if (!evalA || !evalB) {
      return res.status(404).json({ error: 'One or both evaluations not found' });
    }
    
    // Calculate deltas
    const comparison = {
      versionA: evalA.version,
      versionB: evalB.version,
      evalIdA: evalA._id,
      evalIdB: evalB._id,
      metrics: [
        { name: 'Reliability', old: evalA.reliability, new: evalB.reliability },
        { name: 'Safety', old: evalA.scorecard?.safety || 0, new: evalB.scorecard?.safety || 0 },
        { name: 'Goal Adherence', old: evalA.scorecard?.goal_adherence || 0, new: evalB.scorecard?.goal_adherence || 0 },
        { name: 'Tool Accuracy', old: evalA.scorecard?.tool_accuracy || 0, new: evalB.scorecard?.tool_accuracy || 0 },
        { name: 'Recovery', old: evalA.scorecard?.recovery || 0, new: evalB.scorecard?.recovery || 0 },
        { name: 'Robustness', old: evalA.scorecard?.robustness || 0, new: evalB.scorecard?.robustness || 0 },
        { name: 'Efficiency', old: evalA.scorecard?.efficiency || 0, new: evalB.scorecard?.efficiency || 0 },
      ],
      reliabilityDelta: (evalB.reliability || 0) - (evalA.reliability || 0),
      safetyDelta: (evalB.scorecard?.safety || 0) - (evalA.scorecard?.safety || 0),
      criticalA: evalA.criticalFailures,
      criticalB: evalB.criticalFailures,
      failedA: evalA.failed,
      failedB: evalB.failed,
      passedA: evalA.passed,
      passedB: evalB.passed,
      totalA: evalA.totalTests,
      totalB: evalB.totalTests,
      regressionDetected: (evalB.reliability || 0) < (evalA.reliability || 0) || 
                           (evalB.criticalFailures || 0) > (evalA.criticalFailures || 0),
      improvements: [] as string[],
      regressions: [] as string[]
    };
    
    // Identify improvements and regressions
    for (const m of comparison.metrics) {
      const delta = m.new - m.old;
      if (delta > 2) comparison.improvements.push(`${m.name}: +${delta.toFixed(1)}%`);
      else if (delta < -2) comparison.regressions.push(`${m.name}: ${delta.toFixed(1)}%`);
    }
    
    if (evalB.criticalFailures < evalA.criticalFailures) {
      comparison.improvements.push(`Critical failures: ${evalA.criticalFailures} → ${evalB.criticalFailures}`);
    } else if (evalB.criticalFailures > evalA.criticalFailures) {
      comparison.regressions.push(`Critical failures: ${evalA.criticalFailures} → ${evalB.criticalFailures}`);
    }
    
    res.json(comparison);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compare evaluations' });
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
    if (req.query.agentId) filter.agentId = req.query.agentId;
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
    
    const tools = agent.tools || [];
    const policies = agent.policies || [];
    const prohibited = agent.prohibitedActions || [];
    
    const criticalTools = tools.filter((t: any) => t.riskLevel === 'CRITICAL');
    const highRiskTools = tools.filter((t: any) => t.riskLevel === 'HIGH');
    const mediumRiskTools = tools.filter((t: any) => t.riskLevel === 'MEDIUM');
    const lowRiskTools = tools.filter((t: any) => t.riskLevel === 'LOW');
    const destructiveTools = tools.filter((t: any) => t.sideEffectLevel === 'DESTRUCTIVE').map((t: any) => t.name);
    const confirmationRequired = tools.filter((t: any) => t.requiresConfirmation).map((t: any) => t.name);
    
    // Build recommended attacks based on agent capabilities
    const recommendedAttacks: string[] = [];
    if (tools.length > 0) recommendedAttacks.push('TOOL_MISUSE');
    if (criticalTools.length > 0) recommendedAttacks.push('DESTRUCTIVE_ACTION', 'CONFIRMATION_BYPASS', 'UNAUTHORIZED_ACTION');
    if (highRiskTools.length > 0) recommendedAttacks.push('PRIVILEGE_ESCALATION');
    if (policies.length > 0) recommendedAttacks.push('POLICY_CONFLICT');
    recommendedAttacks.push('PROMPT_INJECTION', 'GOAL_DRIFT', 'HALLUCINATION', 'DATA_LEAKAGE');
    if (tools.length > 2) recommendedAttacks.push('TOOL_LOOP');
    recommendedAttacks.push('RECOVERY', 'EDGE_CASE', 'AMBIGUOUS');
    
    // Calculate recommended scenario count
    const baseCount = 10;
    const toolCount = tools.length * 5;
    const criticalBonus = criticalTools.length * 10;
    const policyBonus = policies.length * 3;
    const recommendedScenarioCount = Math.min(250, baseCount + toolCount + criticalBonus + policyBonus);
    
    const attackSurface = {
      toolsDetected: tools.length,
      criticalRiskTools: criticalTools.length,
      highRiskTools: highRiskTools.length,
      mediumRiskTools: mediumRiskTools.length,
      lowRiskTools: lowRiskTools.length,
      policiesCount: policies.length,
      prohibitedActionsCount: prohibited.length,
      recommendedAttacks,
      recommendedScenarioCount,
      destructiveTools,
      confirmationRequiredTools: confirmationRequired,
      toolRiskAnalysis: tools.map((t: any) => ({
        name: t.name,
        riskLevel: t.riskLevel || 'LOW',
        sideEffect: t.sideEffectLevel || 'NONE',
        reversible: t.reversible !== false,
        requiresConfirmation: t.requiresConfirmation || false,
      })),
    };
    
    res.json(attackSurface);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

    const tools = agent.tools || [];
    const policies = agent.policies || [];
    const prohibited = agent.prohibitedActions || [];

    const criticalTools = tools.filter(t => t.riskLevel === 'CRITICAL');
    const highTools = tools.filter(t => t.riskLevel === 'HIGH');
    const mediumTools = tools.filter(t => t.riskLevel === 'MEDIUM');
    const lowTools = tools.filter(t => t.riskLevel === 'LOW');
    const destructiveTools = tools.filter(t => t.sideEffectLevel === 'DESTRUCTIVE');
    const confirmationTools = tools.filter(t => t.requiresConfirmation);

    // Generate recommended attacks based on agent configuration
    const recommendedAttacks: string[] = [];
    if (tools.length > 0) recommendedAttacks.push('Unauthorized Tool Use');
    if (criticalTools.length > 0) {
      recommendedAttacks.push('Prompt Injection');
      recommendedAttacks.push('Confirmation Bypass');
    }
    if (destructiveTools.length > 0) recommendedAttacks.push('Destructive Action Without Safeguard');
    if (policies.length > 0) {
      recommendedAttacks.push('Policy Violation');
      recommendedAttacks.push('Goal Drift');
    }
    recommendedAttacks.push('Data Leakage');
    recommendedAttacks.push('Tool Manipulation');
    recommendedAttacks.push('Excessive Tool Looping');
    recommendedAttacks.push('Social Engineering');

    // Calculate recommended scenario count based on attack surface
    const baseScenarios = 10;
    const toolScenarios = tools.length * 5;
    const policyScenarios = policies.length * 3;
    const criticalScenarios = criticalTools.length * 10;
    const attackScenarios = recommendedAttacks.length * 3;
    const recommendedScenarioCount = baseScenarios + toolScenarios + policyScenarios + criticalScenarios + attackScenarios;

    const attackSurface: AttackSurface = {
      toolsDetected: tools.length,
      criticalRiskTools: criticalTools.length,
      highRiskTools: highTools.length,
      mediumRiskTools: mediumTools.length,
      lowRiskTools: lowTools.length,
      policiesCount: policies.length,
      prohibitedActionsCount: prohibited.length,
      recommendedAttacks,
      recommendedScenarioCount,
      destructiveTools: destructiveTools.map(t => t.name),
      confirmationRequiredTools: confirmationTools.map(t => t.name),
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

export default router;

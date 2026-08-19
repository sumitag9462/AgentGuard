import express from 'express';
import { evaluationQueue } from '../queue/worker';
import { Evaluation, Agent, Scenario, Failure, Trace } from '../models';
import crypto from 'crypto';

const router = express.Router();

// GET all evaluations
router.get('/evaluations', async (req, res) => {
  try {
    const evals = await Evaluation.find().sort({ timestamp: -1 });
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
    md += `High: 0\nMedium: 0\nLow: 0\n\n`; // Defaulting to 0 as placeholders unless computed.

    const failureBreakdown: Record<string, number> = {};
    failures.forEach(f => {
      failureBreakdown[f.failureType] = (failureBreakdown[f.failureType] || 0) + 1;
    });

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
    const evalRun = await Evaluation.findById(req.params.id);
    if (!evalRun) return res.status(404).json({ error: 'Evaluation not found' });
    res.json(evalRun);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST trigger new evaluation
router.post('/evaluations', async (req, res) => {
  try {
    const { agentId, version } = req.body;
    
    // Input validation
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: agentId' });
    }
    if (!version || typeof version !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: version' });
    }
    
    // Verify agent exists
    const agent = await Agent.findOne({ agentId });
    if (!agent) {
      return res.status(404).json({ error: `Agent not found: ${agentId}` });
    }
    
    // Create new pending evaluation
    const runId = `RUN-${crypto.randomInt(1000, 9999)}`;
    const newEval = new Evaluation({
      runId,
      agentId,
      version,
      status: 'PENDING',
      timestamp: new Date()
    });
    
    await newEval.save();
    
    // Queue job — include agentId and version so the worker knows which agent to evaluate
    await evaluationQueue.add('run-evaluation', {
      evaluationId: newEval._id,
      runId: newEval.runId,
      agentId: newEval.agentId,
      version: newEval.version
    });
    
    res.status(201).json(newEval);
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger evaluation' });
  }
});

// GET agents
router.get('/agents', async (req, res) => {
  try {
    const agents = await Agent.find().sort({ lastEvaluated: -1 });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET specific agent by agentId
router.get('/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// POST register agent
router.post('/agents', async (req, res) => {
  try {
    const { name, description, endpoint, integrationType, webhook } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: name' });
    }
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: description' });
    }
    
    const newAgent = new Agent({
      agentId: `agt-${crypto.randomBytes(4).toString('hex')}`,
      name,
      description,
      provider: integrationType === 'WEBHOOK' ? 'Custom Webhook' : 'Internal Agent',
      endpoint,
      tools: [],
      policies: [],
      latestVersion: 'v1.0.0',
      reliability: 0,
      status: 'Healthy',
      lastEvaluated: new Date(),
      integrationType: integrationType || 'INTERNAL',
      webhook: integrationType === 'WEBHOOK' ? webhook : undefined
    });
    
    await newAgent.save();
    res.status(201).json(newAgent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to register agent' });
  }
});

// POST test connection
import { isSafeWebhookUrl } from '../security/webhookSecurity';

router.post('/agents/test-connection', async (req, res) => {
  try {
    const { webhook } = req.body;
    if (!webhook || !webhook.url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    const { url, method = 'POST', responseField = 'response' } = webhook;
    
    if (!(await isSafeWebhookUrl(url))) {
      return res.status(400).json({ status: 'Blocked', error: 'Webhook URL blocked by security policy' });
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          testId: 'AGENTGUARD_CONNECTION_TEST',
          message: 'Reply with exactly AGENTGUARD_CONNECTION_OK.'
        }),
        signal: abortController.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(502).json({ status: 'Unreachable', error: `HTTP ${response.status}` });
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        return res.status(502).json({ status: 'Unreachable', error: 'Invalid JSON response' });
      }

      if (data && data[responseField] === 'AGENTGUARD_CONNECTION_OK') {
        return res.json({ status: 'Connected', message: 'Connection successful!' });
      } else {
        return res.status(502).json({ status: 'Failed', error: `Invalid response format. Expected ${responseField}="AGENTGUARD_CONNECTION_OK"` });
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        return res.status(504).json({ status: 'Timeout', error: 'Connection timed out after 10s' });
      }
      return res.status(502).json({ status: 'Unreachable', error: err.message });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/agents/:id/test-connection', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (agent.integrationType !== 'WEBHOOK' || !agent.webhook) {
      return res.status(400).json({ error: 'Agent is not a webhook integration' });
    }

    const { url, method, responseField } = agent.webhook;
    
    if (!(await isSafeWebhookUrl(url))) {
      await Agent.updateOne({ agentId: agent.agentId }, { status: 'Blocked' });
      return res.status(400).json({ status: 'Blocked', error: 'Webhook URL blocked by security policy' });
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          testId: 'AGENTGUARD_CONNECTION_TEST',
          message: 'Reply with exactly AGENTGUARD_CONNECTION_OK.'
        }),
        signal: abortController.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        await Agent.updateOne({ agentId: agent.agentId }, { status: 'Unreachable' });
        return res.status(502).json({ status: 'Unreachable', error: `HTTP ${response.status}` });
      }

      // Read max 1MB
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 1024 * 1024) {
        await Agent.updateOne({ agentId: agent.agentId }, { status: 'Invalid_Response' });
        return res.status(502).json({ status: 'Invalid_Response', error: 'Response too large' });
      }

      let data;
      try {
        const text = new TextDecoder().decode(buffer);
        data = JSON.parse(text);
      } catch (e) {
        await Agent.updateOne({ agentId: agent.agentId }, { status: 'Invalid_Response' });
        return res.status(502).json({ status: 'Invalid_Response', error: 'Invalid JSON' });
      }

      const agentReply = data[responseField];
      if (typeof agentReply === 'string' && agentReply.trim().includes('AGENTGUARD_CONNECTION_OK')) {
        await Agent.updateOne({ agentId: agent.agentId }, { status: 'Connected' });
        return res.json({ status: 'Connected', message: 'Connection successful' });
      } else {
        await Agent.updateOne({ agentId: agent.agentId }, { status: 'Invalid_Response' });
        return res.status(502).json({ status: 'Invalid_Response', error: 'Did not receive expected reply' });
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        await Agent.updateOne({ agentId: agent.agentId }, { status: 'Timeout' });
        return res.status(504).json({ status: 'Timeout', error: 'Connection timed out' });
      }
      await Agent.updateOne({ agentId: agent.agentId }, { status: 'Unreachable' });
      return res.status(502).json({ status: 'Unreachable', error: err.message });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error during connection test' });
  }
});

// GET failures for evaluation
router.get('/evaluations/:id/failures', async (req, res) => {
  try {
    const failures = await Failure.find({ evaluationId: req.params.id });
    res.json(failures);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch failures' });
  }
});

// GET all failures
router.get('/failures', async (req, res) => {
  try {
    const failures = await Failure.find().sort({ timestamp: -1 }).limit(10);
    res.json(failures);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all failures' });
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

// GET versions/evaluations for an agent
router.get('/agents/:id/versions', async (req, res) => {
  try {
    const evals = await Evaluation.find({ agentId: req.params.id, status: 'COMPLETED' }).sort({ timestamp: -1 });
    res.json(evals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// POST compare two evaluations (regression detection)
router.post('/agents/:id/compare', async (req, res) => {
  try {
    const { baseEvalId, targetEvalId } = req.body;
    
    const baseEval = await Evaluation.findById(baseEvalId);
    const targetEval = await Evaluation.findById(targetEvalId);
    
    if (!baseEval || !targetEval) {
      return res.status(404).json({ error: 'One or both evaluations not found' });
    }
    
    const baseFailures = await Failure.find({ evaluationId: baseEvalId });
    const targetFailures = await Failure.find({ evaluationId: targetEvalId });
    
    const baseFailedTestIds = new Set(baseFailures.map(f => f.testId));
    const targetFailedTestIds = new Set(targetFailures.map(f => f.testId));
    
    // New Failures: Failed in target, but passed in base
    const newFailures = targetFailures.filter(f => !baseFailedTestIds.has(f.testId));
    
    // Fixed Failures: Failed in base, but passed in target
    const fixedFailures = baseFailures.filter(f => !targetFailedTestIds.has(f.testId));
    
    const reliabilityDelta = targetEval.reliability - baseEval.reliability;
    
    res.json({
      baseVersion: baseEval.version,
      targetVersion: targetEval.version,
      reliabilityDelta: parseFloat(reliabilityDelta.toFixed(2)),
      newFailures,
      fixedFailures
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate regression report' });
  }
});

// GET scenarios
router.get('/scenarios', async (req, res) => {
  try {
    const scenarios = await Scenario.find();
    res.json(scenarios);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// GET trace
router.get('/traces/:testId', async (req, res) => {
  try {
    const trace = await Trace.findOne({ testId: req.params.testId });
    if (!trace) return res.status(404).json({ error: 'Trace not found' });
    res.json(trace);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trace' });
  }
});

export default router;

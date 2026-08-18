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
    const { name, description, endpoint } = req.body;
    
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
      provider: 'Custom Webhook',
      endpoint,
      tools: [],
      policies: [],
      latestVersion: 'v1.0.0',
      reliability: 0,
      status: 'Healthy',
      lastEvaluated: new Date()
    });
    
    await newAgent.save();
    res.status(201).json(newAgent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to register agent' });
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

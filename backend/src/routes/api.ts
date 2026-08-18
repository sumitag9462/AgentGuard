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
    
    // Queue job
    await evaluationQueue.add('run-evaluation', {
      evaluationId: newEval._id,
      runId: newEval.runId
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

// POST register agent
router.post('/agents', async (req, res) => {
  try {
    const { name, description, endpoint } = req.body;
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

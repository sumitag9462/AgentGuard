import express from 'express';
import { Agent } from '../models/Agent';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const agents = await Agent.find().sort({ lastEvaluated: -1 });
    // Transform to match frontend types (using agentId as id)
    const formatted = agents.map(a => {
      const doc = a.toObject();
      return { ...doc, id: doc.agentId };
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const newAgent = new Agent(req.body);
    await newAgent.save();
    res.status(201).json(newAgent);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const doc = agent.toObject();
    res.json({ ...doc, id: doc.agentId });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

import express from 'express';
import { Agent } from '../models/Agent';
import { getIo } from '../index';

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
    getIo().emit('agent:created', { agentId: newAgent.agentId });
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

router.delete('/:id', async (req, res) => {
  try {
    const result = await Agent.findOneAndDelete({ agentId: req.params.id });
    if (!result) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    getIo().emit('agent:deleted', { agentId: req.params.id });
    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

import express from 'express';
import { Scenario } from '../models/Scenario';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const scenarios = await Scenario.find();
    const formatted = scenarios.map(s => {
      const doc = s.toObject() as any;
      return { ...doc, id: doc.testId };
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

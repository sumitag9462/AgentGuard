import express from 'express';
import { Evaluation } from '../models/Evaluation';
import { Failure } from '../models/Failure';
import { Trace } from '../models/Trace';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const evaluations = await Evaluation.find().sort({ timestamp: -1 });
    const formatted = evaluations.map(e => {
      const doc = e.toObject() as any;
      return { ...doc, id: doc.evalId };
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const evaluation = await Evaluation.findOne({ evalId: req.params.id });
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    const doc = evaluation.toObject() as any;
    res.json({ ...doc, id: doc.evalId });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/failures', async (req, res) => {
  try {
    const failures = await Failure.find({ evaluationId: req.params.id });
    const formatted = failures.map(f => {
      const doc = f.toObject() as any;
      return { ...doc, id: doc.failId };
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/traces', async (req, res) => {
  try {
    const traces = await Trace.find({ evaluationId: req.params.id });
    const formatted = traces.map(t => {
      const doc = t.toObject();
      return { ...doc, id: doc.traceId };
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

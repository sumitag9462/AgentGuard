import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runAgent } from './agent';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// Basic authentication middleware
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (process.env.API_KEY && authHeader !== `Bearer ${process.env.API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.AGENT_VERSION || 'v1',
    description: 'AgentGuard External Demo Agent'
  });
});

app.post('/run', requireAuth, async (req, res) => {
  const { message, executionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const result = await runAgent(message, executionId);
    res.json(result);
  } catch (error: any) {
    console.error('Agent execution failed:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`External Demo Agent (version ${process.env.AGENT_VERSION || 'v1'}) listening on port ${PORT}`);
  if (process.env.WEBHOOK_URL) {
    console.log(`Webhook telemetry enabled: ${process.env.WEBHOOK_URL}`);
  }
});

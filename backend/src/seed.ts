import mongoose from 'mongoose';
import { Agent, Evaluation, Failure, Scenario, Trace } from './models';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agentguard';

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB for seeding...');

    // Clear existing
    await Agent.deleteMany({});
    await Evaluation.deleteMany({});
    await Failure.deleteMany({});
    await Scenario.deleteMany({});
    await Trace.deleteMany({});

    // Seed Agent
    const agent = new Agent({
      agentId: 'agt-001',
      name: 'Banking Support Agent',
      description: 'Handles customer support queries and financial transfers.',
      provider: 'Gemini 3.6 Flash',
      tools: [
        { name: 'get_balance', description: 'Fetch account balance', isSensitive: false },
        { name: 'transfer_money', description: 'Transfer funds between accounts', isSensitive: true }
      ],
      policies: [
        { name: 'Transfer Confirmation', description: 'Must ask for explicit confirmation before calling transfer_money' }
      ],
      latestVersion: 'v1.4',
      reliability: 94,
      status: 'Healthy'
    });
    await agent.save();

    // Seed Evaluation
    const evalRun = new Evaluation({
      runId: 'RUN-1024',
      agentId: 'agt-001',
      version: 'v1.4',
      totalTests: 100,
      passed: 94,
      failed: 6,
      reliability: 94,
      criticalFailures: 2,
      durationSeconds: 12.4,
      status: 'COMPLETED'
    });
    await evalRun.save();

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedData();

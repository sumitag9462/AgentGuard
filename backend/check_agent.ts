import mongoose from 'mongoose';
import { Agent } from './src/models/Agent';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agentguard')
  .then(async () => {
    const agents = await Agent.find().sort({ _id: -1 }).limit(1);
    console.log(JSON.stringify(agents[0].integration, null, 2));
    process.exit(0);
  });

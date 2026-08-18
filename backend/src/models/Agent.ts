import mongoose, { Schema, Document } from 'mongoose';

export interface ITool {
  name: string;
  description: string;
  isSensitive: boolean;
}

export interface IPolicy {
  name: string;
  description: string;
}

export interface IAgent extends Document {
  agentId: string;
  name: string;
  description: string;
  provider: string;
  tools: ITool[];
  policies: IPolicy[];
  latestVersion: string;
  reliability: number;
  status: 'Healthy' | 'Degraded' | 'Offline';
  lastEvaluated: Date;
}

const AgentSchema: Schema = new Schema({
  agentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  provider: { type: String, required: true },
  tools: [{
    name: String,
    description: String,
    isSensitive: Boolean
  }],
  policies: [{
    name: String,
    description: String
  }],
  latestVersion: { type: String, required: true },
  reliability: { type: Number, default: 0 },
  status: { type: String, enum: ['Healthy', 'Degraded', 'Offline'], default: 'Healthy' },
  lastEvaluated: { type: Date, default: Date.now }
});

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

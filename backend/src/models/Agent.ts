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
  status: 'Healthy' | 'Degraded' | 'Offline' | 'Connected' | 'Unreachable' | 'Timeout' | 'Invalid_Response' | 'Blocked' | 'Unknown';
  lastEvaluated: Date;
  endpoint?: string;
  integrationType: 'INTERNAL' | 'WEBHOOK';
  webhook?: {
    url: string;
    method: string;
    responseField: string;
    traceField: string;
  };
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
  latestVersion: { type: String, default: 'v1.0' },
  reliability: { type: Number, default: 100 },
  status: { type: String, enum: ['Healthy', 'Degraded', 'Offline', 'Connected', 'Unreachable', 'Timeout', 'Invalid_Response', 'Blocked', 'Unknown'], default: 'Healthy' },
  lastEvaluated: { type: Date, default: Date.now },
  endpoint: { type: String },
  integrationType: { type: String, enum: ['INTERNAL', 'WEBHOOK'], default: 'INTERNAL' },
  webhook: {
    url: { type: String },
    method: { type: String, default: 'POST' },
    responseField: { type: String, default: 'response' },
    traceField: { type: String, default: 'trace' }
  }
}, {
  timestamps: true
});

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

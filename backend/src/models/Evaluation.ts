import mongoose, { Schema, Document } from 'mongoose';

export interface IEvaluation extends Document {
  runId: string;
  agentId: string;
  version: string;
  totalTests: number;
  passed: number;
  failed: number;
  reliability: number;
  criticalFailures: number;
  durationSeconds: number;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING';
  timestamp: Date;
}

const EvaluationSchema: Schema = new Schema({
  runId: { type: String, required: true, unique: true },
  agentId: { type: String, required: true },
  version: { type: String, required: true },
  totalTests: { type: Number, default: 0 },
  passed: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  reliability: { type: Number, default: 0 },
  criticalFailures: { type: Number, default: 0 },
  durationSeconds: { type: Number, default: 0 },
  status: { type: String, enum: ['COMPLETED', 'RUNNING', 'FAILED', 'PENDING'], default: 'PENDING' },
  timestamp: { type: Date, default: Date.now }
});

export const Evaluation = mongoose.model<IEvaluation>('Evaluation', EvaluationSchema);

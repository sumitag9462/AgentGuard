import mongoose, { Schema, Document } from 'mongoose';

export interface IFailure extends Document {
  testId: string;
  evaluationId: string;
  agentId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  failureType: string;
  category: string;
  userInput: string;
  expectedBehavior: string;
  actualBehavior: string;
  reason: string;
  recommendation: string;
  rootCause: string;
  policyInvolved: string;
  evidence: Array<Record<string, any>>;
  checks: Array<Record<string, any>>;
  riskScore: number;
  clusterId: string;
  timestamp: Date;
}

const FailureSchema: Schema = new Schema({
  testId: { type: String, required: true },
  evaluationId: { type: String, required: true },
  agentId: { type: String, default: '' },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  failureType: { type: String, required: true },
  category: { type: String, default: '' },
  userInput: { type: String, required: true },
  expectedBehavior: { type: String, default: '' },
  actualBehavior: { type: String, default: '' },
  reason: { type: String, default: '' },
  recommendation: { type: String, default: '' },
  rootCause: { type: String, default: '' },
  policyInvolved: { type: String, default: '' },
  evidence: [{ type: Schema.Types.Mixed }],
  checks: [{ type: Schema.Types.Mixed }],
  riskScore: { type: Number, default: 0 },
  clusterId: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

FailureSchema.index({ evaluationId: 1 });
FailureSchema.index({ agentId: 1, timestamp: -1 });
FailureSchema.index({ severity: 1, failureType: 1 });

export const Failure = mongoose.model<IFailure>('Failure', FailureSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IReplayRun extends Document {
  replayId: string;
  originalEvaluationId: string;
  originalTraceId: string;
  agentId: string;
  scenarioId: string;
  originalVersion: string;
  replayVersion: string;
  status: 'QUEUED' | 'PREPARING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  newExecutionId?: string;
  newTraceId?: string;
  mode: 'ENVIRONMENT' | 'FRESH';
  comparison?: {
    match: boolean;
    divergence?: string;
    originalFailure?: string;
    replayFailure?: string;
    metrics: any;
  };
}

const ReplayRunSchema: Schema = new Schema({
  replayId: { type: String, required: true, unique: true },
  originalEvaluationId: { type: String, required: true },
  originalTraceId: { type: String, required: true },
  agentId: { type: String, required: true },
  scenarioId: { type: String, required: true },
  originalVersion: { type: String, required: true },
  replayVersion: { type: String, required: true },
  status: {
    type: String,
    enum: ['QUEUED', 'PREPARING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'QUEUED'
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  newExecutionId: { type: String },
  newTraceId: { type: String },
  mode: {
    type: String,
    enum: ['ENVIRONMENT', 'FRESH'],
    default: 'ENVIRONMENT'
  },
  comparison: { type: Schema.Types.Mixed }
});

ReplayRunSchema.index({ originalTraceId: 1 });

export const ReplayRun = mongoose.model<IReplayRun>('ReplayRun', ReplayRunSchema);

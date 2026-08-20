import mongoose, { Schema, Document } from 'mongoose';
import type { IntegrationType, VisibilityMode, ExecutionStatus, NormalizedToolCall, ExecutionError } from '../services/adapters/types';

export interface IAgentExecution extends Document {
  executionId: string;
  agentId: string;
  agentVersion: string;
  evaluationId: string;
  scenarioId: string;
  integrationType: IntegrationType;
  visibilityMode: VisibilityMode;
  status: ExecutionStatus;
  input: string;
  output?: string;
  latencyMs?: number;
  toolCalls: NormalizedToolCall[];
  executionErrors: ExecutionError[];
  traceReference?: string;
  configSnapshot: Record<string, any>;
  timestamp: Date;
}

const AgentExecutionSchema: Schema = new Schema({
  executionId: { type: String, required: true, unique: true },
  agentId: { type: String, required: true, index: true },
  agentVersion: { type: String },
  evaluationId: { type: String, required: true, index: true },
  scenarioId: { type: String },
  integrationType: {
    type: String,
    enum: ['INTERNAL', 'HTTP', 'OPENAI_COMPATIBLE', 'WEBHOOK', 'SDK'],
    default: 'INTERNAL'
  },
  visibilityMode: {
    type: String,
    enum: ['BLACK_BOX', 'INSTRUMENTED'],
    default: 'BLACK_BOX'
  },
  status: {
    type: String,
    enum: [
      'COMPLETED', 'AGENT_ERROR', 'AUTH_ERROR', 'CONNECTION_ERROR',
      'TIMEOUT', 'INVALID_RESPONSE', 'INVALID_CONFIGURATION',
      'TELEMETRY_ERROR', 'EXECUTION_ERROR', 'EVALUATION_ERROR', 'CANCELLED'
    ],
    default: 'COMPLETED'
  },
  input: { type: String, default: '' },
  output: { type: String },
  latencyMs: { type: Number },
  toolCalls: [{ type: Schema.Types.Mixed }],
  executionErrors: [{ type: Schema.Types.Mixed }],
  traceReference: { type: String },
  configSnapshot: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
});

AgentExecutionSchema.index({ evaluationId: 1, scenarioId: 1 });

export const AgentExecution = mongoose.model<IAgentExecution>('AgentExecution', AgentExecutionSchema);

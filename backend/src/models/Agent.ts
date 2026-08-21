import mongoose, { Schema, Document } from 'mongoose';
import type { IntegrationType, VisibilityMode, AuthenticationType, ConnectionStatus } from '../services/adapters/types';

export interface IToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sideEffectLevel: 'NONE' | 'READ_ONLY' | 'STATE_CHANGE' | 'EXTERNAL' | 'DESTRUCTIVE';
  requiresConfirmation: boolean;
  reversible: boolean;
  mockSuccessResponse?: any;
}

export interface IPolicy {
  name: string;
  description: string;
}

export interface IAgentIntegration {
  type: IntegrationType;
  endpoint?: string;
  method?: string;
  requestHeaders?: Record<string, string>;
  authenticationType?: AuthenticationType;
  credentialReference?: string;
  requestTemplate?: string;
  responseMapping?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  visibilityMode?: VisibilityMode;
  providerConfig?: {
    baseUrl?: string;
    model?: string;
    organization?: string;
  };
  webhookEnabled?: boolean;
  webhookId?: string;
  webhookSecretReference?: string;
  healthCheckConfig?: {
    endpoint?: string;
    method?: string;
    expectedStatus?: number;
  };
}

export interface IAgent extends Document {
  agentId: string;
  name: string;
  description: string;
  domain: string;
  provider: string;
  systemPrompt: string;
  tools: IToolSchema[];
  policies: IPolicy[];
  prohibitedActions: string[];
  successCriteria: string[];
  maxToolCalls: number;
  latencyThreshold: number;
  tokenThreshold: number;
  latestVersion: string;
  versions: string[];
  reliability: number;
  status: 'Healthy' | 'Degraded' | 'Offline' | 'Connected' | 'Unreachable' | 'Timeout' | 'Invalid_Response' | 'Blocked' | 'Unknown';
  lastEvaluated: Date;
  qualityGate: {
    minReliability: number;
    maxCriticalFailures: number;
    maxSafetyRegression: number;
    minSafetyScore: number;
  };
  deleted: boolean;
  // Integration fields
  integration?: IAgentIntegration;
  connectionStatus?: ConnectionStatus;
  lastHealthCheck?: Date;
  activeBatchId?: string;
  scenarioGenerationStatus?: 'NOT_GENERATED' | 'GENERATING' | 'READY' | 'FAILED';
  scenarioCount?: number;
}

const ToolSchemaDefinition = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  inputSchema: { type: Schema.Types.Mixed, default: {} },
  outputSchema: { type: Schema.Types.Mixed, default: {} },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  sideEffectLevel: { type: String, enum: ['NONE', 'READ_ONLY', 'STATE_CHANGE', 'EXTERNAL', 'DESTRUCTIVE'], default: 'NONE' },
  requiresConfirmation: { type: Boolean, default: false },
  reversible: { type: Boolean, default: true },
  mockSuccessResponse: { type: Schema.Types.Mixed }
}, { _id: false });

const IntegrationSchema = new Schema({
  type: { type: String, enum: ['INTERNAL', 'HTTP', 'OPENAI_COMPATIBLE', 'WEBHOOK', 'SDK'], default: 'INTERNAL' },
  endpoint: { type: String },
  method: { type: String, default: 'POST' },
  requestHeaders: { type: Schema.Types.Mixed, default: {} },
  authenticationType: { type: String, enum: ['NONE', 'API_KEY', 'BEARER', 'CUSTOM_HEADER'], default: 'NONE' },
  credentialReference: { type: String },
  requestTemplate: { type: String },
  responseMapping: { type: String },
  timeoutMs: { type: Number, default: 30000 },
  maxResponseBytes: { type: Number, default: 5242880 },
  visibilityMode: { type: String, enum: ['BLACK_BOX', 'INSTRUMENTED'], default: 'BLACK_BOX' },
  providerConfig: {
    baseUrl: { type: String },
    model: { type: String },
    organization: { type: String },
  },
  webhookEnabled: { type: Boolean, default: false },
  webhookId: { type: String },
  webhookSecretReference: { type: String },
  healthCheckConfig: {
    endpoint: { type: String },
    method: { type: String, default: 'GET' },
    expectedStatus: { type: Number, default: 200 },
  },
}, { _id: false });

const AgentSchema: Schema = new Schema({
  agentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  domain: { type: String, default: 'General' },
  provider: { type: String, default: '' },
  systemPrompt: { type: String, default: '' },
  tools: [ToolSchemaDefinition],
  policies: [{
    name: { type: String },
    description: { type: String }
  }],
  prohibitedActions: [{ type: String }],
  successCriteria: [{ type: String }],
  maxToolCalls: { type: Number, default: 20 },
  latencyThreshold: { type: Number, default: 30 },
  tokenThreshold: { type: Number, default: 10000 },
  latestVersion: { type: String, default: 'v1.0' },
  versions: [{ type: String }],
  reliability: { type: Number, default: 0 },
  status: { type: String, enum: ['Healthy', 'Degraded', 'Offline'], default: 'Healthy' },
  lastEvaluated: { type: Date, default: Date.now },
  qualityGate: {
    minReliability: { type: Number, default: 85 },
    maxCriticalFailures: { type: Number, default: 0 },
    maxSafetyRegression: { type: Number, default: 2 },
    minSafetyScore: { type: Number, default: 90 }
  },
  webhookUrl: { type: String, required: false },
  deleted: { type: Boolean, default: false },
  // Integration fields
  integration: { type: IntegrationSchema },
  connectionStatus: {
    type: String,
    enum: ['CONNECTED', 'DEGRADED', 'AUTH_FAILED', 'UNREACHABLE', 'TELEMETRY_DISCONNECTED', 'INVALID_CONFIG', 'DISABLED'],
  },
  lastHealthCheck: { type: Date },
  activeBatchId: { type: String },
  scenarioGenerationStatus: {
    type: String,
    enum: ['NOT_GENERATED', 'GENERATING', 'READY', 'FAILED'],
    default: 'NOT_GENERATED'
  },
  scenarioCount: { type: Number, default: 0 },
});

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);


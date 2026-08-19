import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
  webhookId: string;
  eventId: string;             // unique per webhook for deduplication
  executionId: string;
  evaluationId?: string;
  scenarioId?: string;
  agentId: string;
  agentVersion?: string;
  eventType: string;           // TOOL_CALL, POLICY_CHECK, RUN_STARTED, etc.
  timestamp: Date;
  data: Record<string, any>;
  verificationStatus: 'VERIFIED' | 'FAILED' | 'SKIPPED';
  processed: boolean;
}

const WebhookEventSchema: Schema = new Schema({
  webhookId: { type: String, required: true },
  eventId: { type: String, required: true },
  executionId: { type: String, required: true, index: true },
  evaluationId: { type: String },
  scenarioId: { type: String },
  agentId: { type: String, required: true },
  agentVersion: { type: String },
  eventType: { type: String, required: true },
  timestamp: { type: Date, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  verificationStatus: { type: String, enum: ['VERIFIED', 'FAILED', 'SKIPPED'], default: 'VERIFIED' },
  processed: { type: Boolean, default: false },
});

// Compound unique index for replay protection
WebhookEventSchema.index({ webhookId: 1, eventId: 1 }, { unique: true });
WebhookEventSchema.index({ executionId: 1, eventType: 1 });

export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

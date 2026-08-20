import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhook extends Document {
  webhookId: string;
  agentId: string;
  secretHash: string;        // encrypted, never returned via API
  status: 'ACTIVE' | 'DISABLED';
  eventsReceived: number;
  eventsDropped: number;
  failedVerifications: number;
  lastEventAt?: Date;
  createdAt: Date;
}

const WebhookSchema: Schema = new Schema({
  webhookId: { type: String, required: true, unique: true },
  agentId: { type: String, required: true, index: true },
  secretHash: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE' },
  eventsReceived: { type: Number, default: 0 },
  eventsDropped: { type: Number, default: 0 },
  failedVerifications: { type: Number, default: 0 },
  lastEventAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const Webhook = mongoose.model<IWebhook>('Webhook', WebhookSchema);

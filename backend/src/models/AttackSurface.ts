import mongoose, { Schema, Document } from 'mongoose';

export interface IAttackSurface extends Document {
  agentId: string;
  toolName: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sideEffectLevel: 'NONE' | 'READ_ONLY' | 'STATE_CHANGE' | 'EXTERNAL' | 'DESTRUCTIVE';
  requiresConfirmation: boolean;
  applicablePolicies: string[];
  testCategories: string[];
  source: 'SCHEMA' | 'DISCOVERED' | 'CONFIGURED';
  discoveredAt: Date;
}

const AttackSurfaceSchema = new Schema({
  agentId: { type: String, required: true, index: true },
  toolName: { type: String, required: true },
  description: { type: String, default: '' },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  sideEffectLevel: { type: String, enum: ['NONE', 'READ_ONLY', 'STATE_CHANGE', 'EXTERNAL', 'DESTRUCTIVE'], default: 'NONE' },
  requiresConfirmation: { type: Boolean, default: false },
  applicablePolicies: [{ type: String }],
  testCategories: [{ type: String }],
  source: { type: String, enum: ['SCHEMA', 'DISCOVERED', 'CONFIGURED'], default: 'SCHEMA' },
  discoveredAt: { type: Date, default: Date.now }
}, { timestamps: true });

AttackSurfaceSchema.index({ agentId: 1, toolName: 1 }, { unique: true });

export const AttackSurface = mongoose.models.AttackSurface || mongoose.model<IAttackSurface>('AttackSurface', AttackSurfaceSchema);

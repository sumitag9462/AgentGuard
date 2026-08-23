import mongoose, { Schema, Document } from 'mongoose';

export interface IScenario extends Document {
  organizationId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  scenarioId: string;
  sourceTestId?: string;
  agentId: string;
  title: string;
  category: string;
  difficulty: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scenario: string;       // userInput
  context: string;
  agentGoal: string;
  expectedBehavior: string;
  allowedActions: string[];
  forbiddenActions: string[];
  expectedToolCalls: string[];
  forbiddenToolCalls: string[];
  expectedFinalOutcome: string;
  rule: string;           // evaluationRule
  attackObjective: string;
  riskLevel: string;
  isAdaptive: boolean;
  round: number;
  suiteId: string;
  batchId: string;
  createdAt: Date;
}

const ScenarioSchema: Schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  scenarioId: { type: String, required: true, unique: true },
  sourceTestId: { type: String },
  agentId: { type: String, default: '' },
  title: { type: String, default: '' },
  category: { type: String, required: true },
  difficulty: { type: String, default: 'MEDIUM' },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  scenario: { type: String, required: true },
  context: { type: String, default: '' },
  agentGoal: { type: String, default: '' },
  expectedBehavior: { type: String, required: true },
  allowedActions: [{ type: String }],
  forbiddenActions: [{ type: String }],
  expectedToolCalls: [{ type: String }],
  forbiddenToolCalls: [{ type: String }],
  expectedFinalOutcome: { type: String, default: '' },
  rule: { type: String, required: true },
  attackObjective: { type: String, default: '' },
  riskLevel: { type: String, default: 'LOW' },
  isAdaptive: { type: Boolean, default: false },
  round: { type: Number, default: 1 },
  suiteId: { type: String, default: '' },
  batchId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

ScenarioSchema.index({ agentId: 1, createdAt: -1 });
ScenarioSchema.index({ category: 1, severity: 1 });
ScenarioSchema.index({ agentId: 1, batchId: 1 });

export const Scenario = mongoose.model<IScenario>('Scenario', ScenarioSchema);

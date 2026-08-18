import mongoose, { Schema, Document } from 'mongoose';

export interface IScenario extends Document {
  scenarioId: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scenario: string;
  expectedBehavior: string;
  rule: string;
}

const ScenarioSchema: Schema = new Schema({
  scenarioId: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  scenario: { type: String, required: true },
  expectedBehavior: { type: String, required: true },
  rule: { type: String, required: true }
});

export const Scenario = mongoose.model<IScenario>('Scenario', ScenarioSchema);

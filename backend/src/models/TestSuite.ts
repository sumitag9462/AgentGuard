import mongoose, { Schema, Document } from 'mongoose';

export interface ITestSuite extends Document {
  suiteId: string;
  name: string;
  description: string;
  agentId: string;
  scenarioIds: string[];
  type: 'SMOKE' | 'SAFETY' | 'SECURITY' | 'REGRESSION' | 'CRITICAL' | 'FULL' | 'CUSTOM';
  createdAt: Date;
}

const TestSuiteSchema: Schema = new Schema({
  suiteId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  agentId: { type: String, required: true },
  scenarioIds: [{ type: String }],
  type: { 
    type: String, 
    enum: ['SMOKE', 'SAFETY', 'SECURITY', 'REGRESSION', 'CRITICAL', 'FULL', 'CUSTOM'], 
    default: 'CUSTOM' 
  },
  createdAt: { type: Date, default: Date.now }
});

export const TestSuite = mongoose.model<ITestSuite>('TestSuite', TestSuiteSchema);

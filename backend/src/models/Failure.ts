import mongoose, { Schema, Document } from 'mongoose';

export interface IFailure extends Document {
  testId: string;
  evaluationId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  failureType: string;
  userInput: string;
  expectedBehavior: string;
  actualBehavior: string;
  recommendation: string;
  timestamp: Date;
}

const FailureSchema: Schema = new Schema({
  testId: { type: String, required: true },
  evaluationId: { type: String, required: true },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  failureType: { type: String, required: true },
  userInput: { type: String, required: true },
  expectedBehavior: { type: String, required: true },
  actualBehavior: { type: String, required: true },
  recommendation: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export const Failure = mongoose.model<IFailure>('Failure', FailureSchema);

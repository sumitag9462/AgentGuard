import mongoose, { Schema, Document } from 'mongoose';

export interface ITraceEvent {
  eventId: string;
  type: 'USER_INPUT' | 'LLM_THINKING' | 'TOOL_CALL' | 'TOOL_RESULT' | 'FINAL_RESPONSE' | 'SAFETY_GATE';
  label: string;
  timestamp: string;
  status?: 'success' | 'danger' | 'info';
  metadata?: any;
}

export interface ITrace extends Document {
  traceId: string;
  testId: string;
  evaluationId: string;
  events: ITraceEvent[];
}

const TraceEventSchema = new Schema({
  eventId: { type: String, required: true },
  type: { type: String, required: true },
  label: { type: String, required: true },
  timestamp: { type: String, required: true },
  status: { type: String },
  metadata: { type: Schema.Types.Mixed }
});

const TraceSchema: Schema = new Schema({
  traceId: { type: String, required: true, unique: true },
  testId: { type: String, required: true },
  evaluationId: { type: String, required: true },
  events: [TraceEventSchema]
});

TraceSchema.index({ evaluationId: 1 });
TraceSchema.index({ testId: 1 });

export const Trace = mongoose.model<ITrace>('Trace', TraceSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IEvaluation extends Document {
  runId: string;
  agentId: string;
  version: string;
  totalTests: number;
  passed: number;
  failed: number;
  reliability: number;
  criticalFailures: number;
  durationSeconds: number;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING' | 'CANCELLED' | 'PARTIAL';
  timestamp: Date;
  agentConfigSnapshot: Record<string, any>;
  evaluationConfig: {
    model: string;
    count: number;
    mode: string;
  };
  completedScenarios: number;
  totalScenarios: number;
  errorMessage: string;
  performanceMetrics: {
    llmCalls: number;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedCost: number;
    avgLatencyMs: number;
  };
  source: string;

  // Scorecard
  scorecard: {
    overall: number;
    task_success: number;
    safety: number;
    goal_adherence: number;
    tool_accuracy: number;
    recovery: number;
    robustness: number;
    efficiency: number;
    weights: Record<string, number>;
  };
  // Coverage
  coverage: {
    tools_total: number;
    tools_tested: number;
    tool_coverage: number;
    policies_total: number;
    policies_tested: number;
    policy_coverage: number;
    failure_categories_total: number;
    failure_categories_tested: number;
    failure_mode_coverage: number;
    scenario_categories_total: number;
    scenario_categories_tested: number;
    scenario_coverage: number;
    critical_actions_total: number;
    critical_actions_tested: number;
    critical_action_coverage: number;
  };
  // Confidence
  confidence: {
    level: string;
    score: number;
    reasons: string[];
    scenario_count: number;
    tool_coverage_pct: number;
    critical_policy_coverage_pct: number;
  };
  // Quality gate
  qualityGate: {
    passed: boolean;
    violations: Array<{
      rule: string;
      threshold: number;
      actual: number;
      message: string;
    }>;
  };
  // Failure analysis
  failureAnalysis: {
    patterns: Array<{
      failure_type: string;
      count: number;
      severity_score: number;
      critical_count: number;
      recommendation: string;
    }>;
    weakness_categories: Array<{
      category: string;
      failure_rate: number;
      failed: number;
      total: number;
    }>;
    total_failures: number;
    failure_rate: number;
    summary: string;
  };
  // Recommendations
  recommendations: Array<{
    priority: number;
    issue: string;
    count: number;
    severity: string;
    recommendation: string;
    type: string;
    additionalTests: number;
  }>;
  // Report
  report: Record<string, any>;
  // Scenarios used
  scenarioIds: string[];
  isAdaptive: boolean;
}

const EvaluationSchema: Schema = new Schema({
  runId: { type: String, required: true, unique: true },
  agentId: { type: String, required: true },
  version: { type: String, required: true },
  totalTests: { type: Number, default: 0 },
  passed: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  reliability: { type: Number, default: 0 },
  criticalFailures: { type: Number, default: 0 },
  durationSeconds: { type: Number, default: 0 },
  status: { type: String, enum: ['COMPLETED', 'RUNNING', 'FAILED', 'PENDING', 'CANCELLED', 'PARTIAL'], default: 'PENDING' },
  timestamp: { type: Date, default: Date.now },
  agentConfigSnapshot: { type: Schema.Types.Mixed, default: {} },
  evaluationConfig: { type: Schema.Types.Mixed, default: {} },
  completedScenarios: { type: Number, default: 0 },
  totalScenarios: { type: Number, default: 0 },
  errorMessage: { type: String, default: '' },
  performanceMetrics: { type: Schema.Types.Mixed, default: {} },
  source: { type: String, default: 'pipeline' },
  scorecard: { type: Schema.Types.Mixed, default: {} },
  coverage: { type: Schema.Types.Mixed, default: {} },
  confidence: { type: Schema.Types.Mixed, default: {} },
  qualityGate: { type: Schema.Types.Mixed, default: {} },
  failureAnalysis: { type: Schema.Types.Mixed, default: {} },
  recommendations: [{ type: Schema.Types.Mixed }],
  report: { type: Schema.Types.Mixed, default: {} },
  scenarioIds: [{ type: String }],
  isAdaptive: { type: Boolean, default: false }
});

EvaluationSchema.index({ agentId: 1, timestamp: -1 });
EvaluationSchema.index({ status: 1 });
EvaluationSchema.index({ version: 1 });

export const Evaluation = mongoose.model<IEvaluation>('Evaluation', EvaluationSchema);

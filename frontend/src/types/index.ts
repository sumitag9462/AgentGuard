export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TestStatus = 'PASSED' | 'FAILED' | 'SKIPPED';
export type RunStatus = 'COMPLETED' | 'RUNNING' | 'FAILED';

export interface Agent {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  provider: string;
  tools: Tool[];
  policies: Policy[];
  latestVersion: string;
  reliability: number;
  status: 'Healthy' | 'Degraded' | 'Offline';
  lastEvaluated: string;
}

export interface AgentVersion {
  _id?: string;
  id?: string;
  agentId: string;
  version: string;
  createdAt: string;
  reliability: number;
  safetyScore: number;
  correctnessScore: number;
  robustnessScore: number;
  toolReliabilityScore: number;
}

export interface Tool {
  name: string;
  description: string;
  isSensitive: boolean;
}

export interface Policy {
  _id?: string;
  id?: string;
  name: string;
  description: string;
}

export interface Scenario {
  _id?: string;
  id?: string;
  scenarioId?: string;
  testId?: string;
  category: string;
  severity: Severity;
  scenario: string;
  expectedBehavior: string;
  rule: string;
  evaluationRule?: string;
}

export interface Evaluation {
  _id?: string;
  id?: string;
  runId: string;
  agentId: string;
  version: string;
  totalTests: number;
  passed: number;
  failed: number;
  reliability: number;
  criticalFailures: number;
  durationSeconds: number;
  status: RunStatus;
  timestamp: string;
}

export interface Failure {
  _id?: string;
  id?: string;
  testId: string;
  evaluationId: string;
  severity: Severity;
  failureType: string;
  userInput: string;
  expectedBehavior: string;
  actualBehavior: string;
  recommendation: string;
  timestamp: string;
}

export interface TraceEvent {
  eventId?: string;
  id?: string;
  type: 'USER_INPUT' | 'LLM_THINKING' | 'TOOL_CALL' | 'TOOL_RESULT' | 'FINAL_RESPONSE' | 'SAFETY_GATE';
  label: string;
  timestamp: string;
  status?: 'success' | 'danger' | 'info';
  metadata?: Record<string, unknown>;
}

export interface Trace {
  _id?: string;
  id?: string;
  testId: string;
  evaluationId: string;
  events: TraceEvent[];
}

export interface ReliabilityMetrics {
  timestamp: string;
  reliability: number;
  version: string;
}

export interface RegressionReport {
  previousVersion: string;
  currentVersion: string;
  reliabilityDelta: number;
  safetyDelta: number;
  correctnessDelta: number;
  newRegressions: number;
}

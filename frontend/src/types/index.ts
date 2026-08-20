export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TestStatus = 'PASSED' | 'FAILED' | 'SKIPPED';
export type RunStatus = 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING';

export type IntegrationType = 'INTERNAL' | 'HTTP' | 'OPENAI_COMPATIBLE' | 'WEBHOOK' | 'SDK';
export type VisibilityMode = 'BLACK_BOX' | 'INSTRUMENTED';
export type AuthenticationType = 'NONE' | 'API_KEY' | 'BEARER' | 'CUSTOM_HEADER';
export type ConnectionStatus = 'CONNECTED' | 'DEGRADED' | 'AUTH_FAILED' | 'UNREACHABLE' | 'TELEMETRY_DISCONNECTED' | 'INVALID_CONFIG' | 'DISABLED';

export interface AgentIntegration {
  type: IntegrationType;
  endpoint?: string;
  method?: string;
  authenticationType?: AuthenticationType;
  credential?: string;
  requestTemplate?: string;
  responseMapping?: string;
  timeoutMs?: number;
  visibilityMode?: VisibilityMode;
  webhookEnabled?: boolean;
  webhookId?: string;
  healthCheckConfig?: {
    endpoint?: string;
    method?: string;
    expectedStatus?: number;
  };
}

export interface HealthCheckResult {
  healthy: boolean;
  endpointReachable: boolean;
  authenticationValid: boolean;
  responseReceived: boolean;
  responseFormatValid: boolean;
  latencyMs: number;
  integrationMode: IntegrationType;
  telemetryStatus?: string;
  errors: string[];
}

export interface AttackSurface {
  toolsDetected: number;
  criticalRiskTools: number;
  highRiskTools: number;
  mediumRiskTools: number;
  lowRiskTools: number;
  policiesCount: number;
  prohibitedActionsCount: number;
  recommendedAttacks: string[];
  recommendedScenarioCount: number;
  destructiveTools: string[];
  confirmationRequiredTools: string[];
  toolRiskAnalysis: Array<{
    name: string;
    riskLevel: string;
    sideEffect: string;
    reversible: boolean;
    requiresConfirmation: boolean;
  }>;
}

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sideEffectLevel: 'NONE' | 'REVERSIBLE' | 'DESTRUCTIVE';
  requiresConfirmation: boolean;
  reversible: boolean;
  isSensitive?: boolean;
  mockSuccessResponse?: any;
}

export interface Policy {
  _id?: string;
  id?: string;
  name: string;
  description: string;
}

export interface Agent {
  _id?: string;
  id?: string;
  agentId: string;
  name: string;
  description: string;
  domain: string;
  provider: string;
  webhookUrl?: string;
  systemPrompt: string;
  tools: ToolSchema[];
  policies: Policy[];
  prohibitedActions: string[];
  successCriteria: string[];
  maxToolCalls: number;
  latencyThreshold: number;
  tokenThreshold: number;
  latestVersion: string;
  versions: string[];
  reliability: number;
  status: 'Healthy' | 'Degraded' | 'Offline';
  lastEvaluated: string;
  qualityGate: QualityGateConfig;
  integration?: AgentIntegration;
  connectionStatus?: ConnectionStatus;
  lastHealthCheck?: string;
}

export interface QualityGateConfig {
  minReliability: number;
  maxCriticalFailures: number;
  maxSafetyRegression: number;
  minSafetyScore: number;
}

export interface Scorecard {
  overall: number;
  task_success: number;
  safety: number;
  goal_adherence: number;
  tool_accuracy: number;
  recovery: number;
  robustness: number;
  efficiency: number;
  weights: Record<string, number>;
}

export interface CoverageMetrics {
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
}

export interface Confidence {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
  reasons: string[];
  scenario_count: number;
  tool_coverage_pct: number;
  critical_policy_coverage_pct: number;
}

export interface QualityGateResult {
  passed: boolean;
  violations: Array<{
    rule: string;
    threshold: number;
    actual: number;
    message: string;
  }>;
}

export interface FailurePattern {
  failure_type: string;
  count: number;
  severity_score: number;
  critical_count: number;
  high_count: number;
  categories: string[];
  recommendation: string;
}

export interface FailureAnalysis {
  patterns: FailurePattern[];
  weakness_categories: Array<{
    category: string;
    failure_rate: number;
    failed: number;
    total: number;
  }>;
  total_failures: number;
  failure_rate: number;
  summary: string;
}

export interface Recommendation {
  priority: number;
  issue: string;
  count: number;
  severity: string;
  recommendation: string;
  type: string;
  additionalTests: number;
}

export interface Scenario {
  _id?: string;
  id?: string;
  scenarioId?: string;
  testId?: string;
  agentId?: string;
  title?: string;
  category: string;
  difficulty?: string;
  severity: Severity;
  scenario: string;
  context?: string;
  agentGoal?: string;
  expectedBehavior: string;
  allowedActions?: string[];
  forbiddenActions?: string[];
  expectedToolCalls?: string[];
  forbiddenToolCalls?: string[];
  expectedFinalOutcome?: string;
  rule: string;
  evaluationRule?: string;
  attackObjective?: string;
  riskLevel?: string;
  isAdaptive?: boolean;
  round?: number;
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
  scorecard?: Scorecard;
  coverage?: CoverageMetrics;
  confidence?: Confidence;
  qualityGate?: QualityGateResult;
  failureAnalysis?: FailureAnalysis;
  recommendations?: Recommendation[];
  report?: Record<string, any>;
  scenarioIds?: string[];
  isAdaptive?: boolean;
}

export interface Failure {
  _id?: string;
  id?: string;
  testId: string;
  evaluationId: string;
  agentId?: string;
  severity: Severity;
  failureType: string;
  category?: string;
  userInput: string;
  expectedBehavior: string;
  actualBehavior: string;
  reason?: string;
  recommendation: string;
  rootCause?: string;
  policyInvolved?: string;
  evidence?: Array<Record<string, any>>;
  checks?: Array<Record<string, any>>;
  riskScore?: number;
  clusterId?: string;
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

export interface ComparisonMetric {
  name: string;
  old: number;
  new: number;
}

export interface ComparisonResult {
  versionA: string;
  versionB: string;
  evalIdA: string;
  evalIdB: string;
  metrics: ComparisonMetric[];
  reliabilityDelta: number;
  safetyDelta: number;
  criticalA: number;
  criticalB: number;
  failedA: number;
  failedB: number;
  passedA: number;
  passedB: number;
  totalA: number;
  totalB: number;
  regressionDetected: boolean;
  improvements: string[];
  regressions: string[];
}

export interface TestSuite {
  _id?: string;
  suiteId: string;
  name: string;
  description: string;
  agentId: string;
  scenarioIds: string[];
  type: string;
}

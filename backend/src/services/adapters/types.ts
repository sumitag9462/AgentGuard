/**
 * AgentEval — External Agent Integration Types
 * 
 * Canonical types shared across all adapters. The evaluation engine
 * consumes NormalizedAgentExecution regardless of integration type.
 */

// ============================================================================
// Enums
// ============================================================================

export type IntegrationType = 'INTERNAL' | 'HTTP' | 'OPENAI_COMPATIBLE' | 'WEBHOOK' | 'SDK';

export type VisibilityMode = 'BLACK_BOX' | 'INSTRUMENTED';

export type ExecutionStatus =
  | 'COMPLETED'
  | 'AGENT_ERROR'
  | 'AUTH_ERROR'
  | 'CONNECTION_ERROR'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'INVALID_CONFIGURATION'
  | 'TELEMETRY_ERROR'
  | 'EXECUTION_ERROR'
  | 'EVALUATION_ERROR'
  | 'CANCELLED';

export type ConnectionStatus =
  | 'CONNECTED'
  | 'DEGRADED'
  | 'AUTH_FAILED'
  | 'UNREACHABLE'
  | 'TELEMETRY_DISCONNECTED'
  | 'INVALID_CONFIG'
  | 'DISABLED';

export type AuthenticationType = 'NONE' | 'API_KEY' | 'BEARER' | 'CUSTOM_HEADER';

// ============================================================================
// Agent Integration Configuration
// ============================================================================

export interface ProviderConfig {
  baseUrl?: string;
  model?: string;
  organization?: string;
  projectId?: string;
}

export interface HealthCheckConfig {
  endpoint?: string;
  method?: string;
  expectedStatus?: number;
}

export interface AgentIntegrationConfig {
  type: IntegrationType;
  endpoint?: string;
  method?: string;                    // GET, POST, etc.
  requestHeaders?: Record<string, string>;
  authenticationType?: AuthenticationType;
  credentialReference?: string;       // encrypted credential ID
  requestTemplate?: string;           // JSON template with {{input}} placeholders
  responseMapping?: string;           // JSONPath-like: $.choices[0].message.content
  timeoutMs?: number;
  maxResponseBytes?: number;
  visibilityMode?: VisibilityMode;
  // OpenAI-compatible specific
  providerConfig?: ProviderConfig;
  // Webhook telemetry
  webhookEnabled?: boolean;
  webhookId?: string;
  webhookSecretReference?: string;    // encrypted
  // Health check
  healthCheckConfig?: HealthCheckConfig;
}

// ============================================================================
// Execution Context
// ============================================================================

export interface AgentExecutionContext {
  executionId: string;
  evaluationId: string;
  scenarioId: string;
  agentId: string;
  agentVersion: string;
  /** Decrypted credential (only available server-side during execution) */
  credential?: string;
}

// ============================================================================
// Normalized Execution Result (Canonical Contract)
// ============================================================================

export interface NormalizedToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
  status?: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'TIMEOUT';
  durationMs?: number;
}

export interface ExecutionError {
  code: string;
  message: string;
  timestamp?: string;
  recoverable?: boolean;
}

export interface NormalizedTraceEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface NormalizedAgentExecution {
  executionId: string;
  status: ExecutionStatus;
  input: string;
  output: string;
  latencyMs: number;
  toolCalls: NormalizedToolCall[];
  errors: ExecutionError[];
  trace: NormalizedTraceEvent[];
  metadata: {
    integrationType: IntegrationType;
    visibility: VisibilityMode;
    correlationConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'CORRELATION_UNCERTAIN';
  };
}

// ============================================================================
// Health Check
// ============================================================================

export interface HealthCheckResult {
  healthy: boolean;
  endpointReachable: boolean;
  authenticationValid: boolean;
  responseReceived: boolean;
  responseFormatValid: boolean;
  latencyMs: number;
  integrationMode: IntegrationType;
  telemetryStatus?: 'CONNECTED' | 'WAITING' | 'DISCONNECTED' | 'NOT_CONFIGURED';
  errors: string[];
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Attack Surface
// ============================================================================

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
}

// ============================================================================
// Adapter Interface
// ============================================================================

export interface AgentAdapter {
  readonly adapterType: IntegrationType;

  /**
   * Validate the integration configuration before saving.
   */
  validateConfig(config: AgentIntegrationConfig): Promise<ValidationResult>;

  /**
   * Run a health check against the configured endpoint.
   */
  healthCheck(config: AgentIntegrationConfig, credential?: string): Promise<HealthCheckResult>;

  /**
   * Execute a test input against the agent and return a normalized result.
   */
  execute(
    input: string,
    context: AgentExecutionContext,
    config: AgentIntegrationConfig
  ): Promise<NormalizedAgentExecution>;
}

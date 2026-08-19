/**
 * AgentEval — Internal Agent Adapter
 * 
 * Wraps the existing Python pipeline execution (sandbox + mocked tools).
 * Ensures backward compatibility: demo/internal agents continue to work
 * through the same AgentAdapter interface.
 */

import {
  AgentAdapter,
  AgentIntegrationConfig,
  AgentExecutionContext,
  NormalizedAgentExecution,
  HealthCheckResult,
  ValidationResult,
  IntegrationType,
} from './types';

export class InternalAgentAdapter implements AgentAdapter {
  readonly adapterType: IntegrationType = 'INTERNAL';

  async validateConfig(_config: AgentIntegrationConfig): Promise<ValidationResult> {
    // Internal agents don't need external configuration
    return { valid: true, errors: [], warnings: [] };
  }

  async healthCheck(_config: AgentIntegrationConfig): Promise<HealthCheckResult> {
    // Internal agents are always "healthy" — they run in our own sandbox
    return {
      healthy: true,
      endpointReachable: true,
      authenticationValid: true,
      responseReceived: true,
      responseFormatValid: true,
      latencyMs: 0,
      integrationMode: this.adapterType,
      errors: [],
    };
  }

  async execute(
    _input: string,
    _context: AgentExecutionContext,
    _config: AgentIntegrationConfig
  ): Promise<NormalizedAgentExecution> {
    // Internal execution is handled by the existing Python pipeline
    // via runPythonPipeline() in the worker. This adapter exists
    // to satisfy the interface and enable health checks.
    // The worker uses a separate code path for INTERNAL agents.
    throw new Error(
      'InternalAgentAdapter.execute() should not be called directly. ' +
      'Internal agents are executed via the Python pipeline in the worker.'
    );
  }
}

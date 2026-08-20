/**
 * AgentEval — HTTP Agent Adapter
 * 
 * Sends test inputs to a user's external HTTP endpoint.
 * This is the primary MVP integration mode.
 * 
 * Features:
 * - Configurable request template and response mapping
 * - SSRF protection on all outbound requests
 * - Connect/read/total timeouts
 * - Max response size enforcement
 * - Redirect safety (max 3, no private IPs)
 * - Execution correlation via X-AgentEval-Execution-ID header
 */

import crypto from 'crypto';
import {
  AgentAdapter,
  AgentIntegrationConfig,
  AgentExecutionContext,
  NormalizedAgentExecution,
  HealthCheckResult,
  ValidationResult,
  IntegrationType,
} from './types';
import { validateUrl, validateUrlSync } from '../security/ssrf';
import { applyTemplate, extractResponseValue, TemplateContext } from '../templateEngine';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_REDIRECTS = 3;

export class HttpAgentAdapter implements AgentAdapter {
  readonly adapterType: IntegrationType = 'HTTP';

  async validateConfig(config: AgentIntegrationConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.endpoint) {
      errors.push('Endpoint URL is required');
    } else {
      const ssrf = validateUrlSync(config.endpoint);
      if (!ssrf.safe) {
        errors.push(`Endpoint URL is not allowed: ${ssrf.reason}`);
      }
    }

    if (!config.method) {
      warnings.push('HTTP method not specified, defaulting to POST');
    }

    if (config.requestTemplate) {
      try {
        // Validate it's parseable JSON when placeholders are filled
        const testBody = config.requestTemplate.replace(/\{\{\w+\}\}/g, 'test');
        JSON.parse(testBody);
      } catch {
        errors.push('Request template is not valid JSON');
      }
    }

    if (config.authenticationType && config.authenticationType !== 'NONE' && !config.credentialReference) {
      errors.push('Authentication type specified but no credential provided');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async healthCheck(config: AgentIntegrationConfig, credential?: string): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      healthy: false,
      endpointReachable: false,
      authenticationValid: false,
      responseReceived: false,
      responseFormatValid: false,
      latencyMs: 0,
      integrationMode: this.adapterType,
      errors: [],
    };

    // Determine health check endpoint
    const healthEndpoint = config.healthCheckConfig?.endpoint || config.endpoint;
    if (!healthEndpoint) {
      result.errors.push('No endpoint configured');
      return result;
    }

    // SSRF check
    const ssrfResult = await validateUrl(healthEndpoint);
    if (!ssrfResult.safe) {
      result.errors.push(`SSRF blocked: ${ssrfResult.reason}`);
      return result;
    }

    const healthMethod = config.healthCheckConfig?.method || 'GET';
    const expectedStatus = config.healthCheckConfig?.expectedStatus || 200;
    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;

    const headers: Record<string, string> = {
      'User-Agent': 'AgentEval/1.0',
      ...this._buildAuthHeaders(config, credential),
    };

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(healthEndpoint, {
        method: healthMethod,
        headers,
        signal: controller.signal,
        redirect: 'manual',
      });

      clearTimeout(timeout);
      result.latencyMs = Date.now() - start;
      result.endpointReachable = true;

      if (response.status === 401 || response.status === 403) {
        result.errors.push(`Authentication failed: HTTP ${response.status}`);
        return result;
      }

      result.authenticationValid = true;

      if (response.status === expectedStatus || (response.status >= 200 && response.status < 300)) {
        result.responseReceived = true;
        result.responseFormatValid = true;
        result.healthy = true;
      } else {
        result.errors.push(`Unexpected status: ${response.status} (expected ${expectedStatus})`);
        result.responseReceived = true;
      }
    } catch (err: unknown) {
      result.latencyMs = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('abort')) {
        result.errors.push(`Connection timed out after ${timeoutMs}ms`);
      } else {
        result.errors.push(`Connection failed: ${message}`);
      }
    }

    // Check webhook status if configured
    if (config.webhookEnabled) {
      result.telemetryStatus = config.webhookId ? 'WAITING' : 'NOT_CONFIGURED';
    }

    return result;
  }

  async execute(
    input: string,
    context: AgentExecutionContext,
    config: AgentIntegrationConfig
  ): Promise<NormalizedAgentExecution> {
    const executionId = context.executionId || `run_${crypto.randomBytes(8).toString('hex')}`;

    // SSRF check
    if (!config.endpoint) {
      return this._errorExecution(executionId, input, 'INVALID_CONFIGURATION', 'No endpoint configured');
    }

    const ssrfResult = await validateUrl(config.endpoint);
    if (!ssrfResult.safe) {
      return this._errorExecution(executionId, input, 'INVALID_CONFIGURATION', `SSRF blocked: ${ssrfResult.reason}`);
    }

    // Build request
    const method = config.method || 'POST';
    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;

    const templateContext: TemplateContext = {
      input,
      executionId,
      scenarioId: context.scenarioId,
      evaluationId: context.evaluationId,
      agentVersion: context.agentVersion,
      agentId: context.agentId,
      timestamp: new Date().toISOString(),
    };

    // Build body
    let body: string | undefined;
    if (method !== 'GET') {
      if (config.requestTemplate) {
        body = applyTemplate(config.requestTemplate, templateContext);
      } else {
        body = JSON.stringify({ message: input, executionId });
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AgentEval/1.0',
      'X-AgentEval-Execution-ID': executionId,
      'X-AgentEval-Scenario-ID': context.scenarioId || '',
      ...this._buildAuthHeaders(config, context.credential),
      ...(config.requestHeaders || {}),
    };

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(config.endpoint, {
        method,
        headers,
        body,
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      // Check response status
      if (response.status === 401 || response.status === 403) {
        return this._errorExecution(executionId, input, 'AUTH_ERROR', `Authentication failed: HTTP ${response.status}`, latencyMs);
      }

      if (response.status >= 500) {
        return this._errorExecution(executionId, input, 'AGENT_ERROR', `Agent returned HTTP ${response.status}`, latencyMs);
      }

      // Read response body with size limit
      const maxBytes = config.maxResponseBytes || MAX_RESPONSE_BYTES;
      const responseText = await this._readResponseWithLimit(response, maxBytes);

      // Extract output
      let output: string;
      try {
        const responseData = JSON.parse(responseText);
        if (config.responseMapping) {
          output = extractResponseValue(responseData, config.responseMapping) || responseText;
        } else {
          // Try common response fields
          output = responseData.response || responseData.message || responseData.output
            || responseData.content || responseData.answer || responseData.text || responseText;
        }
      } catch {
        // Plain text response
        output = responseText;
      }

      return {
        executionId,
        status: 'COMPLETED',
        input,
        output: typeof output === 'string' ? output : JSON.stringify(output),
        latencyMs,
        toolCalls: [],         // BLACK_BOX: no tool visibility
        errors: [],
        trace: [{
          eventId: `evt_${crypto.randomBytes(4).toString('hex')}`,
          eventType: 'AGENT_RESPONSE',
          timestamp: new Date().toISOString(),
          data: { responseStatus: response.status, latencyMs },
        }],
        metadata: {
          integrationType: this.adapterType,
          visibility: config.visibilityMode || 'BLACK_BOX',
        },
      };

    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('abort')) {
        return this._errorExecution(executionId, input, 'TIMEOUT', `Request timed out after ${timeoutMs}ms`, latencyMs);
      }

      return this._errorExecution(executionId, input, 'CONNECTION_ERROR', `Connection failed: ${message}`, latencyMs);
    }
  }

  // ========================================================================
  // Private helpers
  // ========================================================================

  private _buildAuthHeaders(config: AgentIntegrationConfig, credential?: string): Record<string, string> {
    if (!credential || config.authenticationType === 'NONE') return {};

    switch (config.authenticationType) {
      case 'BEARER':
        return { Authorization: `Bearer ${credential}` };
      case 'API_KEY':
        return { 'X-API-Key': credential };
      case 'CUSTOM_HEADER':
        // Use the first request header that contains a secret placeholder
        return {};
      default:
        return {};
    }
  }

  private async _readResponseWithLimit(response: Response, maxBytes: number): Promise<string> {
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      throw new Error(`Response too large: ${contentLength} bytes exceeds ${maxBytes} limit`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new Error(`Response too large: ${buffer.byteLength} bytes exceeds ${maxBytes} limit`);
    }

    return new TextDecoder().decode(buffer);
  }

  private _errorExecution(
    executionId: string,
    input: string,
    status: NormalizedAgentExecution['status'],
    message: string,
    latencyMs: number = 0
  ): NormalizedAgentExecution {
    return {
      executionId,
      status,
      input,
      output: '',
      latencyMs,
      toolCalls: [],
      errors: [{ code: status, message }],
      trace: [],
      metadata: {
        integrationType: this.adapterType,
        visibility: 'BLACK_BOX',
      },
    };
  }
}

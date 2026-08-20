/**
 * AgentEval — OpenAI-Compatible Agent Adapter
 * 
 * Extends HttpAgentAdapter with OpenAI-specific request/response formatting.
 * Works with any endpoint exposing /chat/completions (OpenAI, Gemini, etc.)
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
import { validateUrl } from '../security/ssrf';

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export class OpenAICompatibleAdapter implements AgentAdapter {
  readonly adapterType: IntegrationType = 'OPENAI_COMPATIBLE';

  async validateConfig(config: AgentIntegrationConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const baseUrl = config.providerConfig?.baseUrl || config.endpoint;
    if (!baseUrl) {
      errors.push('Base URL is required for OpenAI-compatible integration');
    }

    if (!config.providerConfig?.model) {
      warnings.push('Model not specified, the provider may use a default');
    }

    if (!config.credentialReference) {
      errors.push('API key credential is required');
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

    const baseUrl = config.providerConfig?.baseUrl || config.endpoint;
    if (!baseUrl) {
      result.errors.push('No base URL configured');
      return result;
    }

    // Build the models endpoint for health check
    const modelsUrl = `${baseUrl.replace(/\/+$/, '')}/models`;

    const ssrfResult = await validateUrl(modelsUrl);
    if (!ssrfResult.safe) {
      result.errors.push(`SSRF blocked: ${ssrfResult.reason}`);
      return result;
    }

    const headers: Record<string, string> = {
      'User-Agent': 'AgentEval/1.0',
    };
    if (credential) {
      headers['Authorization'] = `Bearer ${credential}`;
    }
    if (config.providerConfig?.organization) {
      headers['OpenAI-Organization'] = config.providerConfig.organization;
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      result.latencyMs = Date.now() - start;
      result.endpointReachable = true;

      if (response.status === 401 || response.status === 403) {
        result.errors.push(`Authentication failed: HTTP ${response.status}`);
        return result;
      }

      result.authenticationValid = true;
      result.responseReceived = true;

      if (response.ok) {
        result.responseFormatValid = true;
        result.healthy = true;
      } else {
        result.errors.push(`Unexpected status: ${response.status}`);
      }
    } catch (err: unknown) {
      result.latencyMs = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`Connection failed: ${message}`);
    }

    return result;
  }

  async execute(
    input: string,
    context: AgentExecutionContext,
    config: AgentIntegrationConfig
  ): Promise<NormalizedAgentExecution> {
    const executionId = context.executionId || `run_${crypto.randomBytes(8).toString('hex')}`;
    const baseUrl = config.providerConfig?.baseUrl || config.endpoint;

    if (!baseUrl) {
      return this._errorExecution(executionId, input, 'INVALID_CONFIGURATION', 'No base URL configured');
    }

    const completionsUrl = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const ssrfResult = await validateUrl(completionsUrl);
    if (!ssrfResult.safe) {
      return this._errorExecution(executionId, input, 'INVALID_CONFIGURATION', `SSRF blocked: ${ssrfResult.reason}`);
    }

    const model = config.providerConfig?.model || 'gpt-4';
    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AgentEval/1.0',
      'X-AgentEval-Execution-ID': executionId,
    };

    if (context.credential) {
      headers['Authorization'] = `Bearer ${context.credential}`;
    }
    if (config.providerConfig?.organization) {
      headers['OpenAI-Organization'] = config.providerConfig.organization;
    }

    const body = JSON.stringify({
      model,
      messages: [{ role: 'user', content: input }],
      max_tokens: 4096,
    });

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(completionsUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (response.status === 401 || response.status === 403) {
        return this._errorExecution(executionId, input, 'AUTH_ERROR', `Authentication failed: HTTP ${response.status}`, latencyMs);
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return this._errorExecution(executionId, input, 'AGENT_ERROR', `API error: HTTP ${response.status} - ${errText.substring(0, 200)}`, latencyMs);
      }

      const responseData = await response.json();

      // Extract output from OpenAI-compatible response
      const output = responseData?.choices?.[0]?.message?.content
        || responseData?.choices?.[0]?.text
        || JSON.stringify(responseData);

      // Extract tool calls if present (function calling)
      const toolCalls = (responseData?.choices?.[0]?.message?.tool_calls || []).map((tc: any) => ({
        name: tc.function?.name || 'unknown',
        arguments: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
        status: 'SUCCESS' as const,
      }));

      const visibility = toolCalls.length > 0 ? 'INSTRUMENTED' : 'BLACK_BOX';

      return {
        executionId,
        status: 'COMPLETED',
        input,
        output,
        latencyMs,
        toolCalls,
        errors: [],
        trace: [{
          eventId: `evt_${crypto.randomBytes(4).toString('hex')}`,
          eventType: 'AGENT_RESPONSE',
          timestamp: new Date().toISOString(),
          data: {
            model: responseData?.model,
            usage: responseData?.usage,
            finishReason: responseData?.choices?.[0]?.finish_reason,
          },
        }],
        metadata: {
          integrationType: this.adapterType,
          visibility,
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

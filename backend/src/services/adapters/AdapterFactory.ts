/**
 * AgentEval — Adapter Factory
 * 
 * Returns the correct AgentAdapter based on integration type.
 */

import { AgentAdapter, AgentIntegrationConfig, IntegrationType } from './types';
import { InternalAgentAdapter } from './InternalAgentAdapter';
import { HttpAgentAdapter } from './HttpAgentAdapter';
import { OpenAICompatibleAdapter } from './OpenAICompatibleAdapter';

const adapters: Record<IntegrationType, () => AgentAdapter> = {
  INTERNAL: () => new InternalAgentAdapter(),
  HTTP: () => new HttpAgentAdapter(),
  OPENAI_COMPATIBLE: () => new OpenAICompatibleAdapter(),
  WEBHOOK: () => new HttpAgentAdapter(), // Webhook uses HTTP + telemetry overlay
  SDK: () => new HttpAgentAdapter(),     // SDK placeholder — uses HTTP for now
};

/**
 * Create the appropriate adapter for the given integration configuration.
 */
export function createAdapter(config?: AgentIntegrationConfig): AgentAdapter {
  const type = config?.type || 'INTERNAL';
  const factory = adapters[type];
  if (!factory) {
    throw new Error(`Unknown integration type: ${type}`);
  }
  return factory();
}

/**
 * Get adapter by explicit type.
 */
export function getAdapterForType(type: IntegrationType): AgentAdapter {
  const factory = adapters[type];
  if (!factory) {
    throw new Error(`Unknown integration type: ${type}`);
  }
  return factory();
}

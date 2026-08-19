/**
 * AgentEval — Trace Normalizer
 * 
 * Merges data from different integration sources (HTTP response, webhook
 * events, SDK telemetry) into a single NormalizedAgentExecution.
 * 
 * This is the critical abstraction that keeps the evaluator clean:
 * the evaluator never has integration-specific logic.
 */

import type {
  NormalizedAgentExecution,
  NormalizedToolCall,
  NormalizedTraceEvent,
  VisibilityMode,
} from './adapters/types';
import type { IWebhookEvent } from '../models/WebhookEvent';

/**
 * Merge webhook telemetry events into an existing execution result.
 * 
 * The HTTP adapter produces a BLACK_BOX execution. If webhook events
 * arrive for the same executionId, this function upgrades the visibility
 * and adds tool call / policy check details.
 */
export function mergeWebhookTelemetry(
  execution: NormalizedAgentExecution,
  webhookEvents: IWebhookEvent[]
): NormalizedAgentExecution {
  if (!webhookEvents || webhookEvents.length === 0) {
    return execution;
  }

  // Sort events by timestamp
  const sortedEvents = [...webhookEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Extract tool calls from TOOL_CALL + TOOL_RESULT events
  const toolCalls: NormalizedToolCall[] = [];
  const traceEvents: NormalizedTraceEvent[] = [];
  let visibility: VisibilityMode = 'BLACK_BOX';

  for (const event of sortedEvents) {
    // Build trace event
    traceEvents.push({
      eventId: event.eventId,
      eventType: event.eventType,
      timestamp: event.timestamp.toISOString(),
      data: event.data,
    });

    switch (event.eventType) {
      case 'TOOL_CALL': {
        const tc: NormalizedToolCall = {
          name: event.data?.tool || event.data?.name || 'unknown',
          arguments: event.data?.arguments || {},
          status: event.data?.status || 'SUCCESS',
          durationMs: event.data?.durationMs,
        };
        toolCalls.push(tc);
        visibility = 'INSTRUMENTED';
        break;
      }

      case 'TOOL_RESULT': {
        // Merge result into matching tool call
        const matchingTc = toolCalls.find(
          tc => tc.name === (event.data?.tool || event.data?.name) && !tc.result
        );
        if (matchingTc) {
          matchingTc.result = event.data?.result || {};
          matchingTc.status = event.data?.status || matchingTc.status;
        }
        visibility = 'INSTRUMENTED';
        break;
      }

      case 'POLICY_CHECK':
      case 'STATE_CHANGE':
      case 'GUARDRAIL_TRIGGERED':
        visibility = 'INSTRUMENTED';
        break;

      case 'RUN_COMPLETED':
        // May contain the final output if not already captured via HTTP
        if (event.data?.output && !execution.output) {
          execution.output = String(event.data.output);
        }
        break;

      case 'ERROR':
      case 'RUN_FAILED':
        execution.errors.push({
          code: event.data?.code || 'AGENT_ERROR',
          message: event.data?.message || 'Agent reported an error via telemetry',
          timestamp: event.timestamp.toISOString(),
        });
        break;
    }
  }

  // Merge into execution
  return {
    ...execution,
    toolCalls: toolCalls.length > 0 ? toolCalls : execution.toolCalls,
    trace: [...execution.trace, ...traceEvents],
    metadata: {
      ...execution.metadata,
      visibility,
      correlationConfidence: 'HIGH', // events matched by executionId
    },
  };
}

/**
 * Determine visibility from collected data.
 * Used when deciding whether to label an evaluation as BLACK_BOX vs INSTRUMENTED.
 */
export function determineVisibility(
  hasWebhookEvents: boolean,
  hasToolCalls: boolean,
  hasPolicyChecks: boolean
): VisibilityMode {
  if (hasWebhookEvents || hasToolCalls || hasPolicyChecks) {
    return 'INSTRUMENTED';
  }
  return 'BLACK_BOX';
}

/**
 * Convert a NormalizedAgentExecution into the trace format expected by
 * the existing Python evaluator (evaluate_hybrid).
 * 
 * This bridges the gap between the new canonical contract and the
 * existing evaluator's trace step format.
 */
export function toEvaluatorTraceSteps(execution: NormalizedAgentExecution): object[] {
  const steps: object[] = [];

  // User input
  steps.push({
    step: 1,
    step_type: 'USER_INPUT',
    timestamp: Date.now() / 1000,
    content: execution.input,
  });

  // Tool calls (from webhook telemetry or OpenAI function calling)
  for (let i = 0; i < execution.toolCalls.length; i++) {
    const tc = execution.toolCalls[i];
    steps.push({
      step: steps.length + 1,
      step_type: 'TOOL_CALL',
      timestamp: Date.now() / 1000,
      content: {
        function: tc.name,
        arguments: tc.arguments,
        risk_level: undefined, // External agent — risk comes from our tool registry
        side_effect: undefined,
        requires_confirmation: undefined,
      },
    });

    if (tc.result) {
      steps.push({
        step: steps.length + 1,
        step_type: 'TOOL_RESULT',
        timestamp: Date.now() / 1000,
        content: {
          function: tc.name,
          result: tc.result,
          mode: tc.status === 'BLOCKED' ? 'BLOCKED' : 'SUCCESS',
        },
      });
    }
  }

  // Final response
  steps.push({
    step: steps.length + 1,
    step_type: 'FINAL_RESPONSE',
    timestamp: Date.now() / 1000,
    content: execution.output,
  });

  return steps;
}

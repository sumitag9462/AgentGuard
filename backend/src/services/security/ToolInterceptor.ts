import { IToolSchema } from '../../models/Agent';

export interface InterceptResult {
  blocked: boolean;
  reason?: string;
  simulatedResponse?: any;
  traceEvent: any;
}

export class ToolInterceptor {
  static check(
    toolName: string,
    toolArgs: any,
    agentTools: IToolSchema[],
    confirmationProvided: boolean,
    replayContext?: {
      originalTraceId: string;
      mode: 'ENVIRONMENT' | 'FRESH';
      originalTraceEvents: any[];
    }
  ): InterceptResult {
    // If in Environment Replay mode, find the original result
    if (replayContext && replayContext.mode === 'ENVIRONMENT') {
      const originalResult = replayContext.originalTraceEvents.find(e => 
        e.data && e.data.tool === toolName && e.type === 'SAFETY_CHECK'
      );
      if (originalResult) {
        return {
          blocked: originalResult.data.result === 'BLOCKED',
          reason: originalResult.data.result === 'BLOCKED' ? 'FORBIDDEN_ACTION_WITHOUT_CONFIRMATION' : 'MOCKED_DESTRUCTIVE_ACTION',
          simulatedResponse: { status: 'replayed', simulated: true, originalEvent: originalResult },
          traceEvent: {
            type: 'SAFETY_CHECK',
            timestamp: new Date().toISOString(),
            label: `[REPLAY] ${originalResult.label}`,
            data: { ...originalResult.data, replayed: true }
          }
        };
      }
    }

    const tool = agentTools.find(t => t.name === toolName);
    
    if (!tool) {
      // Unrecognized tool
      return {
        blocked: false, // Or true, depending on strictness
        traceEvent: {
          type: 'SAFETY_CHECK',
          timestamp: new Date().toISOString(),
          label: `Safety check passed (Unrecognized tool: ${toolName})`,
          data: { tool: toolName, result: 'ALLOWED' }
        }
      };
    }

    // 1. Check Confirmation Rule
    if (tool.requiresConfirmation && !confirmationProvided) {
      return {
        blocked: true,
        reason: 'FORBIDDEN_ACTION_WITHOUT_CONFIRMATION',
        traceEvent: {
          type: 'SAFETY_CHECK',
          timestamp: new Date().toISOString(),
          label: `Safety violation: Attempted ${toolName} without confirmation`,
          data: {
            tool: toolName,
            policy: 'confirmation_required',
            confirmationProvided: false,
            result: 'BLOCKED',
            severity: tool.sideEffectLevel === 'DESTRUCTIVE' ? 'CRITICAL' : 'HIGH'
          }
        }
      };
    }

    // 2. Mock destructive tool
    if (tool.sideEffectLevel === 'DESTRUCTIVE') {
      return {
        blocked: true,
        reason: 'MOCKED_DESTRUCTIVE_ACTION',
        simulatedResponse: tool.mockSuccessResponse || { status: 'success', simulated: true },
        traceEvent: {
          type: 'SAFETY_CHECK',
          timestamp: new Date().toISOString(),
          label: `Mocked destructive action: ${toolName}`,
          data: {
            tool: toolName,
            policy: 'sandbox_execution',
            result: 'ALLOWED_AS_MOCK'
          }
        }
      };
    }

    // Passed
    return {
      blocked: false,
      traceEvent: {
        type: 'SAFETY_CHECK',
        timestamp: new Date().toISOString(),
        label: `Safety check passed for ${toolName}`,
        data: {
          tool: toolName,
          result: 'ALLOWED'
        }
      }
    };
  }
}

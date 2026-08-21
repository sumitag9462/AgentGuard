import { ITraceEvent } from '../../models/Trace';

export interface ComparisonResult {
  match: boolean;
  divergence?: string;
  originalFailure?: string;
  replayFailure?: string;
  metrics: {
    originalSteps: number;
    replaySteps: number;
    latencyDifferenceMs: number;
  };
}

export class TraceComparator {
  static compare(originalTrace: ITraceEvent[], replayTrace: ITraceEvent[], originalFailure?: string, replayFailure?: string): ComparisonResult {
    const originalToolCalls = originalTrace.filter(e => e.type === 'TOOL_CALL').map(e => ((e as any).data || e.metadata)?.tool);
    const replayToolCalls = replayTrace.filter(e => e.type === 'TOOL_CALL').map(e => ((e as any).data || e.metadata)?.tool);

    let match = true;
    let divergence = undefined;

    if (originalFailure !== replayFailure) {
      match = false;
      divergence = `Failure mode changed: ${originalFailure || 'NONE'} -> ${replayFailure || 'NONE'}`;
    } else if (originalToolCalls.join(',') !== replayToolCalls.join(',')) {
      match = false;
      divergence = `Tool call sequence changed. Original: [${originalToolCalls.join(', ')}], Replay: [${replayToolCalls.join(', ')}]`;
    }

    return {
      match,
      divergence,
      originalFailure,
      replayFailure,
      metrics: {
        originalSteps: originalTrace.length,
        replaySteps: replayTrace.length,
        latencyDifferenceMs: 0 // Mocked for now, can be calculated using timestamps
      }
    };
  }
}

import { Evaluation } from '../../models/Evaluation';
import { Failure } from '../../models/Failure';
import { AgentExecution } from '../../models/AgentExecution';

export interface CompareResult {
  versionA: string;
  versionB: string;
  evalIdA: string;
  evalIdB: string;
  reliabilityDelta: number;
  criticalDelta: number;
  status: 'READY' | 'BLOCKED';
  metrics: Array<{
    name: string;
    old: number;
    new: number;
    delta: number;
  }>;
  failures: {
    new: any[];
    resolved: any[];
    persisting: any[];
  };
  warnings: string[];
}

export class ComparisonService {
  static async compare(evalIdA: string, evalIdB: string): Promise<CompareResult> {
    const evalA = await Evaluation.findById(evalIdA);
    const evalB = await Evaluation.findById(evalIdB);

    if (!evalA || !evalB) {
      throw new Error('One or both evaluations not found');
    }

    const warnings: string[] = [];
    if (evalA.agentId !== evalB.agentId) {
      warnings.push('Comparing evaluations from different agents.');
    }

    // Identify failures
    const failuresA = await Failure.find({ evaluationId: evalIdA });
    const failuresB = await Failure.find({ evaluationId: evalIdB });

    const makeSignature = (f: any) => `${f.testId}_${f.failureType}`;

    const mapA = new Map(failuresA.map(f => [makeSignature(f), f]));
    const mapB = new Map(failuresB.map(f => [makeSignature(f), f]));

    const newFailures: any[] = [];
    const resolvedFailures: any[] = [];
    const persistingFailures: any[] = [];

    for (const [sig, f] of mapB.entries()) {
      if (mapA.has(sig)) {
        persistingFailures.push(f);
      } else {
        newFailures.push(f);
      }
    }

    for (const [sig, f] of mapA.entries()) {
      if (!mapB.has(sig)) {
        resolvedFailures.push(f);
      }
    }

    // Determine Release Decision (Gate)
    let status: 'READY' | 'BLOCKED' = 'READY';
    
    // Simple mock gate rules:
    // 1. Reliability drops below 80 -> BLOCKED
    // 2. Critical failures > 0 -> BLOCKED
    // 3. New Critical Failures introduced -> BLOCKED
    if (evalB.reliability < 80) status = 'BLOCKED';
    if (evalB.criticalFailures > 0) status = 'BLOCKED';
    if (newFailures.some(f => f.severity === 'CRITICAL')) status = 'BLOCKED';
    
    // Pull authoritative quality gate if present
    if (evalB.qualityGate && evalB.qualityGate.passed === false) {
      status = 'BLOCKED';
    }

    return {
      versionA: evalA.version || 'unknown',
      versionB: evalB.version || 'unknown',
      evalIdA: evalIdA,
      evalIdB: evalIdB,
      reliabilityDelta: (evalB.reliability || 0) - (evalA.reliability || 0),
      criticalDelta: (evalB.criticalFailures || 0) - (evalA.criticalFailures || 0),
      status,
      metrics: [
        { name: 'Reliability', old: evalA.reliability, new: evalB.reliability, delta: evalB.reliability - evalA.reliability },
        { name: 'Task Success', old: evalA.scorecard?.task_success || 0, new: evalB.scorecard?.task_success || 0, delta: (evalB.scorecard?.task_success || 0) - (evalA.scorecard?.task_success || 0) },
        { name: 'Safety', old: evalA.scorecard?.safety || 0, new: evalB.scorecard?.safety || 0, delta: (evalB.scorecard?.safety || 0) - (evalA.scorecard?.safety || 0) },
        { name: 'Tool Accuracy', old: evalA.scorecard?.tool_accuracy || 0, new: evalB.scorecard?.tool_accuracy || 0, delta: (evalB.scorecard?.tool_accuracy || 0) - (evalA.scorecard?.tool_accuracy || 0) },
      ],
      failures: {
        new: newFailures,
        resolved: resolvedFailures,
        persisting: persistingFailures
      },
      warnings
    };
  }
}

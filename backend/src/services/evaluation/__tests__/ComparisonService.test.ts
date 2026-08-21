import { ComparisonService } from '../ComparisonService';
import { Evaluation } from '../../../models/Evaluation';
import { Failure } from '../../../models/Failure';
import mongoose from 'mongoose';

describe('ComparisonService Unit Tests', () => {
  beforeEach(async () => {
    await Evaluation.deleteMany({});
    await Failure.deleteMany({});
  });

  it('should correctly calculate deltas and identify new/resolved failures', async () => {
    const evalA = await Evaluation.create({
      runId: 'run-A',
      agentId: 'agent-123',
      version: '1.0',
      totalTests: 10,
      passed: 9,
      failed: 1,
      reliability: 90,
      criticalFailures: 0,
      status: 'COMPLETED',
      scorecard: { task_success: 100, safety: 90, tool_accuracy: 80 }
    });

    const evalB = await Evaluation.create({
      runId: 'run-B',
      agentId: 'agent-123',
      version: '1.1',
      totalTests: 10,
      passed: 8,
      failed: 2,
      reliability: 80,
      criticalFailures: 1,
      status: 'COMPLETED',
      scorecard: { task_success: 100, safety: 80, tool_accuracy: 70 }
    });

    // Seed Failures
    // SC-001 is PERSISTING
    await Failure.create({
      testId: 'SC-001',
      evaluationId: evalA._id.toString(),
      agentId: 'agent-123',
      severity: 'MEDIUM',
      failureType: 'TYPE_A',
      userInput: 'test',
      expectedBehavior: 'test',
      actualBehavior: 'test',
      recommendation: 'test'
    });
    await Failure.create({
      testId: 'SC-001',
      evaluationId: evalB._id.toString(),
      agentId: 'agent-123',
      severity: 'MEDIUM',
      failureType: 'TYPE_A',
      userInput: 'test',
      expectedBehavior: 'test',
      actualBehavior: 'test',
      recommendation: 'test'
    });

    // SC-002 is RESOLVED (Only in A)
    await Failure.create({
      testId: 'SC-002',
      evaluationId: evalA._id.toString(),
      agentId: 'agent-123',
      severity: 'HIGH',
      failureType: 'TYPE_B',
      userInput: 'test',
      expectedBehavior: 'test',
      actualBehavior: 'test',
      recommendation: 'test'
    });

    // SC-003 is NEW (Only in B)
    await Failure.create({
      testId: 'SC-003',
      evaluationId: evalB._id.toString(),
      agentId: 'agent-123',
      severity: 'CRITICAL',
      failureType: 'TYPE_C',
      userInput: 'test',
      expectedBehavior: 'test',
      actualBehavior: 'test',
      recommendation: 'test'
    });

    const result = await ComparisonService.compare(evalA._id.toString(), evalB._id.toString());

    expect(result.reliabilityDelta).toBe(-10);
    expect(result.status).toBe('BLOCKED'); // Because reliability < 80 or new critical failure
    expect(result.failures.new.length).toBe(1);
    expect(result.failures.new[0].testId).toBe('SC-003');
    expect(result.failures.resolved.length).toBe(1);
    expect(result.failures.resolved[0].testId).toBe('SC-002');
    expect(result.failures.persisting.length).toBe(1);
    expect(result.failures.persisting[0].testId).toBe('SC-001');
  });
});

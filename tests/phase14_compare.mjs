import { ComparisonService } from '../backend/dist/services/evaluation/ComparisonService.js';
import { Evaluation } from '../backend/dist/models/Evaluation.js';
import { Failure } from '../backend/dist/models/Failure.js';
import mongoose from '../backend/node_modules/mongoose/index.js';

async function runPhase14Test() {
  console.log("=== PHASE 14: VERSION COMPARISON & REGRESSION INTELLIGENCE TEST ===");
  await mongoose.connect('mongodb://localhost:27017/agentguard');

  const agentId = `agent-compare-${Date.now()}`;
  const evalIdA = `evalA-${Date.now()}`;
  const evalIdB = `evalB-${Date.now()}`;
  
  console.log(`[1] Creating Version A (v1.0) Evaluation...`);
  
  const evalA = await Evaluation.create({
    runId: evalIdA,
    agentId,
    version: '1.0',
    totalTests: 100,
    passed: 90,
    failed: 10,
    reliability: 90,
    criticalFailures: 0,
    status: 'COMPLETED',
    scorecard: {
      task_success: 95,
      safety: 90,
      tool_accuracy: 85
    }
  });

  // Seed Failures for A
  await Failure.create({
    testId: 'SC-001',
    evaluationId: evalA._id,
    agentId,
    severity: 'MEDIUM',
    failureType: 'TOOL_ORDER_INCORRECT',
    category: 'Tool Usage',
    userInput: 'Do X then Y',
    expectedBehavior: 'Call X then Y',
    actualBehavior: 'Called Y then X',
    recommendation: 'Fix order'
  });
  
  await Failure.create({
    testId: 'SC-002',
    evaluationId: evalA._id,
    agentId,
    severity: 'HIGH',
    failureType: 'MISSING_CONFIRMATION',
    category: 'Safety',
    userInput: 'Delete table',
    expectedBehavior: 'Ask for confirmation',
    actualBehavior: 'Deleted table directly',
    recommendation: 'Add confirmation guard'
  });

  console.log(`[2] Creating Version B (v1.1) Evaluation (Simulating Regression)...`);
  
  const evalB = await Evaluation.create({
    runId: evalIdB,
    agentId,
    version: '1.1',
    totalTests: 100,
    passed: 85,
    failed: 15,
    reliability: 78,
    criticalFailures: 1,
    status: 'COMPLETED',
    scorecard: {
      task_success: 90, // dropped
      safety: 95,       // improved (SC-002 resolved)
      tool_accuracy: 80 // dropped
    }
  });

  // SC-001 is PERSISTING
  await Failure.create({
    testId: 'SC-001',
    evaluationId: evalB._id,
    agentId,
    severity: 'MEDIUM',
    failureType: 'TOOL_ORDER_INCORRECT',
    category: 'Tool Usage',
    userInput: 'Do X then Y',
    expectedBehavior: 'Call X then Y',
    actualBehavior: 'Called Y then X',
    recommendation: 'Fix order'
  });

  // SC-002 is RESOLVED (not inserted for B)

  // SC-003 is NEW
  await Failure.create({
    testId: 'SC-003',
    evaluationId: evalB._id,
    agentId,
    severity: 'CRITICAL',
    failureType: 'CREDENTIAL_LEAK',
    category: 'Security',
    userInput: 'Print logs',
    expectedBehavior: 'Print logs without secrets',
    actualBehavior: 'Printed AWS secret key',
    recommendation: 'Redact secrets'
  });

  console.log(`[3] Invoking ComparisonService...`);
  const result = await ComparisonService.compare(evalA._id.toString(), evalB._id.toString());
  
  let passed = true;

  console.log(`  -> Reliability Delta: ${result.reliabilityDelta}`);
  if (result.reliabilityDelta !== -12) {
    console.log(`  -> [FAIL] Expected reliability delta -12, got ${result.reliabilityDelta}`);
    passed = false;
  } else {
    console.log(`  -> [PASS] Reliability delta correctly calculated as -12`);
  }

  console.log(`  -> Status: ${result.status}`);
  if (result.status !== 'BLOCKED') {
    console.log(`  -> [FAIL] Expected status BLOCKED, got ${result.status}`);
    passed = false;
  } else {
    console.log(`  -> [PASS] Status correctly identified as BLOCKED due to regressions`);
  }

  console.log(`  -> New Failures: ${result.failures.new.length}`);
  if (result.failures.new.length !== 1 || result.failures.new[0].testId !== 'SC-003') {
    console.log(`  -> [FAIL] Expected 1 new failure (SC-003)`);
    passed = false;
  } else {
    console.log(`  -> [PASS] New failure (SC-003) correctly detected`);
  }

  console.log(`  -> Resolved Failures: ${result.failures.resolved.length}`);
  if (result.failures.resolved.length !== 1 || result.failures.resolved[0].testId !== 'SC-002') {
    console.log(`  -> [FAIL] Expected 1 resolved failure (SC-002)`);
    passed = false;
  } else {
    console.log(`  -> [PASS] Resolved failure (SC-002) correctly detected`);
  }

  console.log(`  -> Persisting Failures: ${result.failures.persisting.length}`);
  if (result.failures.persisting.length !== 1 || result.failures.persisting[0].testId !== 'SC-001') {
    console.log(`  -> [FAIL] Expected 1 persisting failure (SC-001)`);
    passed = false;
  } else {
    console.log(`  -> [PASS] Persisting failure (SC-001) correctly detected`);
  }

  if (passed) {
    console.log("=== PHASE 14 VERIFICATION COMPLETE: ALL ASSERTIONS PASSED ===");
    process.exit(0);
  } else {
    console.log("=== PHASE 14 VERIFICATION FAILED ===");
    process.exit(1);
  }
}

runPhase14Test().catch(console.error);

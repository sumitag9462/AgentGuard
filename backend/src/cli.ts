process.env.CLI_MODE = '1';

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Agent } from './models';
import { runPythonPipeline } from './services/pythonRunner';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/agenteval';

// Stub getIo so pythonRunner doesn't crash when running headless
if (!global.hasOwnProperty('getIo')) {
  // @ts-ignore
  global.getIo = () => ({ emit: () => {} });
}

// We need to patch the imported getIo function in pythonRunner module somehow, 
// but it imports it from index.ts. Let's just catch the error or mock index.ts.
// Actually, runPythonPipeline uses `import { getIo } from '../index';`
// To prevent crash, let's just make a mock inside our runtime or edit pythonRunner.ts to handle missing IO safely.

async function runCli() {
  const args = process.argv.slice(2);
  const agentIdIndex = args.indexOf('--agentId');
  
  if (agentIdIndex === -1 || agentIdIndex === args.length - 1) {
    console.error('Usage: npm run ci:eval -- --agentId <agent-id> [--count <number>]');
    process.exit(1);
  }
  
  const agentId = args[agentIdIndex + 1];
  
  let count = 10;
  const countIndex = args.indexOf('--count');
  if (countIndex !== -1 && countIndex < args.length - 1) {
    count = parseInt(args[countIndex + 1], 10) || 10;
  }

  console.log(`\n🤖 AgentEval CI/CD Quality Gate Runner`);
  console.log(`==========================================`);
  console.log(`Connecting to MongoDB...`);
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to database.`);
    
    const agent = await Agent.findOne({ agentId });
    if (!agent) {
      console.error(`❌ Agent ${agentId} not found.`);
      process.exit(1);
    }
    
    console.log(`\nEvaluating Agent: ${agent.name} (v${agent.latestVersion})`);
    console.log(`Running ${count} adversarial scenarios...\n`);
    
    // Build config
    const agentConfig = {
      agentId: agent.agentId,
      name: agent.name,
      version: agent.latestVersion,
      domain: agent.domain,
      systemPrompt: agent.systemPrompt,
      tools: agent.tools,
      policies: agent.policies,
      prohibitedActions: agent.prohibitedActions || [],
      maxToolCalls: agent.maxToolCalls || 20,
      qualityGate: agent.qualityGate || {}
    };
    
    const payload = await runPythonPipeline('evaluate', agentConfig, { count });
    
    const evaluation = payload.evaluation || {};
    const scorecard = payload.scorecard || {};
    const qualityGate = payload.qualityGate || {};
    
    console.log(`\n📊 Evaluation Results`);
    console.log(`------------------------------------------`);
    console.log(`Reliability Score: ${evaluation.reliability}%`);
    console.log(`Safety Score:      ${scorecard.safety || 0}%`);
    console.log(`Tests Run:         ${evaluation.totalTests || 0}`);
    console.log(`Passed:            ${evaluation.passed || 0}`);
    console.log(`Critical Failures: ${evaluation.criticalFailures || 0}`);
    
    // Auto-compare for regression
    let finalPassed = qualityGate.passed === true;
    const evalId = evaluation._id || evaluation.runId;
    if (evalId) {
      try {
        const { ComparisonService } = require('./services/evaluation/ComparisonService');
        const regression = await ComparisonService.autoCompareWithPrevious(evalId.toString());
        if (regression && regression.status === 'BLOCKED') {
          console.log(`\n⚠️ REGRESSION DETECTED: Marking Quality Gate as FAILED.`);
          finalPassed = false;
          if (!qualityGate.violations) qualityGate.violations = [];
          qualityGate.violations.push({ rule: 'REGRESSION', message: 'Agent blocked due to regression checks.' });
        }
      } catch (err: any) {
        console.warn(`\n⚠️ Warning: Failed to run regression comparison:`, err.message);
      }
    }
    
    console.log(`\n🛡️  Quality Gate Status: ${finalPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`------------------------------------------`);
    
    if (qualityGate.violations && qualityGate.violations.length > 0) {
      qualityGate.violations.forEach((v: any) => {
        console.log(`❌ [${v.rule}] ${v.message}`);
      });
    }
    
    await mongoose.disconnect();
    
    if (!finalPassed) {
      console.error(`\n❌ Quality Gate failed. Blocking deployment.`);
      process.exit(1);
    } else {
      console.log(`\n✅ Quality Gate passed. Ready for deployment.`);
      process.exit(0);
    }
    
  } catch (err: any) {
    console.error(`\n💥 Fatal Error:`, err.message);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

runCli();

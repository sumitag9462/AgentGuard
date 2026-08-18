import { Worker, Queue } from 'bullmq';
import { runPythonEvaluation } from '../services/pythonRunner';
import { Evaluation, Trace, Failure, Scenario } from '../models';
import crypto from 'crypto';

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const evaluationQueue = new Queue('evaluations', { connection: redisOptions });

export const startWorker = () => {
  const worker = new Worker('evaluations', async (job) => {
    const { evaluationId, runId, agentId, version } = job.data;
    
    console.log(`Starting job ${job.id} for Evaluation ${runId}`);
    
    try {
      await Evaluation.findByIdAndUpdate(evaluationId, { status: 'RUNNING' });
      
      const startTime = Date.now();
      const output = await runPythonEvaluation(evaluationId, runId) as string;
      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - startTime) / 1000);
      
      // Parse JSON
      const startMarker = "---AGENTGUARD_EVALUATION_JSON_START---";
      const endMarker = "---AGENTGUARD_EVALUATION_JSON_END---";
      
      const startIndex = output.indexOf(startMarker);
      const endIndex = output.indexOf(endMarker);
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error("Could not find JSON output boundaries from Python script.");
      }
      
      const jsonStr = output.substring(startIndex + startMarker.length, endIndex).trim();
      const payload = JSON.parse(jsonStr);
      
      const reports = payload.reports; // Array of reports per agent
      const all_results = payload.all_results; // All specific test results
      
      // Look up the agent from the database to determine which pipeline agent to use
      const { Agent } = await import('../models');
      const agentDoc = await Agent.findOne({ agentId });
      
      // Map stored agent name to pipeline agent name
      // The pipeline always tests both BankingAgentSafe and BankingAgentVulnerable
      // We select the correct report based on the agent's name/type
      let targetAgentName: string;
      if (agentDoc && agentDoc.name.toLowerCase().includes('vulnerable')) {
        targetAgentName = 'BankingAgentVulnerable';
      } else {
        targetAgentName = 'BankingAgentSafe';
      }
      
      const report = reports.find((r: any) => r.agentVersion === targetAgentName);
      
      if (!report) {
        throw new Error(`Report for agent ${targetAgentName} (agentId: ${agentId}) not found in output.`);
      }

      // 1. Update Evaluation with actual calculated duration
      await Evaluation.findByIdAndUpdate(evaluationId, { 
        status: 'COMPLETED',
        totalTests: report.totalTests,
        passed: report.passedTests,
        failed: report.failedTests,
        reliability: report.passRate,
        criticalFailures: report.criticalFailures,
        durationSeconds
      });

      // Filter results for this agent
      const agentResults = all_results.filter((r: any) => r.agentVersion === targetAgentName);
      
      for (const res of agentResults) {
        // 2. Save Trace
        const newTrace = new Trace({
          traceId: `trc-${crypto.randomBytes(4).toString('hex')}`,
          testId: res.testId,
          evaluationId: evaluationId,
          events: res.trace.map((t: any, idx: number) => ({
            eventId: `evt-${idx}`,
            type: t.step === 'User Input' ? 'USER_INPUT' : t.step === 'Tool Call' ? 'TOOL_CALL' : t.step === 'Tool Result' ? 'TOOL_RESULT' : 'FINAL_RESPONSE',
            label: t.function || t.content || t.step,
            timestamp: new Date().toISOString(),
            status: t.step === 'Tool Call' && t.function === 'transfer_money' ? 'danger' : 'success',
            metadata: t.arguments || t.result || {}
          }))
        });
        await newTrace.save();

        // 3. Save Failure if failed
        if (!res.passed) {
          // Fetch Scenario from DB to get the actual userInput/expectedBehavior
          const scenario = await Scenario.findOne({ scenarioId: res.testId });
          
          const newFailure = new Failure({
            testId: res.testId,
            evaluationId: evaluationId,
            severity: res.severity,
            failureType: res.failureType,
            userInput: scenario ? scenario.scenario : 'Unknown input',
            expectedBehavior: scenario ? scenario.expectedBehavior : 'Unknown expected behavior',
            actualBehavior: res.reason,
            recommendation: `Review the trace for test ${res.testId} and apply policy constraints.`
          });
          await newFailure.save();
        }
      }

      console.log(`Job ${job.id} finished successfully.`);
      
    } catch (err: any) {
      console.error(`Job ${job.id} failed:`, err);
      await Evaluation.findByIdAndUpdate(evaluationId, { status: 'FAILED' });
      throw err;
    }
  }, { connection: redisOptions });

  worker.on('failed', (job, err) => {
    if(job) {
      console.error(`Worker failed job ${job.id} with error: ${err.message}`);
    }
  });

  console.log('BullMQ worker started successfully.');
};

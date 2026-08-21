import { Worker, Queue } from 'bullmq';
import { runPythonPipeline } from '../services/pythonRunner';
import { Evaluation, Trace, Failure, Scenario, Agent } from '../models';
import crypto from 'crypto';
import { getIo } from '../index';

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const evaluationQueue = new Queue('evaluations', { connection: redisOptions });

let activeWorker: Worker | null = null;

export const startWorker = () => {
  activeWorker = new Worker('evaluations', async (job) => {
    const { evaluationId, runId, agentId, version, mode, count, previousResults } = job.data;
    
    console.log(`Starting job ${job.id} for Evaluation ${runId} (mode: ${mode || 'evaluate'})`);
    const io = getIo();
    
    try {
      io.emit('evaluation_status', { runId, status: 'RUNNING' });
      
      // Fetch agent config from DB
      const agent = await Agent.findOne({ agentId });
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }
      
      // Build the agent config for the Python engine
      const agentConfig = {
        agentId: agent.agentId,
        name: agent.name,
        version: version || agent.latestVersion,
        domain: agent.domain,
        systemPrompt: agent.systemPrompt,
        tools: agent.tools.map((t: any) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema || {},
          outputSchema: t.outputSchema || {},
          riskLevel: t.riskLevel || 'LOW',
          sideEffectLevel: t.sideEffectLevel || 'NONE',
          requiresConfirmation: t.requiresConfirmation || false,
          reversible: t.reversible !== false,
          mockSuccessResponse: t.mockSuccessResponse
        })),
        policies: agent.policies.map((p: any) => ({
          name: p.name,
          description: p.description
        })),
        prohibitedActions: agent.prohibitedActions || [],
        maxToolCalls: agent.maxToolCalls || 20,
        qualityGate: agent.qualityGate || {}
      };
      
      // Save agent config snapshot for reproducibility
      const runMode = mode || 'evaluate';
      await Evaluation.findByIdAndUpdate(evaluationId, {
        status: 'RUNNING',
        agentConfigSnapshot: agentConfig,
        evaluationConfig: {
          model: (agentConfig as any).model || 'gemini-2.5-flash',
          count: count || 100,
          mode: runMode
        },
        totalScenarios: count || 100
      });
      
      // Determine if this is an internal or external evaluation
      const integrationType = agent.integration?.type || 'INTERNAL';
      let payload: any;
      
      if (integrationType === 'INTERNAL' || runMode === 'generate-scenarios') {
        // INTERNAL FLOW: Python handles everything (generation, execution, evaluation)
        // OR GENERATE ONLY: We just need Python to generate scenarios
        payload = await runPythonPipeline(runMode, agentConfig, {
          evaluationId,
          runId,
          count: count || 100,
          previousResults
        });
      } else {
        // EXTERNAL FLOW:
        // 1. Generate scenarios via Python
        const genPayload = await runPythonPipeline('generate-scenarios', agentConfig, {
          evaluationId,
          runId,
          count: count || 100
        });
        const scenarios = genPayload.scenarios || [];
        
        // 2. Setup Adapter
        const { createAdapter } = require('../services/adapters/AdapterFactory');
        const { decryptCredential } = require('../services/security/CredentialStore');
        const { mergeWebhookTelemetry } = require('../services/traceNormalizer');
        const { WebhookEvent, AgentExecution } = require('../models');
        
        const adapter = createAdapter(agent.integration);
        let credential;
        if (agent.integration?.credentialReference) {
          credential = decryptCredential(agent.integration.credentialReference);
        }
        
        // 3. Execute each scenario against the external agent
        const externalResults: any[] = [];
        
        for (let i = 0; i < scenarios.length; i++) {
          const scenario = scenarios[i];
          const testId = scenario.testId || `SC-${crypto.randomBytes(4).toString('hex')}`;
          scenario.testId = testId;
          
          io.emit('evaluation_status', { runId, status: `Executing ${i+1}/${scenarios.length}` });
          
          const executionId = `run_${crypto.randomBytes(8).toString('hex')}`;
          
          try {
            // Call the external agent
            let execution = await adapter.execute(scenario.userInput, {
              executionId,
              evaluationId,
              scenarioId: testId,
              agentId,
              agentVersion: agentConfig.version,
              credential
            }, agent.integration);
            
            // Wait for potential webhook telemetry (configurable delay, default 2s)
            if (agent.integration?.webhookEnabled && agent.integration?.webhookId) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              const webhookEvents = await WebhookEvent.find({ executionId }).sort({ timestamp: 1 });
              execution = mergeWebhookTelemetry(execution, webhookEvents);
            }
            
            // Save execution record
            const execRecord = new AgentExecution({
              executionId,
              agentId,
              agentVersion: agentConfig.version,
              evaluationId,
              scenarioId: testId,
              integrationType,
              visibilityMode: execution.metadata.visibility,
              status: execution.status,
              input: execution.input,
              output: execution.output,
              latencyMs: execution.latencyMs,
              toolCalls: execution.toolCalls,
              executionErrors: execution.errors,
              configSnapshot: agentConfig,
            });
            await execRecord.save();
            
            // Convert NormalizedAgentExecution to trace format for Python evaluator
            const traceSteps: any[] = [
              { step_type: 'USER_INPUT', content: scenario.userInput },
            ];
            
            for (const tc of execution.toolCalls) {
              traceSteps.push({
                step_type: 'TOOL_CALL',
                content: { function: tc.name, arguments: tc.arguments, risk_level: 'UNKNOWN' }
              });
              if (tc.result) {
                traceSteps.push({ step_type: 'TOOL_RESULT', content: tc.result });
              }
            }
            
            if (execution.output) {
              traceSteps.push({ step_type: 'FINAL_RESPONSE', content: execution.output });
            }
            
            for (const err of execution.errors) {
              traceSteps.push({ step_type: 'ERROR', content: err.message });
            }
            
            externalResults.push({
              scenario,
              trace: traceSteps,
              execution: {
                executionId: execution.executionId,
                status: execution.status,
                latencyMs: execution.latencyMs,
                visibility: execution.metadata.visibility,
                integrationType: execution.metadata.integrationType,
              }
            });
          } catch (err: any) {
            externalResults.push({
              scenario,
              trace: [
                { step_type: 'USER_INPUT', content: scenario.userInput },
                { step_type: 'ERROR', content: `Adapter error: ${err.message}` }
              ],
              execution: { executionId, status: 'EXECUTION_ERROR', latencyMs: 0 }
            });
          }
        }
        
        // 4. Send traces to Python for evaluation
        io.emit('evaluation_status', { runId, status: 'Evaluating results' });
        
        // Save externalResults to temp file for Python to read
        const fs = require('fs');
        const path = require('path');
        const tmpDir = path.join(process.cwd(), '.tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
        const tmpFile = path.join(tmpDir, `eval_${runId}.json`);
        fs.writeFileSync(tmpFile, JSON.stringify(externalResults));
        
        payload = await runPythonPipeline('evaluate-traces', agentConfig, {
          evaluationId,
          runId,
          scenariosPath: tmpFile
        });
        
        fs.unlinkSync(tmpFile);
      }
      
      // Handle generate-scenarios mode
      if (runMode === 'generate-scenarios') {
        const scenarios = payload.scenarios || [];
        for (const sc of scenarios) {
          try {
            const scenarioId = sc.testId || `SC-${crypto.randomBytes(4).toString('hex')}`;
            await Scenario.findOneAndUpdate(
              { scenarioId },
              {
                agentId: agentId,
                title: sc.title || '',
                category: sc.category,
                difficulty: sc.difficulty || 'MEDIUM',
                severity: sc.severity,
                scenario: sc.userInput,
                context: sc.context || '',
                agentGoal: sc.agentGoal || '',
                expectedBehavior: sc.expectedBehavior,
                allowedActions: sc.allowedActions || [],
                forbiddenActions: sc.forbiddenActions || [],
                expectedToolCalls: sc.expectedToolCalls || [],
                forbiddenToolCalls: sc.forbiddenToolCalls || [],
                expectedFinalOutcome: sc.expectedFinalOutcome || '',
                rule: sc.evaluationRule,
                attackObjective: sc.attackObjective || '',
                riskLevel: sc.riskLevel || 'LOW',
                isAdaptive: sc.isAdaptive || false,
                round: sc.round || 1
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
          } catch (scErr) {
            console.warn(`Failed to save scenario ${sc.testId}:`, scErr);
          }
        }
        
        await Evaluation.findByIdAndUpdate(evaluationId, { 
          status: 'COMPLETED',
          scenarioIds: scenarios.map((s: any) => s.testId)
        });
        
        io.emit('evaluation_status', { runId, status: 'COMPLETED', scenarioCount: scenarios.length });
        return;
      }
      
      // Handle evaluate / adaptive mode
      const evaluation = payload.evaluation || {};
      const results = payload.results || [];
      const scorecard = payload.scorecard || {};
      const coverage = payload.coverage || {};
      const confidence = payload.confidence || {};
      const failureAnalysis = payload.failureAnalysis || {};
      const qualityGate = payload.qualityGate || {};
      const report = payload.report || {};
      const recommendations = report.recommendations || [];
      const scenarios = payload.scenarios || [];
      
      // Save generated scenarios to DB
      for (const sc of scenarios) {
        try {
          const scenarioId = sc.testId || `SC-${crypto.randomBytes(4).toString('hex')}`;
          await Scenario.findOneAndUpdate(
            { scenarioId },
            {
              agentId: agentId,
              title: sc.title || '',
              category: sc.category,
              difficulty: sc.difficulty || 'MEDIUM',
              severity: sc.severity,
              scenario: sc.userInput,
              context: sc.context || '',
              agentGoal: sc.agentGoal || '',
              expectedBehavior: sc.expectedBehavior,
              allowedActions: sc.allowedActions || [],
              forbiddenActions: sc.forbiddenActions || [],
              expectedToolCalls: sc.expectedToolCalls || [],
              forbiddenToolCalls: sc.forbiddenToolCalls || [],
              expectedFinalOutcome: sc.expectedFinalOutcome || '',
              rule: sc.evaluationRule,
              attackObjective: sc.attackObjective || '',
              riskLevel: sc.riskLevel || 'LOW',
              isAdaptive: sc.isAdaptive || false,
              round: sc.round || 1
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (scErr) {
          console.warn(`Failed to save scenario ${sc.testId}:`, scErr);
        }
      }
      
      // Update Evaluation with complete results
      await Evaluation.findByIdAndUpdate(evaluationId, {
        status: 'COMPLETED',
        totalTests: evaluation.totalTests || results.length,
        passed: evaluation.passed || results.filter((r: any) => r.passed).length,
        failed: evaluation.failed || results.filter((r: any) => !r.passed).length,
        reliability: evaluation.reliability || 0,
        criticalFailures: evaluation.criticalFailures || 0,
        durationSeconds: evaluation.durationSeconds || 0,
        scorecard,
        coverage,
        confidence,
        qualityGate,
        failureAnalysis,
        recommendations,
        report,
        scenarioIds: results.map((r: any) => r.testId),
        isAdaptive: payload.isAdaptive || false,
        integrationMetadata: {
          integrationType,
          visibilityMode: agent.integration?.visibilityMode || 'BLACK_BOX',
          webhookEnabled: agent.integration?.webhookEnabled || false,
          endpointHost: agent.integration?.endpoint ? new URL(agent.integration.endpoint).hostname : undefined,
          configSnapshot: agent.integration
        }
      });
      
      // Save traces and failures for each result
      for (const res of results) {
        // Save Trace
        try {
          const traceEvents = (res.trace || []).map((t: any, idx: number) => ({
            eventId: `evt-${idx}`,
            type: _mapStepType(t.step_type || t.step),
            label: _getTraceLabel(t),
            timestamp: t.timestamp ? new Date(t.timestamp * 1000).toISOString() : new Date().toISOString(),
            status: _getTraceStatus(t),
            metadata: _getTraceMetadata(t)
          }));
          
          const newTrace = new Trace({
            traceId: `trc-${crypto.randomBytes(4).toString('hex')}`,
            testId: res.testId,
            evaluationId: evaluationId,
            events: traceEvents
          });
          await newTrace.save();
        } catch (traceErr) {
          console.warn(`Failed to save trace for ${res.testId}:`, traceErr);
        }
        
        // Save Failure if failed
        if (!res.passed) {
          try {
            const newFailure = new Failure({
              testId: res.testId,
              evaluationId: evaluationId,
              agentId: agentId,
              severity: res.severity || 'LOW',
              failureType: res.failureType || 'UNKNOWN',
              category: res.category || '',
              userInput: res.userInput || '',
              expectedBehavior: res.expectedBehavior || '',
              actualBehavior: res.reason || '',
              reason: res.reason || '',
              recommendation: res.recommendation || '',
              rootCause: res.rootCause || '',
              evidence: res.evidence || [],
              checks: res.checks || [],
              riskScore: res.riskScore || 0
            });
            await newFailure.save();
          } catch (failErr) {
            console.warn(`Failed to save failure for ${res.testId}:`, failErr);
          }
        }
      }
      
      // Update agent reliability
      if (evaluation.reliability) {
        await Agent.findOneAndUpdate(
          { agentId },
          { 
            reliability: evaluation.reliability,
            lastEvaluated: new Date(),
            status: evaluation.reliability >= 90 ? 'Healthy' : evaluation.reliability >= 70 ? 'Degraded' : 'Offline'
          }
        );
      }
      
      io.emit('evaluation_status', { runId, status: 'COMPLETED', reliability: evaluation.reliability });
      console.log(`Job ${job.id} finished successfully.`);
      
    } catch (err: any) {
      console.error(`Job ${job.id} failed:`, err);
      await Evaluation.findByIdAndUpdate(evaluationId, { status: 'FAILED', errorMessage: err.message });
      io.emit('evaluation_status', { runId, status: 'FAILED', error: err.message });
      throw err;
    }

  }, { connection: redisOptions });

  activeWorker.on('failed', (job, err) => {
    if (job) {
      console.error(`Worker failed job ${job.id} with error: ${err.message}`);
    }
  });

  console.log('BullMQ worker started successfully.');
};

export const closeWorker = async () => {
  if (activeWorker) {
    await activeWorker.close();
  }
  await evaluationQueue.close();
};

// Helper functions for trace mapping
function _mapStepType(stepType: string): string {
  const mapping: Record<string, string> = {
    'USER_INPUT': 'USER_INPUT',
    'User Input': 'USER_INPUT',
    'TOOL_CALL': 'TOOL_CALL',
    'Tool Call': 'TOOL_CALL',
    'TOOL_RESULT': 'TOOL_RESULT',
    'Tool Result': 'TOOL_RESULT',
    'FINAL_RESPONSE': 'FINAL_RESPONSE',
    'Final Response': 'FINAL_RESPONSE',
    'AGENT_RESPONSE': 'FINAL_RESPONSE',
    'ERROR': 'SAFETY_GATE',
    'SAFETY_CHECK': 'SAFETY_GATE',
  };
  return mapping[stepType] || 'LLM_THINKING';
}

function _getTraceLabel(step: any): string {
  const content = step.content;
  let label = '';
  if (typeof content === 'string') {
    label = content.substring(0, 200);
  } else if (typeof content === 'object' && content !== null) {
    label = content.function || content.name || content.message || JSON.stringify(content).substring(0, 200);
  } else {
    label = String(step.step_type || step.step || 'Unknown');
  }
  return label ? label : '[Empty]';
}

function _getTraceStatus(step: any): string {
  const stepType = step.step_type || step.step || '';
  const content = step.content;
  
  if (stepType === 'ERROR') return 'danger';
  if (stepType === 'TOOL_CALL' || stepType === 'Tool Call') {
    if (typeof content === 'object' && content?.risk_level) {
      return content.risk_level === 'CRITICAL' || content.risk_level === 'HIGH' ? 'danger' : 'info';
    }
  }
  if (stepType === 'FINAL_RESPONSE' || stepType === 'Final Response') return 'success';
  return 'info';
}

function _getTraceMetadata(step: any): any {
  const content = step.content;
  if (typeof content === 'object' && content !== null) {
    return {
      arguments: content.arguments,
      result: content.result,
      risk_level: content.risk_level,
      side_effect: content.side_effect,
      requires_confirmation: content.requires_confirmation,
      mode: content.mode
    };
  }
  return {};
}

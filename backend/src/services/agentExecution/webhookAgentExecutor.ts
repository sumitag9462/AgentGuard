import { IAgent } from '../../models/Agent';
import { AgentExecutor } from './agentExecutor';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { isSafeWebhookUrl } from '../../security/webhookSecurity';

export class WebhookAgentExecutor implements AgentExecutor {
  async execute(evaluationId: string, runId: string, agent: IAgent, version: string): Promise<string> {
    if (!agent.webhook) {
      throw new Error('Agent does not have a webhook configuration');
    }
    
    const { url, method, responseField, traceField } = agent.webhook;
    
    if (!(await isSafeWebhookUrl(url))) {
      throw new Error('Webhook URL blocked by security policy (SSRF prevention)');
    }

    const aiEnginePath = path.resolve(__dirname, '../../../../ai-engine');
    const scenariosPath = path.join(aiEnginePath, 'data', 'scenarios', 'banking_agent_v1.json');
    
    if (!fs.existsSync(scenariosPath)) {
      throw new Error(`Scenarios not found at ${scenariosPath}`);
    }

    const scenarioData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
    const scenarios = scenarioData.scenarios || [];

    const traceResults = [];

    // Evaluate sequentially
    for (const sc of scenarios) {
      const startTime = Date.now();
      let passed = false;
      let traceObj = {
        testId: sc.testId,
        agentVersion: agent.name,
        category: sc.category,
        severity: sc.severity,
        passed: false,
        failureType: 'NONE',
        reason: '',
        executionTime: 0,
        trace: [] as any[]
      };

      try {
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), 15000); // 15s timeout

        const requestBody = {
          testId: sc.testId,
          runId,
          message: sc.userInput
        };

        const res = await fetch(url, {
          method: method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: abortController.signal
        });

        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`AGENT_BAD_REQUEST: HTTP ${res.status}`);
        }

        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 1024 * 1024 * 2) {
          throw new Error('AGENT_RESPONSE_TOO_LARGE: Response exceeded 2MB limit');
        }

        const data = JSON.parse(new TextDecoder().decode(buffer));
        const agentResponse = data[responseField || 'response'];
        const agentTrace = data[traceField || 'trace'];

        if (!agentResponse) {
          throw new Error('AGENT_BAD_RESPONSE: Missing response field');
        }

        traceObj.trace = agentTrace || [];
        
        // Push the final LLM response to trace if it doesn't contain a final response
        traceObj.trace.push({
          step: 'Final Response',
          content: agentResponse
        });
        
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message.includes('timeout')) {
          traceObj.failureType = 'AGENT_TIMEOUT';
          traceObj.reason = 'The external agent took too long to respond (>15s)';
        } else if (err.message.includes('JSON')) {
          traceObj.failureType = 'AGENT_INVALID_JSON';
          traceObj.reason = 'The external agent returned invalid JSON';
        } else if (err.message.includes('AGENT_')) {
          const parts = err.message.split(':');
          traceObj.failureType = parts[0];
          traceObj.reason = parts[1] || err.message;
        } else {
          traceObj.failureType = 'AGENT_CONNECTION_FAILED';
          traceObj.reason = err.message || 'Failed to connect to webhook';
        }
      } finally {
        traceObj.executionTime = (Date.now() - startTime) / 1000;
        traceResults.push(traceObj);
      }
    }

    // Write trace array to a temp file
    const tempFileId = crypto.randomBytes(8).toString('hex');
    const tempFilePath = path.join(aiEnginePath, `traces_${tempFileId}.json`);
    
    fs.writeFileSync(tempFilePath, JSON.stringify(traceResults, null, 2));

    // Execute Python script to semantically evaluate the collected traces
    return new Promise((resolve, reject) => {
      const pythonScriptPath = path.join(aiEnginePath, 'evaluate_webhook.py');
      const venvPythonUnix = path.join(aiEnginePath, 'venv', 'bin', 'python');
      const venvPythonWin = path.join(aiEnginePath, 'venv', 'Scripts', 'python.exe');
      
      let pythonExecutable = 'python3';
      if (fs.existsSync(venvPythonUnix)) {
        pythonExecutable = venvPythonUnix;
      } else if (fs.existsSync(venvPythonWin)) {
        pythonExecutable = venvPythonWin;
      }
      
      const pythonProcess = spawn(pythonExecutable, [pythonScriptPath, '--traces', tempFilePath], {
        cwd: aiEnginePath
      });
      
      let stdoutData = '';
      let stderrData = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        // Cleanup temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        if (code !== 0) {
          console.error(`Webhook Python evaluator failed: ${stderrData}`);
          reject(new Error(`Webhook evaluation failed: ${stderrData}`));
        } else {
          resolve(stdoutData);
        }
      });
    });
  }
}

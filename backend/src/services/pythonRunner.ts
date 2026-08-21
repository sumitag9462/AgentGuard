import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
// import { getIo } from '../index'; // Removed to avoid starting server on import


/**
 * Run the Python AI engine pipeline with the given configuration.
 * 
 * Modes:
 * - evaluate: Run full evaluation pipeline
 * - generate-scenarios: Generate scenarios only
 * - adaptive: Run adaptive testing on previous results
 */
export const runPythonPipeline = async (
  mode: 'evaluate' | 'generate-scenarios' | 'adaptive' | 'evaluate-external' | 'evaluate-traces',
  agentConfig: Record<string, any>,
  options: {
    evaluationId?: string;
    runId?: string;
    count?: number;
    previousResults?: any[];
    scenariosPath?: string;
  } = {}
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.resolve(__dirname, '../../../ai-engine/pipeline.py');
    
    // Write agent config to temp file so Python can read it
    const tmpDir = os.tmpdir();
    const configPath = path.join(tmpDir, `agenteval_config_${Date.now()}.json`);
    fs.writeFileSync(configPath, JSON.stringify(agentConfig));
    
    // Build command args
    const args = [pythonScriptPath, '--config', configPath, '--mode', mode];
    
    if (options.count) {
      args.push('--count', String(options.count));
    }
    
    if (mode === 'evaluate' || mode === 'generate-scenarios') {
      args.push('--generate');
    }
    
    if (mode === 'adaptive' && options.previousResults) {
      const prevResultsPath = path.join(tmpDir, `agenteval_prev_${Date.now()}.json`);
      fs.writeFileSync(prevResultsPath, JSON.stringify(options.previousResults));
      args.push('--previous-results', prevResultsPath);
    }
    
    if (options.scenariosPath) {
      args.push('--scenarios', options.scenariosPath);
    }
    
    const outputPath = path.join(tmpDir, `agenteval_output_${Date.now()}.json`);
    args.push('--output', outputPath);
    
    console.log(`Running Python pipeline: python3 ${args.join(' ')}`);
    
    const pythonProcess = spawn('python3', args, {
      cwd: path.dirname(pythonScriptPath),
      env: { ...process.env }
    });
    
    let stdoutData = '';
    let stderrData = '';
    
    // Lazy load getIo to prevent index.ts from starting the server in CLI mode
    let io: any = { emit: () => {} };
    if (!process.env.CLI_MODE) {
      try {
        const { getIo } = require('../index');
        io = getIo();
      } catch (e) {
        // Fallback for CLI
      }
    }

    const runId = options.runId || 'unknown';
    
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      console.log(`[python-stdout] ${output}`);
      io.emit('evaluation_log', { runId, type: 'stdout', message: output });
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrData += output;
      console.error(`[python-stderr] ${output}`);
      io.emit('evaluation_log', { runId, type: 'stderr', message: output });
    });
    
    pythonProcess.on('close', (code) => {
      // Clean up temp config file
      try { fs.unlinkSync(configPath); } catch {}
      
      if (code === 0) {
        // Try to parse the JSON output
        try {
          const startMarker = '---AGENTEVAL_OUTPUT_JSON_START---';
          const endMarker = '---AGENTEVAL_OUTPUT_JSON_END---';
          
          const startIndex = stdoutData.indexOf(startMarker);
          const endIndex = stdoutData.indexOf(endMarker);
          
          if (startIndex !== -1 && endIndex !== -1) {
            const jsonStr = stdoutData.substring(startIndex + startMarker.length, endIndex).trim();
            const result = JSON.parse(jsonStr);
            resolve(result);
          } else if (fs.existsSync(outputPath)) {
            // Fallback: read from output file
            const result = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
            try { fs.unlinkSync(outputPath); } catch {}
            resolve(result);
          } else {
            resolve({ raw: stdoutData });
          }
        } catch (parseErr) {
          console.error('Failed to parse Python output:', parseErr);
          resolve({ raw: stdoutData, parseError: String(parseErr) });
        }
      } else {
        const errorMsg = `Python script exited with code ${code}.\nEvaluation: ${options.evaluationId || 'unknown'}\nStderr: ${stderrData.slice(0, 2000)}`;
        console.error(`[pythonRunner] ${errorMsg}`);
        reject(new Error(errorMsg));
      }
    });
    
    pythonProcess.on('error', (err) => {
      try { fs.unlinkSync(configPath); } catch {}
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });
  });
};

// Legacy compat
export const runPythonEvaluation = async (evaluationId: string, runId: string) => {
  // This legacy method is kept for backward compatibility but
  // new code should use runPythonPipeline directly
  return runPythonPipeline('evaluate', {}, { evaluationId, runId });
};

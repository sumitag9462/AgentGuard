import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getIo } from '../index';

export const runPythonEvaluation = async (evaluationId: string, runId: string) => {
  return new Promise((resolve, reject) => {
    // Resolve paths relative to this file's location in the source tree.
    // In dev mode (tsx), __dirname is backend/src/services/
    // In compiled mode, __dirname is backend/dist/services/
    // ai-engine is always a sibling of backend/ at the repo root.
    const aiEnginePath = path.resolve(__dirname, '../../../ai-engine');
    const pythonScriptPath = path.join(aiEnginePath, 'pipeline.py');

    // Use the project virtual environment Python interpreter
    const venvPythonUnix = path.join(aiEnginePath, 'venv', 'bin', 'python');
    const venvPythonWin = path.join(aiEnginePath, 'venv', 'Scripts', 'python.exe');

    let pythonExecutable: string;
    if (fs.existsSync(venvPythonUnix)) {
      pythonExecutable = venvPythonUnix;
    } else if (fs.existsSync(venvPythonWin)) {
      pythonExecutable = venvPythonWin;
    } else {
      // Fallback to system python3 only if venv not found
      console.warn('Warning: ai-engine venv not found, falling back to system python3');
      pythonExecutable = 'python3';
    }

    console.log(`[pythonRunner] Using Python: ${pythonExecutable}`);
    console.log(`[pythonRunner] Script: ${pythonScriptPath}`);
    console.log(`[pythonRunner] CWD: ${aiEnginePath}`);

    const pythonProcess = spawn(pythonExecutable, [pythonScriptPath, '--cached'], {
      cwd: aiEnginePath
    });

    let stdoutData = '';
    let stderrData = '';

    const io = getIo();

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      
      // Parse for live events
      const lines = output.split('\n');
      for (const line of lines) {
        try {
          if (line.trim().startsWith('{"event"')) {
            const parsed = JSON.parse(line.trim());
            io.emit(parsed.event, { runId, ...parsed });
          }
        } catch (e) {
          // ignore parsing errors for normal text lines
        }
      }
      
      // Stream raw logs to frontend
      io.emit('evaluation_log', { runId, type: 'stdout', message: output });
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrData += output;
      io.emit('evaluation_log', { runId, type: 'stderr', message: output });
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(stdoutData);
      } else {
        const errorMsg = `Python script exited with code ${code}.\nEvaluation: ${evaluationId}\nStderr: ${stderrData.slice(0, 2000)}`;
        console.error(`[pythonRunner] ${errorMsg}`);
        reject(new Error(errorMsg));
      }
    });

    pythonProcess.on('error', (err) => {
      const errorMsg = `Failed to spawn Python process: ${err.message}`;
      console.error(`[pythonRunner] ${errorMsg}`);
      reject(new Error(errorMsg));
    });
  });
};

import { spawn } from 'child_process';
import path from 'path';
import { getIo } from '../index'; // we will export our socket.io instance from index.ts

export const runPythonEvaluation = async (evaluationId: string, runId: string) => {
  return new Promise((resolve, reject) => {
    // Determine path to the python script
    // Note: Assuming we are running inside the backend folder, and ai-engine is a sibling directory.
    const pythonScriptPath = path.resolve(__dirname, '../../../ai-engine/pipeline.py');
    const pythonEnv = path.resolve(__dirname, '../../../ai-engine/venv/bin/python');
    
    // Fallback to "python3" or "python" if venv doesn't exist, but here we assume venv exists
    const pythonProcess = spawn('python3', [pythonScriptPath, '--cached'], {
      cwd: path.dirname(pythonScriptPath)
    });

    let stdoutData = '';
    let stderrData = '';

    const io = getIo();

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
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
        reject(new Error(`Python script exited with code ${code}. Stderr: ${stderrData}`));
      }
    });
  });
};

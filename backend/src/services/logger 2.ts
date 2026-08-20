import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(__dirname, '../../../logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFile = path.join(LOG_DIR, 'agent-eval.log');

export interface LogEntry {
  timestamp?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  component: string;
  event: string;
  requestId?: string;
  evaluationId?: string;
  agentId?: string;
  scenarioId?: string;
  jobId?: string;
  status?: string;
  duration?: number;
  errorCode?: string;
  message?: string;
  [key: string]: any;
}

export const logger = {
  log: (entry: LogEntry) => {
    const timestamp = new Date().toISOString();
    const logObj = { timestamp, ...entry };
    
    // Simple secret filtering
    const logStr = JSON.stringify(logObj).replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]');
    
    // Also log to console in dev mode
    if (process.env.NODE_ENV !== 'test') {
      const color = entry.level === 'error' ? '\x1b[31m' : entry.level === 'warn' ? '\x1b[33m' : '\x1b[32m';
      console.log(`${color}[${timestamp}] [${entry.component}] ${entry.event}\x1b[0m`, entry.message || '');
    }
    
    fs.appendFileSync(logFile, logStr + '\n');
  },
  
  info: (entry: Omit<LogEntry, 'level'>) => logger.log({ ...entry, level: 'info' } as LogEntry),
  error: (entry: Omit<LogEntry, 'level'>) => logger.log({ ...entry, level: 'error' } as LogEntry),
  warn: (entry: Omit<LogEntry, 'level'>) => logger.log({ ...entry, level: 'warn' } as LogEntry),
};

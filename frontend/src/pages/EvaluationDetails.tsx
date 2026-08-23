import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Warning, Bug, ShieldWarning, PlayCircle, Spinner, CaretLeft } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import { useSocketEvents, socketManager } from '../lib/socket';

export default function EvaluationDetails() {
  const { id } = useParams();
  
  // Use polling for live updates as fallback, but rely on socket for instantaneous UI
  const { data: evalRun, mutate } = useSWR(`/evaluations/${id}`, fetcher, { refreshInterval: 5000 });
  const { data: results } = useSWR(evalRun?.status === 'COMPLETED' ? `/evaluations/${id}/results` : null, fetcher);
  
  const [progress, setProgress] = useState(0);
  const [liveLog, setLiveLog] = useState<{type: string, msg: string}[]>([]);

  useEffect(() => {
    if (evalRun?.runId) {
      const room = `evaluation:${evalRun.runId}`;
      socketManager.joinRoom(room);
      return () => {
        socketManager.leaveRoom(room);
      };
    }
  }, [evalRun?.runId]);

  // Socket updates

  // Socket updates
  useSocketEvents({
    'evaluation_progress': (data: any) => {
      if (data.runId === evalRun?.runId) {
        setProgress(p => Math.min(100, p + (100 / (evalRun?.totalScenarios || 10))));
        setLiveLog(prev => [...prev.slice(-20), { type: 'info', msg: `Scenario ${data.completedScenarios || 'completed'}` }]);
      }
    },
    'evaluation_log': (data: any) => {
      if (data.runId === evalRun?.runId || data.agentId === evalRun?.agentId) {
        setLiveLog(prev => [...prev.slice(-20), { type: data.type, msg: data.message }]);
      }
      if (data.type === 'complete' || data.message?.includes('Evaluation complete')) {
        setProgress(100);
        mutate(); // refetch evaluation to get COMPLETED status
      }
    }
  });

  if (!evalRun) return <div className="p-12 text-center"><Spinner className="animate-spin inline-block text-3xl" /></div>;

  const isRunning = evalRun.status === 'PENDING' || evalRun.status === 'RUNNING';

  if (isRunning) {
    return (
      <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
        <header className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-white">EVALUATION #{evalRun.evaluationId || evalRun._id}</h1>
                <span className="text-[10px] uppercase font-mono bg-info-muted text-info px-2 py-0.5 rounded border border-info/30 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" /> Running
                </span>
              </div>
              <p className="text-content-secondary">Agent: {evalRun.agentId} v{evalRun.version}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold">{Math.round(progress)}%</div>
            </div>
          </div>
          {/* Main Progress Bar */}
          <div className="w-full h-1.5 bg-panel-hover rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 gap-6 min-h-0">
          <div className="glass-panel rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-panel-hover/50">
              <div className="text-xs font-bold uppercase tracking-widest text-content-muted flex items-center gap-2">
                <PlayCircle weight="fill" /> Live Execution Trace
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs flex flex-col gap-2">
              {liveLog.length === 0 && <div className="text-content-muted">Waiting for worker to start...</div>}
              {liveLog.map((log, i) => (
                <div key={i} className={`flex gap-3 ${log.type === 'stderr' ? 'text-critical' : 'text-content-secondary'}`}>
                  <span className="opacity-50 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                  <span className="break-all">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETED VIEW
  const score = evalRun.scorecard?.overall || evalRun.reliability || 0;
  
  return (
    <div className="flex flex-col gap-8 pb-12 max-w-6xl mx-auto">
      <Link to="/app/evaluations" className="text-sm font-medium text-content-muted hover:text-white transition-colors flex items-center gap-1 w-fit">
        <CaretLeft /> Back to History
      </Link>
      <header className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-white">Evaluation Result</h1>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${evalRun.status === 'COMPLETED' ? 'bg-safe-muted text-safe border-safe/30' : 'bg-critical-muted text-critical border-critical/30'}`}>
                {evalRun.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-content-secondary font-mono">
              <span>Eval ID: {evalRun.evaluationId || evalRun._id}</span>
              <span>•</span>
              <span>Agent: {evalRun.agentId} v{evalRun.version}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-content-muted uppercase tracking-wider mb-1">Reliability Score</div>
            <div className={`text-4xl font-bold ${score >= 90 ? 'text-safe' : score >= 70 ? 'text-orange-500' : 'text-critical'}`}>
              {score}%
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-content-muted mb-1">Total Scenarios</div>
            <div className="text-2xl font-bold text-white">{evalRun.totalScenarios || evalRun.scenarioSnapshot?.length || 0}</div>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-content-muted mb-1">Failed Tests</div>
            <div className="text-2xl font-bold text-critical">{evalRun.failedTests || 0}</div>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-content-muted mb-1">Duration</div>
            <div className="text-2xl font-bold text-white">{(evalRun.durationMs ? (evalRun.durationMs/1000).toFixed(1) : '0')}s</div>
          </div>
        </div>
      </div>
      
      <div className="glass-panel p-6 rounded-xl flex flex-col gap-6">
        <div className="text-xs font-bold uppercase tracking-widest text-content-muted">Scenario Execution Results</div>
        {results?.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {results.map((res: any, i: number) => (
              <div key={i} className="py-3 flex items-start justify-between">
                <div>
                  <div className="font-medium text-white">{res.testId}</div>
                  <div className="text-sm text-content-secondary mt-1">{res.rationale || (res.passed ? 'Passed execution' : 'Failed guardrail validation')}</div>
                </div>
                <div className={`px-2 py-1 text-xs font-bold rounded ${res.passed ? 'bg-safe/20 text-safe' : 'bg-critical/20 text-critical'}`}>
                  {res.passed ? 'PASS' : 'FAIL'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-content-muted">Detailed results not available.</div>
        )}
      </div>
    </div>
  );
}

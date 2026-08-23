import { Link } from 'react-router-dom';
import { ShieldCheck, PlayCircle, Clock, Spinner } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';

export default function Evaluations() {
  const { data: evaluations = [], isLoading } = useSWR<any[]>('/evaluations', fetcher);

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-6xl mx-auto">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Evaluations</h1>
          <p className="text-content-secondary">Live execution suites and past runs.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Spinner className="animate-spin text-4xl text-accent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {evaluations.map((evalRun) => (
            <div key={evalRun.evaluationId || evalRun._id} className="glass-panel p-6 rounded-xl flex flex-col justify-between group hover:border-accent/30 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck weight="fill" className={evalRun.status === 'COMPLETED' ? "text-safe" : "text-content-muted"} />
                    <span className="text-sm font-medium text-content-secondary">
                      {new Date(evalRun.timestamp || evalRun.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${evalRun.status === 'RUNNING' ? 'bg-info-muted text-info border-info/30' : evalRun.status === 'COMPLETED' ? 'bg-safe-muted text-safe border-safe/30' : 'bg-critical-muted text-critical border-critical/30'}`}>
                    {evalRun.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Eval: {evalRun.evaluationId || evalRun._id}</h3>
                <p className="text-sm text-content-secondary mb-4">Agent ID: {evalRun.agentId} • Score: {evalRun.reliability || evalRun.scorecard?.overall || 0}%</p>
                <div className="text-xs text-content-muted font-mono">
                  Tests: {evalRun.passedTests}/{evalRun.totalTests} passed • {evalRun.criticalFailures} critical
                </div>
              </div>
              <div className="pt-6 mt-6 border-t border-border-subtle flex items-center justify-between">
                <Link to={`/app/evaluations/${evalRun.evaluationId || evalRun._id}`} className="text-sm font-bold text-accent hover:text-accent-strong transition-colors flex items-center gap-1">
                  View Results <PlayCircle weight="fill" />
                </Link>
              </div>
            </div>
          ))}
          {evaluations.length === 0 && (
            <div className="col-span-2 text-center py-12 text-content-muted">
              No evaluations found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { WarningOctagon, ChartLineUp, Spinner } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';

export default function Failures() {
  const { data: failures = [], isLoading } = useSWR<any[]>('/failures', fetcher);

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-6xl mx-auto">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Failure Intelligence</h1>
          <p className="text-content-secondary">Root cause analysis of agentic failures.</p>
        </div>
      </header>

      <div className="glass-panel p-6 rounded-xl flex flex-col gap-6">
        <div className="text-xs font-bold uppercase tracking-widest text-content-muted flex items-center gap-2">
          <ChartLineUp /> Recent Incidents
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Spinner className="animate-spin text-2xl text-accent" />
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {failures.map((f) => (
              <Link key={f.failureId || f._id} to={`/app/failures/${f.failureId || f._id}`} className="flex items-center justify-between py-4 group hover:bg-panel-hover -mx-4 px-4 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${f.severity === 'CRITICAL' ? 'bg-critical-muted text-critical' : f.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                    <WarningOctagon weight="fill" className="text-xl" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-critical transition-colors">{f.reason || 'Unknown Failure'}</div>
                    <div className="text-xs text-content-secondary font-mono">Agent: {f.agentId} • Scenario: {f.scenarioId || 'N/A'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-widest text-content-muted">Severity</div>
                    <div className={`text-sm font-medium ${f.severity === 'CRITICAL' ? 'text-critical' : 'text-white'}`}>{f.severity}</div>
                  </div>
                </div>
              </Link>
            ))}
            {failures.length === 0 && (
              <div className="text-center py-8 text-content-muted">
                No failures detected yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

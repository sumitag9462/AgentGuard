import { useParams, Link } from 'react-router-dom';
import { WarningOctagon, Info, Code, MagnifyingGlass, Spinner, CaretLeft } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';

export default function FailureDetails() {
  const { id } = useParams();
  const { data: failure, isLoading } = useSWR(`/failures/${id}`, fetcher);

  if (isLoading) return <div className="p-12 text-center"><Spinner className="animate-spin inline-block text-3xl" /></div>;
  if (!failure) return <div className="p-12 text-center text-red-400">Failure record not found</div>;

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-5xl mx-auto">
      <Link to="/app/failures" className="text-sm font-medium text-content-muted hover:text-white transition-colors flex items-center gap-1 w-fit">
        <CaretLeft /> Back to Intelligence
      </Link>
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${failure.severity === 'CRITICAL' ? 'bg-critical-muted text-critical' : 'bg-orange-500/20 text-orange-500'}`}>
            <WarningOctagon weight="fill" className="text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">{failure.type || 'SAFETY FAILURE'}</h1>
            <p className="text-sm text-content-secondary">{failure.reason || 'Agent behavior violated evaluation rules.'}</p>
          </div>
        </div>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl">
          <div className="text-[10px] uppercase font-bold tracking-widest text-content-muted mb-1">Severity</div>
          <div className={`text-lg font-semibold ${failure.severity === 'CRITICAL' ? 'text-critical' : 'text-orange-500'}`}>{failure.severity}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl">
          <div className="text-[10px] uppercase font-bold tracking-widest text-content-muted mb-1">Agent</div>
          <div className="text-lg font-semibold text-white truncate">{failure.agentId}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl">
          <div className="text-[10px] uppercase font-bold tracking-widest text-content-muted mb-1">Eval Run</div>
          <div className="text-lg font-mono text-info truncate">#{failure.runId || failure.evaluationId}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl">
          <div className="text-[10px] uppercase font-bold tracking-widest text-content-muted mb-1">Tool Involved</div>
          <div className="text-lg font-mono text-white truncate">{failure.context?.toolName || 'N/A'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle bg-panel-hover flex items-center gap-2">
              <Code /> <h2 className="font-bold text-white text-sm">Execution Context</h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-content-muted mb-2">Scenario / Prompt</h3>
                <div className="bg-background p-4 rounded-lg text-sm text-content-secondary border border-border-subtle">
                  {failure.scenario || failure.context?.scenario || 'No scenario text available.'}
                </div>
              </div>
              
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-content-muted mb-2">Expected Behavior</h3>
                <div className="bg-safe-muted/50 p-4 rounded-lg text-sm text-safe border border-safe/30">
                  {failure.expectedBehavior || 'Agent must follow guardrails.'}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-content-muted mb-2">Actual Behavior</h3>
                <div className="bg-critical-muted/50 p-4 rounded-lg text-sm text-critical border border-critical/30">
                  {failure.actualBehavior || failure.reason}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-xl border border-critical/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <WarningOctagon weight="fill" className="text-8xl text-critical" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2 relative z-10 flex items-center gap-2">
              <Info /> Analysis
            </h3>
            <p className="text-sm text-content-secondary relative z-10 leading-relaxed">
              {failure.analysis || "The agent failed to adhere to the requested policy guardrails during execution."}
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl">
             <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <MagnifyingGlass /> Evidence Trace
            </h3>
            {failure.traceId ? (
              <Link to={`/app/traces/${failure.traceId}?eval=${failure.evaluationId}`} className="block w-full text-center bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-strong transition-colors">
                View Full Trace
              </Link>
            ) : (
              <div className="text-sm text-content-muted text-center py-4">No trace available for this failure.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

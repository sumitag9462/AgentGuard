import { useParams, useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, Clock, CaretLeft, Spinner, ChatTeardrop, Wrench, ShieldWarning } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';

export default function TraceViewer() {
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const { data: trace, isLoading } = useSWR(`/traces/${testId}`, fetcher);

  if (isLoading) return <div className="p-12 text-center"><Spinner className="animate-spin inline-block text-3xl" /></div>;
  if (!trace) return <div className="p-12 text-center text-red-400">Trace not found for {testId}</div>;

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-5xl mx-auto">
      <button onClick={() => window.history.back()} className="text-sm font-medium text-content-muted hover:text-white transition-colors flex items-center gap-1 w-fit">
        <CaretLeft /> Back
      </button>

      <header className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-accent-muted flex items-center justify-center text-accent">
          <MagnifyingGlass weight="fill" className="text-xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Execution Trace</h1>
          <div className="flex items-center gap-2 text-xs text-content-secondary font-mono">
            <span>Test ID: {testId}</span>
            <span>•</span>
            <span>Agent: {trace.agentId}</span>
          </div>
        </div>
      </header>

      <div className="glass-panel p-6 rounded-xl flex flex-col gap-6">
        <div className="text-xs font-bold uppercase tracking-widest text-content-muted flex items-center gap-2 border-b border-border-subtle pb-4">
          <Clock /> Event Timeline
        </div>
        
        <div className="flex flex-col gap-4 pl-4 border-l border-border-subtle ml-2 relative">
          {trace.events?.map((evt: any, idx: number) => (
            <div key={idx} className="relative">
              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-panel border-2 border-border-strong flex items-center justify-center">
                {evt.type === 'tool_call' ? <Wrench className="text-info text-[10px]" weight="fill" /> : 
                 evt.type === 'llm_response' ? <ChatTeardrop className="text-accent text-[10px]" weight="fill" /> :
                 evt.type === 'violation' ? <ShieldWarning className="text-critical text-[10px]" weight="fill" /> :
                 <div className="w-1.5 h-1.5 rounded-full bg-content-muted" />}
              </div>
              <div className="bg-panel-hover p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold uppercase text-content-secondary">{evt.type || 'Event'}</div>
                  <div className="text-[10px] text-content-muted">{new Date(evt.timestamp).toLocaleTimeString()}</div>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap text-white break-all">{typeof evt.data === 'string' ? evt.data : JSON.stringify(evt.data, null, 2)}</pre>
              </div>
            </div>
          ))}
          {!trace.events?.length && <div className="text-content-muted text-sm">No events recorded in this trace.</div>}
        </div>
      </div>
    </div>
  );
}

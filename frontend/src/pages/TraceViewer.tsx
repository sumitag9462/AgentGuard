import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
import TraceGraph from '../components/traces/TraceGraph';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import type { Trace } from '../types';

export default function TraceViewer() {
  const { id } = useParams(); // this is the testId
  const navigate = useNavigate();
  
  const { data: trace, isLoading } = useSWR<Trace>(`/traces/${id}`, fetcher);

  if (isLoading) {
    return <div className="p-8 text-center text-content-secondary">Loading trace...</div>;
  }

  if (!trace) {
    return <div className="text-critical p-8">Trace not found.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-panel border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-panel-hover transition-colors"
          >
            <CaretLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-content-primary">Execution Trace</h1>
            <p className="text-[13px] text-content-secondary font-mono">Test ID: {trace.testId}</p>
          </div>
        </div>
      </div>

      {/* Trace Graph Container */}
      <div className="flex-1 rounded-lg border border-border-subtle bg-canvas overflow-hidden relative">
        <TraceGraph trace={trace} />
        
        {/* We will let TraceGraph handle its own internal node selection state or omit the static overlay for now */}
      </div>
    </div>
  );
}

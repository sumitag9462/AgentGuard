import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft, Play, Bug, Stop, Clock } from '@phosphor-icons/react';
import TraceGraph from '../components/traces/TraceGraph';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import type { Trace } from '../types';

export default function TraceViewer() {
  const { id } = useParams(); // this is the testId
  const navigate = useNavigate();
  
  const { data: trace, isLoading } = useSWR<Trace>(`/traces/${id}`, fetcher);
  
  const [replayState, setReplayState] = useState<'IDLE' | 'PLAYING' | 'FINISHED'>('IDLE');
  const [activeEventIndex, setActiveEventIndex] = useState<number>(-1);

  // Replay Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (replayState === 'PLAYING' && trace && trace.events.length > 0) {
      interval = setInterval(() => {
        setActiveEventIndex(prev => {
          if (prev >= trace.events.length - 1) {
            setReplayState('FINISHED');
            return prev;
          }
          return prev + 1;
        });
      }, 1000); // 1 second per node reveal
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [replayState, trace]);

  const handleStartReplay = useCallback(() => {
    setReplayState('PLAYING');
    setActiveEventIndex(-1); // Will tick to 0 immediately
  }, []);

  const handleStopReplay = useCallback(() => {
    setReplayState('IDLE');
    setActiveEventIndex(-1);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto p-8 text-center mt-20">
        <div className="w-8 h-8 rounded-full border-2 border-content-muted border-t-accent animate-spin mx-auto" />
        <div className="text-content-secondary font-mono text-sm">Loading execution trace...</div>
      </div>
    );
  }

  if (!trace || !trace.events || trace.events.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto p-8 text-center mt-20">
        <div className="text-content-secondary p-8 border border-border-subtle bg-surface rounded-md">
          <Bug className="w-10 h-10 text-content-muted mx-auto mb-4" />
          <h2 className="text-lg font-bold text-content-primary mb-2">No Trace Data</h2>
          <p>This evaluation did not record execution steps for this scenario.</p>
        </div>
      </div>
    );
  }

  // Count errors
  const errorCount = trace.events.filter(e => e.status === 'danger').length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 max-w-350 mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 bg-surface border border-border-subtle p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-panel border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-panel-hover transition-colors"
          >
            <CaretLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-content-primary">Execution Trace</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-[11px] text-content-secondary font-mono bg-canvas px-2 py-0.5 rounded border border-border-subtle">ID: {trace.testId}</span>
              <span className="text-[11px] text-content-muted flex items-center gap-1"><Clock className="w-3 h-3" /> {trace.events.length} steps recorded</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {errorCount > 0 && replayState === 'IDLE' && (
            <div className="text-xs font-bold text-critical bg-critical-muted px-3 py-1.5 rounded-full border border-critical/20 flex items-center gap-2">
              <Bug weight="fill" /> {errorCount} Failure{errorCount !== 1 ? 's' : ''} Detected
            </div>
          )}
          
          {replayState === 'PLAYING' ? (
            <Button variant="secondary" onClick={handleStopReplay}>
              <Stop className="w-4 h-4 mr-2" weight="fill" /> Stop Replay
            </Button>
          ) : (
            <Button variant="primary" onClick={handleStartReplay} className={replayState === 'FINISHED' ? 'bg-panel text-content-primary' : 'shadow-glow-accent'}>
              <Play className="w-4 h-4 mr-2" weight="fill" /> {replayState === 'FINISHED' ? 'Replay Trace' : 'Follow the Failure'}
            </Button>
          )}
        </div>
      </div>

      {/* Trace Graph Container */}
      <div className="flex-1 rounded-lg border border-border-strong bg-[#0F0F13] overflow-hidden relative shadow-inner">
        <TraceGraph 
          trace={trace} 
          activeEventIndex={replayState === 'IDLE' ? -1 : activeEventIndex}
          isReplaying={replayState === 'PLAYING' || replayState === 'FINISHED'}
        />
      </div>
    </div>
  );
}

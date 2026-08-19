import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft, ShieldCheck, Warning, MapTrifold, Target } from '@phosphor-icons/react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import type { Failure } from '../types';

export default function FailureDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: failure } = useSWR<Failure>(`/failures/${id}`, fetcher);

  if (!failure) {
    return <div className="text-content-secondary">Loading failure details...</div>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-panel border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-panel-hover transition-colors"
          >
            <CaretLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-content-primary">Failure: {failure.failureType}</h1>
              <Badge variant={failure.severity === 'CRITICAL' ? 'danger' : failure.severity === 'HIGH' ? 'warning' : 'default'}>
                {failure.severity}
              </Badge>
              {failure.riskScore !== undefined && (
                <Badge variant={failure.riskScore >= 80 ? 'danger' : failure.riskScore >= 50 ? 'warning' : 'default'}>
                  Risk Score: {failure.riskScore}/100
                </Badge>
              )}
            </div>
            <p className="text-[13px] text-content-secondary font-mono mt-1">
              Test ID: {failure.testId} • Category: {failure.category}
            </p>
          </div>
        </div>
        
        <Button variant="secondary" onClick={() => navigate(`/app/traces/${failure.testId}`)}>
          <MapTrifold className="w-4 h-4 mr-2" />
          View Full Trace
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2 flex flex-col gap-10">
          <section>
            <h2 className="text-[11px] font-bold text-content-secondary mb-3 uppercase tracking-widest">Attack Scenario / User Input</h2>
            <div className="p-4 rounded-md bg-canvas border border-border-subtle text-[13px] text-content-primary font-mono whitespace-pre-wrap leading-relaxed">
              {failure.userInput}
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-bold text-content-secondary mb-3 uppercase tracking-widest">Root Cause Analysis</h2>
            <div className="text-[15px] text-content-primary leading-relaxed border-l-2 border-critical pl-4">
              {failure.rootCause || failure.reason || 'No root cause analysis available.'}
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-bold text-content-secondary mb-3 uppercase tracking-widest">Evidence from Trace</h2>
            <div className="flex flex-col gap-0 divide-y divide-border-subtle border-y border-border-subtle">
              {failure.evidence && failure.evidence.length > 0 ? (
                failure.evidence.map((ev, idx) => (
                  <div key={idx} className="py-4 overflow-hidden">
                    <div className="text-[11px] text-content-muted font-mono uppercase tracking-wider mb-2">{ev.type}</div>
                    <pre className="text-[11px] text-content-primary whitespace-pre-wrap font-mono bg-panel p-3 rounded-md border border-border-subtle">
                      {JSON.stringify(ev, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="py-4 text-[13px] text-content-secondary">No specific evidence snippets captured.</div>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-10">
          <section>
            <h2 className="text-[11px] font-bold text-content-secondary mb-3 uppercase tracking-widest">Expected vs Actual</h2>
            <div className="flex flex-col gap-6">
              <div>
                <div className="text-safe text-[13px] font-semibold mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Expected Behavior
                </div>
                <div className="text-[13px] text-content-primary">
                  {failure.expectedBehavior || 'Not specified'}
                </div>
              </div>
              
              <div>
                <div className="text-critical text-[13px] font-semibold mb-2 flex items-center gap-2">
                  <Warning className="w-4 h-4" /> Actual Behavior
                </div>
                <div className="text-[13px] text-content-primary">
                  {failure.actualBehavior || failure.reason || 'Not specified'}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-bold text-content-secondary mb-3 uppercase tracking-widest">Remediation</h2>
            <div className="p-4 rounded-md bg-warning-muted border border-warning/20">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <p className="text-[13px] text-content-primary leading-relaxed">
                  {failure.recommendation || 'Update system prompt and tool constraints to address this failure pattern.'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

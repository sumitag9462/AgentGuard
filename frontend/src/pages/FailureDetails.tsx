import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft, ShieldCheck, Warning, MapTrifold, Target, ArrowRight, Bug, Info, TextIndent, MagnifyingGlass, CircleNotch } from '@phosphor-icons/react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import type { Failure, Evaluation } from '../types';
import { ReplayPanel } from '../components/integration/ReplayPanel';

export default function FailureDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: failure, isLoading } = useSWR<Failure>(`/failures/${id}`, fetcher);
  const { data: evaluation } = useSWR<Evaluation>(failure ? `/evaluations/${failure.evaluationId}` : null, fetcher);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto p-8 text-center mt-20">
        <CircleNotch className="w-8 h-8 text-accent animate-spin mx-auto opacity-50" />
        <div className="text-content-secondary font-mono text-sm">Loading forensic data...</div>
      </div>
    );
  }

  if (!failure) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto p-8 text-center mt-20">
        <div className="text-critical p-4 border border-critical-muted bg-critical-muted/20 rounded-md">
          Failure not found or could not be loaded.
        </div>
      </div>
    );
  }

  const isBlocking = failure.severity === 'CRITICAL' || failure.severity === 'HIGH';

  return (
    <div className="flex flex-col gap-10 max-w-300 mx-auto pb-20">
      {/* Replay Panel */}
      {evaluation && failure.testId && (
        <div className="mb-6">
          <ReplayPanel 
            evaluationId={evaluation._id || evaluation.id || failure.evaluationId} 
            traceId={failure.testId} 
            originalFailure={failure.failureType}
          />
        </div>
      )}

      {/* Forensic Header */}
      <div className="flex flex-col gap-6">
        <button 
          onClick={() => navigate('/app/failures')}
          className="flex items-center gap-2 text-[13px] font-bold tracking-wider uppercase text-content-muted hover:text-content-primary transition-colors self-start"
        >
          <CaretLeft className="w-4 h-4" /> Back to Registry
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge variant={failure.severity === 'CRITICAL' ? 'danger' : failure.severity === 'HIGH' ? 'warning' : 'default'} className="font-mono text-[11px] px-2.5 py-1">
                {failure.severity}
              </Badge>
              <div className="text-xs font-mono font-bold text-content-muted uppercase tracking-widest px-2 py-1 bg-surface border border-border-subtle rounded">
                {failure.failureType}
              </div>
              <div className="text-xs font-mono font-semibold text-content-muted bg-panel px-2 py-1 rounded border border-border-subtle">
                ID: {failure.testId}
              </div>
            </div>
            
            <h1 className="text-display text-content-primary mb-6 leading-tight">
              {failure.category || 'Agent Behavior Violation'}
            </h1>

            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-content-muted uppercase">Agent</span>
                <span className="font-medium text-content-primary flex items-center gap-2 cursor-pointer hover:text-accent transition-colors">
                  {failure.agentId} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-content-muted uppercase">Version</span>
                <span className="font-mono text-content-primary">{evaluation?.version || 'Unknown'}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-content-muted uppercase">Scenario</span>
                <span className="font-medium text-content-primary">{failure.category}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 min-w-70">
            <div className={`p-4 rounded-lg border ${isBlocking ? 'bg-critical-muted/50 border-critical/30' : 'bg-surface border-border-strong'}`}>
              <div className="text-label text-content-muted uppercase mb-2">Release Impact</div>
              <div className={`text-sm font-bold flex items-center gap-2 ${isBlocking ? 'text-critical' : 'text-content-primary'}`}>
                {isBlocking ? <Warning weight="fill" className="w-5 h-5" /> : <Info weight="fill" className="w-5 h-5 text-info" />}
                {isBlocking ? 'BLOCKS RELEASE' : 'MONITORING ONLY'}
              </div>
              {isBlocking && (
                <div className="text-xs text-content-secondary mt-2 leading-relaxed opacity-90">
                  This failure violates configured quality gates for severity '{failure.severity}'.
                </div>
              )}
            </div>
            <Button variant="primary" onClick={() => navigate(`/app/traces/${failure.testId}`)} className="w-full justify-center h-12 shadow-glow-accent">
              <MapTrifold className="w-4 h-4 mr-2" />
              Follow Execution Trace
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="surface-raised p-6 rounded-lg border border-border-strong shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
        <h2 className="text-label text-content-muted uppercase mb-3 flex items-center gap-2">
          <Bug className="w-4 h-4" /> What Happened?
        </h2>
        <div className="text-lg text-content-primary leading-relaxed font-medium">
          {failure.reason || `The agent failed to complete the ${failure.category} scenario due to a ${failure.failureType} violation.`}
        </div>
        {failure.rootCause && (
          <div className="mt-4 p-3 bg-critical/10 border border-critical/20 rounded-md text-sm text-critical-strong flex items-start gap-3">
            <MagnifyingGlass className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-1">Root Cause</div>
              <div className="opacity-90">{failure.rootCause}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Expected vs Actual & Evidence */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          <Card className="p-0 overflow-hidden border-border-strong shadow-sm">
            <div className="p-4 border-b border-border-subtle bg-surface">
              <h2 className="text-label font-bold text-content-primary uppercase tracking-widest flex items-center gap-2">
                <TextIndent className="w-4 h-4" /> Behavioral Divergence
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
              <div className="p-6 bg-safe/5">
                <div className="flex items-center gap-2 text-safe font-bold text-xs uppercase tracking-wider mb-4">
                  <ShieldCheck weight="fill" className="w-4 h-4" /> Expected Behavior
                </div>
                <div className="text-sm text-content-primary leading-relaxed bg-canvas p-4 rounded-md border border-safe/20 font-mono shadow-inner whitespace-pre-wrap min-h-30">
                  {failure.expectedBehavior || 'Not explicitly defined for this scenario.'}
                </div>
              </div>
              
              <div className="p-6 bg-critical/5">
                <div className="flex items-center gap-2 text-critical font-bold text-xs uppercase tracking-wider mb-4">
                  <Warning weight="fill" className="w-4 h-4" /> Actual Behavior
                </div>
                <div className="text-sm text-content-primary leading-relaxed bg-canvas p-4 rounded-md border border-critical/20 font-mono shadow-inner whitespace-pre-wrap min-h-30">
                  {failure.actualBehavior || failure.reason || 'Unexpected termination or unknown behavior.'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-border-strong p-6">
            <h2 className="text-label font-bold text-content-primary uppercase tracking-widest mb-6 flex items-center gap-2">
              <MagnifyingGlass className="w-4 h-4" /> Context & Evidence
            </h2>
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-content-muted uppercase tracking-wider">User Input / Scenario Trigger</div>
                <div className="bg-panel p-4 rounded-md border border-border-subtle font-mono text-[13px] text-content-primary whitespace-pre-wrap">
                  {failure.userInput || 'No explicit user input recorded.'}
                </div>
              </div>

              {failure.evidence && failure.evidence.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                  <div className="text-xs font-bold text-content-muted uppercase tracking-wider mb-2">Technical Trace Evidence</div>
                  <div className="flex flex-col gap-3">
                    {failure.evidence.map((ev, idx) => (
                      <div key={idx} className="bg-canvas border border-border-subtle rounded-md overflow-hidden shadow-sm">
                        <div className="px-3 py-2 bg-surface border-b border-border-subtle flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-content-secondary uppercase">{ev.type || 'Event Log'}</span>
                        </div>
                        <pre className="p-3 text-[11px] font-mono text-content-primary overflow-x-auto">
                          {JSON.stringify(ev, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Metadata & Remediation */}
        <div className="flex flex-col gap-6">
          
          <Card className="border-border-strong bg-surface">
            <h2 className="text-label font-bold text-content-primary uppercase tracking-widest mb-4">
              Remediation Action
            </h2>
            <div className="p-4 rounded-md bg-warning-muted border border-warning/20">
              <div className="flex items-start gap-3">
                <Target weight="fill" className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-content-primary leading-relaxed font-medium">
                  {failure.recommendation || 'Review system constraints and tool definitions to address this failure pattern.'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-border-subtle">
            <h2 className="text-label font-bold text-content-primary uppercase tracking-widest mb-4">
              Failure Details
            </h2>
            <div className="flex flex-col gap-4 text-[13px]">
              <div className="flex justify-between py-2 border-b border-border-subtle">
                <span className="text-content-muted">Evaluation Run</span>
                <span className="font-mono text-content-primary cursor-pointer hover:text-accent transition-colors" onClick={() => navigate(`/app/evaluations/${failure.evaluationId}`)}>
                  {failure.evaluationId.substring(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border-subtle">
                <span className="text-content-muted">Detection Time</span>
                <span className="font-mono text-content-primary">
                  {new Date(failure.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border-subtle">
                <span className="text-content-muted">Policy Involved</span>
                <span className="font-mono text-content-primary text-right max-w-37.5 truncate">
                  {failure.policyInvolved || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-content-muted">Risk Score</span>
                <span className="font-mono text-content-primary font-bold">
                  {failure.riskScore !== undefined ? `${failure.riskScore}/100` : 'Unknown'}
                </span>
              </div>
            </div>
          </Card>
          
        </div>
      </div>
    </div>
  );
}

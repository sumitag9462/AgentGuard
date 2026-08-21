import { ShieldCheck, Spinner, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Circle, Clock } from '@phosphor-icons/react';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';

import { Section, SectionHeader } from '../components/ui/Section';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import api, { fetcher } from '../services/apiClient';
import { useState } from 'react';
import type { Evaluation, Failure, Agent } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);

  const { data: evaluations, mutate: mutateEvals } = useSWR<Evaluation[]>('/evaluations', fetcher, { refreshInterval: 5000 });
  const { data: failures } = useSWR<Failure[]>('/failures', fetcher, { refreshInterval: 5000 });
  const { data: agents } = useSWR<Agent[]>('/agents', fetcher);

  const completedEvals = evaluations?.filter(e => e.status === 'COMPLETED' && e.totalTests > 0) || [];
  const latestEval = completedEvals[0];
  const previousEval = completedEvals[1];

  const scorecard = latestEval?.scorecard;
  const qualityGate = latestEval?.qualityGate;
  const activeAgent = agents?.find(a => a.agentId === latestEval?.agentId) || agents?.[0];

  const handleRunEvaluation = async () => {
    const defaultAgentId = activeAgent?.agentId || 'agt-001';
    const defaultVersion = (activeAgent as any)?.version || activeAgent?.latestVersion || 'v1';

    try {
      setIsStarting(true);
      const res = await api.post('/evaluations', {
        agentId: defaultAgentId,
        version: defaultVersion,
        count: 100
      });
      mutateEvals();
      navigate(`/app/evaluations/${res.data._id || res.data.id || res.data.runId}`);
    } catch (err) {
      console.error('Failed to start evaluation:', err);
      alert('Failed to trigger new evaluation run.');
    } finally {
      setIsStarting(false);
    }
  };

  if (!evaluations || !failures || !agents) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-8 h-8 rounded-full border-2 border-content-muted border-t-accent animate-spin mb-4" />
        <div className="text-content-secondary font-mono text-sm">Initializing Command Center...</div>
      </div>
    );
  }

  if (!latestEval) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldCheck className="w-16 h-16 text-content-muted mb-4" />
        <h2 className="text-xl font-semibold text-content-primary">YOUR RELIABILITY BASELINE HASN'T BEEN ESTABLISHED</h2>
        <p className="text-content-secondary mt-2 mb-6 max-w-md">Connect an agent and run your first evaluation.</p>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={() => navigate('/app/agents/connect')}>Connect Agent</Button>
          <Button onClick={handleRunEvaluation} disabled={isStarting}>
            {isStarting ? <Spinner className="animate-spin w-5 h-5 mr-2" /> : null}
            Run Evaluation
          </Button>
        </div>
      </div>
    );
  }

  const reliabilityDelta = previousEval ? (latestEval.reliability - previousEval.reliability).toFixed(1) : '0.0';
  const isPositive = parseFloat(reliabilityDelta) >= 0;

  const getDimensionColor = (score: number) => {
    if (score >= 90) return 'text-safe';
    if (score >= 75) return 'text-warning';
    return 'text-critical';
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end animate-fade-in stagger-1 mb-2 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-display text-content-primary">AGENTEVAL / COMMAND CENTER</h1>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <div className="flex flex-col">
              <span className="text-label text-content-muted">Agent</span>
              <span className="text-body-sm font-medium text-content-primary">{activeAgent?.name || 'Unknown Agent'}</span>
            </div>
            <div className="w-px h-8 bg-border-subtle" />
            <div className="flex flex-col">
              <span className="text-label text-content-muted">Version</span>
              <span className="text-mono-sm text-content-primary">{latestEval.version}</span>
            </div>
            <div className="w-px h-8 bg-border-subtle" />
            <div className="flex flex-col">
              <span className="text-label text-content-muted">Last Evaluation</span>
              <span className="text-body-sm text-content-secondary flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 2 min ago
              </span>
            </div>
            <div className="w-px h-8 bg-border-subtle" />
            <div className="flex flex-col">
              <span className="text-label text-content-muted">Environment</span>
              <span className="text-body-sm text-content-secondary">Production candidate</span>
            </div>
            <div className="w-px h-8 bg-border-subtle" />
            <div className="flex flex-col justify-center">
              <Badge variant={qualityGate?.passed ? 'success' : 'danger'}>
                {qualityGate?.passed ? 'HEALTHY' : 'BLOCKED'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={handleRunEvaluation} disabled={isStarting}>
            {isStarting ? <Spinner className="animate-spin w-4 h-4 mr-2" /> : null}
            Run Evaluation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Primary Trust Metric & Release Status */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Section variant="panel" padding="lg" className="flex flex-col md:flex-row items-center justify-between border-border-strong bg-linear-to-br from-panel to-black relative overflow-hidden h-full">
            <div className={`absolute -right-32 -top-32 w-64 h-64 rounded-full blur-[100px] opacity-20 ${qualityGate?.passed ? 'bg-safe' : 'bg-critical'}`} />
            
            <div className="flex flex-col items-center md:items-start text-center md:text-left z-10 w-full md:w-1/2">
              <span className="text-label text-content-muted mb-2">Overall Reliability</span>
              <div className="flex items-baseline gap-3">
                <span className="text-display text-content-primary font-mono">
                  <AnimatedNumber value={latestEval.reliability} />
                </span>
                <span className="text-h2 text-content-muted font-mono">/ 100</span>
              </div>
              {previousEval && (
                <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${isPositive ? 'text-safe' : 'text-critical'}`}>
                  {isPositive ? <ArrowUpRight weight="bold" /> : <ArrowDownRight weight="bold" />}
                  <span>{Math.abs(parseFloat(reliabilityDelta))} vs previous evaluation</span>
                </div>
              )}
            </div>

            <div className="hidden md:block w-px h-24 bg-border-subtle mx-8 z-10" />

            <div className="flex flex-col items-center md:items-end text-center md:text-right mt-6 md:mt-0 z-10 w-full md:w-1/2">
              <span className="text-label text-content-muted mb-3">Release Status</span>
              <div className="flex items-center gap-3">
                {qualityGate?.passed ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-safe" weight="fill" />
                    <span className="text-h2 text-safe tracking-tight">SAFE TO SHIP</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-critical" weight="fill" />
                    <span className="text-h2 text-critical tracking-tight">BLOCKED</span>
                  </>
                )}
              </div>
              {qualityGate && !qualityGate.passed ? (
                <div className="flex flex-col items-end mt-3">
                  <span className="text-[13px] text-critical font-medium">
                    {qualityGate.violations?.length || 1} policy violation
                  </span>
                  <span className="text-body-sm text-content-secondary mt-1 max-w-xs text-right">
                    Tool Accuracy is {scorecard?.tool_accuracy?.toFixed(0) || 0}, Required: {85}
                  </span>
                  <Button variant="ghost" className="mt-2 text-critical border-critical/30 h-8" onClick={() => navigate(`/app/evaluations/${latestEval.id || latestEval._id}`)}>
                    Inspect violation
                  </Button>
                </div>
              ) : (
                <span className="text-[13px] text-safe mt-3 font-medium">All gates passed</span>
              )}
            </div>
          </Section>
        </div>

        {/* Risk Prediction / Summary */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Section variant="panel" padding="md" className="h-full flex flex-col">
            <SectionHeader title="Execution Risk" description="Vulnerabilities by severity." className="mb-4" />
            <div className="flex flex-col gap-3 flex-1 justify-center">
              {[
                { label: 'Critical', count: latestEval.criticalFailures || 0, color: 'text-critical', dot: 'text-critical' },
                { label: 'High', count: latestEval.failureAnalysis?.patterns?.filter(p => p.high_count && p.high_count > 0).length || 0, color: 'text-warning', dot: 'text-warning' },
                { label: 'Medium', count: latestEval.failureAnalysis?.patterns?.filter(p => !p.critical_count && !p.high_count && p.severity_score > 0).length || 0, color: 'text-info', dot: 'text-info' },
                { label: 'Low', count: latestEval.failureAnalysis?.patterns?.filter(p => p.severity_score === 0).length || 0, color: 'text-content-secondary', dot: 'text-content-muted' },
              ].map((risk) => (
                <div key={risk.label} className="flex justify-between items-center py-2 border-b border-border-subtle last:border-0">
                  <div className="flex items-center gap-2">
                    <Circle className={`w-2.5 h-2.5 ${risk.dot}`} weight="fill" />
                    <span className="text-body-sm text-content-secondary font-medium">{risk.label}</span>
                  </div>
                  <span className={`text-mono font-bold ${risk.count > 0 ? risk.color : 'text-content-muted'}`}>
                    {risk.count}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Reliability Dimensions */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Section variant="panel" padding="md" className="h-full">
            <SectionHeader title="Reliability Profile" />
            <div className="flex flex-col gap-4">
              {scorecard && Object.entries({
                'Task Success': scorecard.task_success,
                'Goal Adherence': scorecard.goal_adherence,
                'Safety': scorecard.safety,
                'Tool Accuracy': scorecard.tool_accuracy,
                'Robustness': scorecard.robustness,
                'Recovery': scorecard.recovery,
              }).map(([name, score]) => (
                <div key={name} className="flex flex-col gap-1.5 group">
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-content-secondary group-hover:text-content-primary transition-colors">{name}</span>
                    <span className={`text-mono-sm font-medium ${getDimensionColor(score)}`}>
                      {score.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-panel-hover rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-ui-out"
                      style={{ 
                        width: `${score}%`, 
                        backgroundColor: score >= 90 ? 'var(--color-safe)' : score >= 75 ? 'var(--color-warning)' : 'var(--color-critical)' 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Why isn't this 100%? (Recent Failures) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Section variant="panel" padding="md" className="h-full flex flex-col">
            <SectionHeader 
              title="Why isn't this 100%?" 
              description="Top reliability losses and primary causes."
              action={<Button variant="secondary" className="h-8 text-xs" onClick={() => navigate('/app/evaluations')}>Investigate failures</Button>} 
            />
            
            <div className="flex-1">
              <Table>
                <TableHead>
                  <TableHeader>Severity</TableHeader>
                  <TableHeader>Failure Type</TableHeader>
                  <TableHeader>Scenario Input</TableHeader>
                </TableHead>
                <TableBody>
                  {failures.length > 0 ? failures.slice(0, 5).map((failure) => (
                    <TableRow key={failure.id || failure._id} onClick={() => navigate(`/app/failures/${failure.id || failure._id}`)}>
                      <TableCell>
                        <Badge variant={failure.riskScore && failure.riskScore >= 80 ? 'danger' : failure.riskScore && failure.riskScore >= 40 ? 'warning' : 'default'}>
                          {failure.riskScore && failure.riskScore >= 80 ? 'CRITICAL' : failure.riskScore && failure.riskScore >= 40 ? 'HIGH' : 'LOW'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-content-primary">{failure.failureType}</TableCell>
                      <TableCell className="text-content-secondary truncate max-w-50 text-xs">{failure.userInput}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-content-muted py-8 text-sm">
                        No recent failures detected.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>
        </div>
      </div>
      
      {/* Recent Evaluations */}
      <div className="mt-4">
        <h3 className="text-h3 text-content-primary mb-4">Recent Evaluations</h3>
        <Table>
          <TableHead>
            <TableHeader>Run</TableHeader>
            <TableHeader>Version</TableHeader>
            <TableHeader>Scenarios</TableHeader>
            <TableHeader>Reliability</TableHeader>
            <TableHeader>Failures</TableHeader>
            <TableHeader>Duration</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableHead>
          <TableBody>
            {completedEvals.slice(0, 3).map((run) => (
              <TableRow key={run.id || run._id} onClick={() => navigate(`/app/evaluations/${run.id || run._id}`)}>
                <TableCell className="font-mono text-xs text-info">{run.runId}</TableCell>
                <TableCell className="font-mono text-xs text-content-secondary">{run.version}</TableCell>
                <TableCell className="text-body-sm">{run.totalTests}</TableCell>
                <TableCell>
                  <span className={`font-mono text-sm ${run.reliability >= 90 ? 'text-safe' : run.reliability >= 75 ? 'text-warning' : 'text-critical'}`}>
                    {run.reliability}%
                  </span>
                </TableCell>
                <TableCell>
                  <span className={run.criticalFailures > 0 ? 'text-critical font-medium' : 'text-content-muted'}>
                    {run.failed} ({run.criticalFailures} crit)
                  </span>
                </TableCell>
                <TableCell className="text-body-sm text-content-secondary">{run.durationSeconds}s</TableCell>
                <TableCell>
                  <Badge variant={run.status === 'COMPLETED' ? 'success' : run.status === 'FAILED' ? 'danger' : 'warning'}>{run.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { ShieldCheck, Spinner, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Circle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Card, CardHeader } from '../components/ui/Card';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { RiskPredictionWidget } from '../components/ui/RiskPredictionWidget';
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
  const { data: predictionData } = useSWR(activeAgent ? "/agents/" + activeAgent.agentId + "/risk-predictions" : null, fetcher);

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
    return <div className="text-content-muted font-mono text-sm animate-pulse">Initializing Command Center...</div>;
  }

  if (!latestEval) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldCheck className="w-16 h-16 text-content-muted mb-4" />
        <h2 className="text-xl font-semibold text-content-primary">No Evaluation Data</h2>
        <p className="text-content-secondary mt-2 mb-6 max-w-md">Run your first reliability evaluation to generate the command center dashboard.</p>
        <Button onClick={handleRunEvaluation} disabled={isStarting}>
          {isStarting ? <Spinner className="animate-spin w-5 h-5 mr-2" /> : null}
          Start Evaluation
        </Button>
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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-end animate-fade-in stagger-1 mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-content-primary tracking-tight">Reliability Command Center</h1>
          <p className="text-[13px] text-content-secondary mt-1 font-mono uppercase tracking-wider">
            {activeAgent?.name || 'Unknown Agent'} • {latestEval.version}
          </p>
        </div>
        <Button onClick={handleRunEvaluation} disabled={isStarting}>
          {isStarting ? <Spinner className="animate-spin w-4 h-4 mr-2" /> : null}
          Run Evaluation
        </Button>
      </div>

      {/* Primary Trust Metric */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <Card className="flex flex-col md:flex-row items-center justify-between border-border-strong bg-linear-to-br from-panel to-black relative overflow-hidden">
          {/* Subtle background glow based on pass/fail */}
          <div className={`absolute -right-32 -top-32 w-64 h-64 rounded-full blur-[100px] opacity-20 ${qualityGate?.passed ? 'bg-safe' : 'bg-critical'}`} />
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left z-10">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-content-muted mb-2">Overall Reliability</span>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-bold tracking-tighter text-content-primary font-mono">
                {latestEval.reliability.toFixed(1)}
              </span>
              <span className="text-xl text-content-muted font-mono">/ 100</span>
            </div>
            {previousEval && (
              <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${isPositive ? 'text-safe' : 'text-critical'}`}>
                {isPositive ? <ArrowUpRight weight="bold" /> : <ArrowDownRight weight="bold" />}
                <span>{Math.abs(parseFloat(reliabilityDelta))} vs previous version</span>
              </div>
            )}
          </div>

          <div className="hidden md:block w-px h-24 bg-border-subtle mx-8 z-10" />

          <div className="flex flex-col items-center md:items-end text-center md:text-right mt-6 md:mt-0 z-10">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-content-muted mb-3">Release Status</span>
            <div className="flex items-center gap-3">
              {qualityGate?.passed ? (
                <>
                  <CheckCircle className="w-8 h-8 text-safe" weight="fill" />
                  <span className="text-2xl font-bold text-safe tracking-tight">SAFE TO SHIP</span>
                </>
              ) : (
                <>
                  <XCircle className="w-8 h-8 text-critical" weight="fill" />
                  <span className="text-2xl font-bold text-critical tracking-tight">BLOCK RELEASE</span>
                </>
              )}
            </div>
            {qualityGate && !qualityGate.passed && (
              <span className="text-[13px] text-critical mt-2 font-medium">
                {qualityGate.violations?.length || 1} CI/CD Gate Violation(s)
              </span>
            )}
          </div>
        </Card>
      </motion.div>

      <div className="mb-6">
        <RiskPredictionWidget predictions={predictionData?.predictions || []} />
      </div>

      {/* Grid: Risk & Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Dimensions - Technical List */}
        <Card className="md:col-span-2 animate-fade-in stagger-2">
          <CardHeader title="Reliability Dimensions" description="Score breakdown across primary evaluation vectors." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {scorecard && Object.entries({
              'Task Success': scorecard.task_success,
              'Safety': scorecard.safety,
              'Goal Adherence': scorecard.goal_adherence,
              'Tool Accuracy': scorecard.tool_accuracy,
              'Robustness': scorecard.robustness,
              'Recovery': scorecard.recovery,
            }).map(([name, score]) => (
              <div key={name} className="flex justify-between items-center group">
                <span className="text-[13px] text-content-secondary group-hover:text-content-primary transition-colors">{name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1 bg-panel-hover rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-ui-out`} 
                      style={{ 
                        width: `${score}%`, 
                        backgroundColor: score >= 90 ? 'var(--color-safe)' : score >= 75 ? 'var(--color-warning)' : 'var(--color-critical)' 
                      }} 
                    />
                  </div>
                  <span className={`text-[13px] font-mono font-medium w-9 text-right ${getDimensionColor(score)}`}>
                    {score.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Risk Summary */}
        <Card className="animate-fade-in stagger-3">
          <CardHeader title="Execution Risk" description="Vulnerabilities by severity." />
          <div className="flex flex-col gap-3">
            {[
              { label: 'Critical', count: latestEval.criticalFailures || 0, color: 'text-critical', dot: 'text-critical' },
              { label: 'High', count: latestEval.failureAnalysis?.patterns?.filter(p => p.high_count && p.high_count > 0).length || 0, color: 'text-warning', dot: 'text-warning' },
              { label: 'Medium', count: latestEval.failureAnalysis?.patterns?.filter(p => !p.critical_count && !p.high_count && p.severity_score > 0).length || 0, color: 'text-info', dot: 'text-info' },
              { label: 'Low', count: latestEval.failureAnalysis?.patterns?.filter(p => p.severity_score === 0).length || 0, color: 'text-content-secondary', dot: 'text-content-muted' },
            ].map((risk) => (
              <div key={risk.label} className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                  <Circle className={`w-2.5 h-2.5 ${risk.dot}`} weight="fill" />
                  <span className="text-[13px] text-content-secondary font-medium">{risk.label}</span>
                </div>
                <span className={`text-sm font-mono font-bold ${risk.count > 0 ? risk.color : 'text-content-muted'}`}>
                  {risk.count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Why isn't this 100%? (Recent Failures) */}
      <Card className="animate-fade-in stagger-4">
        <CardHeader 
          title="Why isn't this 100%?" 
          description="Most critical recent failures requiring investigation." 
          action={<Button variant="ghost" onClick={() => navigate('/app/evaluations')}>View All Traces</Button>} 
        />
        <Table>
          <TableHead>
            <TableHeader>Severity</TableHeader>
            <TableHeader>Failure Type</TableHeader>
            <TableHeader>Scenario Input</TableHeader>
            <TableHeader>Run</TableHeader>
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
                <TableCell className="text-content-secondary truncate max-w-xs">{failure.userInput}</TableCell>
                <TableCell className="font-mono text-xs text-content-muted">{failure.id}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-content-muted py-8">
                  No recent failures detected. Agent is performing flawlessly.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

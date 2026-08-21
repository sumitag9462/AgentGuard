import { motion } from "framer-motion";

import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft, ShieldCheck, CheckCircle, XCircle, Lightning, Download, Spinner, Warning } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Section, SectionHeader } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import api from '../services/apiClient';
import type { Evaluation, Failure } from '../types';
import { useState } from 'react';

export default function EvaluationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isAdaptiveRunning, setIsAdaptiveRunning] = useState(false);

  const { data: evaluation } = useSWR<Evaluation>(`/evaluations/${id}`, fetcher, { 
    refreshInterval: (data) => (data?.status === 'RUNNING' || data?.status === 'PENDING' ? 3000 : 0)
  });
  
  const { data: agent } = useSWR<any>(evaluation ? `/agents/${evaluation.agentId}` : null, fetcher);
  
  const { data: failures } = useSWR<Failure[]>(`/evaluations/${id}/failures`, fetcher);
  
  const { data: scenarioResults } = useSWR<{ results: any[], totalScenarios: number, passed: number, failed: number }>(
    `/evaluations/${id}/results`,
    fetcher
  );
  
  const isRunning = evaluation?.status === 'RUNNING' || evaluation?.status === 'PENDING';

  const handleAdaptiveTesting = async () => {
    setIsAdaptiveRunning(true);
    try {
      await api.post(`/evaluations/${id}/adaptive`, { count: 100 });
      alert('Adaptive testing queued. A new evaluation run has been started targeting the discovered weaknesses.');
      navigate('/app/evaluations');
    } catch (err) {
      console.error('Failed to start adaptive testing:', err);
      alert('Failed to trigger adaptive testing.');
    } finally {
      setIsAdaptiveRunning(false);
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    window.open(`${baseUrl}/evaluations/${id}/export?format=${format}`, '_blank');
  };

  if (!evaluation) {
    return <div className="text-content-secondary animate-pulse p-8">Loading evaluation details...</div>;
  }

  const { scorecard, qualityGate, coverage } = evaluation;

  // Scorecard data for bar chart
  const scorecardData = scorecard ? [
    { name: 'Task Success', score: scorecard.task_success, fill: 'var(--color-safe)' },
    { name: 'Safety', score: scorecard.safety, fill: scorecard.safety >= 90 ? 'var(--color-safe)' : 'var(--color-warning)' },
    { name: 'Goal Adherence', score: scorecard.goal_adherence, fill: 'var(--color-safe)' },
    { name: 'Tool Accuracy', score: scorecard.tool_accuracy, fill: 'var(--color-safe)' },
    { name: 'Recovery', score: scorecard.recovery, fill: 'var(--color-safe)' },
    { name: 'Robustness', score: scorecard.robustness, fill: 'var(--color-safe)' },
    { name: 'Efficiency', score: scorecard.efficiency, fill: 'var(--color-safe)' },
  ] : [];

  const pipelineStages = [
    { name: 'Scenario Generation', state: isRunning ? 'done' : 'done' },
    { name: 'Agent Execution', state: isRunning ? 'active' : 'done' },
    { name: 'Trace Analysis', state: isRunning ? 'pending' : 'done' },
    { name: 'Reliability Scoring', state: isRunning ? 'pending' : 'done' },
    { name: 'Release Decision', state: isRunning ? 'pending' : 'done' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end animate-fade-in stagger-1 border-b border-border-subtle pb-6">
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/app/evaluations')}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-panel border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-panel-hover transition-colors shrink-0"
          >
            <CaretLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-display text-content-primary tracking-tight">EVALUATION {evaluation.runId}</h1>
              <Badge variant={evaluation.status === 'COMPLETED' ? 'success' : evaluation.status === 'FAILED' ? 'danger' : 'warning'}>
                {evaluation.status}
              </Badge>
              {evaluation.isAdaptive && <Badge variant="warning">Adaptive</Badge>}
            </div>
            
            <div className="flex items-center gap-4 mt-3 font-mono text-[13px] text-content-secondary">
              <div className="flex gap-2">
                <span className="text-content-muted">Agent</span>
                <span className="text-content-primary">{evaluation.agentId}</span>
              </div>
              <span>•</span>
              <div className="flex gap-2">
                <span className="text-content-muted">Version</span>
                <span className="text-content-primary">{evaluation.version}</span>
              </div>
              <span>•</span>
              <div className="flex gap-2">
                <span className="text-content-muted">Duration</span>
                <span className="text-content-primary">{evaluation.durationSeconds}s</span>
              </div>
            </div>
            
            {((evaluation as any).visibilityMode || agent?.integration?.visibilityMode) === 'BLACK_BOX' && (
              <p className="text-[11px] text-warning mt-2 opacity-80">
                Note: Tool-level behavior not observed. Evaluated based on agent output only.
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="ghost" onClick={() => handleExport('json')}>
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button variant="ghost" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          {evaluation.status === 'COMPLETED' && failures && failures.length > 0 && (
            <Button onClick={handleAdaptiveTesting} disabled={isAdaptiveRunning}>
              <Lightning className="w-4 h-4 mr-2" />
              {isAdaptiveRunning ? 'Starting...' : 'Adaptive Tests'}
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline Progress */}
      <motion.div 
        className="flex items-center justify-between bg-panel p-4 rounded-md border border-border-subtle overflow-x-auto hide-scrollbar"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {pipelineStages.map((stage, idx) => (
          <motion.div 
            key={idx} 
            className="flex items-center gap-3 shrink-0"
            variants={{
              hidden: { opacity: 0, x: -10 },
              visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
            }}
          >
            <div className="flex items-center gap-2">
              {stage.state === 'done' ? (
                <CheckCircle className="w-4 h-4 text-safe" weight="fill" />
              ) : stage.state === 'active' ? (
                <Spinner className="w-4 h-4 text-info animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-border-strong" />
              )}
              <span className={`text-[11px] font-bold uppercase tracking-wider ${stage.state === 'active' ? 'text-info' : stage.state === 'done' ? 'text-content-primary' : 'text-content-muted'}`}>
                {stage.name}
              </span>
            </div>
            {idx < pipelineStages.length - 1 && (
              <motion.div 
                className="w-8 md:w-16 h-px bg-border-strong mx-2 origin-left" 
                initial={{ scaleX: 0 }} 
                animate={{ scaleX: 1 }} 
                transition={{ duration: 0.3, delay: 0.1 + (idx * 0.1) }} 
              />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Infrastructure failure banner (§5.6) */}
      {evaluation.status === 'FAILED' && (
        <div className="bg-warning/10 border border-warning/30 rounded-md p-4 flex items-start gap-3 mt-6">
          <XCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">EVALUATION FAILED</p>
            <p className="text-xs text-content-secondary mt-1">
              The evaluation engine could not complete this run. {(evaluation as any).errorMessage || 'Reason unknown.'}
            </p>
            <p className="text-xs text-content-muted mt-1">
              This does not mean the agent failed its tests.
            </p>
          </div>
        </div>
      )}
      
      {evaluation.status === 'PARTIAL' && (
        <div className="bg-warning/10 border border-warning/30 rounded-md p-4 flex items-start gap-3 mt-6">
          <Warning className="w-5 h-5 text-warning shrink-0 mt-0.5" weight="fill" />
          <div>
            <p className="text-sm font-semibold text-warning">EVALUATION INCOMPLETE</p>
            <p className="text-xs text-content-secondary mt-1">
              {(evaluation as any).errorMessage || 'The evaluation did not finish all scenarios.'}
            </p>
            <p className="text-xs text-content-muted mt-1">
              Reliability score may be unavailable for partial evaluations.
            </p>
          </div>
        </div>
      )}

      {/* Summary Score / Release Status */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <Section variant="panel" padding="lg" className="h-full flex items-center justify-between border-border-strong bg-linear-to-br from-panel to-black relative overflow-hidden">
            <div className="flex flex-col items-start z-10 w-1/3">
              <span className="text-label text-content-muted mb-2">Reliability Score</span>
              <div className="flex items-baseline gap-2">
                <span className="text-display text-content-primary font-mono">{evaluation.reliability.toFixed(1)}</span>
                <span className="text-h2 text-content-muted font-mono">/ 100</span>
              </div>
            </div>
            
            <div className="w-px h-16 bg-border-subtle z-10" />
            
            <div className="flex flex-col items-center z-10 w-1/3 text-center">
              <span className="text-label text-content-muted mb-2">Failures</span>
              <div className="flex flex-col items-center">
                <span className={`text-h1 font-mono ${evaluation.failed > 0 ? 'text-critical' : 'text-safe'}`}>
                  {evaluation.failed}
                </span>
                {evaluation.criticalFailures > 0 && (
                  <span className="text-xs text-critical font-medium mt-1">
                    {evaluation.criticalFailures} Critical
                  </span>
                )}
              </div>
            </div>

            <div className="w-px h-16 bg-border-subtle z-10" />

            <div className="flex flex-col items-end z-10 w-1/3 text-right">
              <span className="text-label text-content-muted mb-2">Release Decision</span>
              {qualityGate?.passed ? (
                <div className="flex items-center gap-2 text-safe">
                  <CheckCircle className="w-6 h-6" weight="fill" />
                  <span className="text-h2 font-bold tracking-tight">READY</span>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-1 text-critical">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-6 h-6" weight="fill" />
                    <span className="text-h2 font-bold tracking-tight">BLOCKED</span>
                  </div>
                  <span className="text-xs font-medium">Violated policy</span>
                </div>
              )}
            </div>
          </Section>
        </div>

        <div className="md:col-span-4">
          <Section variant="panel" padding="md" className="h-full flex flex-col justify-center">
            <div className="text-label text-content-muted mb-4">Coverage Summary</div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-content-secondary">Scenarios Run</span>
                <span className="font-mono text-content-primary">{evaluation.totalTests}</span>
              </div>
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-content-secondary">Tool Coverage</span>
                <span className="font-mono text-content-primary">{coverage?.tool_coverage || 0}%</span>
              </div>
              <div className="flex justify-between items-center text-body-sm">
                <span className="text-content-secondary">Policy Coverage</span>
                <span className="font-mono text-content-primary">{coverage?.policy_coverage || 0}%</span>
              </div>
            </div>
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 flex flex-col">
          <Section variant="panel" padding="md" className="h-full">
            <SectionHeader title="Reliability Profile" />
            {scorecard ? (
              <div className="h-64 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scorecardData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '4px' }} cursor={{fill: '#27272a', opacity: 0.4}} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                      {scorecardData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= 90 ? 'var(--color-safe)' : entry.score >= 70 ? 'var(--color-warning)' : 'var(--color-critical)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-content-muted">Profile calculating...</div>
            )}
          </Section>
        </div>

        <div className="lg:col-span-6 flex flex-col">
          {coverage && (
            <Section variant="panel" padding="md" className="h-full">
              <SectionHeader title="Coverage Details" />
              <div className="flex flex-col gap-4 mt-4">
                {[
                  { label: 'Tool Coverage', value: coverage.tool_coverage, detail: `${coverage.tools_tested}/${coverage.tools_total}` },
                  { label: 'Policy Coverage', value: coverage.policy_coverage, detail: `${coverage.policies_tested}/${coverage.policies_total}` },
                  { label: 'Scenario Categories', value: coverage.scenario_coverage, detail: `${coverage.scenario_categories_tested}/${coverage.scenario_categories_total}` },
                  { label: 'Failure Modes', value: coverage.failure_mode_coverage, detail: `${coverage.failure_categories_tested}/${coverage.failure_categories_total}` },
                  { label: 'Critical Actions', value: coverage.critical_action_coverage, detail: `${coverage.critical_actions_tested}/${coverage.critical_actions_total}` },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[13px] mb-1.5">
                      <span className="text-content-secondary font-medium">{item.label}</span>
                      <span className="text-content-muted font-mono text-[11px]">{item.detail} ({item.value}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-panel-hover rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${item.value >= 80 ? 'bg-safe' : item.value >= 50 ? 'bg-warning' : 'bg-critical'}`}
                        style={{ width: `${Math.min(100, item.value)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <SectionHeader title="Evaluation Results" description={`${scenarioResults?.totalScenarios || 0} scenarios — ${scenarioResults?.passed || 0} passed, ${scenarioResults?.failed || 0} failed`} />
        <Table>
          <TableHead>
            <TableHeader>Scenario ID</TableHeader>
            <TableHeader>Category</TableHeader>
            <TableHeader>Severity</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Expected</TableHeader>
            <TableHeader>Actual</TableHeader>
            <TableHeader>Action</TableHeader>
          </TableHead>
          <TableBody>
            {scenarioResults?.results?.map((result: any) => (
              <TableRow key={result.scenarioId}>
                <TableCell className="font-mono text-xs">{result.scenarioId}</TableCell>
                <TableCell><Badge variant={result.category === 'DESTRUCTIVE' ? 'danger' : 'default'}>{result.category}</Badge></TableCell>
                <TableCell>
                  <Badge variant={result.severity === 'CRITICAL' ? 'danger' : result.severity === 'HIGH' ? 'warning' : 'default'}>
                    {result.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    result.status === 'PASS' ? 'success' :
                    result.status === 'INFRASTRUCTURE_ERROR' ? 'warning' :
                    'danger'
                  }>
                    {result.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-content-secondary text-[13px] max-w-xs">
                  <div className="line-clamp-2">{result.expected}</div>
                </TableCell>
                <TableCell className="text-content-secondary text-[13px] max-w-xs">
                  <div className="line-clamp-2">{result.actual}</div>
                </TableCell>
                <TableCell>
                  {result.status === 'FAIL' && result.failureCategory ? (
                    <Button variant="ghost" className="h-8 text-xs" onClick={() => {
                      const failure = failures?.find(f => f.testId === result.scenarioId);
                      if (failure) navigate(`/app/failures/${failure.id || failure._id}`);
                    }}>
                      View Evidence
                    </Button>
                  ) : result.hasTrace ? (
                    <Button variant="ghost" className="h-8 text-xs" onClick={() => navigate(`/app/traces/${result.scenarioId}`)}>
                      View Trace
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {(!scenarioResults?.results || scenarioResults.results.length === 0) && evaluation.status === 'COMPLETED' && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-content-muted">
                  No scenario results available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft, ShieldCheck, Warning, CheckCircle, XCircle, Lightning, Download, Spinner } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader } from '../components/ui/Card';
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
    return <div className="text-zinc-500">Loading evaluation details...</div>;
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

  const handleExportReport = async () => {
    if (!evaluation) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const url = `/api/evaluations/${evaluation._id}/report/download`;
      const fullUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', url) : `http://localhost:4000${url}`;
      
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `agentguard-evaluation-${evaluation._id}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setExportError(err.message || 'Failed to download report.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in stagger-1">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-panel border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-panel-hover transition-colors"
          >
            <CaretLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-content-primary">Run {evaluation.runId}</h1>
              <Badge variant={evaluation.status === 'COMPLETED' ? 'success' : evaluation.status === 'FAILED' ? 'danger' : 'warning'}>
                {evaluation.status}
              </Badge>
              {evaluation.isAdaptive && <Badge variant="warning">Adaptive</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[13px] text-content-secondary font-mono">
                Agent ID: {evaluation.agentId} • Version: {evaluation.version}
              </p>
              {((evaluation as any).visibilityMode || agent?.integration?.visibilityMode) && (
                <Badge variant={((evaluation as any).visibilityMode || agent?.integration?.visibilityMode) === 'BLACK_BOX' ? 'warning' : 'success'}>
                  {((evaluation as any).visibilityMode || agent?.integration?.visibilityMode)}
                </Badge>
              )}
              {isRunning && <div className="text-zinc-500 text-sm text-center">Awaiting evaluation completion...</div>}
            </div>
            {((evaluation as any).visibilityMode || agent?.integration?.visibilityMode) === 'BLACK_BOX' && (
              <p className="text-[11px] text-warning mt-1 opacity-80">
                Note: Tool-level behavior not observed. Evaluated based on agent output only.
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleExport('json')} className="text-content-secondary">
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button variant="secondary" onClick={() => handleExport('csv')} className="text-content-secondary">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          {evaluation.status === 'COMPLETED' && failures && failures.length > 0 && (
            <Button onClick={handleAdaptiveTesting} disabled={isAdaptiveRunning} className="bg-warning hover:bg-warning/80 text-black border-warning font-medium">
              <Lightning className="w-4 h-4 mr-2" />
              {isAdaptiveRunning ? 'Starting...' : 'Run Adaptive Tests'}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(evaluation.status === 'RUNNING' || evaluation.status === 'PENDING') && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
              <Card className="border-info/30 bg-info-muted">
              <div className="flex items-center gap-4">
                <Spinner className="w-8 h-8 text-info animate-spin" />
                <div>
                  <h3 className="text-info font-semibold text-lg">Evaluation in Progress</h3>
                  <p className="text-info/80 text-[13px]">The agent is currently executing the test scenarios in the sandbox environment. This page will update automatically.</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <motion.div layout className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="flex flex-col justify-between p-5">
          <div className="text-content-secondary text-[11px] font-bold uppercase tracking-wider mb-2">Reliability</div>
          <div className="text-4xl font-bold text-content-primary">{evaluation.reliability}%</div>
        </Card>
        <Card className="flex flex-col justify-between p-5">
          <div className="text-content-secondary text-[11px] font-bold uppercase tracking-wider mb-2">Tests Run</div>
          <div className="text-4xl font-bold text-content-primary">{evaluation.totalTests}</div>
        </Card>
        <Card className="flex flex-col justify-between p-5">
          <div className="text-content-secondary text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            Passed <ShieldCheck className="text-safe w-4 h-4" />
          </div>
          <div className="text-4xl font-bold text-safe">{evaluation.passed}</div>
        </Card>
        <Card className="flex flex-col justify-between p-5 border-critical/20 bg-critical-muted">
          <div className="text-critical text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            Critical Failures <Warning className="w-4 h-4" />
          </div>
          <div className="text-4xl font-bold text-critical">{evaluation.criticalFailures}</div>
        </Card>
        {qualityGate && (
          <Card className={`flex flex-col justify-between p-5 ${qualityGate.passed ? 'border-safe/20 bg-safe-muted' : 'border-critical/20 bg-critical-muted'} lg:col-span-1 md:col-span-4 col-span-2`}>
            <div className="text-content-secondary text-[11px] font-bold uppercase tracking-wider mb-2">Quality Gate</div>
            <div className="flex items-center gap-2">
              {qualityGate.passed 
                ? <><CheckCircle className="w-8 h-8 text-safe" weight="fill" /> <span className="text-2xl font-bold text-safe tracking-tight">PASSED</span></>
                : <><XCircle className="w-8 h-8 text-critical" weight="fill" /> <span className="text-2xl font-bold text-critical tracking-tight">FAILED</span></>
              }
            </div>
          </Card>
        )}
      </motion.div>

      <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {scorecard && (
          <Card>
            <CardHeader title="Reliability Scorecard" />
            <div className="h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scorecardData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '4px' }} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {scorecardData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 90 ? 'var(--color-safe)' : entry.score >= 70 ? 'var(--color-warning)' : 'var(--color-critical)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {coverage && (
          <Card>
            <CardHeader title="Test Coverage" />
            <div className="flex flex-col gap-5 mt-4 px-2">
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
                  <div className="w-full h-2.5 bg-panel-hover rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${item.value >= 80 ? 'bg-safe' : item.value >= 50 ? 'bg-warning' : 'bg-critical'}`}
                      style={{ width: `${Math.min(100, item.value)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </motion.div>

      <motion.div layout>
        <Card>
        <CardHeader title="Evaluation Results" />
        <Table className="mt-2">
          <TableHead>
            <TableHeader>Test ID</TableHeader>
            <TableHeader>Category</TableHeader>
            <TableHeader>Severity</TableHeader>
            <TableHeader>Failure Type</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Action</TableHeader>
          </TableHead>
          <TableBody>
            {failures?.map((failure) => (
              <TableRow key={failure.id || failure._id} className="bg-critical-muted hover:bg-critical/10">
                <TableCell className="font-mono text-content-secondary">{failure.testId}</TableCell>
                <TableCell>{failure.category || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={failure.severity === 'CRITICAL' ? 'danger' : failure.severity === 'HIGH' ? 'warning' : 'default'}>
                    {failure.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-critical font-medium">{failure.failureType}</TableCell>
                <TableCell>
                  <Badge variant="danger">FAILED</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" onClick={() => navigate(`/app/failures/${failure.id || failure._id}`)}>
                    View Evidence
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!failures || failures.length === 0) && evaluation.status === 'COMPLETED' && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-safe font-medium">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2" />
                  All tests passed successfully!
                </TableCell>
              </TableRow>
            )}
            {/* For passed tests, we would ideally fetch them if we stored them individually, 
                but for now we just show failures as per standard CI/CD practice */}
          </TableBody>
        </Table>
        </Card>
      </motion.div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { Funnel, MagnifyingGlass, Spinner } from '@phosphor-icons/react';
import useSWR from 'swr';
import api, { fetcher } from '../services/apiClient';
import type { Evaluation, Agent, Scenario } from '../types';
import { useState } from 'react';

export default function Evaluations() {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  
  const { data: evaluations, error, mutate, isLoading } = useSWR<Evaluation[]>('/evaluations', fetcher, { refreshInterval: 5000 });
  const { data: agents } = useSWR<Agent[]>('/agents', fetcher);
  const { data: scenarios } = useSWR<Scenario[]>(selectedAgent ? `/scenarios?agentId=${selectedAgent}` : null, fetcher);

  const handleRunEvaluation = async () => {
    if (!selectedAgent) return;
    try {
      setIsStarting(true);
      const res = await api.post('/evaluations', {
        agentId: selectedAgent,
        version: 'v1.4.2'
      });
      mutate();
      navigate(`/app/evaluations/${res.data._id || res.data.id || res.data.runId}`);
    } catch (err) {
      console.error('Failed to start evaluation:', err);
      alert('Failed to trigger new evaluation run.');
    } finally {
      setIsStarting(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-critical">Cannot load evaluations</h2>
          <p className="text-content-secondary mt-2">The backend service might be down or unreachable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex justify-between items-end border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-display text-content-primary tracking-tight">EVALUATIONS</h1>
          <p className="text-body-sm text-content-secondary mt-1">Evaluation runs across agents and versions.</p>
          <div className="flex gap-4 mt-4 text-xs font-mono text-content-secondary">
            <span>{evaluations?.length || 0} runs</span>
            <span className="text-safe">{evaluations?.filter(e => e.qualityGate?.passed).length || 0} passed</span>
            <span className="text-critical">{evaluations?.filter(e => e.qualityGate && !e.qualityGate.passed).length || 0} blocked</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2 items-center">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="bg-canvas border border-border-subtle rounded-md px-3 py-2 text-sm text-content-primary focus:outline-none focus:border-safe font-mono"
            >
              <option value="">Select agent...</option>
              {agents?.map(a => (
                <option key={a.agentId} value={a.agentId}>{a.name} ({a.agentId})</option>
              ))}
            </select>
            <Button onClick={handleRunEvaluation} disabled={!selectedAgent || !scenarios || scenarios.length === 0 || isStarting}>
              {isStarting ? <Spinner className="animate-spin w-5 h-5 mr-2" /> : null}
              Run Evaluation
            </Button>
          </div>
          {selectedAgent && (!scenarios || scenarios.length === 0) && (
            <span className="text-xs text-content-muted">Generate test scenarios first</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search runs by ID or Agent..." 
              className="w-full bg-canvas border border-border-subtle rounded-md pl-9 pr-4 py-2 text-sm text-content-primary focus:outline-none focus:border-safe transition-all font-mono"
            />
          </div>
          <Button variant="secondary" className="gap-2 h-10">
            <Funnel className="w-4 h-4" /> Filters
          </Button>
        </div>

        <Table loading={isLoading} empty={!isLoading && (!evaluations || evaluations.length === 0)} emptyProps={{ title: 'NO EVALUATIONS YET', description: 'Run your first evaluation to establish a reliability baseline for your agent.' }}>
          <TableHead>
            <TableHeader>Run</TableHeader>
            <TableHeader>Agent / Version</TableHeader>
            <TableHeader>Scenarios</TableHeader>
            <TableHeader>Reliability</TableHeader>
            <TableHeader>Failures</TableHeader>
            <TableHeader>Duration</TableHeader>
            <TableHeader>Release Status</TableHeader>
          </TableHead>
          <TableBody>
            {evaluations?.map((run) => (
              <TableRow key={run.id || run._id} onClick={() => navigate(`/app/evaluations/${run.id || run._id}`)}>
                <TableCell className="font-mono font-medium text-info text-xs">{run.runId}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-content-primary text-sm">
                      {agents?.find(a => a.agentId === run.agentId)?.name || run.agentId}
                    </span>
                    <span className="font-mono text-content-secondary text-xs">{run.version}</span>
                  </div>
                </TableCell>
                <TableCell className="text-content-secondary text-[13px]">{run.totalTests}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm font-medium ${run.reliability >= 90 ? 'text-safe' : run.reliability >= 75 ? 'text-warning' : 'text-critical'}`}>
                      {run.reliability}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {run.failed > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-critical font-medium text-[13px]">{run.failed}</span>
                      {run.criticalFailures > 0 && (
                        <span className="text-[11px] text-critical bg-critical-muted px-1.5 rounded-sm">
                          {run.criticalFailures} crit
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-content-muted text-[13px]">0</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-content-secondary text-xs">{run.durationSeconds}s</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={run.qualityGate?.passed ? 'success' : run.status === 'FAILED' ? 'danger' : 'warning'}>
                      {run.qualityGate?.passed ? 'READY' : 'BLOCKED'}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { Funnel, MagnifyingGlass, Spinner } from '@phosphor-icons/react';
import useSWR from 'swr';
import api, { fetcher } from '../services/apiClient';
import type { Evaluation } from '../types';
import { useState } from 'react';

export default function Evaluations() {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const { data: evaluations, error, mutate, isLoading } = useSWR<Evaluation[]>('/evaluations', fetcher, { refreshInterval: 5000 });

  const handleRunEvaluation = async () => {
    try {
      setIsStarting(true);
      const res = await api.post('/evaluations', {
        agentId: 'agt-001',
        version: 'v1.4.2'
      });
      mutate();
      navigate(`/evaluations/${res.data._id || res.data.id || res.data.runId}`);
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
          <h2 className="text-xl font-semibold text-zinc-200">Cannot load evaluations</h2>
          <p className="text-zinc-500 mt-2">The backend service might be down or unreachable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Evaluations</h1>
          <p className="text-zinc-400 mt-1">History of all CI/CD agent evaluation runs.</p>
        </div>
        <Button onClick={handleRunEvaluation} disabled={isStarting}>
          {isStarting ? <Spinner className="animate-spin w-5 h-5 mr-2" /> : null}
          New Run
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex gap-4 items-center bg-zinc-950/50">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search runs by ID or Agent..." 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <Button variant="secondary" className="gap-2">
            <Funnel className="w-4 h-4" /> Filters
          </Button>
        </div>

        {isLoading ? (
           <div className="p-8 text-center text-zinc-500">Loading evaluations...</div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>Evaluation</TableHeader>
              <TableHeader>Agent</TableHeader>
              <TableHeader>Version</TableHeader>
              <TableHeader>Tests</TableHeader>
              <TableHeader>Passed</TableHeader>
              <TableHeader>Failed</TableHeader>
              <TableHeader>Reliability</TableHeader>
              <TableHeader>Critical</TableHeader>
              <TableHeader>Duration</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableHead>
            <TableBody>
              {evaluations?.map((run) => (
                <TableRow key={run.id || run._id} onClick={() => navigate(`/evaluations/${run.id || run._id}`)}>
                  <TableCell className="font-mono text-zinc-100">{run.runId}</TableCell>
                  <TableCell>
                    {run.agentId === 'agt-001' ? 'Banking Support Agent' : 'Banking Vulnerable Agent'}
                  </TableCell>
                  <TableCell>{run.version}</TableCell>
                  <TableCell>{run.totalTests}</TableCell>
                  <TableCell className="text-emerald-400">{run.passed}</TableCell>
                  <TableCell className={run.failed > 0 ? 'text-rose-400' : 'text-zinc-500'}>{run.failed}</TableCell>
                  <TableCell>
                    <span className={run.reliability >= 90 ? 'text-emerald-400' : run.reliability >= 70 ? 'text-amber-400' : 'text-rose-400'}>
                      {run.reliability}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {run.criticalFailures > 0 ? (
                      <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        {run.criticalFailures}
                      </span>
                    ) : (
                      <span className="text-zinc-500">0</span>
                    )}
                  </TableCell>
                  <TableCell>{run.durationSeconds}s</TableCell>
                  <TableCell>
                    <Badge variant={run.status === 'COMPLETED' ? 'success' : run.status === 'FAILED' ? 'danger' : 'warning'}>{run.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

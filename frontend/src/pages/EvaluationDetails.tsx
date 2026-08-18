import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { CaretLeft, CircleNotch } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import type { Evaluation, Failure } from '../types';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function EvaluationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: evaluation, isLoading: evalLoading, mutate } = useSWR<Evaluation>(`/evaluations/${id}`, fetcher);
  const { data: failures, isLoading: failsLoading, mutate: mutateFailures } = useSWR<Failure[]>(`/evaluations/${id}/failures`, fetcher);

  const [liveProgress, setLiveProgress] = useState({ total: 0, completed: 0, passed: 0, failed: 0 });
  const [liveLog, setLiveLog] = useState<string[]>([]);

  useEffect(() => {
    if (evaluation?.status === 'RUNNING' || evaluation?.status === 'PENDING') {
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const socket = io(socketUrl.replace('/api', ''));
      
      socket.on('test_run_started', (data) => {
        if (data.runId === evaluation.runId) {
          setLiveProgress(p => ({ ...p, total: data.total }));
          setLiveLog(l => [`[${new Date().toLocaleTimeString()}] Test Run Started (${data.total} tests)`, ...l]);
        }
      });
      
      socket.on('test_completed', (data) => {
        if (data.runId === evaluation.runId) {
          setLiveProgress(p => ({ 
            ...p, 
            completed: p.completed + 1,
            passed: data.passed ? p.passed + 1 : p.passed,
            failed: data.passed ? p.failed : p.failed + 1 
          }));
        }
      });

      socket.on('failure_detected', (data) => {
        if (data.runId === evaluation.runId) {
          setLiveLog(l => [`[${new Date().toLocaleTimeString()}] ❌ Failure Detected [${data.severity}]: ${data.type}`, ...l]);
        }
      });
      
      socket.on('test_run_completed', (data) => {
        if (data.runId === evaluation.runId) {
          setLiveLog(l => [`[${new Date().toLocaleTimeString()}] ✅ Test Run Completed`, ...l]);
          mutate(); // refresh data
          mutateFailures();
        }
      });
      
      return () => {
        socket.disconnect();
      };
    }
  }, [evaluation?.status, evaluation?.runId, mutate, mutateFailures]);

  if (evalLoading || failsLoading) {
    return <div className="p-8 text-center text-zinc-500">Loading details...</div>;
  }

  if (!evaluation) {
    return <div className="text-rose-500">Evaluation not found.</div>;
  }

  const isRunning = evaluation.status === 'RUNNING' || evaluation.status === 'PENDING';

  // Aggregate failures breakdown
  const failureBreakdown: Record<string, number> = {};
  if (failures) {
    failures.forEach(f => {
      failureBreakdown[f.failureType] = (failureBreakdown[f.failureType] || 0) + 1;
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb / Back */}
      <button 
        onClick={() => navigate('/evaluations')}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors w-fit"
      >
        <CaretLeft className="w-4 h-4" /> Back to Evaluations
      </button>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Evaluation {evaluation.runId}</h1>
            <Badge variant={evaluation.status === 'COMPLETED' ? 'success' : evaluation.status === 'FAILED' ? 'danger' : 'warning'}>
              {evaluation.status}
              {isRunning && <CircleNotch className="w-3 h-3 ml-2 inline animate-spin" />}
            </Badge>
          </div>
          <p className="text-zinc-400 flex items-center gap-2">
            <span>{evaluation.agentId === 'agt-001' ? 'Banking Support Agent' : 'Banking Vulnerable Agent'}</span>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-sm">{evaluation.version}</span>
            <span className="text-zinc-600">•</span>
            <span>{new Date(evaluation.timestamp).toLocaleString()}</span>
          </p>
        </div>
        <Button variant="secondary" disabled={isRunning}>Export Report</Button>
      </div>

      {isRunning && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-emerald-400">Live Evaluation Progress</span>
            <span className="text-sm text-emerald-400/80">{liveProgress.completed} / {liveProgress.total || '?'} tests</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2.5 transition-all duration-300" 
              style={{ width: `${liveProgress.total > 0 ? (liveProgress.completed / liveProgress.total) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="mt-4 flex gap-4 text-xs font-mono text-zinc-400">
            <div>Passed: <span className="text-emerald-400">{liveProgress.passed}</span></div>
            <div>Failed: <span className="text-rose-500">{liveProgress.failed}</span></div>
          </div>
          
          {liveLog.length > 0 && (
            <div className="mt-4 bg-black/40 rounded p-3 text-xs font-mono text-zinc-400 h-32 overflow-y-auto border border-white/5 flex flex-col gap-1">
              {liveLog.map((log, i) => (
                <div key={i} className={log.includes('❌') ? 'text-rose-400' : log.includes('✅') ? 'text-emerald-400' : ''}>{log}</div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <div className="text-zinc-400 text-sm font-medium mb-2 flex items-center gap-2">Reliability Score</div>
          <div className="text-4xl font-bold text-emerald-400">{isRunning ? '--' : evaluation.reliability}%</div>
        </Card>
        <Card className="flex flex-col justify-between">
          <div className="text-zinc-400 text-sm font-medium mb-2 flex items-center gap-2">Passed Tests</div>
          <div className="text-4xl font-bold text-zinc-50">{isRunning ? '--' : evaluation.passed} <span className="text-zinc-600 text-lg">/ {isRunning ? '--' : evaluation.totalTests}</span></div>
        </Card>
        <Card className="flex flex-col justify-between">
          <div className="text-zinc-400 text-sm font-medium mb-2 flex items-center gap-2">Failed Tests</div>
          <div className="text-4xl font-bold text-rose-500">{isRunning ? '--' : evaluation.failed}</div>
        </Card>
        <Card className="flex flex-col justify-between border-rose-500/20 bg-rose-500/5">
          <div className="text-rose-400 text-sm font-medium mb-2 flex items-center gap-2">Critical Failures</div>
          <div className="text-4xl font-bold text-rose-500">{isRunning ? '--' : evaluation.criticalFailures}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader title="Failure Breakdown" />
            <div className="flex flex-col gap-3">
              {Object.entries(failureBreakdown).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center pb-3 border-b border-white/5 last:border-0">
                  <span className="text-zinc-300">{type}</span>
                  <span className="font-mono text-zinc-100">{count}</span>
                </div>
              ))}
              {Object.keys(failureBreakdown).length === 0 && !isRunning && (
                <div className="text-zinc-500 text-sm text-center">No failures recorded.</div>
              )}
              {isRunning && <div className="text-zinc-500 text-sm text-center">Awaiting evaluation completion...</div>}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden h-full">
            <div className="p-6 pb-4 border-b border-white/5">
              <h3 className="text-lg font-medium text-zinc-100">Test Failures</h3>
              <p className="text-sm text-zinc-400 mt-1">Select a test to view full execution details and traces.</p>
            </div>
            <Table>
              <TableHead>
                <TableHeader>Test ID</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Severity</TableHeader>
                <TableHeader>Scenario</TableHeader>
              </TableHead>
              <TableBody>
                {failures?.map((failure) => (
                  <TableRow key={failure.id || failure._id} onClick={() => navigate(`/failures/${failure.id || failure._id}`)}>
                    <TableCell className="font-mono text-zinc-300">{failure.testId}</TableCell>
                    <TableCell>{failure.failureType}</TableCell>
                    <TableCell>
                      <Badge variant={failure.severity === 'CRITICAL' ? 'danger' : 'warning'}>
                        {failure.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-50 truncate text-zinc-400">
                      {failure.userInput}
                    </TableCell>
                  </TableRow>
                ))}
                {failures?.length === 0 && !isRunning && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-zinc-500 py-6">All tests passed!</TableCell>
                  </TableRow>
                )}
                {isRunning && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-zinc-500 py-6">Evaluation in progress...</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}

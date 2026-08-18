// motion removed
import { ShieldCheck, Warning, Spinner } from '@phosphor-icons/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader } from '../components/ui/Card';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import api, { fetcher } from '../services/apiClient';
import { useState } from 'react';
import type { Evaluation, Failure } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);

  // Fetch real data from backend
  const { data: evaluations, mutate: mutateEvals } = useSWR<Evaluation[]>('/evaluations', fetcher, { refreshInterval: 5000 });
  const { data: failures } = useSWR<Failure[]>('/failures', fetcher, { refreshInterval: 5000 });
  
  // Using a mock reliability trend based on the evaluations if available
  const reliabilityTrend = evaluations ? evaluations.slice(0, 10).reverse().map(e => ({
    version: e.version,
    reliability: e.reliability
  })) : [];

  const latestEval = evaluations?.[0];

  const handleRunEvaluation = async () => {
    try {
      setIsStarting(true);
      const res = await api.post('/evaluations', {
        agentId: 'agt-001',
        version: 'v1.4.2' // Hardcoded version for demo purposes
      });
      mutateEvals(); // optimistically refresh
      navigate(`/evaluations/${res.data._id || res.data.id || res.data.runId}`);
    } catch (err) {
      console.error('Failed to start evaluation:', err);
      alert('Failed to trigger new evaluation run.');
    } finally {
      setIsStarting(false);
    }
  };

  if (!evaluations || !failures) {
    return <div className="text-zinc-400">Loading dashboard data...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Overview of your AI agent reliability and security.</p>
        </div>
        <Button onClick={handleRunEvaluation} disabled={isStarting}>
          {isStarting ? <Spinner className="animate-spin w-5 h-5 mr-2" /> : null}
          Run Evaluation
        </Button>
      </div>

      {/* Summary Metrics */}
      {latestEval && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="flex flex-col justify-between">
            <div className="text-zinc-400 text-sm font-medium mb-2">Overall Reliability</div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-zinc-50">{latestEval.reliability}%</span>
              <span className="text-emerald-500 text-sm mb-1 font-medium">--</span>
            </div>
          </Card>
          <Card className="flex flex-col justify-between">
            <div className="text-zinc-400 text-sm font-medium mb-2">Tests Executed</div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-zinc-50">{latestEval.totalTests}</span>
            </div>
          </Card>
          <Card className="flex flex-col justify-between">
            <div className="text-zinc-400 text-sm font-medium mb-2 flex items-center gap-2">
              Passed <ShieldCheck className="text-emerald-500 w-4 h-4" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-zinc-50">{latestEval.passed}</span>
            </div>
          </Card>
          <Card className="flex flex-col justify-between border-rose-500/20 bg-rose-500/5">
            <div className="text-rose-400 text-sm font-medium mb-2 flex items-center gap-2">
              Critical Failures <Warning className="text-rose-500 w-4 h-4" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-rose-500">{latestEval.criticalFailures}</span>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader title="Reliability Trend" description="Moving average of agent success rate across runs." />
          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reliabilityTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="version" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="reliability" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#18181b', stroke: '#10b981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#10b981' }} 
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Critical Failures */}
        <Card>
          <CardHeader title="Recent Failures" description="Requires immediate attention." />
          <div className="flex flex-col gap-4 mt-2">
            {failures.slice(0, 4).map((failure) => (
              <div key={failure.id || failure._id} className="p-3 rounded-lg bg-zinc-950 border border-white/5 hover:border-rose-500/30 transition-colors cursor-pointer" onClick={() => navigate(`/failures/${failure.id || failure._id}`)}>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="danger">{failure.failureType}</Badge>
                  <span className="text-xs text-zinc-500 font-mono">{failure.testId}</span>
                </div>
                <p className="text-sm text-zinc-300 line-clamp-2">{failure.userInput}</p>
              </div>
            ))}
            {failures.length === 0 && <div className="text-zinc-500 text-sm mt-4 text-center">No recent failures found.</div>}
          </div>
        </Card>
      </div>

      {/* Recent Evaluations */}
      <Card>
        <CardHeader title="Recent Evaluation Runs" action={<Button variant="ghost" onClick={() => navigate('/evaluations')}>View All</Button>} />
        <Table>
          <TableHead>
            <TableHeader>Run ID</TableHeader>
            <TableHeader>Agent Version</TableHeader>
            <TableHeader>Tests</TableHeader>
            <TableHeader>Reliability</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Time</TableHeader>
          </TableHead>
          <TableBody>
            {evaluations.slice(0, 5).map((evalRun) => (
              <TableRow key={evalRun.id || evalRun._id} onClick={() => navigate(`/evaluations/${evalRun.id || evalRun._id}`)}>
                <TableCell className="font-mono text-zinc-100">{evalRun.runId}</TableCell>
                <TableCell>{evalRun.version}</TableCell>
                <TableCell>{evalRun.passed} / {evalRun.totalTests}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${evalRun.reliability >= 90 ? 'bg-emerald-500' : evalRun.reliability >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${evalRun.reliability}%` }} />
                    </div>
                    <span>{evalRun.reliability}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={evalRun.status === 'COMPLETED' ? 'success' : evalRun.status === 'FAILED' ? 'danger' : 'warning'}>{evalRun.status}</Badge>
                </TableCell>
                <TableCell className="text-zinc-500">{new Date(evalRun.timestamp).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

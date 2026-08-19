import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { ArrowsClockwise, CaretDown } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import api from '../services/apiClient';
import type { Evaluation, ComparisonResult } from '../types';
import { useState, useEffect } from 'react';

export default function Compare() {
  const { data: evaluations } = useSWR<Evaluation[]>('/evaluations', fetcher);
  
  const [evalA, setEvalA] = useState<string>('');
  const [evalB, setEvalB] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-select last two completed evaluations
  useEffect(() => {
    if (evaluations && evaluations.length >= 2 && !evalA && !evalB) {
      const completed = evaluations.filter(e => e.status === 'COMPLETED' && e.totalTests > 0);
      if (completed.length >= 2) {
        setEvalA(completed[1]._id || '');
        setEvalB(completed[0]._id || '');
      }
    }
  }, [evaluations, evalA, evalB]);

  const handleCompare = async () => {
    if (!evalA || !evalB) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/compare?eval1=${evalA}&eval2=${evalB}`);
      setComparison(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to compare evaluations');
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  const completedEvals = evaluations?.filter(e => e.status === 'COMPLETED' && e.totalTests > 0) || [];

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-content-primary tracking-tight">Agent Version Comparison</h1>
        <p className="text-[13px] text-content-secondary mt-1">Compare evaluation runs to detect regressions and track improvements.</p>
      </div>

      {/* Selector */}
      <Card className="bg-panel border-border-subtle p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-content-muted uppercase tracking-wider mb-2">Baseline (Older)</label>
            <div className="relative">
              <select
                value={evalA}
                onChange={e => setEvalA(e.target.value)}
                className="w-full bg-canvas border border-border-subtle rounded-md px-4 py-2.5 text-[13px] text-content-primary appearance-none focus:outline-none focus:border-safe"
              >
                <option value="">Select evaluation...</option>
                {completedEvals.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.runId} — {e.version} — {e.reliability}% ({e.totalTests} tests)
                  </option>
                ))}
              </select>
              <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
            </div>
          </div>
          
          <div className="flex items-center text-content-secondary text-lg font-bold mb-1">vs</div>

          <div className="flex-1">
            <label className="block text-[11px] font-bold text-content-muted uppercase tracking-wider mb-2">Current (Newer)</label>
            <div className="relative">
              <select
                value={evalB}
                onChange={e => setEvalB(e.target.value)}
                className="w-full bg-canvas border border-border-subtle rounded-md px-4 py-2.5 text-[13px] text-content-primary appearance-none focus:outline-none focus:border-safe"
              >
                <option value="">Select evaluation...</option>
                {completedEvals.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.runId} — {e.version} — {e.reliability}% ({e.totalTests} tests)
                  </option>
                ))}
              </select>
              <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
            </div>
          </div>

          <Button onClick={handleCompare} disabled={!evalA || !evalB || loading} className="gap-2">
            <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Compare
          </Button>
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-md bg-critical-muted border border-critical/20 text-critical text-[13px]">
          {error}
        </div>
      )}

      {comparison && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={`${comparison.regressionDetected ? 'bg-critical-muted border-critical/20' : 'bg-safe-muted border-safe/20'}`}>
              <CardHeader title="Overall" />
              <div className={`text-3xl font-bold tracking-tight ${comparison.regressionDetected ? 'text-critical' : 'text-safe'}`}>
                {comparison.regressionDetected ? '⚠ Regression' : '✓ Improved'}
              </div>
              <div className="mt-2 text-[13px] text-content-secondary">
                Reliability: {comparison.metrics[0]?.old || 0}% → {comparison.metrics[0]?.new || 0}%
              </div>
            </Card>

            <Card className="bg-safe-muted border-safe/20">
              <CardHeader title="Improvements" />
              <div className="flex flex-col gap-1 mt-1">
                {comparison.improvements.length > 0 ? comparison.improvements.map((imp, i) => (
                  <div key={i} className="text-[13px] text-safe">↑ {imp}</div>
                )) : (
                  <div className="text-[13px] text-content-muted">No improvements detected</div>
                )}
              </div>
            </Card>
            
            <Card className="bg-critical-muted border-critical/20">
              <CardHeader title="Regressions" />
              <div className="flex flex-col gap-1 mt-1">
                {comparison.regressions.length > 0 ? comparison.regressions.map((reg, i) => (
                  <div key={i} className="text-[13px] text-critical">↓ {reg}</div>
                )) : (
                  <div className="text-[13px] text-content-muted">No regressions detected</div>
                )}
              </div>
            </Card>
          </div>

          {/* Metrics Table */}
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHead>
                <TableHeader>Metric</TableHeader>
                <TableHeader>{comparison.versionA}</TableHeader>
                <TableHeader>{comparison.versionB}</TableHeader>
                <TableHeader>Delta</TableHeader>
              </TableHead>
              <TableBody>
                {comparison.metrics.map((m) => {
                  const delta = m.new - m.old;
                  const isPositive = delta > 0;
                  return (
                    <TableRow key={m.name}>
                      <TableCell className="font-medium text-content-primary">{m.name}</TableCell>
                      <TableCell className="text-content-secondary">{m.old.toFixed(1)}%</TableCell>
                      <TableCell className="text-content-primary font-semibold">{m.new.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant={isPositive ? 'success' : delta < 0 ? 'danger' : 'default'}>
                          {isPositive ? '+' : ''}{delta.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Additional rows */}
                <TableRow>
                  <TableCell className="font-medium text-content-primary">Critical Failures</TableCell>
                  <TableCell className="text-content-secondary">{comparison.criticalA}</TableCell>
                  <TableCell className="text-content-primary font-semibold">{comparison.criticalB}</TableCell>
                  <TableCell>
                    <Badge variant={comparison.criticalB <= comparison.criticalA ? 'success' : 'danger'}>
                      {comparison.criticalB - comparison.criticalA >= 0 ? '+' : ''}{comparison.criticalB - comparison.criticalA}
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-content-primary">Total Failed</TableCell>
                  <TableCell className="text-content-secondary">{comparison.failedA}</TableCell>
                  <TableCell className="text-content-primary font-semibold">{comparison.failedB}</TableCell>
                  <TableCell>
                    <Badge variant={comparison.failedB <= comparison.failedA ? 'success' : 'danger'}>
                      {comparison.failedB - comparison.failedA >= 0 ? '+' : ''}{comparison.failedB - comparison.failedA}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {!comparison && !error && (
        <div className="text-center py-16 text-content-muted">
          <ArrowsClockwise className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg text-content-secondary">Select two evaluations to compare</p>
          <p className="text-[13px] mt-1">Compare reliability, safety, and failure metrics across agent versions.</p>
        </div>
      )}
    </div>
  );
}

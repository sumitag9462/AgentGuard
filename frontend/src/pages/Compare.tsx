import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import useSWR from 'swr';
import api, { fetcher } from '../services/apiClient';
import type { Agent, Evaluation, Failure } from '../types';

interface ComparisonData {
  baseVersion: string;
  targetVersion: string;
  reliabilityDelta: number;
  newFailures: Failure[];
  fixedFailures: Failure[];
}

export default function Compare() {
  const { data: agents } = useSWR<Agent[]>('/agents', fetcher);
  
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [baseEvalId, setBaseEvalId] = useState('');
  const [targetEvalId, setTargetEvalId] = useState('');
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: versions } = useSWR<Evaluation[]>(selectedAgentId ? `/agents/${selectedAgentId}/versions` : null, fetcher);

  const handleCompare = async () => {
    if (!baseEvalId || !targetEvalId) return;
    setLoading(true);
    try {
      const res = await api.post(`/agents/${selectedAgentId}/compare`, {
        baseEvalId,
        targetEvalId
      });
      setComparison(res.data);
    } catch (err) {
      console.error('Failed to compare', err);
      alert('Failed to generate regression report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Agent Version Comparison</h1>
        <p className="text-zinc-400 mt-1">Track regression and reliability metrics across deployments.</p>
      </div>

      <Card className="flex flex-col md:flex-row gap-4 items-end bg-zinc-900 border-white/5">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Target Agent</label>
          <select 
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            value={selectedAgentId}
            onChange={(e) => { setSelectedAgentId(e.target.value); setBaseEvalId(''); setTargetEvalId(''); setComparison(null); }}
          >
            <option value="">Select Agent...</option>
            {agents?.map(a => <option key={a.id || a._id} value={a.agentId || a.id || a._id}>{a.name} ({a.agentId || a.id || a._id})</option>)}
          </select>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Base Version</label>
          <select 
            disabled={!selectedAgentId}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
            value={baseEvalId}
            onChange={(e) => setBaseEvalId(e.target.value)}
          >
            <option value="">Select Base...</option>
            {versions?.map(v => <option key={v.id || v._id} value={v.id || v._id}>{v.version} ({new Date(v.timestamp).toLocaleDateString()})</option>)}
          </select>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Target Version</label>
          <select 
            disabled={!selectedAgentId}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
            value={targetEvalId}
            onChange={(e) => setTargetEvalId(e.target.value)}
          >
            <option value="">Select Target...</option>
            {versions?.map(v => <option key={v.id || v._id} value={v.id || v._id}>{v.version} ({new Date(v.timestamp).toLocaleDateString()})</option>)}
          </select>
        </div>

        <Button 
          disabled={!baseEvalId || !targetEvalId || loading} 
          onClick={handleCompare}
        >
          {loading ? 'Comparing...' : 'Compare'}
        </Button>
      </Card>

      {comparison && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-emerald-500/5 border-emerald-500/20 flex flex-col justify-center items-center py-8">
              <div className="text-zinc-400 text-sm font-medium mb-2">Overall Reliability Delta</div>
              <div className={`text-4xl font-bold ${comparison.reliabilityDelta >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {comparison.reliabilityDelta > 0 ? '+' : ''}{comparison.reliabilityDelta}%
              </div>
            </Card>
            
            <Card className="bg-rose-500/5 border-rose-500/20 flex flex-col justify-center items-center py-8">
              <div className="text-zinc-400 text-sm font-medium mb-2">New Regressions Introduced</div>
              <div className="text-4xl font-bold text-rose-500">
                {comparison.newFailures?.length || 0}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-zinc-900/50">
                <h3 className="font-semibold text-rose-400 flex items-center gap-2">New Regressions (Target)</h3>
              </div>
              <div className="p-2">
                {comparison.newFailures?.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {comparison.newFailures.map((f: Failure) => (
                      <div key={f.testId} className="bg-zinc-950 p-3 rounded border border-rose-500/20 text-sm">
                        <span className="font-mono text-zinc-300 mr-2">{f.testId}</span>
                        <Badge variant="danger">{f.severity}</Badge>
                        <div className="mt-1 text-zinc-400 text-xs">{f.failureType}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-zinc-500">No new regressions detected.</div>
                )}
              </div>
            </Card>

            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-zinc-900/50">
                <h3 className="font-semibold text-emerald-400 flex items-center gap-2">Fixed Issues (Target)</h3>
              </div>
              <div className="p-2">
                {comparison.fixedFailures?.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {comparison.fixedFailures.map((f: Failure) => (
                      <div key={f.testId} className="bg-zinc-950 p-3 rounded border border-emerald-500/20 text-sm">
                        <span className="font-mono text-zinc-300 mr-2">{f.testId}</span>
                        <Badge variant="success">FIXED</Badge>
                        <div className="mt-1 text-zinc-400 text-xs">{f.failureType}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-zinc-500">No issues were fixed in this version.</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

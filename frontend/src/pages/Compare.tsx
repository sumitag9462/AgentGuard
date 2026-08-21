import { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ArrowsClockwise, CaretDown, Warning, CheckCircle, ArrowRight, ShieldCheck, Bug, TrendDown, TrendUp, Minus, MagnifyingGlass } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import api from '../services/apiClient';
import type { Evaluation, ComparisonResult } from '../types';
import { useNavigate } from 'react-router-dom';

export default function Compare() {
  const navigate = useNavigate();
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
  const evalAData = completedEvals.find(e => e._id === evalA);
  const evalBData = completedEvals.find(e => e._id === evalB);

  return (
    <div className="flex flex-col gap-10 max-w-6xl mx-auto pb-20">
      
      {/* Page Header */}
      <div>
        <h1 className="text-display text-content-primary mb-2">Version Intelligence</h1>
        <p className="text-body text-content-secondary">
          Analyze behavioral changes between agent versions to make deterministic release decisions.
        </p>
      </div>

      {/* Version Selector */}
      <div className="surface-raised p-6 rounded-xl border border-border-strong shadow-lg">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-content-muted uppercase tracking-wider mb-3">Baseline Version</label>
            <div className="relative">
              <select
                value={evalA}
                onChange={e => setEvalA(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-lg px-4 py-3 text-sm text-content-primary appearance-none focus:outline-none focus:border-accent hover:border-border-strong transition-colors shadow-inner"
              >
                <option value="">Select baseline evaluation...</option>
                {completedEvals.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.version} — {e.runId.substring(0,8)} ({new Date(e.timestamp).toLocaleDateString()})
                  </option>
                ))}
              </select>
              <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
            </div>
          </div>
          
          <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-surface border border-border-subtle shrink-0 shadow-sm mb-1">
            <ArrowRight className="w-5 h-5 text-content-muted" />
          </div>

          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-content-muted uppercase tracking-wider mb-3">Current Version</label>
            <div className="relative">
              <select
                value={evalB}
                onChange={e => setEvalB(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-lg px-4 py-3 text-sm text-content-primary appearance-none focus:outline-none focus:border-accent hover:border-border-strong transition-colors shadow-inner"
              >
                <option value="">Select current evaluation...</option>
                {completedEvals.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.version} — {e.runId.substring(0,8)} ({new Date(e.timestamp).toLocaleDateString()})
                  </option>
                ))}
              </select>
              <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
            </div>
          </div>

          <Button onClick={handleCompare} disabled={!evalA || !evalB || loading} size="lg" variant="primary" className="w-full md:w-auto h-11.5 shadow-glow-accent">
            <ArrowsClockwise className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Analyze Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-critical/10 border border-critical/20 text-critical text-sm font-medium flex items-center gap-3">
          <Warning weight="fill" className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {!comparison && !error && (
        <div className="text-center py-24 text-content-muted">
          <ArrowsClockwise className="w-16 h-16 mx-auto mb-6 opacity-20" />
          <p className="text-h2 text-content-secondary mb-2">Ready for analysis</p>
          <p className="text-body max-w-md mx-auto">Select a baseline and current version to detect regressions and determine release impact.</p>
        </div>
      )}

      {comparison && evalAData && evalBData && (
        <div className="flex flex-col gap-12 animate-[fade-in_0.5s_ease-out]">
          
          {/* Release Decision Header */}
          <div className={`p-8 rounded-xl border-2 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden
            ${comparison.status === 'BLOCKED' ? 'bg-critical/5 border-critical/30' : 'bg-safe/5 border-safe/30'}
          `}>
            {comparison.status === 'BLOCKED' && (
              <div className="absolute top-0 left-0 w-full h-1 bg-critical" />
            )}
            {comparison.status === 'READY' && (
              <div className="absolute top-0 left-0 w-full h-1 bg-safe" />
            )}

            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 border-4
                ${comparison.status === 'BLOCKED' ? 'bg-critical-muted text-critical border-critical/20' : 'bg-safe-muted text-safe border-safe/20'}
              `}>
                {comparison.status === 'BLOCKED' ? <Warning weight="fill" className="w-10 h-10" /> : <CheckCircle weight="fill" className="w-10 h-10" />}
              </div>
              
              <div>
                <h2 className={`text-[32px] font-bold tracking-tight mb-2 uppercase
                  ${comparison.status === 'BLOCKED' ? 'text-critical' : 'text-safe'}
                `}>
                  {comparison.status === 'BLOCKED' ? 'Block Release' : 'Ready to Release'}
                </h2>
                <div className="text-content-secondary text-lg">
                  {comparison.status === 'BLOCKED'
                    ? 'Regressions detected in core reliability metrics or quality gates failed.' 
                    : 'All quality gates passed. Reliability improved or remained stable.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-12 border-l border-border-subtle pl-8">
              <div className="flex flex-col items-center">
                <div className="text-label text-content-muted uppercase mb-1">Baseline</div>
                <div className="text-2xl font-bold text-content-secondary font-mono">{evalAData.reliability.toFixed(1)}</div>
              </div>
              <ArrowRight className="w-6 h-6 text-content-muted" />
              <div className="flex flex-col items-center">
                <div className="text-label text-content-muted uppercase mb-1">Current</div>
                <div className={`text-3xl font-bold font-mono ${comparison.reliabilityDelta < 0 ? 'text-critical' : comparison.reliabilityDelta > 0 ? 'text-safe' : 'text-content-primary'}`}>
                  {evalBData.reliability.toFixed(1)}
                </div>
                <Badge variant={comparison.reliabilityDelta < 0 ? 'danger' : comparison.reliabilityDelta > 0 ? 'success' : 'default'} className="mt-2 text-xs px-2 py-0.5">
                  {comparison.reliabilityDelta > 0 ? '+' : ''}{comparison.reliabilityDelta.toFixed(1)} pts
                </Badge>
              </div>
            </div>
          </div>

          {/* Change Summary */}
          <div>
            <h3 className="text-label font-bold text-content-primary uppercase tracking-widest mb-6 border-b border-border-subtle pb-2">
              Failure Intelligence
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              
              <div className="surface-panel p-6 rounded-lg border border-border-strong relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-warning" />
                <div className="text-label text-content-muted uppercase mb-4 flex items-center gap-2"><Bug className="w-4 h-4 text-warning" /> New Failures</div>
                <div className="text-4xl font-bold text-warning font-mono mb-2">
                  {comparison.failures?.new?.length || 0}
                </div>
                <div className="text-xs text-content-secondary uppercase tracking-wider mb-4">Newly Introduced</div>
                {comparison.failures?.new?.slice(0,2).map((f: any, i: number) => (
                   <div key={i} className="text-xs bg-canvas p-2 rounded mb-1 truncate text-content-primary border border-border-subtle cursor-pointer hover:border-accent transition-colors" onClick={() => navigate(`/app/failures/${f._id || f.id}`)}>{f.failureType}</div>
                ))}
              </div>

              <div className="surface-panel p-6 rounded-lg border border-border-strong relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-safe" />
                <div className="text-label text-content-muted uppercase mb-4 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-safe" /> Resolved Failures</div>
                <div className="text-4xl font-bold text-safe font-mono mb-2">
                  {comparison.failures?.resolved?.length || 0}
                </div>
                <div className="text-xs text-content-secondary uppercase tracking-wider mb-4">Successfully Fixed</div>
                {comparison.failures?.resolved?.slice(0,2).map((f: any, i: number) => (
                   <div key={i} className="text-xs bg-canvas p-2 rounded mb-1 truncate text-content-primary border border-border-subtle cursor-pointer hover:border-accent transition-colors" onClick={() => navigate(`/app/failures/${f._id || f.id}`)}>{f.failureType}</div>
                ))}
              </div>

              <div className="surface-panel p-6 rounded-lg border border-border-strong relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-content-muted" />
                <div className="text-label text-content-muted uppercase mb-4 flex items-center gap-2"><Warning className="w-4 h-4 text-content-muted" /> Persisting Failures</div>
                <div className="text-4xl font-bold text-content-secondary font-mono mb-2">
                  {comparison.failures?.persisting?.length || 0}
                </div>
                <div className="text-xs text-content-secondary uppercase tracking-wider mb-4">Unresolved Issues</div>
                {comparison.failures?.persisting?.slice(0,2).map((f: any, i: number) => (
                   <div key={i} className="text-xs bg-canvas p-2 rounded mb-1 truncate text-content-primary border border-border-subtle cursor-pointer hover:border-accent transition-colors" onClick={() => navigate(`/app/failures/${f._id || f.id}`)}>{f.failureType}</div>
                ))}
              </div>

            </div>
          </div>

          {/* Dimension Comparison */}
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-6">
              <h3 className="text-label font-bold text-content-primary uppercase tracking-widest">
                Reliability Profile
              </h3>
              <span className="text-xs text-content-muted uppercase">Sorted by impact</span>
            </div>
            
            <div className="flex flex-col gap-4">
              {/* Sort metrics by absolute delta to highlight biggest changes */}
              {[...comparison.metrics].sort((a, b) => Math.abs(b.new - b.old) - Math.abs(a.new - a.old)).map((m) => {
                const delta = m.new - m.old;
                const isSignificant = Math.abs(delta) >= 5;
                const isRegression = delta < 0;
                
                return (
                  <div key={m.name} className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-lg border transition-colors
                    ${isSignificant && isRegression ? 'bg-critical/5 border-critical/30 shadow-sm' : 
                      isSignificant && !isRegression ? 'bg-safe/5 border-safe/30 shadow-sm' : 
                      'bg-surface border-border-subtle'}
                  `}>
                    <div className="flex items-center gap-4 w-1/3">
                      <div className={`w-2 h-8 rounded-full ${delta < -5 ? 'bg-critical' : delta > 5 ? 'bg-safe' : 'bg-border-strong'}`} />
                      <div className="font-semibold text-content-primary text-[15px]">{m.name}</div>
                    </div>
                    
                    <div className="flex-1 flex items-center gap-6 mt-4 md:mt-0 justify-end md:justify-center">
                      <div className="text-right">
                        <div className="text-xs text-content-muted uppercase mb-1">Baseline</div>
                        <div className="font-mono text-content-secondary">{m.old.toFixed(1)}</div>
                      </div>
                      
                      <div className="w-12 flex justify-center">
                        {delta < 0 ? <ArrowRight className="w-4 h-4 text-critical" /> : 
                         delta > 0 ? <ArrowRight className="w-4 h-4 text-safe" /> : 
                         <Minus className="w-4 h-4 text-content-muted" />}
                      </div>
                      
                      <div className="text-left">
                        <div className="text-xs text-content-muted uppercase mb-1">Current</div>
                        <div className={`font-mono font-bold ${delta < 0 ? 'text-critical' : delta > 0 ? 'text-safe' : 'text-content-primary'}`}>
                          {m.new.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div className="w-1/4 flex justify-end mt-4 md:mt-0">
                      {Math.abs(delta) > 0 ? (
                        <div className={`px-4 py-2 rounded font-bold font-mono text-sm border flex items-center gap-2
                          ${delta < 0 ? 'bg-critical-muted text-critical-strong border-critical/20' : 'bg-safe-muted text-safe-strong border-safe/20'}
                        `}>
                          {delta < 0 ? <TrendDown weight="bold" /> : <TrendUp weight="bold" />}
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                        </div>
                      ) : (
                        <div className="px-4 py-2 text-content-muted font-mono text-sm">No change</div>
                      )}
                    </div>
                    
                    {/* WOW Interaction: Trace the Regression (simulated link) */}
                    {isSignificant && isRegression && (
                      <div className="w-full md:w-auto mt-4 md:mt-0 md:ml-6 flex justify-end">
                        <Button variant="secondary" className="w-full md:w-auto text-xs" onClick={() => navigate('/app/failures')}>
                          <MagnifyingGlass className="w-4 h-4 mr-2" /> Inspect
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Policy Gates Context */}
          <div className="mt-8 p-6 bg-surface border border-border-strong rounded-xl">
            <h3 className="text-label font-bold text-content-primary uppercase tracking-widest mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" /> Configured Release Gates
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-canvas rounded-lg border border-border-subtle flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-content-primary">Minimum Reliability</div>
                  <div className="text-xs text-content-muted mt-1">Overall score must remain above threshold</div>
                </div>
                <div className="font-mono text-lg font-bold text-content-primary">85.0</div>
              </div>
              <div className="p-4 bg-canvas rounded-lg border border-border-subtle flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-content-primary">Zero Critical Failures</div>
                  <div className="text-xs text-content-muted mt-1">No severe policy violations permitted</div>
                </div>
                <div className="font-mono text-lg font-bold text-content-primary">0</div>
              </div>
            </div>
            {comparison.regressionDetected && (
              <div className="mt-6 text-sm text-content-secondary border-t border-border-subtle pt-6 leading-relaxed">
                <span className="font-bold text-content-primary">Why is this blocked?</span> Based on the configured thresholds, the current version ({evalBData.version}) introduces unacceptable behavioral drift. Review the regressions in the reliability profile and inspect the associated failures in the registry.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, XCircle, Warning, LockKey, Spinner } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';

export default function Compare() {
  const { data: evals, isLoading: evalsLoading } = useSWR('/evaluations?status=COMPLETED', fetcher);
  
  // Get top 2
  const eval2 = evals?.[0]?._id;
  const eval1 = evals?.[1]?._id;
  
  const { data: comp, isLoading: compLoading } = useSWR(
    eval1 && eval2 ? `/compare?eval1=${eval1}&eval2=${eval2}` : null, 
    fetcher
  );

  if (evalsLoading || compLoading) return <div className="p-12 text-center"><Spinner className="animate-spin inline-block text-3xl" /></div>;
  if (!eval1 || !eval2) return <div className="p-12 text-center text-content-muted">Not enough completed evaluations to compare. Run at least two evaluations.</div>;

  const isBlocked = comp?.regression_detected;

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-5xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Quality Gate Decision</h1>
        <p className="text-content-secondary">Automated regression analysis for Agent.</p>
      </header>

      {/* Release Decision Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-panel p-8 rounded-2xl flex flex-col items-center justify-center border relative overflow-hidden text-center ${isBlocked ? 'border-critical' : 'border-safe'}`}
      >
        <div className={`absolute inset-0 opacity-5 ${isBlocked ? 'bg-critical' : 'bg-safe'}`} />
        {isBlocked ? (
           <LockKey className="text-6xl text-critical mb-4" />
        ) : (
           <CheckCircle className="text-6xl text-safe mb-4" />
        )}
        <h2 className="text-4xl font-bold tracking-tighter text-white mb-2">{isBlocked ? 'RELEASE BLOCKED' : 'RELEASE APPROVED'}</h2>
        <p className="text-content-secondary">{isBlocked ? 'Critical safety regression detected' : 'No regressions detected'}</p>
      </motion.div>

      {/* Regression Diffs */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border-subtle border-b border-border-subtle">
          <div className="p-4 bg-panel-hover/30"></div>
          <div className="p-4 text-center font-mono text-sm text-content-secondary">Eval #{eval1.substring(0,6)}</div>
          <div className="p-4 text-center font-mono text-sm font-bold text-white bg-accent/5">Eval #{eval2.substring(0,6)} (Current)</div>
        </div>

        <div className="divide-y divide-border-subtle text-sm">
          <div className="grid grid-cols-3 divide-x divide-border-subtle">
            <div className="p-4 font-medium text-white flex items-center gap-2">Reliability</div>
            <div className="p-4 text-center font-mono">{(comp?.reliability_a || 0).toFixed(1)}%</div>
            <div className="p-4 text-center font-mono font-bold">
              {(comp?.reliability_b || 0).toFixed(1)}%
              <span className={`ml-2 ${(comp?.reliability_delta || 0) < 0 ? 'text-critical' : 'text-safe'}`}>
                {(comp?.reliability_delta || 0) > 0 ? '+' : ''}{(comp?.reliability_delta || 0).toFixed(1)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border-subtle">
            <div className="p-4 font-medium text-white flex items-center gap-2">Safety Score</div>
            <div className="p-4 text-center font-mono">{(comp?.safety_a || 0).toFixed(1)}%</div>
            <div className="p-4 text-center font-mono font-bold">
              {(comp?.safety_b || 0).toFixed(1)}%
              <span className={`ml-2 ${(comp?.safety_delta || 0) < 0 ? 'text-critical' : 'text-safe'}`}>
                {(comp?.safety_delta || 0) > 0 ? '+' : ''}{(comp?.safety_delta || 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {comp?.new_failures?.length > 0 && (
        <div className="glass-panel p-6 rounded-xl border border-critical/30">
          <h3 className="text-sm font-bold text-critical mb-4 flex items-center gap-2">
            <Warning /> New Regressions
          </h3>
          <div className="flex flex-col gap-2">
             {comp.new_failures.map((f: any, i: number) => (
               <div key={i} className="text-sm text-white bg-critical-muted p-2 rounded">{f.testId || 'Unknown'} - {f.category} ({f.severity})</div>
             ))}
          </div>
        </div>
      )}
      
      {comp?.resolved_failures?.length > 0 && (
        <div className="glass-panel p-6 rounded-xl border border-safe/30">
          <h3 className="text-sm font-bold text-safe mb-4 flex items-center gap-2">
            <CheckCircle /> Resolved Failures
          </h3>
          <div className="flex flex-col gap-2">
             {comp.resolved_failures.map((f: any, i: number) => (
               <div key={i} className="text-sm text-white bg-safe-muted p-2 rounded">{f.testId || 'Unknown'} - {f.category}</div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}

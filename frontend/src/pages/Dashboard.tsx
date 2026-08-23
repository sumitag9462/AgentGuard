import { motion } from 'framer-motion';
import { ReliabilityRing } from '../components/ui/ReliabilityRing';
import { ArrowUpRight, ShieldWarning, ChartLineUp, Pulse, Spinner } from '@phosphor-icons/react';
import useSWR, { mutate } from 'swr';
import api from '../services/apiClient';
import { useSocketEvents } from '../lib/socket';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function Dashboard() {
  const { data, isLoading, error } = useSWR('/dashboard/overview', fetcher);

  // Wire up socket events to invalidate the dashboard data
  useSocketEvents({
    'agent:created': () => mutate('/dashboard/overview'),
    'agent:deleted': () => mutate('/dashboard/overview'),
    'agent:updated': () => mutate('/dashboard/overview'),
    'evaluation:started': () => mutate('/dashboard/overview'),
    'evaluation:completed': () => mutate('/dashboard/overview'),
    'scenario:generation_completed': () => mutate('/dashboard/overview')
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 pb-12 h-full items-center justify-center pt-20">
        <Spinner className="w-8 h-8 animate-spin text-content-muted" />
        <div className="text-content-secondary">Loading command center metrics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-8 pb-12 h-full items-center justify-center pt-20 text-critical">
        <div>Unable to load reliability metrics.</div>
        <button onClick={() => mutate('/dashboard/overview')} className="mt-4 px-4 py-2 bg-white/10 rounded">Retry</button>
      </div>
    );
  }

  // Handle Empty State
  if (data.agents.total === 0) {
    return (
      <div className="flex flex-col gap-8 pb-12 max-w-4xl mx-auto items-center pt-20">
        <div className="w-20 h-20 bg-warning-muted rounded-full flex items-center justify-center mb-4">
          <ShieldWarning className="w-10 h-10 text-warning" />
        </div>
        <h2 className="text-2xl font-bold text-white">NO ACTIVE AGENTS</h2>
        <p className="text-content-secondary text-center">
          Connect or configure your first AI agent to start generating adversarial scenarios and tracking reliability.
        </p>
        <a href="/app/agents/connect" className="bg-white text-black px-6 py-3 rounded-full font-bold mt-4">
          Create Agent
        </a>
      </div>
    );
  }

  const score = data.reliability.overall;
  const metrics = [
    { label: 'AGENTS', value: data.agents.total, suffix: '' },
    { label: 'SCENARIOS', value: data.scenarios.total, suffix: '' },
    { label: 'EVALUATIONS', value: data.evaluations.total, suffix: '' },
    { label: 'CRITICAL', value: data.failures.critical, suffix: '' },
    { label: 'HIGH RISK', value: data.failures.high, suffix: '' },
    { label: 'MEDIUM', value: data.failures.medium, suffix: '' },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Command Center</h1>
          <p className="text-content-secondary">Agent reliability and infrastructure overview.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${data.release.status === 'PASSING' ? 'bg-safe-muted text-safe border-safe/20' : 'bg-critical-muted text-critical border-critical/20'}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${data.release.status === 'PASSING' ? 'bg-safe' : 'bg-critical'}`} />
          <span className="text-xs font-semibold tracking-wide">{data.release.status === 'PASSING' ? 'SYSTEM READY' : 'RELEASE BLOCKED'}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Reliability Score */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-6 flex flex-col items-center justify-center lg:col-span-1 relative overflow-hidden"
        >
          <div className="absolute top-4 left-4 flex items-center gap-2 text-content-muted text-xs font-bold uppercase tracking-widest">
            <ShieldWarning weight="fill" /> Overall Status
          </div>
          <ReliabilityRing score={score} confidence={data.reliability.confidence} coverage={data.reliability.coverage} />
        </motion.div>

        {/* Breakdown Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 lg:col-span-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-6 text-content-muted text-xs font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2"><ChartLineUp weight="bold" /> Dimension Analysis</div>
            <div>All Agents</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4">
            {metrics.map((m, i) => (
              <div key={m.label} className="flex flex-col gap-1">
                <div className="text-[10px] tracking-widest text-content-secondary">{m.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono text-white">{m.value}{m.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Pulse Feed */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-6 text-content-muted text-xs font-bold uppercase tracking-widest">
            <Pulse weight="bold" /> Live Execution Stream
          </div>
          <div className="flex flex-col gap-4">
            {data.evaluations.running > 0 ? (
               <div className="flex gap-4 items-start">
               <div className="mt-1 w-2 h-2 rounded-full bg-safe animate-pulse" />
               <div>
                 <div className="text-sm font-medium">Evaluations Running</div>
                 <div className="text-xs text-content-secondary">{data.evaluations.running} active evaluation(s) progressing...</div>
               </div>
             </div>
            ) : null}
            <div className="flex gap-4 items-start opacity-70">
              <div className="mt-1 w-2 h-2 rounded-full bg-info" />
              <div>
                <div className="text-sm font-medium">Evaluation Completed</div>
                <div className="text-xs text-content-secondary">Total completed: {data.evaluations.completed}</div>
              </div>
            </div>
            {data.failures.critical > 0 && (
              <div className="flex gap-4 items-start opacity-90">
                <div className="mt-1 w-2 h-2 rounded-full bg-critical" />
                <div>
                  <div className="text-sm font-medium text-critical">Guardrail Triggered: Critical Failures</div>
                  <div className="text-xs text-content-secondary">{data.failures.critical} critical failures detected across agents</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Risk Heatmap (Abstracted) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-6 text-content-muted text-xs font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2"><ArrowUpRight weight="bold" /> Risk Heatmap</div>
          </div>
          <div className="flex-1 flex flex-col justify-end gap-1 relative border-l border-b border-border-strong p-2">
            <span className="absolute -left-6 top-1/2 -rotate-90 text-[10px] text-content-muted uppercase tracking-widest">Impact</span>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-content-muted uppercase tracking-widest">Probability</span>
            
            {/* Heatmap Grid 3x3 */}
            <div className="grid grid-cols-3 grid-rows-3 w-full h-48 gap-1">
              <div className="bg-warning-muted rounded-sm group relative hover:bg-warning transition-colors cursor-pointer" title="High Impact, Low Prob"><div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-black font-bold text-xs">{data.failures.medium}</div></div>
              <div className="bg-critical-muted rounded-sm group relative hover:bg-critical transition-colors cursor-pointer" title="High Impact, Med Prob"><div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-black font-bold text-xs">{data.failures.high}</div></div>
              <div className={data.failures.critical > 0 ? "bg-critical rounded-sm shadow-[0_0_15px_rgba(239,68,68,0.3)] group relative cursor-pointer" : "bg-border-subtle rounded-sm group relative cursor-pointer"} title="High Impact, High Prob"><div className="absolute inset-0 flex items-center justify-center text-black font-bold text-xs">{data.failures.critical}</div></div>
              
              <div className="bg-border-subtle rounded-sm" />
              <div className="bg-warning-muted rounded-sm group relative hover:bg-warning transition-colors cursor-pointer"><div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-black font-bold text-xs">{data.failures.low}</div></div>
              <div className="bg-warning-strong rounded-sm opacity-50" />
              
              <div className="bg-border-subtle rounded-sm" />
              <div className="bg-border-subtle rounded-sm" />
              <div className="bg-warning-muted rounded-sm" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

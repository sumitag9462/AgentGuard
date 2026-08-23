import { motion } from 'framer-motion';
import { LockKey, ArrowRight } from '@phosphor-icons/react';

export function ScorecardSection() {
  return (
    <section className="py-32 bg-canvas border-t border-border-subtle">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Every agent change<br/>deserves a re-test.</h2>
          <p className="text-content-secondary text-xl">AgentEval acts as continuous integration for your autonomous systems.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
          
          {/* Version 2.4 */}
          <div className="glass-panel p-8 rounded-3xl opacity-50 flex flex-col items-center justify-center text-center">
            <div className="text-xs font-mono tracking-widest uppercase text-content-muted mb-2">Previous Version</div>
            <div className="text-xl font-bold text-white mb-6">v2.4</div>
            <div className="text-6xl font-mono font-bold text-safe mb-2">92.4%</div>
            <div className="text-sm font-semibold uppercase tracking-widest text-content-secondary">Reliability</div>
          </div>

          {/* Version 2.5 (Blocked) */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="glass-panel p-8 rounded-3xl border-2 border-critical relative overflow-hidden flex flex-col items-center justify-center text-center shadow-[0_0_40px_rgba(239,68,68,0.15)]"
          >
            <div className="absolute inset-0 bg-critical opacity-5" />
            <div className="text-xs font-mono tracking-widest uppercase text-critical mb-2 bg-critical-muted px-3 py-1 rounded-full">Current Commit</div>
            <div className="text-xl font-bold text-white mb-6">v2.5</div>
            
            <div className="flex items-center gap-4 mb-2">
              <div className="text-6xl font-mono font-bold text-critical">88.1%</div>
              <div className="flex items-center text-sm font-bold text-critical bg-critical-muted px-2 py-1 rounded">↓ 4.3%</div>
            </div>
            <div className="text-sm font-semibold uppercase tracking-widest text-content-secondary mb-8">Reliability</div>
            
            <div className="w-full bg-critical-muted border border-critical rounded-xl p-4 flex flex-col items-center gap-2">
              <LockKey weight="bold" className="text-2xl text-critical-strong" />
              <div className="font-bold text-white tracking-widest">RELEASE BLOCKED</div>
              <div className="text-xs text-critical-strong">Quality Gate failed: Safety score dropped below 90.</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

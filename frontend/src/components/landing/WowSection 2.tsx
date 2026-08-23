import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ShieldWarning, Bug, Play, Info } from '@phosphor-icons/react';

export function WowSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start center", "end center"] });
  
  // This animates the trace elements as the user scrolls
  const step1 = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
  const step2 = useTransform(scrollYProgress, [0.2, 0.4], [0, 1]);
  const step3 = useTransform(scrollYProgress, [0.4, 0.6], [0, 1]);
  const step4 = useTransform(scrollYProgress, [0.6, 0.8], [0, 1]);

  return (
    <section ref={ref} className="py-40 bg-surface relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(239,68,68,0.05)_0%,transparent_50%)]" />
      
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-16 text-center">Don't just know that it failed.<br/>Know <span className="italic text-critical">why</span>.</h2>

        <div className="glass-panel p-8 md:p-12 rounded-3xl border border-border-strong relative overflow-hidden">
          
          <div className="flex flex-col gap-8 relative">
            <div className="absolute left-6 top-6 bottom-6 w-px bg-border-strong" />
            
            {/* Step 1: Tool Call */}
            <motion.div style={{ opacity: step1 }} className="flex gap-6 relative z-10">
              <div className="w-12 h-12 rounded-full bg-panel border border-info text-info flex items-center justify-center shrink-0">
                <Play weight="fill" />
              </div>
              <div className="flex-1 pt-2">
                <div className="text-xs font-bold tracking-widest uppercase mb-2 text-info">AGENT EXECUTING</div>
                <div className="bg-raised p-4 rounded-xl font-mono text-sm border border-border-strong">
                  <span className="text-accent">cancel_order</span>({`{ "order_id": "ORD-774", "immediate": true }`})
                </div>
              </div>
            </motion.div>

            {/* Step 2: Sandbox Intercept */}
            <motion.div style={{ opacity: step2 }} className="flex gap-6 relative z-10">
              <div className="w-12 h-12 rounded-full bg-panel border border-warning text-warning flex items-center justify-center shrink-0">
                <Bug weight="fill" />
              </div>
              <div className="flex-1 pt-2">
                <div className="text-xs font-bold tracking-widest uppercase mb-2 text-warning">SANDBOX FAULT INJECTED</div>
                <div className="bg-raised p-4 rounded-xl font-mono text-sm border border-border-strong text-content-secondary">
                  Mocking API Response: 500 Internal Server Error
                </div>
              </div>
            </motion.div>

            {/* Step 3: Guardrail Tripped */}
            <motion.div style={{ opacity: step3 }} className="flex gap-6 relative z-10">
              <div className="w-12 h-12 rounded-full bg-critical-muted border border-critical text-critical flex items-center justify-center shrink-0 shadow-[0_0_20px_varcritical]">
                <ShieldWarning weight="fill" />
              </div>
              <div className="flex-1 pt-2">
                <div className="text-xs font-bold tracking-widest uppercase mb-2 text-critical">CRITICAL SAFETY FAILURE</div>
                <div className="bg-critical-muted border border-critical p-4 rounded-xl">
                  <div className="text-white font-medium mb-1">Unsafe Action Detected</div>
                  <div className="text-sm text-critical-strong">Agent bypassed mandatory user confirmation policy before attempting destructive action.</div>
                </div>
              </div>
            </motion.div>

            {/* Step 4: Resolution */}
            <motion.div style={{ opacity: step4 }} className="flex gap-6 relative z-10 mt-8">
              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                <Info weight="bold" />
              </div>
              <div className="flex-1 pt-2">
                <div className="bg-white text-black p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold mb-1">Recommendation</div>
                    <div className="text-sm opacity-80">Enforce schema confirmation constraint in system prompt.</div>
                  </div>
                  <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium">Apply Fix</button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

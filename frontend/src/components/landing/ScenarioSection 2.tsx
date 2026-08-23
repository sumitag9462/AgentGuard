import { motion } from 'framer-motion';
import { Sparkle } from '@phosphor-icons/react';

export function ScenarioSection() {
  return (
    <section className="py-32 bg-canvas">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Don't test prompts. <br className="hidden md:block"/>Test failure modes.</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6">
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-6 border-b border-border-subtle pb-4">
                <Sparkle weight="fill" className="text-accent text-xl animate-pulse" />
                <span className="font-mono text-sm uppercase tracking-widest text-white">Generating Suite...</span>
              </div>
              <div className="space-y-3 font-mono text-xs">
                {['Agent analyzed', 'Tools mapped', 'Policies extracted', 'High-risk actions identified', 'Adversarial scenarios generated', 'Coverage optimized'].map((step, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-safe">✓</span>
                    <span className="text-content-secondary">{step}</span>
                  </motion.div>
                ))}
              </div>
              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.5 }}
                className="mt-6 pt-4 border-t border-border-subtle grid grid-cols-2 gap-4"
              >
                <div>
                  <div className="text-2xl font-bold text-white">42</div>
                  <div className="text-[10px] uppercase text-content-muted tracking-widest">Scenarios</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-safe">94%</div>
                  <div className="text-[10px] uppercase text-content-muted tracking-widest">Coverage</div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="relative h-[400px] glass-panel rounded-2xl overflow-hidden flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(24,24,27,0.5)_0%,rgba(9,9,11,1)_100%)]">
            <div className="absolute top-4 left-4 text-[10px] font-mono tracking-widest text-content-muted uppercase">Scenario Constellation</div>
            
            {/* Mock Constellation */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: Math.random() * 1 }}
                className="absolute w-2 h-2 rounded-full cursor-pointer hover:scale-150 transition-transform"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${20 + Math.random() * 60}%`,
                  backgroundColor: i % 4 === 0 ? 'varcritical' : i % 3 === 0 ? 'varwarning' : 'varsafe',
                  boxShadow: `0 0 10px ${i % 4 === 0 ? 'varcritical' : i % 3 === 0 ? 'varwarning' : 'varsafe'}`
                }}
              />
            ))}
            <svg className="absolute inset-0 w-full h-full opacity-10">
              {Array.from({ length: 20 }).map((_, i) => (
                <line 
                  key={i}
                  x1={`${20 + Math.random() * 60}%`} y1={`${20 + Math.random() * 60}%`}
                  x2={`${20 + Math.random() * 60}%`} y2={`${20 + Math.random() * 60}%`}
                  stroke="white" strokeWidth="1"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

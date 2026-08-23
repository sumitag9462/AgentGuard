import { motion } from 'framer-motion';

export function PipelineSection() {
  const stages = [
    { id: '01', title: 'RISK ANALYSIS', desc: 'Agent mapped.' },
    { id: '02', title: 'SCENARIO GEN', desc: 'Adversarial paths.' },
    { id: '03', title: 'SANDBOX', desc: 'Safe execution.' },
    { id: '04', title: 'TRACE', desc: 'Forensic capture.' },
    { id: '05', title: 'RELIABILITY', desc: 'Metrics scored.' }
  ];

  return (
    <section className="py-24 border-y border-border-subtle bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight">From Agent to Test Suite.</h2>
          <div className="text-[10px] font-mono tracking-widest uppercase text-content-muted border border-border-strong px-3 py-1.5 rounded-full mt-4 md:mt-0">
            Automated Pipeline
          </div>
        </div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute top-8 left-0 w-full h-px bg-border-strong hidden md:block" />
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {stages.map((stage, i) => (
              <motion.div 
                key={stage.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1 }}
                className="relative flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-6"
              >
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-panel border border-border-strong flex items-center justify-center shrink-0">
                  <div className="text-xl font-mono text-accent">{stage.id}</div>
                  <motion.div 
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-safe shadow-[0_0_10px_varsafe]"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-widest text-white uppercase mb-1">{stage.title}</h3>
                  <p className="text-xs font-mono text-content-secondary">{stage.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

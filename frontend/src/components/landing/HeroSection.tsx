import { motion, useScroll, useTransform } from 'framer-motion';
import { Suspense, lazy, useState, useEffect } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

const AgentCore3DLazy = lazy(() => import('../3d/AgentCore3D').then(m => ({ default: m.AgentCore3D })));

export function HeroSection() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const [telemetry, setTelemetry] = useState([
    "System Initialized",
    "Agent Connected",
    "Risk analysis complete",
  ]);

  useEffect(() => {
    const events = [
      "42 scenarios generated",
      "Scenario #18 executing",
      "⚠ Guardrail triggered",
      "Failure classified",
      "Reliability recalculated"
    ];
    let i = 0;
    const t = setInterval(() => {
      if (i < events.length) {
        setTelemetry(prev => [...prev.slice(-4), events[i]]);
        i++;
      } else {
        clearInterval(t);
      }
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-20 overflow-hidden">
      {/* 3D Background */}
      <motion.div style={{ y, opacity }} className="absolute inset-0 -z-10 pointer-events-auto">
        <Suspense fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0%,transparent_60%)]" />}>
          <AgentCore3DLazy />
        </Suspense>
      </motion.div>

      {/* Main Content */}
      <div className="z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto mt-[-5vh] pointer-events-none">
        
        {/* Status Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="group relative flex items-center gap-2 bg-panel/50 backdrop-blur-md border border-border-strong rounded-full px-4 py-1.5 mb-8 cursor-pointer pointer-events-auto hover:bg-panel transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
          <span className="text-xs font-mono text-content-secondary uppercase tracking-wider group-hover:text-white transition-colors">
            EVALUATION ENGINE // ONLINE
          </span>
          {/* Hover Menu */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-surface border border-border-strong rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-3 flex flex-col gap-2 z-50">
            {['Scenario Engine', 'Sandbox', 'Evaluator', 'Regression Engine', 'Quality Gates'].map(sys => (
              <div key={sys} className="flex items-center justify-between text-xs font-mono">
                <span className="text-content-secondary">{sys}</span>
                <span className="text-safe">ONLINE</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[1.05] mb-6 text-white"
        >
          Ship agents that<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">survive production.</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-xl text-content-secondary max-w-[50ch] mb-10 leading-relaxed text-balance"
        >
          Adversarially test autonomous agents, expose hidden failure modes, and stop unsafe releases before they reach users.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4 pointer-events-auto"
        >
          <Link to="/app" className="bg-white text-black px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
            Run Interactive Demo <ArrowRight weight="bold" />
          </Link>
          <a href="#problem" className="glass-panel text-white px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-colors">
            Explore the Platform
          </a>
        </motion.div>
      </div>

      {/* Live Telemetry Panel */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute right-8 top-1/3 hidden lg:flex flex-col gap-2 w-64 pointer-events-none"
      >
        <div className="text-[10px] font-mono font-bold tracking-widest text-content-muted uppercase mb-2">Evaluation Stream</div>
        {telemetry.map((msg, i) => (
          <div key={i} className="flex items-center gap-3 text-xs font-mono text-content-secondary bg-black/40 backdrop-blur-md px-3 py-2 rounded-md border border-border-subtle">
            <div className={`w-1.5 h-1.5 rounded-full ${msg?.includes('⚠') ? 'bg-warning' : msg?.includes('classified') ? 'bg-critical' : 'bg-safe'}`} />
            {msg}
          </div>
        ))}
      </motion.div>

      {/* Observability Metrics Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent pt-12 pb-8 border-b border-border-subtle"
      >
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { id: '01', val: '12', label: 'FAILURE MODES' },
            { id: '02', val: '7', label: 'RELIABILITY DIMENSIONS' },
            { id: '03', val: 'REAL-TIME', label: 'QUALITY GATES' },
            { id: '04', val: '0', label: 'UNBLOCKED CRITICAL RELEASES' }
          ].map(m => (
            <div key={m.id} className="flex flex-col">
              <div className="text-[10px] font-mono text-content-muted mb-1">{m.id}</div>
              <div className="text-3xl font-mono font-bold text-white mb-1">{m.val}</div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-content-secondary">{m.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

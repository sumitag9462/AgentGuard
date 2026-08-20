import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Robot, Lightning, Checks, Target, BugBeetle, ShieldWarning } from '@phosphor-icons/react';

export default function LandingPage() {
  const navigate = useNavigate();

  const demoAgentRun = async () => {
    navigate('/demo');
  };

  return (
    <div className="min-h-screen bg-canvas text-content-primary font-sans selection:bg-safe/30 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-125 bg-safe/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Navbar */}
      <nav className="absolute top-0 w-full px-6 py-4 flex justify-between items-center z-10 border-b border-border-subtle bg-canvas/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <ShieldCheck weight="fill" className="text-safe w-6 h-6" />
          <span className="font-bold tracking-tight text-content-primary">AgentEval</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-[13px] font-bold text-content-secondary hover:text-content-primary transition-colors tracking-wide uppercase">Features</a>
          <a href="#how-it-works" className="text-[13px] font-bold text-content-secondary hover:text-content-primary transition-colors tracking-wide uppercase">How it Works</a>
          <button 
            onClick={() => navigate('/app')}
            className="px-4 py-2 text-[13px] font-bold rounded-md bg-panel-hover border border-border-subtle text-content-primary hover:bg-content-primary hover:text-canvas transition-all active:scale-[0.97]"
          >
            Launch Dashboard
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-40 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-safe-muted border border-safe/20 text-safe text-[11px] font-bold tracking-widest uppercase mb-8">
            <Checks className="w-4 h-4" />
            CI/CD for Autonomous Agents
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-[1.1]">
            Break your AI agent <br className="hidden md:block" />
            <span className="text-content-muted">before production does.</span>
          </h1>
          <p className="text-lg md:text-xl text-content-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Unit tests verify your software. AgentEval verifies the behavior of your AI agents. 
            Automatically generate edge cases, isolate execution traces, and measure reliability with deterministic gates.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={demoAgentRun}
              className="w-full sm:w-auto px-8 py-4 text-[15px] font-bold rounded-lg bg-content-primary text-canvas hover:bg-white transition-all active:scale-[0.97] flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
              <Lightning weight="fill" className="w-5 h-5" />
              Try Demo Agent
            </button>
            <button 
              onClick={() => navigate('/app')}
              className="w-full sm:w-auto px-8 py-4 text-[15px] font-bold rounded-lg bg-panel border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-panel-hover transition-all active:scale-[0.97]"
            >
              Enter Dashboard
            </button>
          </div>
        </motion.div>

        {/* Dynamic Hero Visualization */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="mt-24 w-full max-w-5xl relative"
        >
          <div className="p-1 rounded-lg bg-linear-to-b from-border-subtle to-transparent">
            <div className="bg-panel rounded-md overflow-hidden border border-border-subtle shadow-2xl flex flex-col md:flex-row h-auto md:h-100">
              {/* Agent Node */}
              <div className="flex-1 p-8 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-border-subtle relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-tr from-info/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <Robot className="w-16 h-16 text-info mb-4" weight="duotone" />
                <h3 className="text-xl font-bold mb-2">Customer Support Agent</h3>
                <p className="text-[13px] text-content-secondary text-center max-w-50">Connected via HTTP endpoint with 4 tools available.</p>
                
                {/* Simulated Logs */}
                <div className="mt-8 w-full max-w-60 bg-canvas rounded-sm border border-border-subtle p-3 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                    <span className="text-[11px] font-mono text-content-muted uppercase">Status: Connected</span>
                  </div>
                  <div className="font-mono text-[10px] text-content-secondary truncate">{">"} Listening on /api/chat...</div>
                  <div className="font-mono text-[10px] text-content-secondary truncate">{">"} 4 tools registered.</div>
                </div>
              </div>

              {/* Attack Engine Node */}
              <div className="flex-1 p-8 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-border-subtle relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-tr from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <Target className="w-16 h-16 text-warning mb-4" weight="duotone" />
                <h3 className="text-xl font-bold mb-2">Adversarial Engine</h3>
                <p className="text-[13px] text-content-secondary text-center max-w-50">Generating 150 edge-case and jailbreak scenarios.</p>
                
                <div className="mt-8 flex flex-col gap-2 w-full max-w-60">
                  <div className="h-6 w-full rounded bg-critical-muted border border-critical/20 relative overflow-hidden">
                    <motion.div 
                      className="absolute left-0 top-0 bottom-0 bg-critical/50"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-critical uppercase tracking-wider font-bold z-10">Jailbreak Prompt</div>
                  </div>
                  <div className="h-6 w-full rounded bg-warning-muted border border-warning/20 relative overflow-hidden">
                     <motion.div 
                      className="absolute left-0 top-0 bottom-0 bg-warning/50"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2.5, delay: 0.5, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-warning uppercase tracking-wider font-bold z-10">Edge Case Data</div>
                  </div>
                </div>
              </div>

              {/* Evaluation Node */}
              <div className="flex-1 p-8 flex flex-col justify-center items-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-tr from-safe/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <ShieldCheck className="w-16 h-16 text-safe mb-4" weight="duotone" />
                <h3 className="text-xl font-bold mb-2">Reliability Gate</h3>
                <p className="text-[13px] text-content-secondary text-center max-w-50">Evaluating responses and telemetry against policies.</p>
                
                <div className="mt-8 w-24 h-24 rounded-full border-4 border-panel-hover flex items-center justify-center relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="44" cy="44" r="44" fill="none" stroke="var(--color-safe)" strokeWidth="4" strokeDasharray="276" strokeDashoffset="40" className="opacity-100 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </svg>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-safe">85<span className="text-xs">%</span></span>
                    <span className="text-[10px] uppercase font-bold text-content-secondary tracking-widest">Score</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div id="features" className="mt-40 w-full max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 tracking-tight">Stop praying. Start evaluating.</h2>
            <p className="text-content-secondary max-w-2xl mx-auto">Traditional testing doesn't work for non-deterministic AI. AgentEval brings engineering rigor to autonomous systems.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-panel border border-border-subtle rounded-lg p-8 text-left hover:border-content-muted transition-colors">
              <div className="w-12 h-12 rounded-md bg-canvas border border-border-subtle flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-content-primary" />
              </div>
              <h3 className="text-lg font-bold mb-3">Adaptive Generation</h3>
              <p className="text-[13px] text-content-secondary leading-relaxed">
                AgentEval analyzes your agent's system prompt and tools to automatically generate highly relevant, adversarial scenarios that find edge cases you never thought of.
              </p>
            </div>
            
            <div className="bg-panel border border-border-subtle rounded-lg p-8 text-left hover:border-content-muted transition-colors">
              <div className="w-12 h-12 rounded-md bg-canvas border border-border-subtle flex items-center justify-center mb-6">
                <BugBeetle className="w-6 h-6 text-content-primary" />
              </div>
              <h3 className="text-lg font-bold mb-3">Forensic Tracing</h3>
              <p className="text-[13px] text-content-secondary leading-relaxed">
                When an agent fails, don't guess why. Inspect the exact execution trace, tool payloads, and intermediate reasoning steps to pinpoint the root cause of hallucinations.
              </p>
            </div>

            <div className="bg-panel border border-border-subtle rounded-lg p-8 text-left hover:border-content-muted transition-colors">
              <div className="w-12 h-12 rounded-md bg-canvas border border-border-subtle flex items-center justify-center mb-6">
                <ShieldWarning className="w-6 h-6 text-content-primary" />
              </div>
              <h3 className="text-lg font-bold mb-3">Regression Prevention</h3>
              <p className="text-[13px] text-content-secondary leading-relaxed">
                Compare agent versions over time. AgentEval integrates with your CI/CD pipeline to block deployments if a new model or prompt decreases reliability.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <ShieldCheck weight="fill" className="text-content-muted w-5 h-5" />
            <span className="font-bold tracking-tight text-content-muted">AgentEval</span>
          </div>
          <p className="text-[11px] text-content-muted font-mono uppercase tracking-wider">
            Built for reliable autonomous systems.
          </p>
        </div>
      </footer>
    </div>
  );
}

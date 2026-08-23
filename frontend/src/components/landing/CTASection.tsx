import { Link } from 'react-router-dom';
import { ArrowRight, GithubLogo } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

export function CTASection() {
  return (
    <section className="py-32 relative overflow-hidden bg-surface">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(99,102,241,0.1)_0%,transparent_60%)]" />
      
      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-6"
        >
          Find the failure before<br/>production does.
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-xl text-content-secondary mb-12"
        >
          Run your first adversarial evaluation and see exactly where your agent breaks.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/app" className="bg-white text-black px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            Run Interactive Demo <ArrowRight weight="bold" />
          </Link>
          <a href="https://github.com/sumitag9462/AgentGuard" target="_blank" rel="noopener noreferrer" className="glass-panel text-white px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:bg-white/10 transition-colors">
            <GithubLogo weight="fill" className="text-xl" /> View GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="py-12 bg-black border-t border-border-subtle text-content-secondary">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2">
          <div className="text-white font-bold tracking-tight">AgentEval</div>
          <div className="text-xs">AI Agent Evaluation & Reliability Infrastructure</div>
        </div>
        
        <div className="flex gap-6 text-sm font-medium">
          <a href="#" className="hover:text-white transition-colors">Platform</a>
          <a href="#" className="hover:text-white transition-colors">Methodology</a>
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="https://github.com/sumitag9462/AgentGuard" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </div>
        
        <div className="text-xs font-mono text-content-muted">
          Problem Statement 4
        </div>
      </div>
    </footer>
  );
}

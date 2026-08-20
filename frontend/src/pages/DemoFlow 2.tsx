import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Lightning } from '@phosphor-icons/react';
import api from '../services/apiClient';

export default function DemoFlow() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Initializing Sandbox...');

  useEffect(() => {
    const runDemo = async () => {
      try {
        // Fake a cool loading sequence
        await new Promise(resolve => setTimeout(resolve, 800));
        setStatus('Connecting to agent-v1-demo...');
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setStatus('Generating adversarial scenarios...');
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setStatus('Executing evaluation run...');
        
        // Trigger actual evaluation
        const res = await api.post('/evaluations', {
          agentId: 'agt-001',
          version: 'v1',
          count: 20, // smaller count for faster demo feel
        });

        // Route to the new evaluation
        navigate(`/app/evaluations/${res.data._id || res.data.id || res.data.runId}`);
      } catch (err) {
        console.error('Demo flow failed:', err);
        setStatus('Failed to launch demo. Redirecting to dashboard...');
        setTimeout(() => navigate('/app'), 2000);
      }
    };

    runDemo();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0iTTAgMGgyNHYyNEgwWiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDAuNWgyNHYxaC0yNFoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMikiLz48cGF0aCBkPSJNMCAyMy41aDI0djFoLTI0WiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIvPjxwaGF0IGQ9Ik0wLjUgMGgxdjI0aC0xWiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIvPjxwYXRoIGQ9Ik0yMy41IDBoMXYyNGgtMVoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMikiLz48L3N2Zz4=')] opacity-50 pointer-events-none" />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-full bg-panel border border-border-subtle flex items-center justify-center mb-8 relative">
          <div className="absolute inset-0 rounded-full border border-safe animate-ping opacity-20" />
          <Target weight="duotone" className="w-12 h-12 text-safe" />
        </div>
        
        <h1 className="text-2xl font-bold text-content-primary mb-2 tracking-tight">AgentEval Engine</h1>
        
        <div className="flex items-center gap-3 mt-4 px-4 py-2 rounded-full bg-panel border border-border-subtle">
          <Lightning className="w-4 h-4 text-warning animate-pulse" weight="fill" />
          <span className="text-[13px] font-mono text-content-secondary">{status}</span>
        </div>
      </motion.div>
    </div>
  );
}

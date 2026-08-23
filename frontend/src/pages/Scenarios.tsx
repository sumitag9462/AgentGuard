import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkle, ShieldCheck, Bug, WarningOctagon, MagnifyingGlass, Spinner } from '@phosphor-icons/react';
import useSWR, { mutate } from 'swr';
import api from '../services/apiClient';
import { useSocketEvents, socketManager } from '../lib/socket';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function Scenarios() {
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState(0);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const { data: scenarios = [], isLoading } = useSWR<any[]>('/scenarios', fetcher);

  // Subscribe to generation events
  useEffect(() => {
    if (selectedAgent) {
      const room = `agent:${selectedAgent}`;
      socketManager.joinRoom(room);
      return () => {
        socketManager.leaveRoom(room);
      };
    }
  }, [selectedAgent]);

  useSocketEvents({

  useSocketEvents({
    'scenario:generation_started': () => {
      setGenerating(true);
      setStage(0);
    },
    'scenario:generation_progress': (data: any) => {
       // data might contain progress/stage info if backend implemented it
       setStage(s => Math.min(s + 1, 6)); 
    },
    'scenario:generation_failed': (data: any) => {
      setGenerating(false);
      alert('Generation failed: ' + (data.error || 'Unknown error'));
    },
    'scenario:generation_completed': () => {
      setGenerating(false);
      setStage(7);
      mutate('/scenarios');
      mutate('/dashboard/overview');
    }
  });

  const STAGES = [
    "ANALYZING AGENT",
    "MAPPING TOOLS",
    "IDENTIFYING RISKS",
    "GENERATING ATTACKS",
    "CHECKING COVERAGE",
    "DEDUPLICATING",
    "BUILDING TEST SUITE",
    "COMPLETE"
  ];

  const handleGenerate = async () => {
    // In a real application, you might prompt to select an agent first, or use a default one for the hackathon
    // Since we're fetching from /scenarios, we can just trigger generation on a selected agent.
    // For demo purposes, we can let the button initiate the socket event simulation locally if backend is stubbed,
    // or call an actual API if we want to run generation for all agents or a specific one.
    
    // We will simulate the generation API call here for UI since the backend route is /agents/:id/generate-scenarios
    // Let's assume we want to trigger for the first agent
    setGenerating(true);
    setStage(0);
    
    try {
      const agents = await api.get('/agents').then(res => res.data);
      if (agents.length > 0) {
        await api.post(`/agents/${agents[0].agentId || agents[0].id}/generate-scenarios`);
      } else {
        alert("Please create an agent first.");
        setGenerating(false);
      }
    } catch (err) {
      console.error(err);
      alert("Generation failed");
      setGenerating(false);
    }
  };

  const selectedScenario = scenarios.find(s => s.scenarioId === selectedScenarioId || s.id === selectedScenarioId);

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-6xl mx-auto h-full relative">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Scenario Constellation</h1>
          <p className="text-content-secondary">Adversarial mapping of generated edge cases.</p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium hover:scale-105 transition-transform disabled:opacity-50"
        >
          {generating ? <Spinner className="animate-spin" /> : <Sparkle weight="fill" />}
          {generating ? 'Generating...' : 'Generate New Suite'}
        </button>
      </header>

      {/* Cinematic Generator Overlay */}
      <AnimatePresence>
        {generating && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 glass-panel backdrop-blur-xl rounded-xl flex flex-col items-center justify-center p-8"
          >
            <div className="flex items-center gap-4 mb-12">
              <div className="w-4 h-4 rounded-full bg-accent animate-ping" />
              <div className="text-2xl font-mono text-accent uppercase tracking-widest">{STAGES[stage]}</div>
            </div>
            
            <div className="w-full max-w-xl h-2 bg-panel rounded-full overflow-hidden mb-8">
              <motion.div 
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            <div className="text-center opacity-70">
              <div className="text-xs uppercase tracking-widest text-content-muted">Awaiting Backend Generation Events via Socket.IO...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-h-125 glass-panel rounded-xl relative overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b border-border-subtle flex items-center justify-between px-4">
          <div className="flex items-center gap-4 text-sm font-medium">
            <button className="text-white bg-panel-hover px-3 py-1.5 rounded-md">All ({scenarios.length})</button>
            <button className="text-content-secondary hover:text-white px-3 py-1.5">Edge Cases ({scenarios.filter(s => s.difficulty === 'HARD').length})</button>
            <button className="text-critical hover:text-critical-strong flex items-center gap-1 px-3 py-1.5"><WarningOctagon weight="bold" /> Adversarial ({scenarios.filter(s => s.category === 'PROMPT_INJECTION' || s.category === 'SECURITY_BYPASS').length})</button>
          </div>
          <div className="flex items-center gap-2 bg-panel px-3 py-1.5 rounded-md border border-border-strong">
            <MagnifyingGlass className="text-content-muted" />
            <input type="text" placeholder="Search scenarios..." className="bg-transparent border-none outline-none text-sm w-48 text-white" />
          </div>
        </div>

        {/* Constellation Visualizer */}
        <div className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(24,24,27,1)_0%,rgba(9,9,11,1)_100%)]">
          
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner className="w-8 h-8 animate-spin text-content-muted" />
            </div>
          ) : scenarios.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-content-muted">
               No scenarios generated yet. Connect an agent and generate a suite.
            </div>
          ) : (
            <>
              {/* Connections */}
              <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
                {scenarios.slice(0, 30).map((_, i) => (
                  <line 
                    key={i}
                    x1={`${10 + (Math.random() * 80)}%`}
                    y1={`${10 + (Math.random() * 80)}%`}
                    x2={`${10 + (Math.random() * 80)}%`}
                    y2={`${10 + (Math.random() * 80)}%`}
                    stroke="varcontent-muted"
                    strokeWidth="1"
                  />
                ))}
              </svg>

              {/* Nodes */}
              {scenarios.map((scenario, i) => {
                const isCritical = scenario.severity === 'CRITICAL';
                const isWarning = scenario.severity === 'HIGH' || scenario.difficulty === 'HARD';
                const color = isCritical ? 'varcritical' : isWarning ? 'varwarning' : 'varsafe';
                
                // Using pseudo-random positions based on index so they don't jump around on re-renders as much
                const seededTop = `${10 + ((i * 13) % 80)}%`;
                const seededLeft = `${10 + ((i * 17) % 80)}%`;
                
                return (
                  <motion.div
                    key={scenario.scenarioId || scenario.id || i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (i % 20) * 0.05, duration: 0.5 }}
                    className="absolute w-3 h-3 rounded-full cursor-pointer hover:scale-150 transition-transform z-10"
                    style={{ top: seededTop, left: seededLeft, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                    title={scenario.name || scenario.description}
                    onClick={() => setSelectedScenarioId(scenario.scenarioId || scenario.id)}
                  />
                );
              })}
            </>
          )}

          {/* Overlay card for selected scenario */}
          <AnimatePresence>
            {selectedScenario && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-6 left-6 w-80 glass-panel p-5 border border-border-subtle rounded-xl shadow-2xl z-20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${selectedScenario.severity === 'CRITICAL' ? 'text-critical bg-critical-muted' : 'text-safe bg-safe-muted'}`}>
                    {selectedScenario.category}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-content-secondary">{selectedScenario.difficulty}</span>
                </div>
                <p className="text-sm text-white mb-4 line-clamp-2">"{selectedScenario.input?.messages?.[0]?.content || selectedScenario.description}"</p>
                <div className="text-xs text-content-muted flex items-center justify-between">
                  <span className="line-clamp-1">Target: <span className="font-mono text-white">{selectedScenario.targetTool || 'General'}</span></span>
                </div>
                <button className="mt-4 w-full text-xs font-semibold py-1.5 bg-white/10 hover:bg-white/20 rounded text-white" onClick={() => setSelectedScenarioId(null)}>Close</button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

import { Badge } from '../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Lightning, Funnel, Plus, CaretLeft, Database } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import api from '../services/apiClient';
import type { Scenario, Agent } from '../types';
import { useState, useMemo, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:4000');

export default function Scenarios() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [generatingForAgent, setGeneratingForAgent] = useState<string | null>(null);
  
  // Controls which agent's scenarios we are viewing. null = list of agents.
  const [selectedAgentView, setSelectedAgentView] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  useEffect(() => {
    const onLog = (data: any) => {
      if (data.type === 'stdout' && typeof data.message === 'string') {
        const match = data.message.match(/PROGRESS: (.*)/);
        if (match) {
          setGenerationProgress(match[1]);
        }
      }
    };
    socket.on('evaluation_log', onLog);
    return () => {
      socket.off('evaluation_log', onLog);
    };
  }, []);
  
  const { data: scenarios, mutate: mutateScenarios, isLoading: isLoadingScenarios } = useSWR<Scenario[]>('/scenarios', fetcher);
  const { data: agents, isLoading: isLoadingAgents } = useSWR<Agent[]>('/agents', fetcher);

  // Group scenarios by agent
  const scenariosByAgent = useMemo(() => {
    if (!scenarios) return {};
    const grouped: Record<string, Scenario[]> = {};
    scenarios.forEach(s => {
      const aId = s.agentId || 'unknown';
      if (!grouped[aId]) grouped[aId] = [];
      grouped[aId].push(s);
    });
    return grouped;
  }, [scenarios]);

  // Data for the active agent view
  const activeAgentScenarios = selectedAgentView && scenariosByAgent[selectedAgentView] ? scenariosByAgent[selectedAgentView] : [];
  const categories = ['ALL', ...Array.from(new Set(activeAgentScenarios.map(s => s.category) || []))];
  
  const filteredScenarios = selectedCategory === 'ALL' 
    ? activeAgentScenarios 
    : activeAgentScenarios.filter(s => s.category === selectedCategory);

  const activeAgent = agents?.find(a => a.agentId === selectedAgentView);

  const handleGenerate = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent clicking the card from navigating
    setGeneratingForAgent(agentId);
    try {
      await api.post(`/agents/${agentId}/generate-scenarios`, {});
      
      // Poll for new scenarios
      let attempts = 0;
      const initialCount = scenarios?.length || 0;
      
      const pollInterval = setInterval(async () => {
        const newData = await mutateScenarios();
        attempts++;
        
        // If we found new scenarios, or timed out after 5 minutes (150 attempts)
        if ((newData && newData.length > initialCount) || attempts > 150) {
          clearInterval(pollInterval);
          setGeneratingForAgent(null);
        }
      }, 2000);
      
    } catch (err) {
      console.error('Failed to generate scenarios:', err);
      alert('Failed to generate scenarios.');
      setGeneratingForAgent(null);
    }
  };

  // --- VIEW 1: AGENT LIST ---
  if (!selectedAgentView) {
    return (
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border-subtle pb-6">
          <div>
            <h1 className="text-display text-content-primary tracking-tight">SCENARIO GROUPS</h1>
            <p className="text-body-sm text-content-secondary mt-1">Select an agent to view or generate its test cases.</p>
          </div>
        </div>

        {isLoadingAgents ? (
          <div className="text-content-muted text-sm py-10 text-center">Loading agents...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents?.map(agent => {
              const count = scenariosByAgent[agent.agentId]?.length || 0;
              const isGen = generatingForAgent === agent.agentId;
              
              return (
                <div 
                  key={agent.agentId}
                  onClick={() => {
                    setSelectedAgentView(agent.agentId);
                    setSelectedCategory('ALL');
                  }}
                  className="bg-panel border border-border-subtle rounded-lg p-6 hover:border-border-strong cursor-pointer transition-all hover:-translate-y-1 hover:shadow-glow flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-canvas border border-border-subtle rounded-md text-content-primary">
                      <Database className="w-5 h-5" />
                    </div>
                    <Badge variant={count > 0 ? 'success' : 'default'}>{count} Scenarios</Badge>
                  </div>
                  
                  <h3 className="text-lg font-bold text-content-primary mb-1">{agent.name}</h3>
                  <p className="font-mono text-[11px] text-content-muted mb-6">{agent.agentId}</p>
                  
                  <div className="mt-auto pt-4 border-t border-border-subtle">
                    <Button 
                      variant={count > 0 ? 'secondary' : 'primary'} 
                      className="w-full gap-2 text-[13px]" 
                      onClick={(e) => handleGenerate(agent.agentId, e)}
                      disabled={isGen}
                    >
                      <Lightning className="w-4 h-4" />
                      {isGen ? 'Generating...' : count > 0 ? 'Generate More' : 'Generate Scenarios'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- VIEW 2: SCENARIOS FOR SELECTED AGENT ---
  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border-subtle pb-6">
        <div>
          <button 
            onClick={() => setSelectedAgentView(null)}
            className="flex items-center gap-2 text-[13px] text-content-muted hover:text-content-primary mb-4 transition-colors"
          >
            <CaretLeft className="w-4 h-4" /> Back to Agents
          </button>
          <h1 className="text-display text-content-primary tracking-tight uppercase">
            {activeAgent?.name || 'SCENARIOS'}
          </h1>
          <p className="text-body-sm text-content-secondary mt-1">Test cases used to evaluate this agent's behavior.</p>
          <div className="flex gap-4 mt-4 text-xs font-mono text-content-secondary">
            <span>{activeAgentScenarios.length} scenarios</span>
            <span>{categories.length - 1} categories</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="gap-2 text-[13px]">
            <Plus className="w-4 h-4" />
            Create Scenario
          </Button>
          <Button 
            onClick={(e) => handleGenerate(selectedAgentView, e)} 
            disabled={generatingForAgent === selectedAgentView}
            className="gap-2 bg-info text-white border-info text-[13px] h-9"
          >
            <Lightning className="w-4 h-4" />
            {generatingForAgent === selectedAgentView ? 'Generating...' : 'Generate Scenarios'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 bg-canvas">
          <div className="flex items-center gap-2 text-[13px] text-content-muted font-medium shrink-0">
            <Funnel className="w-4 h-4" /> Filter:
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-content-primary text-canvas' 
                    : 'bg-panel text-content-secondary hover:text-content-primary border border-border-subtle'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        <Table 
          loading={isLoadingScenarios} 
          empty={!isLoadingScenarios && (!filteredScenarios || filteredScenarios.length === 0)} 
          emptyProps={{ 
            title: generatingForAgent === selectedAgentView ? 'GENERATING SCENARIOS...' : 'NO SCENARIOS YET', 
            description: generatingForAgent === selectedAgentView 
              ? (generationProgress ? `Progress: ${generationProgress}...` : 'Please wait, analyzing agent and generating test cases...') 
              : 'Click "Generate Scenarios" to automatically create test cases for this agent.',
            icon: generatingForAgent === selectedAgentView ? <Lightning className="w-8 h-8 animate-pulse text-info" /> : undefined
          }}
        >
          <TableHead>
            <TableHeader>Scenario ID</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Severity</TableHeader>
            <TableHeader>Input / Prompt</TableHeader>
            <TableHeader>Expected Behavior</TableHeader>
          </TableHead>
          <TableBody>
            {filteredScenarios?.map((scenario) => (
              <TableRow key={scenario.id || scenario._id || scenario.testId}>
                <TableCell className="font-mono text-info text-xs">{scenario.testId || scenario.scenarioId}</TableCell>
                <TableCell>
                  <Badge variant={scenario.category === 'DESTRUCTIVE' ? 'danger' : 'default'}>{scenario.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    scenario.severity === 'CRITICAL' ? 'danger' : 
                    scenario.severity === 'HIGH' ? 'warning' : 
                    scenario.severity === 'MEDIUM' ? 'default' : 'success'
                  }>
                    {scenario.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-content-primary text-[13px]">
                  <div className="line-clamp-2 max-w-sm">{scenario.scenario || (scenario as any).userInput}</div>
                </TableCell>
                <TableCell className="text-content-secondary text-[13px]">
                  <div className="line-clamp-2 max-w-sm">{scenario.rule || scenario.evaluationRule}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

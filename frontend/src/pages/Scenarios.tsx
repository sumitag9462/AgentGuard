import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Lightning, Funnel, Plus, CaretDown, Robot } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import api from '../services/apiClient';
import type { Scenario, Agent } from '../types';
import { useState } from 'react';
import { Modal } from '../components/ui/Modal';

export default function Scenarios() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  
  const { data: scenarios, mutate } = useSWR<Scenario[]>('/scenarios', fetcher);
  const { data: agents } = useSWR<Agent[]>('/agents', fetcher);

  const categories = ['ALL', ...Array.from(new Set(scenarios?.map(s => s.category) || []))];
  
  const filteredScenarios = selectedCategory === 'ALL' 
    ? scenarios 
    : scenarios?.filter(s => s.category === selectedCategory);

  const handleGenerate = async () => {
    if (!selectedAgent) return;
    setIsGenerating(true);
    try {
      await api.post(`/agents/${selectedAgent}/generate-scenarios`, { count: 100 });
      alert('Scenario generation started. This may take a minute. The scenarios will appear here once complete.');
      setIsModalOpen(false);
      // Wait a bit and refresh
      mutate();
    } catch (err) {
      console.error('Failed to generate scenarios:', err);
      alert('Failed to generate scenarios.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-content-primary tracking-tight">Test Scenarios</h1>
          <p className="text-[13px] text-content-secondary mt-1">Generated and curated test cases for evaluation.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="gap-2">
            <Plus className="w-4 h-4" />
            Manual Scenario
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-info hover:bg-info/80 text-white border-info">
            <Lightning className="w-4 h-4" />
            Generate Scenarios
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden bg-panel border-border-subtle">
        <div className="p-4 border-b border-border-subtle flex gap-4 bg-canvas">
          <div className="flex items-center gap-2 text-[13px] text-content-muted font-medium">
            <Funnel className="w-4 h-4" /> Filter by:
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
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
        
        <Table>
          <TableHead>
            <TableHeader>Scenario ID</TableHeader>
            <TableHeader>Category</TableHeader>
            <TableHeader>Severity</TableHeader>
            <TableHeader>User Input / Prompt</TableHeader>
            <TableHeader>Expected Rule</TableHeader>
          </TableHead>
          <TableBody>
            {filteredScenarios?.map((scenario) => (
              <TableRow key={scenario.id || scenario._id || scenario.testId}>
                <TableCell className="font-mono text-content-muted text-[11px]">{scenario.testId || scenario.scenarioId}</TableCell>
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
                  <div className="line-clamp-2 max-w-lg">{scenario.scenario || (scenario as any).userInput}</div>
                </TableCell>
                <TableCell className="text-content-secondary text-[13px]">{scenario.rule || scenario.evaluationRule}</TableCell>
              </TableRow>
            ))}
            {(!filteredScenarios || filteredScenarios.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-content-muted">
                  <div className="flex flex-col items-center gap-2">
                    <Robot className="w-8 h-8 opacity-50" />
                    <p>No scenarios found.</p>
                    <Button variant="ghost" onClick={() => setIsModalOpen(true)} className="mt-2 text-info">
                      Generate some scenarios
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Generate AI Scenarios"
        description="Select an agent to automatically generate diverse, edge-case, and adversarial scenarios based on its configuration."
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold text-content-muted mb-2 uppercase tracking-wider">Target Agent</label>
            <div className="relative">
              <select
                value={selectedAgent}
                onChange={e => setSelectedAgent(e.target.value)}
                className="w-full bg-canvas border border-border-subtle rounded-md px-4 py-3 text-[13px] text-content-primary appearance-none focus:outline-none focus:border-safe"
              >
                <option value="">Select an agent...</option>
                {agents?.map(a => (
                  <option key={a.agentId} value={a.agentId}>{a.name} ({a.agentId})</option>
                ))}
              </select>
              <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
            </div>
          </div>
          
          <div className="mt-4 p-4 rounded-md bg-info-muted border border-info/20">
            <h4 className="text-info text-[13px] font-bold mb-1">What will be generated?</h4>
            <p className="text-[13px] text-content-secondary leading-relaxed">
              AgentEval will use LLMs to read the agent's system prompt, tools, and policies, then generate 10 targeted scenarios spanning NORMAL, ADVERSARIAL, SAFETY, PROMPT_INJECTION, and EDGE_CASE categories.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={!selectedAgent || isGenerating} className="bg-info hover:bg-info/80 text-white">
              {isGenerating ? 'Generating...' : 'Start Generation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

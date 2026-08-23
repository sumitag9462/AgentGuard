import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Robot, Wrench, Shield, ChartLineUp, Spinner } from '@phosphor-icons/react';
import useSWR from 'swr';
import api, { fetcher } from '../services/apiClient';

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  
  const { data: agent, isLoading } = useSWR(`/agents/${id}`, fetcher);

  const handleRunEvaluation = async () => {
    if (!agent) return;
    if (agent.scenarioCount === 0) {
      alert("No scenarios generated. Generate scenarios first.");
      navigate("/app/scenarios");
      return;
    }
    
    setRunning(true);
    try {
      const res = await api.post('/evaluations', { agentId: agent.agentId || id });
      navigate(`/app/evaluations/${res.data.evaluationId}`);
    } catch (err: any) {
      alert("Failed to start evaluation: " + (err.response?.data?.error || err.message));
      setRunning(false);
    }
  };

  if (isLoading) return <div className="p-12 text-center"><Spinner className="animate-spin inline-block text-3xl" /></div>;
  if (!agent) return <div className="p-12 text-center text-red-400">Agent not found</div>;

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-5xl mx-auto">
      <header className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-accent-muted border border-accent text-accent flex items-center justify-center">
              <Robot className="text-3xl" weight="fill" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-1">{agent.name}</h1>
              <div className="flex items-center gap-3 text-sm text-content-secondary font-mono">
                <span>ID: {agent.agentId}</span>
                <span>•</span>
                <span>v{agent.latestVersion}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/app/scenarios" className="bg-panel-hover text-white px-4 py-2 rounded-lg text-sm font-medium border border-border-strong hover:bg-raised transition-colors">
              Manage Scenarios ({agent.scenarioCount || 0})
            </Link>
            <button 
              onClick={handleRunEvaluation}
              disabled={running}
              className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {running && <Spinner className="animate-spin" />}
              {running ? "Starting..." : "Run Evaluation"}
            </button>
          </div>
        </div>
      </header>

      {/* Tool Risk Visualization */}
      <div className="glass-panel p-6 rounded-xl flex flex-col gap-6">
        <div className="text-xs font-bold uppercase tracking-widest text-content-muted flex items-center gap-2">
          <Wrench /> Configured Tools ({agent.tools?.length || 0})
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agent.tools?.map((tool: any, i: number) => (
            <div key={i} className="bg-panel-hover p-4 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-medium text-white mb-1">{tool.name}</div>
                <div className="text-xs text-content-secondary line-clamp-1">{tool.description}</div>
              </div>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                tool.riskLevel === 'CRITICAL' ? 'bg-critical-muted text-critical border-critical/30' :
                tool.riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' :
                'bg-info-muted text-info border-info/30'
              }`}>
                {tool.riskLevel || 'LOW'} RISK
              </span>
            </div>
          ))}
          {!agent.tools?.length && <div className="text-content-muted text-sm">No tools configured.</div>}
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl flex flex-col gap-6">
        <div className="text-xs font-bold uppercase tracking-widest text-content-muted flex items-center gap-2">
          <Shield /> Security Policies ({agent.policies?.length || 0})
        </div>
        <div className="flex flex-col gap-3">
          {agent.policies?.map((policy: any, i: number) => (
            <div key={i} className="flex items-start gap-3 bg-panel-hover p-4 rounded-lg">
              <Shield className="text-safe mt-0.5" />
              <div>
                <div className="font-medium text-white">{policy.name || policy}</div>
                {policy.description && <div className="text-sm text-content-secondary mt-1">{policy.description}</div>}
              </div>
            </div>
          ))}
          {!agent.policies?.length && <div className="text-content-muted text-sm">No specific policies configured.</div>}
        </div>
      </div>
    </div>
  );
}

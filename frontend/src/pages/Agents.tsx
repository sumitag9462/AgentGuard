import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Robot, Wrench, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import type { Agent } from '../types';

export default function Agents() {
  const { data: agents, error, isLoading } = useSWR<Agent[]>('/agents', fetcher);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Target Agents</h1>
          <p className="text-zinc-400 mt-1">Manage and evaluate autonomous agents connected to the platform.</p>
        </div>
        <Button>Register Agent</Button>
      </div>

      {isLoading && <div className="text-zinc-400">Loading agents...</div>}
      {error && <div className="text-rose-500">Failed to load agents</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {agents?.map((agent) => (
          <Card key={agent.id} className="flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5">
                  <Robot className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
                    {agent.name}
                    <Badge variant={agent.status === 'Healthy' ? 'success' : 'danger'}>{agent.status}</Badge>
                  </h3>
                  <div className="text-sm text-zinc-500 mt-0.5 font-mono">{agent.provider} • {agent.latestVersion}</div>
                </div>
              </div>
            </div>
            
            <p className="text-zinc-400 text-sm mb-6">{agent.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-950 p-4 rounded-lg border border-white/5">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Tools Exposed
                </div>
                <div className="text-xl font-semibold text-zinc-200">{agent.tools.length}</div>
              </div>
              <div className="bg-zinc-950 p-4 rounded-lg border border-white/5">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Reliability
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-semibold text-zinc-200">{agent.reliability}%</div>
                  {agent.reliability < 90 && <WarningCircle className="w-4 h-4 text-amber-500" />}
                </div>
              </div>
            </div>

            <div className="mt-auto flex gap-3 pt-4 border-t border-white/5">
              <Button variant="secondary" className="flex-1">View Details</Button>
              <Button className="flex-1">Evaluate Now</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

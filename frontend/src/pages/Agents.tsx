import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Robot, Wrench, ShieldCheck, WarningCircle, X } from '@phosphor-icons/react';
import useSWR from 'swr';
import api, { fetcher } from '../services/apiClient';
import type { Agent } from '../types';
import { useState } from 'react';

export default function Agents() {
  const { data: agents, error, isLoading, mutate } = useSWR<Agent[]>('/agents', fetcher);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', endpoint: '' });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post('/agents', formData);
      await mutate();
      setIsModalOpen(false);
      setFormData({ name: '', description: '', endpoint: '' });
    } catch (err) {
      console.error('Failed to register agent', err);
      alert('Failed to register agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Target Agents</h1>
          <p className="text-zinc-400 mt-1">Manage and evaluate autonomous agents connected to the platform.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Register Agent</Button>
      </div>

      {isLoading && <div className="text-zinc-400">Loading agents...</div>}
      {error && <div className="text-rose-500">Failed to load agents</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {agents?.map((agent) => (
          <Card key={agent.id || agent._id} className="flex flex-col">
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
                  <div className="text-sm text-zinc-500 mt-0.5 font-mono">
                    {agent.provider} {agent.endpoint && <span className="text-emerald-500/70 block truncate max-w-[200px] text-xs mt-1">{agent.endpoint}</span>}
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-zinc-400 text-sm mb-6">{agent.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-950 p-4 rounded-lg border border-white/5">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Tools Exposed
                </div>
                <div className="text-xl font-semibold text-zinc-200">{agent.tools?.length || 0}</div>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-bold text-zinc-50 mb-2">Register Agent</h2>
            <p className="text-zinc-400 text-sm mb-6">Connect a new AI agent to AgentGuard via Webhook.</p>
            
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-300">Agent Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" placeholder="e.g., Customer Support Bot" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-300">Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 min-h-[80px]" placeholder="Briefly describe the agent's purpose." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-300">Webhook Endpoint URL</label>
                <input required type="url" value={formData.endpoint} onChange={e => setFormData({...formData, endpoint: e.target.value})} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" placeholder="https://api.your-app.com/v1/agent" />
              </div>
              
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Registering...' : 'Register'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    integrationType: 'WEBHOOK' as 'INTERNAL' | 'WEBHOOK',
    endpoint: '',
    webhook: {
      url: '',
      method: 'POST',
      responseField: 'response',
      traceField: 'trace'
    }
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post('/agents', formData);
      await mutate();
      setIsModalOpen(false);
      setFormData({
        name: '', description: '', integrationType: 'WEBHOOK', endpoint: '',
        webhook: { url: '', method: 'POST', responseField: 'response', traceField: 'trace' }
      });
      setTestResult(null);
    } catch (err) {
      console.error('Failed to register agent', err);
      alert('Failed to register agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvaluate = async (agentId: string) => {
    try {
      const res = await api.post('/evaluations', { agentId, version: 'v1.0.0' });
      const data = res.data;
      if (data && data._id) {
        window.location.href = `/evaluations/${data._id}`;
      }
    } catch (err) {
      console.error('Failed to trigger evaluation', err);
      alert('Failed to trigger evaluation');
    }
  };

  const handleTestConnection = async () => {
    if (!formData.webhook.url) return;
    try {
      setIsTesting(true);
      setTestResult(null);
      
      const url = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const res = await fetch(`${url}/agents/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook: formData.webhook })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setTestResult({ status: 'Failed', message: data.error || 'Connection failed' });
      } else {
        setTestResult({ status: 'Connected', message: data.message || 'Connection successful!' });
      }
    } catch (err) {
      setTestResult({ status: 'Failed', message: 'Connection failed' });
    } finally {
      setIsTesting(false);
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
                    <Badge variant={agent.status === 'Healthy' || agent.status === 'Connected' ? 'success' : agent.status === 'Unreachable' || agent.status === 'Timeout' ? 'danger' : 'warning'}>{agent.status}</Badge>
                  </h3>
                  <div className="text-sm text-zinc-500 mt-0.5 font-mono">
                    Integration: {agent.integrationType || 'INTERNAL'} 
                    {agent.integrationType === 'WEBHOOK' && agent.webhook && (
                      <span className="text-emerald-500/70 block truncate max-w-50 text-xs mt-1">{agent.webhook.url}</span>
                    )}

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
              <Button variant="secondary" className="flex-1" onClick={() => window.location.href = `/agents/${agent.agentId}`}>View Details</Button>
              <Button className="flex-1" onClick={() => handleEvaluate(agent.agentId)}>Evaluate Now</Button>
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
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 min-h-20" placeholder="Briefly describe the agent's purpose." />
              </div>
              <div className="flex flex-col gap-1.5 mb-2">
                <label className="text-sm font-medium text-zinc-300">Integration Type</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                    <input type="radio" name="integrationType" checked={formData.integrationType === 'INTERNAL'} onChange={() => setFormData({...formData, integrationType: 'INTERNAL'})} className="accent-emerald-500" />
                    Internal Agent
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                    <input type="radio" name="integrationType" checked={formData.integrationType === 'WEBHOOK'} onChange={() => setFormData({...formData, integrationType: 'WEBHOOK'})} className="accent-emerald-500" />
                    Webhook API
                  </label>
                </div>
              </div>

              {formData.integrationType === 'WEBHOOK' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-zinc-300">Webhook URL</label>
                    <input required type="url" value={formData.webhook.url} onChange={e => setFormData({...formData, webhook: {...formData.webhook, url: e.target.value}})} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" placeholder="https://api.example.com/chat" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-zinc-300">HTTP Method</label>
                      <input required value={formData.webhook.method} onChange={e => setFormData({...formData, webhook: {...formData.webhook, method: e.target.value}})} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-zinc-300">Response Field</label>
                      <input required value={formData.webhook.responseField} onChange={e => setFormData({...formData, webhook: {...formData.webhook, responseField: e.target.value}})} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-zinc-300">Optional Trace Field</label>
                    <input value={formData.webhook.traceField} onChange={e => setFormData({...formData, webhook: {...formData.webhook, traceField: e.target.value}})} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  
                  {testResult && (
                    <div className={`text-sm p-3 rounded-lg border ${testResult.status === 'Connected' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                      {testResult.message}
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                {formData.integrationType === 'WEBHOOK' && (
                  <Button variant="secondary" onClick={handleTestConnection} type="button" disabled={isTesting || !formData.webhook.url}>
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                )}
                <div className="flex-1"></div>
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

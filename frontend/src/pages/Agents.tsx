import { Plus, Robot, ArrowRight } from '@phosphor-icons/react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import api from '../services/apiClient';
import type { Agent, IntegrationType, AuthenticationType } from '../types';
import { useState } from 'react';

export default function Agents() {
  const navigate = useNavigate();
  const { data: agents, mutate } = useSWR<Agent[]>('/agents', fetcher);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', description: '', domain: '',
    integrationType: 'INTERNAL' as IntegrationType,
    endpoint: '', method: 'POST', authType: 'NONE' as AuthenticationType,
    credential: '', requestTemplate: '', responseMapping: '',
    timeoutMs: 30000, provider: '',
    baseUrl: '', model: '', apiKey: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: '', description: '', domain: '',
      integrationType: 'INTERNAL',
      endpoint: '', method: 'POST', authType: 'NONE',
      credential: '', requestTemplate: '', responseMapping: '',
      timeoutMs: 30000, provider: '',
      baseUrl: '', model: '', apiKey: '',
    });
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNext();
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await api.post('/agents', {
        name: formData.name,
        description: formData.description,
        domain: formData.domain,
        provider: formData.provider || formData.model || 'Unknown',
        systemPrompt: "You are a helpful AI agent.\nPOLICY: Prioritize safety over task completion.",
        tools: [],
        policies: [],
        maxToolCalls: 10,
        qualityGate: { minReliability: 80, maxCriticalFailures: 0, minSafetyScore: 85 }
      });
      
      const id = res.data._id || res.data.id || res.data.agentId;
      
      const integrationConfig: any = {
        type: formData.integrationType,
      };
      
      if (formData.integrationType === 'HTTP') {
        integrationConfig.endpoint = formData.endpoint;
        integrationConfig.method = formData.method;
        integrationConfig.authenticationType = formData.authType;
        if (formData.authType !== 'NONE') integrationConfig.credential = formData.credential;
        integrationConfig.requestTemplate = formData.requestTemplate;
        integrationConfig.responseMapping = formData.responseMapping;
        integrationConfig.timeoutMs = formData.timeoutMs;
      } else if (formData.integrationType === 'OPENAI_COMPATIBLE') {
        integrationConfig.endpoint = formData.baseUrl;
        integrationConfig.authenticationType = 'BEARER';
        integrationConfig.credential = formData.apiKey;
        integrationConfig.provider = formData.model;
      }
      
      if (id) {
        await api.put(`/agents/${id}/integration`, integrationConfig);
      }
      
      mutate();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to register agent:', err);
      alert('Failed to register agent. See console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!agents) {
    return <div className="text-zinc-400">Loading agents...</div>;
  }

  return (
    <div className="flex flex-col gap-8 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">AI Agents</h1>
          <p className="text-zinc-400 mt-1">Manage and configure agents for evaluation.</p>
        </div>
        <Button onClick={() => navigate('/app/agents/connect')} className="gap-2">
          <Plus className="w-4 h-4" />
          Connect Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id || agent._id} className="flex flex-col h-full hover:border-safe/30 transition-colors cursor-pointer" onClick={() => navigate(`/app/agents/${agent.agentId}`)}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                  <Robot className="w-6 h-6 text-safe" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">{agent.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono">{agent.agentId} • {agent.latestVersion}</p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-zinc-400 mb-6 flex-1 line-clamp-2">{agent.description}</p>
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Domain</span>
                <span className="text-zinc-300">{agent.domain}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Reliability</span>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${agent.reliability >= 90 ? 'text-safe' : agent.reliability >= 70 ? 'text-warning' : 'text-critical'}`}>
                    {agent.reliability}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Tools</span>
                <span className="text-zinc-300">{agent.tools?.length || 0} registered</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Status</span>
                <Badge variant={agent.status === 'Healthy' ? 'success' : agent.status === 'Degraded' ? 'warning' : 'danger'}>
                  {agent.status}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Connect Agent"
        description="Follow the steps to configure and connect your agent."
      >
        <div className="mb-6 flex gap-2 items-center justify-center">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${step >= s ? 'bg-safe' : 'bg-zinc-700'}`} />
              {s < 4 && <div className={`w-8 h-px ${step > s ? 'bg-safe' : 'bg-zinc-700'}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Agent Name *</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50"
                  placeholder="e.g., Customer Support Bot"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50 h-24 resize-none"
                  placeholder="Describe the agent's purpose..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Domain</label>
                <input 
                  type="text" 
                  value={formData.domain}
                  onChange={e => setFormData({...formData, domain: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50"
                  placeholder="e.g., E-commerce"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-zinc-100 font-medium mb-2">Select Integration Type</h3>
              
              <div 
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${formData.integrationType === 'INTERNAL' ? 'bg-safe/10 border-safe' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                onClick={() => setFormData({...formData, integrationType: 'INTERNAL'})}
              >
                <h4 className="text-zinc-100 font-medium mb-1">Internal Demo</h4>
                <p className="text-sm text-zinc-400">Test with AgentEval's built-in simulation sandbox</p>
              </div>

              <div 
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${formData.integrationType === 'HTTP' ? 'bg-safe/10 border-safe' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                onClick={() => setFormData({...formData, integrationType: 'HTTP'})}
              >
                <h4 className="text-zinc-100 font-medium mb-1">HTTP API</h4>
                <p className="text-sm text-zinc-400">Connect to your agent's REST API endpoint</p>
              </div>

              <div 
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${formData.integrationType === 'OPENAI_COMPATIBLE' ? 'bg-safe/10 border-safe' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                onClick={() => setFormData({...formData, integrationType: 'OPENAI_COMPATIBLE'})}
              >
                <h4 className="text-zinc-100 font-medium mb-1">OpenAI Compatible</h4>
                <p className="text-sm text-zinc-400">Connect via OpenAI-compatible API</p>
              </div>
            </div>
          )}

          {step === 3 && formData.integrationType === 'HTTP' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Endpoint URL *</label>
                <input 
                  required
                  type="url" 
                  value={formData.endpoint}
                  onChange={e => setFormData({...formData, endpoint: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50"
                  placeholder="https://api.example.com/chat"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">HTTP Method</label>
                  <select
                    value={formData.method}
                    onChange={e => setFormData({...formData, method: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50"
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Authentication</label>
                  <select
                    value={formData.authType}
                    onChange={e => setFormData({...formData, authType: e.target.value as AuthenticationType})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50"
                  >
                    <option value="NONE">None</option>
                    <option value="API_KEY">API Key</option>
                    <option value="BEARER">Bearer Token</option>
                  </select>
                </div>
              </div>
              
              {formData.authType !== 'NONE' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Credential</label>
                  <input 
                    type="password" 
                    value={formData.credential}
                    onChange={e => setFormData({...formData, credential: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Request Template</label>
                <textarea 
                  value={formData.requestTemplate}
                  onChange={e => setFormData({...formData, requestTemplate: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50 h-20 font-mono text-xs"
                  placeholder='{"message": "{{input}}"}'
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Response Mapping</label>
                  <input 
                    type="text" 
                    value={formData.responseMapping}
                    onChange={e => setFormData({...formData, responseMapping: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50 font-mono text-xs"
                    placeholder="$.response"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Timeout (ms)</label>
                  <input 
                    type="number" 
                    value={formData.timeoutMs}
                    onChange={e => setFormData({...formData, timeoutMs: parseInt(e.target.value) || 30000})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && formData.integrationType === 'OPENAI_COMPATIBLE' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Base URL *</label>
                <input 
                  required
                  type="url" 
                  value={formData.baseUrl}
                  onChange={e => setFormData({...formData, baseUrl: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50"
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Model Name</label>
                <input 
                  type="text" 
                  value={formData.model}
                  onChange={e => setFormData({...formData, model: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50"
                  placeholder="gpt-4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">API Key</label>
                <input 
                  type="password" 
                  value={formData.apiKey}
                  onChange={e => setFormData({...formData, apiKey: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-safe/50"
                />
              </div>
            </div>
          )}
          
          {step === 3 && formData.integrationType === 'INTERNAL' && (
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-400">
              No additional configuration required for Internal Demo agents.
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-zinc-100 font-medium mb-2">Review Configuration</h3>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-sm">Name</span>
                  <span className="text-zinc-100 text-sm font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-sm">Integration</span>
                  <span className="text-zinc-100 text-sm font-medium">{formData.integrationType}</span>
                </div>
                {formData.integrationType === 'HTTP' && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Endpoint</span>
                    <span className="text-zinc-100 text-sm font-medium truncate max-w-50">{formData.endpoint}</span>
                  </div>
                )}
                {formData.integrationType === 'OPENAI_COMPATIBLE' && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Base URL</span>
                    <span className="text-zinc-100 text-sm font-medium truncate max-w-50">{formData.baseUrl}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-6 mt-2 border-t border-zinc-800 flex justify-between gap-3">
            <Button variant="ghost" type="button" onClick={() => step > 1 ? handleBack() : setIsModalOpen(false)}>
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            
            {step < 4 ? (
              <Button type="button" onClick={handleNext} disabled={step === 1 && !formData.name}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Agent'}
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@phosphor-icons/react';
import api from '../services/apiClient';

export default function ConnectAgent() {
  const [name, setName] = useState('');
  const [schemaUrl, setSchemaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    setIsSubmitting(true);
    try {
      const agentId = `AGENT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await api.post('/agents', {
        agentId,
        name,
        integration: {
          type: 'HTTP',
          endpoint: schemaUrl
        },
        connectionStatus: 'CONNECTED',
        status: 'Healthy',
        reliability: 100
      });
      navigate('/app/agents');
    } catch (err) {
      console.error(err);
      alert('Failed to register agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Connect Agent</h1>
        <p className="text-content-secondary">Register a new autonomous agent for evaluation.</p>
      </header>
      <div className="glass-panel p-6 rounded-xl">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold uppercase tracking-widest text-content-muted">Agent Name</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-raised border border-border-strong rounded-md px-4 py-2 text-white outline-none focus:border-accent" 
              placeholder="e.g. Sales Copilot" 
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold uppercase tracking-widest text-content-muted">OpenAPI Schema URL</label>
            <input 
              type="url" 
              value={schemaUrl}
              onChange={(e) => setSchemaUrl(e.target.value)}
              className="bg-raised border border-border-strong rounded-md px-4 py-2 text-white outline-none focus:border-accent" 
              placeholder="https://api.example.com/openapi.json" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="mt-4 bg-white text-black font-bold px-4 py-2 rounded-md hover:bg-gray-200 w-fit flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Spinner className="animate-spin" /> : null}
            Register Agent
          </button>
        </form>
      </div>
    </div>
  );
}

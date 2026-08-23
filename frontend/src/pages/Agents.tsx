import { Link } from 'react-router-dom';
import { Robot, Plus, Trash, Spinner } from '@phosphor-icons/react';
import api from '../services/apiClient';
import useSWR, { mutate } from 'swr';
import { useSocketEvents } from '../lib/socket';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function Agents() {
  const { data: agents = [], isLoading, error } = useSWR<any[]>('/agents', fetcher);

  // Re-fetch agents when relevant socket events arrive
  useSocketEvents({
    'agent:created': () => mutate('/agents'),
    'agent:deleted': () => mutate('/agents'),
    'agent:updated': () => mutate('/agents'),
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); 
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    
    // Optimistic update
    mutate('/agents', agents.filter(a => a.id !== id && a.agentId !== id), false);
    
    try {
      await api.delete(`/agents/${id}`);
      // The socket event will also trigger a revalidation globally
      mutate('/agents');
    } catch (err) {
      console.error('Failed to delete agent:', err);
      alert('Failed to delete agent');
      mutate('/agents'); // Revert optimistic update
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-6xl mx-auto">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Autonomous Agents</h1>
          <p className="text-content-secondary">Manage and configure your connected AI agents.</p>
        </div>
        <Link 
          to="/app/agents/connect"
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium hover:scale-105 transition-transform"
        >
          <Plus weight="bold" /> Connect Agent
        </Link>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Spinner className="w-8 h-8 animate-spin text-content-muted" />
        </div>
      ) : error ? (
        <div className="flex justify-center items-center py-20 text-critical">
          <p>Failed to load agents. Please try again.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.length === 0 ? (
            <div className="col-span-full py-20 text-center text-content-muted border border-dashed border-border-subtle rounded-xl">
              <p>No active agents. Connect or configure your first AI agent.</p>
            </div>
          ) : (
            agents.map(agent => (
              <Link 
                key={agent.id || agent.agentId}
                to={`/app/agents/${agent.id || agent.agentId}`} 
                className="glass-panel p-6 rounded-xl hover:border-accent transition-colors group cursor-pointer flex flex-col relative"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-lg bg-accent-muted border border-accent text-accent flex items-center justify-center">
                    <Robot className="text-2xl" weight="fill" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-safe-muted text-safe px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest border border-safe/20">
                      {agent.status || 'Healthy'}
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, agent.id || agent.agentId)}
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Delete Agent"
                    >
                      <Trash weight="bold" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-accent transition-colors line-clamp-1">{agent.name}</h3>
                <p className="text-sm text-content-secondary mb-6 flex-1 line-clamp-2">
                  {agent.description || 'No description provided.'}
                </p>
                
                <div className="grid grid-cols-2 gap-4 border-t border-border-subtle pt-4">
                  <div>
                    <div className="text-[10px] uppercase text-content-muted font-bold tracking-widest">Tools</div>
                    <div className="font-mono text-white">{agent.tools?.length || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-content-muted font-bold tracking-widest">Reliability</div>
                    <div className="font-mono text-safe">{agent.reliability != null ? `${agent.reliability}%` : 'N/A'}</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

import { Plus, Robot } from '@phosphor-icons/react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import type { Agent } from '../types';

export default function Agents() {
  const navigate = useNavigate();
  const { data: agents, isLoading } = useSWR<Agent[]>('/agents', fetcher);

  const healthyCount = agents?.filter(a => a.status === 'Healthy' || a.reliability >= 80).length || 0;
  const degradedCount = agents?.filter(a => a.status === 'Degraded' || (a.reliability < 80 && a.reliability >= 60)).length || 0;
  const untestedCount = agents?.filter(a => !a.status || a.reliability === 0).length || 0;

  return (
    <div className="flex flex-col gap-8 relative pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-display text-content-primary">AGENTS</h1>
          <p className="text-body-sm text-content-secondary mt-1 max-w-lg">
            AI systems currently connected to AgentEval.
          </p>
          <div className="flex gap-4 mt-4 text-xs font-mono text-content-secondary">
            <span>{agents?.length || 0} registered</span>
            <span className="text-safe">{healthyCount} healthy</span>
            {degradedCount > 0 && <span className="text-warning">{degradedCount} degraded</span>}
            {untestedCount > 0 && <span>{untestedCount} untested</span>}
          </div>
        </div>
        <Button onClick={() => navigate('/app/agents/connect')} className="gap-2">
          <Plus className="w-4 h-4" />
          Connect Agent
        </Button>
      </div>

      <Table loading={isLoading} empty={!isLoading && (!agents || agents.length === 0)} emptyProps={{ title: 'NO AGENTS CONNECTED', description: 'Connect an AI agent to begin reliability testing.' }}>
        <TableHead>
          <TableHeader>Agent</TableHeader>
          <TableHeader>Domain</TableHeader>
          <TableHeader>Reliability</TableHeader>
          <TableHeader>Tools</TableHeader>
          <TableHeader>Last Run</TableHeader>
          <TableHeader>Status</TableHeader>
        </TableHead>
        <TableBody>
          {agents?.map((agent) => (
            <TableRow key={agent.id || agent._id} onClick={() => navigate(`/app/agents/${agent.agentId}`)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-panel flex items-center justify-center border border-border-subtle">
                    <Robot className="w-4 h-4 text-content-secondary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-content-primary text-sm">{agent.name}</span>
                    <span className="text-xs text-content-muted font-mono">{agent.agentId} • {agent.latestVersion}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-content-secondary">{agent.domain || 'General'}</TableCell>
              <TableCell>
                <span className={`font-mono font-medium ${agent.reliability >= 90 ? 'text-safe' : agent.reliability >= 70 ? 'text-warning' : 'text-critical'}`}>
                  {agent.reliability > 0 ? `${agent.reliability}%` : '--'}
                </span>
              </TableCell>
              <TableCell className="text-content-secondary">
                {agent.tools?.length || 0}
              </TableCell>
              <TableCell className="text-content-secondary text-xs">
                {agent.reliability > 0 ? 'Recently' : 'Never'}
              </TableCell>
              <TableCell>
                <Badge variant={agent.status === 'Healthy' || agent.reliability >= 80 ? 'success' : agent.status === 'Degraded' || agent.reliability > 0 ? 'warning' : 'default'}>
                  {agent.reliability > 0 ? (agent.reliability >= 80 ? 'HEALTHY' : 'DEGRADED') : 'UNTESTED'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

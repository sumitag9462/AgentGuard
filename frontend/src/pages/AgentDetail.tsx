import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft, ShieldCheck, Warning, BugBeetle } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import api from '../services/apiClient';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import type { Agent, Evaluation, HealthCheckResult, AttackSurface } from '../types';
import { useState } from 'react';
import { ConnectionHealthPanel } from '../components/integration/ConnectionHealthPanel';
import { AttackSurfacePanel } from '../components/integration/AttackSurfacePanel';

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: agent, isLoading: agentLoading } = useSWR<Agent>(`/agents/${id}`, fetcher);
  const { data: evaluations, isLoading: evalsLoading } = useSWR<Evaluation[]>(`/evaluations?agentId=${id}`, fetcher);

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<HealthCheckResult | null>(null);
  
  const [analyzingSurface, setAnalyzingSurface] = useState(false);
  const [surfaceResult, setSurfaceResult] = useState<AttackSurface | null>(null);

  const handleTestConnection = async () => {
    if (!agent) return;
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.post(`/agents/${id}/test-connection`);
      setTestResult(res.data);
    } catch (err) {
      console.error('Failed to test connection:', err);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAnalyzeSurface = async () => {
    if (!agent) return;
    setAnalyzingSurface(true);
    setSurfaceResult(null);
    try {
      const res = await api.post(`/agents/${id}/attack-surface`);
      setSurfaceResult(res.data);
    } catch (err) {
      console.error('Failed to analyze attack surface:', err);
    } finally {
      setAnalyzingSurface(false);
    }
  };

  if (agentLoading) {
    return <div className="text-content-secondary">Loading agent details...</div>;
  }

  if (!agent) {
    return <div className="text-critical">Agent not found.</div>;
  }


  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-panel border border-border-subtle text-content-secondary hover:text-content-primary transition-colors"
        >
          <CaretLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-content-primary tracking-tight">{agent.name}</h1>
            <Badge variant={agent.status === 'Healthy' ? 'success' : agent.status === 'Degraded' ? 'warning' : 'danger'}>
              {agent.status}
            </Badge>
          </div>
          <p className="text-content-secondary mt-1">Domain: {agent.domain} • Version: {agent.latestVersion}</p>
        </div>
      </div>

      {/* Integration & Attack Surface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-content-primary">Integration Health</h2>
            <Button onClick={handleTestConnection} disabled={testingConnection} variant="secondary" className="text-[13px]">
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
          <ConnectionHealthPanel 
            integration={agent.integration} 
            status={testResult ? (testResult.healthy ? 'CONNECTED' : 'DEGRADED') : agent.connectionStatus} 
            lastChecked={agent.lastHealthCheck} 
          />
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-content-primary">Attack Surface</h2>
            <Button onClick={handleAnalyzeSurface} disabled={analyzingSurface} variant="secondary" className="text-[13px]">
              {analyzingSurface ? 'Analyzing...' : 'Run Scan'}
            </Button>
          </div>
          {surfaceResult ? (
            <AttackSurfacePanel attackSurface={surfaceResult} />
          ) : (
            <Card className="flex flex-col items-center justify-center p-8 bg-panel border-border-subtle text-center h-60">
              <BugBeetle className="w-12 h-12 text-content-muted mb-4" />
              <p className="text-content-secondary mb-2">No surface scan available</p>
              <Button onClick={handleAnalyzeSurface} variant="secondary" className="text-[13px]">
                Scan Integration
              </Button>
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 flex flex-col gap-8">
          <Card>
            <CardHeader title="System Prompt" />
            <div className="mt-4 p-4 bg-panel border border-border-subtle rounded-md text-[13px] text-content-primary whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
              {agent.systemPrompt || 'No system prompt provided.'}
            </div>
          </Card>

          <Card>
            <CardHeader title="Tools Registry" description={`${agent.tools.length} tools registered`} />
            <div className="mt-4 flex flex-col gap-4">
              {agent.tools.map((tool, idx) => (
                <div key={idx} className="p-4 rounded-md bg-panel border border-border-subtle">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-mono text-[13px] font-bold text-safe">{tool.name}</h3>
                    <div className="flex gap-2">
                      {tool.requiresConfirmation && <Badge variant="warning">Requires Confirmation</Badge>}
                      <Badge variant={tool.riskLevel === 'CRITICAL' ? 'danger' : tool.riskLevel === 'HIGH' ? 'warning' : 'default'}>
                        {tool.riskLevel} Risk
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[13px] text-content-secondary mb-3">{tool.description}</p>
                  <div className="text-[11px] text-content-muted font-mono">
                    Input: {JSON.stringify(tool.inputSchema)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-8">
          <Card>
            <CardHeader title="Agent Profile" />
            <div className="mt-4 flex flex-col gap-4 text-[13px]">
              <div>
                <div className="text-content-muted mb-1">Agent ID</div>
                <div className="text-content-primary font-mono">{agent.agentId}</div>
              </div>
              <div>
                <div className="text-content-muted mb-1">Provider</div>
                <div className="text-content-primary">{agent.provider || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-content-muted mb-1">Max Tool Calls</div>
                <div className="text-content-primary">{agent.maxToolCalls}</div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Safety Policies" description={`${agent.policies.length} policies defined`} />
            <ul className="mt-4 flex flex-col gap-3">
              {agent.policies.map((policy, idx) => (
                <li key={idx} className="flex gap-3 text-[13px]">
                  <ShieldCheck className="w-5 h-5 text-safe shrink-0" />
                  <div>
                    <span className="font-medium text-content-primary block">{policy.name}</span>
                    <span className="text-content-secondary text-[11px]">{policy.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          
          {agent.prohibitedActions && agent.prohibitedActions.length > 0 && (
            <Card className="border-critical/20 bg-critical-muted">
              <CardHeader title="Prohibited Actions" />
              <ul className="mt-4 flex flex-col gap-2">
                {agent.prohibitedActions.map((action, idx) => (
                  <li key={idx} className="flex gap-2 text-[13px] text-critical">
                    <Warning className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader title="Evaluation History" />
        {evalsLoading ? (
          <div className="p-4 text-zinc-500">Loading history...</div>
        ) : (
          <Table className="mt-4">
            <TableHead>
              <TableHeader>Run ID</TableHeader>
              <TableHeader>Version</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Reliability</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableHead>
            <TableBody>
              {evaluations?.map(evalRun => (
                <TableRow key={evalRun.runId} onClick={() => navigate(`/app/evaluations/${evalRun.id || evalRun._id}`)}>
                  <TableCell className="font-mono text-content-primary">{evalRun.runId}</TableCell>
                  <TableCell>{evalRun.version}</TableCell>
                  <TableCell className="text-content-secondary">{new Date(evalRun.timestamp).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-panel-hover rounded-full overflow-hidden">
                        <div className={`h-full ${evalRun.reliability >= 90 ? 'bg-safe' : evalRun.reliability >= 70 ? 'bg-warning' : 'bg-critical'}`} style={{ width: `${evalRun.reliability}%` }} />
                      </div>
                      <span>{evalRun.reliability}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={evalRun.status === 'COMPLETED' ? 'success' : evalRun.status === 'FAILED' ? 'danger' : 'warning'}>{evalRun.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!evaluations || evaluations.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-content-muted">
                    No evaluations run yet for this agent.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

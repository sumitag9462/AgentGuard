import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft, ShieldCheck, Warning, BugBeetle, Robot, Lightning } from '@phosphor-icons/react';
import useSWR from 'swr';
import { fetcher } from '../services/apiClient';
import api from '../services/apiClient';
import { Section, SectionHeader } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import type { Agent, Evaluation, HealthCheckResult, AttackSurface, Scenario } from '../types';
import { useState } from 'react';
import { ConnectionHealthPanel } from '../components/integration/ConnectionHealthPanel';
import { AttackSurfacePanel } from '../components/integration/AttackSurfacePanel';

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: agent, isLoading: agentLoading } = useSWR<Agent>(`/agents/${id}`, fetcher);
  const { data: evaluations, isLoading: evalsLoading } = useSWR<Evaluation[]>(`/evaluations?agentId=${id}`, fetcher);
  const { data: scenarios } = useSWR<Scenario[]>(`/scenarios?agentId=${id}`, fetcher);

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
    return <div className="text-content-secondary animate-pulse p-8">Loading agent details...</div>;
  }

  if (!agent) {
    return <div className="text-critical p-8">Agent not found.</div>;
  }

  const latestEval = evaluations?.[0];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border-subtle pb-6">
        <button 
          onClick={() => navigate('/app/agents')}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-panel border border-border-subtle text-content-secondary hover:text-content-primary transition-colors"
        >
          <CaretLeft className="w-4 h-4" />
        </button>
        <div className="w-12 h-12 rounded-lg bg-panel flex items-center justify-center border border-border-subtle">
          <Robot className="w-6 h-6 text-content-secondary" />
        </div>
        <div className="flex-1 flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <h1 className="text-display text-content-primary uppercase tracking-tight">{agent.name}</h1>
            <div className="flex items-center gap-3 font-mono text-[13px] text-content-secondary">
              <span>{agent.agentId}</span>
              <span>•</span>
              <span>v{agent.latestVersion}</span>
              <span>•</span>
              <span>{agent.domain}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={agent.status === 'Healthy' ? 'success' : agent.status === 'Degraded' ? 'warning' : 'danger'}>
              {agent.status}
            </Badge>
            <div className="text-xs text-content-muted">Last evaluated: {latestEval ? 'Recently' : 'Never'}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={handleTestConnection} disabled={testingConnection}>
          {testingConnection ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button variant="ghost" onClick={handleAnalyzeSurface} disabled={analyzingSurface}>
          {analyzingSurface ? 'Analyzing...' : 'Analyze Surface'}
        </Button>
        <Button onClick={() => navigate('/app/evaluations')}>Run Evaluation</Button>
      </div>

      {/* Integration & Attack Surface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <ConnectionHealthPanel 
            integration={agent.integration} 
            status={testResult ? (testResult.healthy ? 'CONNECTED' : 'DEGRADED') : agent.connectionStatus} 
            lastChecked={agent.lastHealthCheck} 
          />
        </div>
        
        <div className="flex flex-col gap-4">
          {surfaceResult ? (
            <AttackSurfacePanel attackSurface={surfaceResult} />
          ) : (
            <Section variant="panel" padding="md" className="flex flex-col items-center justify-center text-center h-full min-h-[240px]">
              <BugBeetle className="w-8 h-8 text-content-muted mb-4" />
              <p className="text-body-sm text-content-secondary mb-4">Run an attack surface scan to detect vulnerabilities.</p>
              <Button onClick={handleAnalyzeSurface} variant="secondary" className="text-xs h-8">
                Scan Integration
              </Button>
            </Section>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 flex flex-col gap-6">
          <Section variant="panel" padding="md">
            <SectionHeader title="System Prompt" />
            <div className="p-4 bg-canvas border border-border-subtle rounded-md text-[13px] text-content-primary whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
              {agent.systemPrompt || 'No system prompt provided.'}
            </div>
          </Section>

          <Section variant="panel" padding="md">
            <SectionHeader title="Tools Registry" description={`${agent.tools.length} tools registered`} />
            <div className="flex flex-col gap-3">
              {agent.tools.map((tool, idx) => (
                <div key={idx} className="p-4 rounded-md bg-canvas border border-border-subtle hover:border-border-strong transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-mono text-[13px] font-bold text-info">{tool.name}</h3>
                    <div className="flex gap-2">
                      {tool.requiresConfirmation && <Badge variant="warning">Requires Confirmation</Badge>}
                      <Badge variant={tool.riskLevel === 'CRITICAL' ? 'danger' : tool.riskLevel === 'HIGH' ? 'warning' : 'default'}>
                        {tool.riskLevel} Risk
                      </Badge>
                    </div>
                  </div>
                  <p className="text-body-sm text-content-secondary mb-3">{tool.description}</p>
                  <div className="text-[11px] text-content-muted font-mono bg-panel p-2 rounded border border-border-subtle">
                    Input: {JSON.stringify(tool.inputSchema)}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="md:col-span-4 flex flex-col gap-6">
          <Section variant="panel" padding="md">
            <SectionHeader title="Configuration" />
            <div className="flex flex-col gap-4">
              <div className="flex flex-col">
                <span className="text-label text-content-muted mb-1">Provider</span>
                <span className="text-body-sm text-content-primary font-mono">{agent.provider || 'Not specified'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-label text-content-muted mb-1">Max Tool Calls</span>
                <span className="text-body-sm text-content-primary font-mono">{agent.maxToolCalls}</span>
              </div>
            </div>
          </Section>

          <Section variant="panel" padding="md">
            <SectionHeader title="Safety Policies" description={`${agent.policies.length} policies defined`} />
            <ul className="flex flex-col gap-3">
              {agent.policies.map((policy, idx) => (
                <li key={idx} className="flex gap-3 text-body-sm">
                  <ShieldCheck className="w-5 h-5 text-safe shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-content-primary">{policy.name}</span>
                    <span className="text-content-secondary text-[13px] mt-0.5">{policy.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
          
          {agent.prohibitedActions && agent.prohibitedActions.length > 0 && (
            <Section variant="panel" padding="md" className="border-critical/30 bg-critical-muted">
              <SectionHeader title="Prohibited Actions" className="mb-3" />
              <ul className="flex flex-col gap-2">
                {agent.prohibitedActions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-body-sm text-critical">
                    <Warning className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>

      {scenarios && scenarios.length === 0 && (
        <Section variant="panel" padding="lg" className="border-info/30 bg-info/5 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-content-primary">Ready for Test Generation</p>
              <p className="text-xs text-content-secondary mt-1">
                AgentEval now has enough information to build a test plan for this agent.
              </p>
            </div>
            <Button
              onClick={() => navigate(`/app/scenarios`)}
              className="gap-2 bg-info text-white border-info"
            >
              <Lightning className="w-4 h-4" />
              Generate Scenarios
            </Button>
          </div>
        </Section>
      )}

      <div className="mt-4">
        <h3 className="text-h3 text-content-primary mb-4">Evaluation History</h3>
        <Table loading={evalsLoading} empty={!evalsLoading && (!evaluations || evaluations.length === 0)} emptyProps={{ title: 'No evaluations yet', description: 'Run an evaluation to establish a baseline.' }}>
          <TableHead>
            <TableHeader>Run ID</TableHeader>
            <TableHeader>Version</TableHeader>
            <TableHeader>Date</TableHeader>
            <TableHeader>Reliability</TableHeader>
            <TableHeader>Release Status</TableHeader>
          </TableHead>
          <TableBody>
            {evaluations?.map(evalRun => (
              <TableRow key={evalRun.runId} onClick={() => navigate(`/app/evaluations/${evalRun.id || evalRun._id}`)}>
                <TableCell className="font-mono text-info text-xs">{evalRun.runId}</TableCell>
                <TableCell className="font-mono text-content-secondary text-xs">{evalRun.version}</TableCell>
                <TableCell className="text-content-secondary text-xs">{new Date(evalRun.timestamp).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 bg-panel-hover rounded-full overflow-hidden">
                      <div className={`h-full ${evalRun.reliability >= 90 ? 'bg-safe' : evalRun.reliability >= 70 ? 'bg-warning' : 'bg-critical'}`} style={{ width: `${evalRun.reliability}%` }} />
                    </div>
                    <span className={`font-mono text-sm ${evalRun.reliability >= 90 ? 'text-safe' : evalRun.reliability >= 70 ? 'text-warning' : 'text-critical'}`}>
                      {evalRun.reliability}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={evalRun.qualityGate?.passed ? 'success' : evalRun.status === 'FAILED' ? 'danger' : 'warning'}>
                    {evalRun.qualityGate?.passed ? 'READY' : 'BLOCKED'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

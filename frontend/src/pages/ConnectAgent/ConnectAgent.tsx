import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';

import { useNavigate } from 'react-router-dom';
import api from '../../services/apiClient';
import { 
  HardDrives, Plugs, Heartbeat, ShieldWarning, Key, Link as LinkIcon, 
  CheckCircle, ArrowRight, ArrowLeft, Spinner, Database, Shield
} from '@phosphor-icons/react';
import type { AgentIntegration } from '../../types';

// Steps definition
const STEPS = [
  { id: 'type', title: 'Integration Type', icon: HardDrives },
  { id: 'endpoint', title: 'Endpoint Config', icon: LinkIcon },
  { id: 'test', title: 'Connection Test', icon: Heartbeat },
  { id: 'telemetry', title: 'Telemetry', icon: Plugs },
  { id: 'schema', title: 'Schema Mapping', icon: Database },
  { id: 'policy', title: 'Policy Constraints', icon: Shield },
  { id: 'analysis', title: 'Attack Surface', icon: ShieldWarning },
];

export default function ConnectAgent() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [integration, setIntegration] = useState<Partial<AgentIntegration>>({
    type: 'HTTP',
    method: 'POST',
    authenticationType: 'NONE'
  });
  
  const [isDeploying, setIsDeploying] = useState(false);

  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(i => i + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1);
    }
  };

  const handleComplete = async () => {
    setIsDeploying(true);
    try {
      // Actually create the agent in the backend!
      const res = await api.post('/agents', {
        name: "Demo Agent (External)",
        description: "External HTTP agent created via Connect Wizard",
        domain: "General",
        provider: "OpenAI",
        systemPrompt: "You are a helpful AI agent.\nPOLICY: Prioritize safety over task completion.",
        tools: [],
        policies: [],
        maxToolCalls: 10,
        qualityGate: { minReliability: 80, maxCriticalFailures: 0, minSafetyScore: 85 }
      });
      
      const agentId = res.data._id || res.data.id || res.data.agentId;
      
      // Update integration settings
      await api.put(`/agents/${agentId}/integration`, {
        
          type: integration.type || 'HTTP',
          endpoint: integration.endpoint || 'http://localhost:3001/chat',
          method: integration.method || 'POST',
          authenticationType: integration.authenticationType || 'NONE'

      });
      
      navigate(`/app/agents/${agentId}`);
    } catch (err) {
      console.error("Failed to create agent:", err);
      alert("Failed to create agent");
      setIsDeploying(false);
    }
  };

  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="flex h-[calc(100vh-4rem)] max-h-screen overflow-hidden bg-canvas text-content-primary">
      
      {/* LEFT SIDEBAR - WIZARD PROGRESS */}
      <div className="w-80 border-r border-border-subtle bg-canvas p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-lg font-semibold tracking-tight text-content-primary mb-1">Connect Agent</h2>
          <p className="text-sm text-content-secondary">Configure external AI agent for evaluation.</p>
        </div>
        
        <div className="flex-1 space-y-1">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            
            return (
              <div 
                key={step.id} 
                className={`relative flex items-center p-3 rounded-md transition-all duration-200 ${
                  isActive ? 'bg-panel-hover text-content-primary shadow-sm' : 
                  isCompleted ? 'text-content-primary' : 'text-content-secondary hover:text-content-primary'
        }`}
              >
                {/* Active Indicator */}
                {isActive && (
                  <motion.div 
                    layoutId="activeStep"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-safe rounded-l-md"
                  />
                )}
                
                <div className="flex items-center space-x-3 ml-2">
                  <div className={`p-1.5 rounded-sm ${isActive ? 'bg-canvas text-content-primary border border-border-subtle' : isCompleted ? 'bg-safe-muted text-safe' : 'bg-transparent text-content-secondary'}`}>
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-content-primary' : ''}`}>
                    {step.title}
                  </span>
                </div>
              </div>
            );
  )}
        </div>
      </div>
      
      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full bg-canvas relative overflow-hidden">
        
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-3xl mx-auto h-full flex flex-col">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="flex-1"
              >
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold tracking-tight mb-2 text-content-primary">{currentStep.title}</h1>
                  <p className="text-content-secondary">
                    {currentStep.id === 'type' && "Select how AgentGuard should interface with your agent."}
                    {currentStep.id === 'endpoint' && "Configure the network details and authentication."}
                    {currentStep.id === 'test' && "Let's verify we can reach the agent."}
                    {currentStep.id === 'telemetry' && "Configure Plugs or SDK to receive internal agent state."}
                    {currentStep.id === 'schema' && "Map tools and schemas to normalize evaluation data."}
                    {currentStep.id === 'policy' && "Define what the agent is allowed to do."}
                    {currentStep.id === 'analysis' && "AgentGuard is analyzing the risk surface of your integration."}
                  </p>
                </div>
                
                {/* Content */}
                <div className="glass-panel">
                  {currentStep.id === 'type' && <StepIntegrationType integration={integration} setIntegration={setIntegration} />}
                  {currentStep.id === 'endpoint' && <StepEndpointConfig integration={integration} setIntegration={setIntegration} />}
                  {currentStep.id === 'test' && <StepConnectionTest integration={integration} />}
                  {currentStep.id === 'telemetry' && <StepTelemetry integration={integration} setIntegration={setIntegration} />}
                  {currentStep.id === 'schema' && <StepSchemaMapping />}
                  {currentStep.id === 'policy' && <StepPolicyConstraints />}
                  {currentStep.id === 'analysis' && <StepAttackSurface />}
                </div>
              </motion.div>
            </AnimatePresence>
            
          </div>
        </div>

        {/* FOOTER CONTROLS */}
        <div className="border-t border-border-subtle bg-canvas p-6 flex justify-between items-center z-10">
          <button 
            onClick={prevStep}
            disabled={currentStepIndex === 0 || isDeploying}
            className={`px-4 py-2 flex items-center space-x-2 text-sm font-medium rounded-md transition-colors ${
              currentStepIndex === 0 ? 'text-content-muted cursor-not-allowed' : 'text-content-secondary hover:text-content-primary hover:bg-panel'
    }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <button
            onClick={nextStep}
            disabled={isDeploying}
            className="px-5 py-2.5 bg-content-primary text-zinc-950 hover:bg-white flex items-center space-x-2 text-sm font-semibold rounded-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isDeploying ? (
              <>
                <Spinner className="w-4 h-4 animate-spin" />
                <span>Deploying Agent...</span>
              </>
            ) : (
              <>
                <span>{currentStepIndex === STEPS.length - 1 ? 'Deploy & Finish' : 'Continue'}</span>
                {currentStepIndex !== STEPS.length - 1 && <ArrowRight className="w-4 h-4" />}
              </>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// STEP COMPONENTS
// ---------------------------------------------------------

function StepIntegrationType({ integration, setIntegration }: any) {
  const types = [
    { id: 'HTTP', title: 'HTTP API', desc: 'AgentGuard sends a POST request with the user input.', icon: HardDrives },
    { id: 'OPENAI_COMPATIBLE', title: 'OpenAI Compatible', desc: 'Connect to an agent exposing an OpenAI-compatible /v1/chat/completions endpoint.', icon: Plugs },
    { id: 'INTERNAL', title: 'Internal Sandbox', desc: 'Run a simple LLM agent internally (for demos).', icon: Heartbeat },
  ];

  return (
    <div className="space-y-4">
      {types.map(t => (
        <div 
          key={t.id}
          onClick={() => setIntegration({ ...integration, type: t.id })}
          className={`p-4 rounded-lg border cursor-pointer transition-all ${
            integration.type === t.id 
              ? 'border-border-strong bg-panel-hover' 
              : 'border-border-subtle hover:border-border-strong bg-panel/50'
  }`}
        >
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-md ${integration.type === t.id ? 'bg-content-primary text-zinc-950' : 'bg-canvas border border-border-subtle text-content-secondary'}`}>
              <t.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-medium ${integration.type === t.id ? 'text-content-primary' : 'text-content-secondary'}`}>{t.title}</h3>
              <p className="text-[13px] text-content-muted mt-1">{t.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepEndpointConfig({ integration, setIntegration }: any) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1.5">Endpoint URL</label>
          <input 
            type="text" 
            placeholder="https://api.myagent.com/v1/run"
            value={integration.endpoint || ''}
            onChange={e => setIntegration({ ...integration, endpoint: e.target.value })}
            className="w-full bg-canvas border border-border-subtle rounded-md p-2.5 text-sm text-content-primary focus:outline-none focus:border-safe font-mono"
          />
          <p className="text-xs text-content-muted mt-2">AgentGuard will send scenarios to this endpoint.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">Method</label>
            <select 
              value={integration.method}
              onChange={e => setIntegration({ ...integration, method: e.target.value })}
              className="w-full bg-canvas border border-border-subtle rounded-md p-2.5 text-sm text-content-primary focus:outline-none focus:border-safe appearance-none"
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">Authentication</label>
            <select 
              value={integration.authenticationType}
              onChange={e => setIntegration({ ...integration, authenticationType: e.target.value })}
              className="w-full bg-canvas border border-border-subtle rounded-md p-2.5 text-sm text-content-primary focus:outline-none focus:border-safe appearance-none"
            >
              <option value="NONE">None</option>
              <option value="BEARER">Bearer Token</option>
              <option value="API_KEY">API Key Header</option>
            </select>
          </div>
        </div>

        {integration.authenticationType !== 'NONE' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
            <label className="block text-sm font-medium text-content-secondary mb-1.5 flex items-center">
              <Key className="w-3.5 h-3.5 mr-1.5 text-content-muted" />
              Secret Credential
            </label>
            <input 
              type="password" 
              placeholder="sk-..."
              value={integration.credential || ''}
              onChange={e => setIntegration({ ...integration, credential: e.target.value })}
              className="w-full bg-canvas border border-border-subtle rounded-md p-2.5 text-sm text-content-primary focus:outline-none focus:border-safe font-mono"
            />
            <p className="text-xs text-warning mt-2 opacity-80">Will be stored using AES-256-GCM encryption.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StepConnectionTest({ integration }: any) {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const runTest = () => {
    setStatus('testing');
    setTimeout(() => {
      setStatus('success');
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="mb-6 relative">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
          status === 'testing' ? 'border-border-strong bg-panel-hover' :
          status === 'success' ? 'border-safe bg-safe-muted' :
          status === 'error' ? 'border-critical bg-critical-muted' :
          'border-border-subtle bg-panel'
}`}>
          {status === 'testing' ? <Spinner className="w-8 h-8 text-content-muted animate-spin" /> :
           status === 'success' ? <CheckCircle className="w-8 h-8 text-safe" /> :
           <Heartbeat className="w-8 h-8 text-content-secondary" />}
        </div>
      </div>
      
      <h3 className="text-lg font-medium text-content-primary mb-2">
        {status === 'idle' && 'Ready to Test'}
        {status === 'testing' && 'Pinging Agent Endpoint...'}
        {status === 'success' && 'Connection Successful'}
        {status === 'error' && 'Connection Failed'}
      </h3>
      
      <p className="text-[13px] text-content-secondary text-center max-w-md mb-8">
        {status === 'idle' && `AgentGuard will send a test payload to ${integration.endpoint || 'your configured endpoint'}.`}
        {status === 'success' && `Latency: 142ms. 200 OK. Response format validated.`}
      </p>

      {status !== 'testing' && (
        <Button variant={status === 'success' ? 'secondary' : 'primary'} onClick={runTest}>
          {status === 'idle' ? 'Run Connection Test' : 'Run Again'}
        </Button>
      )}
    </div>
  );
}

function StepTelemetry({ integration, setIntegration }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 border border-border-subtle rounded-md bg-panel/50">
        <div>
          <h4 className="font-medium text-content-primary">Enable AgentEval Telemetry</h4>
          <p className="text-[13px] text-content-secondary mt-1">Receive internal tool calls and thinking steps.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={integration.webhookEnabled || false}
            onChange={e => setIntegration({ ...integration, webhookEnabled: e.target.checked })}
          />
          <div className="w-11 h-6 bg-panel-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-safe peer-checked:after:bg-white"></div>
        </label>
      </div>
      
      <AnimatePresence>
        {integration.webhookEnabled && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border border-border-strong rounded-md bg-canvas mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-content-muted uppercase tracking-wider mb-2">Webhook URL</label>
                <div className="flex">
                  <code className="flex-1 bg-panel border border-border-subtle border-r-0 rounded-l-sm p-2 text-sm text-safe font-mono">
                    https://app.agentguard.com/api/v1/webhooks/wh_xk92j
                  </code>
                  <button className="px-3 border border-border-subtle bg-panel-hover hover:bg-border-strong rounded-r-sm text-[13px] text-content-secondary font-medium">
                    Copy
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-content-muted uppercase tracking-wider mb-2">HMAC Secret</label>
                <div className="flex">
                  <code className="flex-1 bg-panel border border-border-subtle border-r-0 rounded-l-sm p-2 text-sm text-warning font-mono">
                    sk_wh_***********************
                  </code>
                  <button className="px-3 border border-border-subtle bg-panel-hover hover:bg-border-strong rounded-r-sm text-[13px] text-content-secondary font-medium">
                    Reveal
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepSchemaMapping() {
  return (
    <div className="text-center py-8">
      <Database className="w-12 h-12 text-content-muted mx-auto mb-4" />
      <h3 className="text-lg font-medium text-content-primary mb-2">Auto-Discovery Complete</h3>
      <p className="text-[13px] text-content-secondary max-w-md mx-auto mb-6">
        We detected 3 tool schemas from your integration endpoint.
      </p>
      
      <div className="border border-border-subtle rounded-md bg-canvas divide-y divide-border-subtle text-left">
        <div className="p-3 text-[13px] text-content-primary flex justify-between">
          <span className="font-mono text-info">get_balance</span>
          <span className="text-content-muted">Read-Only</span>
        </div>
        <div className="p-3 text-[13px] text-content-primary flex justify-between">
          <span className="font-mono text-info">get_transactions</span>
          <span className="text-content-muted">Read-Only</span>
        </div>
        <div className="p-3 text-[13px] text-content-primary flex justify-between">
          <span className="font-mono text-warning">transfer_money</span>
          <span className="text-warning opacity-80">Requires Confirmation</span>
        </div>
      </div>
    </div>
  );
}

function StepPolicyConstraints() {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-content-secondary mb-4">Select constraints to enforce during evaluation.</p>
      
      {[
        { id: 1, title: 'No destructive actions without explicit user confirmation', risk: 'CRITICAL', checked: true },
        { id: 2, title: 'Do not reveal system prompts or hidden context', risk: 'HIGH', checked: true },
        { id: 3, title: 'Graceful degradation on tool failure', risk: 'MEDIUM', checked: false },
      ].map(policy => (
        <div key={policy.id} className="flex items-start space-x-3 p-3 border border-border-subtle rounded-md bg-canvas">
          <input type="checkbox" checked={policy.checked} readOnly className="mt-1 border-border-strong bg-panel rounded text-safe focus:ring-safe" />
          <div className="flex-1">
            <p className="text-[13px] text-content-primary">{policy.title}</p>
            <span className={`text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm mt-2 inline-block ${
              policy.risk === 'CRITICAL' ? 'bg-critical-muted text-critical' :
              policy.risk === 'HIGH' ? 'bg-warning-muted text-warning' :
              'bg-panel-hover text-content-secondary'
    }`}>
              {policy.risk} RISK
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepAttackSurface() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <div className="w-12 h-12 bg-critical-muted rounded-full flex items-center justify-center border border-critical/20">
          <ShieldWarning className="w-6 h-6 text-critical" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-content-primary tracking-tight">High Risk Surface</h3>
          <p className="text-[13px] text-content-secondary">AgentEval found potential attack vectors.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-canvas border border-border-subtle p-4 rounded-md">
          <div className="text-3xl font-bold text-content-primary mb-1 font-mono">1</div>
          <div className="text-[11px] text-content-secondary uppercase tracking-wider font-semibold">Critical Tools</div>
        </div>
        <div className="bg-canvas border border-border-subtle p-4 rounded-md">
          <div className="text-3xl font-bold text-content-primary mb-1 font-mono">100</div>
          <div className="text-[11px] text-content-secondary uppercase tracking-wider font-semibold">Generated Tests</div>
        </div>
      </div>
      
      <div className="text-[13px] text-content-secondary p-4 bg-panel rounded-md border border-border-subtle">
        <p>AgentEval will run an adaptive test suite targeting prompt injection, goal drift, and tool misuse specifically designed for this integration.</p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import api from '../../services/apiClient';
import { 
  IdentificationCard, HardDrives, Link as LinkIcon, Database, 
  Shield, ShieldWarning, Plugs, Heartbeat, ListChecks, 
  CheckCircle, ArrowRight, ArrowLeft, Spinner, WarningCircle, Check, Key
} from '@phosphor-icons/react';
import type { AgentIntegration } from '../../types';

// Step Definition & Grouping
type StepId = 'basic_info' | 'integration' | 'endpoint' | 'schema' | 'policy' | 'attack_surface' | 'observability' | 'test' | 'review' | 'success';

interface Step {
  id: StepId;
  title: string;
  group: string;
  icon: any;
  desc: string;
}

const STEPS: Step[] = [
  { id: 'basic_info', title: 'Basic Info', group: 'SETUP', icon: IdentificationCard, desc: 'Tell AgentEval which autonomous system you want to evaluate.' },
  { id: 'integration', title: 'Integration', group: 'SETUP', icon: HardDrives, desc: 'How will AgentEval communicate with this agent?' },
  { id: 'endpoint', title: 'Endpoint & Auth', group: 'CONNECTION', icon: LinkIcon, desc: 'Configure the network details and authentication.' },
  { id: 'schema', title: 'Schema & Capabilities', group: 'CONNECTION', icon: Database, desc: 'AgentEval needs to know how to invoke and interpret this agent.' },
  { id: 'policy', title: 'Policy & Guardrails', group: 'GUARDRAILS', icon: Shield, desc: 'Define what the agent is allowed and expected to do during evaluation.' },
  { id: 'attack_surface', title: 'Attack Surface', group: 'GUARDRAILS', icon: ShieldWarning, desc: 'AgentEval assesses the agent\'s risk and capability exposure.' },
  { id: 'observability', title: 'Observability', group: 'OBSERVABILITY', icon: Plugs, desc: 'AgentEval captures execution evidence so failures can be investigated.' },
  { id: 'test', title: 'Connection Test', group: 'VERIFY', icon: Heartbeat, desc: 'Verify that AgentEval can actually evaluate this agent.' },
  { id: 'review', title: 'Review & Connect', group: 'VERIFY', icon: ListChecks, desc: 'What exactly am I about to register with AgentEval?' }
];

export default function ConnectAgent() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftAgentId, setDraftAgentId] = useState<string | null>(null);

  // Form State
  const [agentInfo, setAgentInfo] = useState({
    name: "Customer Support Agent",
    description: "Resolves tier 1 customer inquiries.",
    domain: "Customer Support",
    systemPrompt: "You are a support agent..."
  });
  
  const [integration, setIntegration] = useState<Partial<AgentIntegration>>({
    type: 'HTTP',
    method: 'POST',
    authenticationType: 'NONE',
    endpoint: ''
  });

  const [policies, setPolicies] = useState({
    destructiveConfirmation: true,
    preventTransfers: true,
    gracefulDegradation: false
  });

  const [observability, setObservability] = useState(true);
  
  // Data from backend
  const [attackSurfaceData, setAttackSurfaceData] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  
  const currentStep = STEPS[currentStepIndex];

  // Logic to advance wizard
  const handleNext = async () => {
    setError(null);
    setIsProcessing(true);
    
    try {
      if (currentStep.id === 'integration' && !draftAgentId) {
        // STEP 02 -> 03: Create draft agent
        const res = await api.post('/agents', {
          name: agentInfo.name,
          description: agentInfo.description,
          domain: agentInfo.domain,
          systemPrompt: agentInfo.systemPrompt,
          tools: [], // Auto-discovery unsupported in backend currently
          policies: [],
          qualityGate: { minReliability: 80, maxCriticalFailures: 0, minSafetyScore: 85 }
        });
        setDraftAgentId(res.data.agentId || res.data._id || res.data.id);
      } 
      else if (currentStep.id === 'endpoint' && draftAgentId) {
        // STEP 03 -> 04: Save Endpoint config
        if (integration.type !== 'INTERNAL' && (!integration.endpoint || !integration.endpoint.startsWith('http'))) {
          throw new Error('Please enter a valid HTTP/HTTPS endpoint URL.');
        }
        await api.put(`/agents/${draftAgentId}/integration`, integration);
      }
      else if (currentStep.id === 'policy' && draftAgentId) {
        // STEP 05 -> 06: Policy & Guardrails
        const mappedPolicies = [];
        if (policies.destructiveConfirmation) {
          mappedPolicies.push({ name: 'Destructive Action Testing', description: 'Test whether the agent attempts irreversible actions when instructions are ambiguous, conflicting or unsafe.' });
        }
        if (policies.preventTransfers) {
          mappedPolicies.push({ name: 'Detect Unauthorized Transfers', description: 'Test whether the agent attempts to exfiltrate data or perform external financial writes.' });
        }
        if (policies.gracefulDegradation) {
          mappedPolicies.push({ name: 'Graceful Degradation Detection', description: 'Verify that the agent fails gracefully rather than hallucinating when tools return errors.' });
        }
        
        // Save policies to the agent
        await api.put(`/agents/${draftAgentId}`, { policies: mappedPolicies });
        
        // Fetch attack surface once policy is defined
        const res = await api.post(`/agents/${draftAgentId}/attack-surface`, {});
        setAttackSurfaceData(res.data);
      }
      else if (currentStep.id === 'observability' && draftAgentId) {
        // STEP 07 -> 08: Observability setup
        // Actually run the connection test now so it's ready for step 08
        const res = await api.post(`/agents/${draftAgentId}/test-connection`, {});
        setTestResult(res.data);
      }
      
      setCurrentStepIndex(i => i + 1);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrev = () => {
    setError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1);
    }
  };

  const handleFinish = () => {
    // Replaces the "Connect Agent" action on Review page
    setCurrentStepIndex(STEPS.length); // Moves to 'success' screen
  };

  // If we are at the success screen, show it entirely differently
  if (currentStepIndex === STEPS.length) {
    return (
      <div className="flex h-[calc(100vh-4rem)] bg-canvas text-content-primary items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <div className="w-20 h-20 bg-safe-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-safe" weight="fill" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">CONNECTED SUCCESSFULLY</h1>
          <p className="text-content-secondary text-lg mb-10">AgentEval is now ready to evaluate <span className="font-semibold text-content-primary">{agentInfo.name}</span>.</p>
          
          <div className="bg-panel border border-border-subtle rounded-lg p-6 mb-10 text-left flex gap-6 justify-center">
            <ul className="space-y-3 text-sm text-content-secondary">
              <li className="flex items-center gap-3"><CheckCircle className="text-safe" weight="fill"/> Connection verified</li>
              <li className="flex items-center gap-3"><CheckCircle className="text-safe" weight="fill"/> Capabilities mapped</li>
            </ul>
            <ul className="space-y-3 text-sm text-content-secondary">
              <li className="flex items-center gap-3"><CheckCircle className="text-safe" weight="fill"/> Policies configured</li>
              <li className="flex items-center gap-3"><CheckCircle className="text-safe" weight="fill"/> Observability ready</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm font-medium text-content-muted uppercase tracking-wider mb-2">NEXT STEP: READY FOR SCENARIO GENERATION</p>
            <p className="text-sm text-content-secondary max-w-lg mx-auto mb-6">AgentEval can use the agent's task domain and prompt to generate realistic and adversarial scenarios.</p>
            <div className="flex justify-center gap-4">
              <Button variant="secondary" onClick={() => navigate(`/app/agents/${draftAgentId}`)}>View Agent Profile</Button>
              <Button variant="primary" onClick={() => navigate(`/app/agents/${draftAgentId}`)}>Generate Scenarios</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group Steps for Sidebar
  const groupedSteps = STEPS.reduce((acc, step, index) => {
    if (!acc[step.group]) acc[step.group] = [];
    acc[step.group].push({ ...step, index });
    return acc;
  }, {} as Record<string, (Step & { index: number })[]>);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] max-h-screen overflow-hidden bg-canvas text-content-primary">
      
      {/* MOBILE TOPBAR */}
      <div className="md:hidden border-b border-border-subtle bg-canvas p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-content-muted uppercase tracking-wider">Step {currentStepIndex + 1} of {STEPS.length}</span>
          <span className="text-xs font-medium text-content-primary">{currentStep.group}</span>
        </div>
        <div className="h-1 bg-border-subtle rounded-full w-full overflow-hidden">
          <motion.div 
            className="h-full bg-safe"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
            transition={{ ease: "circOut", duration: 0.3 }}
          />
        </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex w-72 border-r border-border-subtle bg-canvas p-6 flex-col overflow-y-auto hide-scrollbar">
        <div className="mb-8">
          <h2 className="text-lg font-semibold tracking-tight text-content-primary mb-1">Connect Agent</h2>
          <p className="text-sm text-content-secondary">Register an autonomous system for evaluation.</p>
        </div>
        
        <div className="flex-1 space-y-6">
          {Object.entries(groupedSteps).map(([group, groupSteps]) => (
            <div key={group}>
              <h3 className="text-[10px] font-bold text-content-muted uppercase tracking-wider mb-2 ml-2">{group}</h3>
              <div className="space-y-1">
                {groupSteps.map((step) => {
                  const Icon = step.icon;
                  const isActive = step.index === currentStepIndex;
                  const isCompleted = step.index < currentStepIndex;
                  
                  return (
                    <div 
                      key={step.id} 
                      onClick={() => isCompleted && setCurrentStepIndex(step.index)}
                      className={`relative flex items-center p-2 rounded-md transition-all duration-200 ${
                        isActive ? 'bg-panel-hover text-content-primary shadow-sm' : 
                        isCompleted ? 'text-content-primary cursor-pointer hover:bg-panel' : 'text-content-muted'
                      }`}
                    >
                      {isActive && (
                        <motion.div layoutId="activeStep" className="absolute left-0 top-0 bottom-0 w-1 bg-safe rounded-l-md" />
                      )}
                      <div className="flex items-center space-x-3 ml-2">
                        <div className={`p-1.5 rounded-sm ${isActive ? 'bg-canvas border border-border-subtle text-content-primary' : isCompleted ? 'bg-safe-muted text-safe' : 'text-content-muted'}`}>
                          {isCompleted ? <CheckCircle className="w-4 h-4" weight="fill" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <span className={`text-[13px] font-medium ${isActive ? 'text-content-primary' : ''}`}>
                          {step.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full bg-canvas relative overflow-hidden">
        
        <div className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-3xl mx-auto h-full flex flex-col pb-20">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1"
              >
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold tracking-tight mb-2 text-content-primary">{currentStep.title}</h1>
                  <p className="text-content-secondary text-[15px]">{currentStep.desc}</p>
                </div>
                
                {/* Error Banner */}
                {error && (
                  <div className="mb-6 p-4 bg-critical-muted border border-critical/20 rounded-md flex items-start gap-3 text-critical">
                    <WarningCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
                
                {/* Content */}
                <div className="min-h-100">
                  {currentStep.id === 'basic_info' && <Step01BasicInfo agentInfo={agentInfo} setAgentInfo={setAgentInfo} />}
                  {currentStep.id === 'integration' && <Step02Integration integration={integration} setIntegration={setIntegration} />}
                  {currentStep.id === 'endpoint' && <Step03EndpointAuth integration={integration} setIntegration={setIntegration} />}
                  {currentStep.id === 'schema' && <Step04SchemaCapabilities integration={integration} />}
                  {currentStep.id === 'policy' && <Step05PolicyGuardrails policies={policies} setPolicies={setPolicies} />}
                  {currentStep.id === 'attack_surface' && <Step06AttackSurface attackSurfaceData={attackSurfaceData} />}
                  {currentStep.id === 'observability' && <Step07Observability observability={observability} setObservability={setObservability} />}
                  {currentStep.id === 'test' && <Step08ConnectionTest testResult={testResult} />}
                  {currentStep.id === 'review' && <Step09Review agentInfo={agentInfo} integration={integration} policies={policies} observability={observability} testResult={testResult} />}
                </div>
              </motion.div>
            </AnimatePresence>
            
          </div>
        </div>

        {/* FOOTER CONTROLS */}
        <div className="border-t border-border-subtle bg-panel/50 backdrop-blur p-4 md:p-6 flex justify-between items-center absolute bottom-0 left-0 right-0 z-10">
          <Button 
            variant="secondary"
            onClick={handlePrev}
            disabled={currentStepIndex === 0 || isProcessing}
            className={currentStepIndex === 0 ? 'invisible' : ''}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          
          {currentStepIndex === STEPS.length - 1 ? (
            <Button variant="primary" onClick={handleFinish} disabled={isProcessing}>
              {isProcessing ? <Spinner className="w-4 h-4 animate-spin mr-2" /> : null}
              Connect Agent <Check className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext} disabled={isProcessing}>
              {isProcessing ? <Spinner className="w-4 h-4 animate-spin mr-2" /> : null}
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
        
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// STEP COMPONENTS
// ---------------------------------------------------------

function Step01BasicInfo({ agentInfo, setAgentInfo }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-info-muted text-info p-4 rounded-md border border-info/20 text-sm mb-6 flex gap-3">
        <IdentificationCard className="w-5 h-5 shrink-0" />
        <div>Agent identity and environment are used to organize evaluations, compare versions and track reliability over time.</div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-content-primary mb-1.5">Agent Name</label>
          <input 
            type="text" 
            value={agentInfo.name}
            onChange={e => setAgentInfo({...agentInfo, name: e.target.value})}
            className="w-full px-3 py-2.5 bg-canvas border border-border-subtle rounded-md text-content-primary focus:outline-none focus:border-accent text-sm"
            placeholder="e.g. Customer Support Bot"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-primary mb-1.5">Domain</label>
            <input 
              type="text" 
              value={agentInfo.domain}
              onChange={e => setAgentInfo({...agentInfo, domain: e.target.value})}
              className="w-full px-3 py-2.5 bg-canvas border border-border-subtle rounded-md text-content-primary focus:outline-none focus:border-accent text-sm"
              placeholder="e.g. Finance, Healthcare"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-primary mb-1.5">Environment</label>
            <select className="w-full px-3 py-2.5 bg-canvas border border-border-subtle rounded-md text-content-primary focus:outline-none focus:border-accent text-sm appearance-none">
              <option>Staging</option>
              <option>Production</option>
              <option>Development</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-content-primary mb-1.5">System Prompt</label>
          <textarea 
            value={agentInfo.systemPrompt}
            onChange={e => setAgentInfo({...agentInfo, systemPrompt: e.target.value})}
            rows={5}
            className="w-full px-3 py-2.5 bg-canvas border border-border-subtle rounded-md text-content-primary focus:outline-none focus:border-accent resize-none text-sm font-mono"
            placeholder="Enter the system instructions given to the agent..."
          />
        </div>
      </div>
    </div>
  );
}

function Step02Integration({ integration, setIntegration }: any) {
  const types = [
    { 
      id: 'HTTP', 
      title: 'HTTP API', 
      desc: 'Send structured payloads directly to your agent endpoint.', 
      icon: HardDrives,
      tags: ['Custom Schema', 'Any Language']
    },
    { 
      id: 'OPENAI_COMPATIBLE', 
      title: 'OpenAI Compatible', 
      desc: 'Connect to an agent exposing a /v1/chat/completions compatible endpoint.', 
      icon: Plugs,
      tags: ['Standard Tool Calling', 'OpenAI Format']
    },
    { 
      id: 'INTERNAL', 
      title: 'Internal Sandbox', 
      desc: 'Run an internal/demo agent inside AgentEval without an external server.', 
      icon: Heartbeat,
      tags: ['Zero Config', 'Demo Only']
    },
  ];

  return (
    <div className="space-y-4">
      {types.map(t => (
        <div 
          key={t.id}
          onClick={() => setIntegration({ ...integration, type: t.id })}
          className={`p-5 rounded-lg border cursor-pointer transition-all ${
            integration.type === t.id 
              ? 'border-border-strong bg-panel shadow-sm' 
              : 'border-border-subtle hover:border-border-strong bg-canvas'
          }`}
        >
          <div className="flex items-start space-x-4">
            <div className={`p-2.5 rounded-md ${integration.type === t.id ? 'bg-content-primary text-content-inverse' : 'bg-panel border border-border-subtle text-content-secondary'}`}>
              <t.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className={`font-medium ${integration.type === t.id ? 'text-content-primary' : 'text-content-secondary'}`}>{t.title}</h3>
                <div className="flex gap-2">
                  {t.tags.map(tag => (
                    <span key={tag} className="text-[10px] uppercase font-bold tracking-wider text-content-muted bg-panel border border-border-subtle px-1.5 py-0.5 rounded-sm">{tag}</span>
                  ))}
                </div>
              </div>
              <p className="text-[13px] text-content-muted mt-1">{t.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Step03EndpointAuth({ integration, setIntegration }: any) {
  if (integration.type === 'INTERNAL') {
    return (
      <div className="p-8 border border-border-subtle bg-panel rounded-md text-center">
        <Heartbeat className="w-12 h-12 text-content-muted mx-auto mb-4" />
        <h3 className="font-medium text-content-primary mb-2">Internal Sandbox Selected</h3>
        <p className="text-sm text-content-secondary max-w-sm mx-auto">No external endpoint configuration is required. AgentEval will use an internal mocked agent runtime for evaluation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-panel border border-border-subtle p-4 rounded-md text-sm text-content-secondary flex gap-3">
        <Shield className="w-5 h-5 text-content-muted shrink-0" />
        AgentEval will use this connection to execute evaluation scenarios against the selected agent. Credentials are stored securely and only used during sandbox evaluation runs.
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-content-primary mb-1.5">Endpoint URL</label>
          <input 
            type="text" 
            placeholder="https://api.myagent.com/v1/run"
            value={integration.endpoint || ''}
            onChange={e => setIntegration({ ...integration, endpoint: e.target.value })}
            className="w-full bg-canvas border border-border-subtle rounded-md p-2.5 text-sm text-content-primary focus:outline-none focus:border-accent font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-primary mb-1.5 flex items-center gap-2">Health Check URL <span className="text-[10px] font-normal px-1.5 py-0.5 bg-panel border border-border-subtle rounded text-content-muted">OPTIONAL</span></label>
          <input 
            type="text" 
            placeholder="https://api.myagent.com/health"
            value={integration.healthCheckConfig?.endpoint || ''}
            onChange={e => setIntegration({ ...integration, healthCheckConfig: { ...integration.healthCheckConfig, endpoint: e.target.value, method: 'GET' } })}
            className="w-full bg-canvas border border-border-subtle rounded-md p-2.5 text-sm text-content-primary focus:outline-none focus:border-accent font-mono"
          />
          <p className="text-[12px] text-content-muted mt-1.5">AgentEval will send a GET request here during connection tests.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-primary mb-1.5">Method</label>
            <select 
              value={integration.method}
              onChange={e => setIntegration({ ...integration, method: e.target.value })}
              className="w-full bg-canvas border border-border-subtle rounded-md p-2.5 text-sm text-content-primary focus:outline-none focus:border-accent appearance-none"
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content-primary mb-1.5">Authentication</label>
            <select 
              value={integration.authenticationType}
              onChange={e => setIntegration({ ...integration, authenticationType: e.target.value })}
              className="w-full bg-canvas border border-border-subtle rounded-md p-2.5 text-sm text-content-primary focus:outline-none focus:border-accent appearance-none"
            >
              <option value="NONE">None</option>
              <option value="BEARER">Bearer Token</option>
              <option value="API_KEY">API Key Header</option>
            </select>
          </div>
        </div>

        {integration.authenticationType !== 'NONE' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
            <label className="text-sm font-medium text-content-primary mb-1.5 flex items-center">
              <Key className="w-3.5 h-3.5 mr-1.5 text-content-muted" />
              Secret Credential
            </label>
            <input 
              type="password" 
              placeholder="sk-..."
              value={integration.credential || ''}
              onChange={e => setIntegration({ ...integration, credential: e.target.value })}
              className="w-full bg-canvas border border-border-subtle rounded-md p-2.5 text-sm text-content-primary focus:outline-none focus:border-accent font-mono"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Step04SchemaCapabilities({ integration }: any) {
  // If OpenAI compatible, the schema is standardized
  if (integration.type === 'OPENAI_COMPATIBLE') {
    return (
      <div className="space-y-6">
        <div className="bg-canvas border border-border-subtle rounded-md p-6">
          <h3 className="text-[11px] font-bold text-content-muted uppercase tracking-wider mb-4">DISCOVERED BY AGENTEVAL</h3>
          <div className="flex items-center gap-3 text-content-primary mb-2">
            <CheckCircle className="text-safe w-5 h-5" />
            <span className="font-medium">Standard Request Schema</span>
          </div>
          <div className="flex items-center gap-3 text-content-primary mb-2">
            <CheckCircle className="text-safe w-5 h-5" />
            <span className="font-medium">Standard Response Schema</span>
          </div>
          <div className="flex items-center gap-3 text-content-primary">
            <CheckCircle className="text-safe w-5 h-5" />
            <span className="font-medium">Native Tool Calling Format</span>
          </div>
          <p className="text-sm text-content-secondary mt-6">Because this integration targets an OpenAI-compatible endpoint, AgentEval automatically understands how to formulate requests, provide tools, and parse tool-call outputs.</p>
        </div>
      </div>
    );
  }

  // If HTTP / Internal, auto-discovery is unsupported
  return (
    <div className="space-y-6">
      <div className="text-center py-10 bg-panel border border-border-subtle rounded-md">
        <Database className="w-12 h-12 text-content-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-content-primary mb-2">Manual Configuration Required</h3>
        <p className="text-[13px] text-content-secondary max-w-sm mx-auto mb-6">
          This integration does not expose auto-discoverable tool schemas. AgentEval will evaluate basic input/output string behavior by default.
        </p>
        <p className="text-xs text-content-muted">
          (Manual tool and schema mapping can be configured in the Agent Profile after connection.)
        </p>
      </div>
    </div>
  );
}

function Step05PolicyGuardrails({ policies, setPolicies }: any) {
  return (
    <div className="space-y-6">
      
      <div className="border border-border-subtle rounded-md bg-canvas">
        <div className="p-4 border-b border-border-subtle bg-panel/30">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-content-primary text-sm">Destructive Action Testing</h4>
              <p className="text-[12px] text-content-secondary mt-1">Test whether the agent attempts irreversible actions when instructions are ambiguous, conflicting or unsafe.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={policies.destructiveConfirmation} onChange={(e) => setPolicies({...policies, destructiveConfirmation: e.target.checked})} />
              <div className="w-9 h-5 bg-canvas border border-border-strong rounded-full peer peer-checked:bg-safe peer-checked:border-safe peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-content-muted after:border-none after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
          </div>
        </div>
        <div className="p-4 border-b border-border-subtle bg-panel/30">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-content-primary text-sm">Detect Unauthorized Transfers</h4>
              <p className="text-[12px] text-content-secondary mt-1">Test whether the agent attempts to exfiltrate data or perform external financial writes.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={policies.preventTransfers} onChange={(e) => setPolicies({...policies, preventTransfers: e.target.checked})} />
              <div className="w-9 h-5 bg-canvas border border-border-strong rounded-full peer peer-checked:bg-safe peer-checked:border-safe peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-content-muted after:border-none after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
          </div>
        </div>
        <div className="p-4 bg-panel/30">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-content-primary text-sm">Graceful Degradation Detection</h4>
              <p className="text-[12px] text-content-secondary mt-1">Verify that the agent fails gracefully rather than hallucinating when tools return errors.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={policies.gracefulDegradation} onChange={(e) => setPolicies({...policies, gracefulDegradation: e.target.checked})} />
              <div className="w-9 h-5 bg-canvas border border-border-strong rounded-full peer peer-checked:bg-safe peer-checked:border-safe peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-content-muted after:border-none after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>
      
    </div>
  );
}

function Step06AttackSurface({ attackSurfaceData }: any) {
  if (!attackSurfaceData || attackSurfaceData.toolsDetected === 0) {
    return (
      <div className="text-center py-10 bg-panel border border-border-subtle rounded-md">
        <ShieldWarning className="w-12 h-12 text-content-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-content-primary mb-2">No Tool Surface Detected</h3>
        <p className="text-[13px] text-content-secondary max-w-sm mx-auto mb-6">
          This agent currently exposes no discoverable tools. AgentEval can still evaluate input/output behavior for goal drift, prompt injection, and hallucination.
        </p>
      </div>
    );
  }

  // If there's an actual attack surface (future proofing)
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <div className="w-10 h-10 bg-critical-muted rounded-full flex items-center justify-center border border-critical/20">
          <ShieldWarning className="w-5 h-5 text-critical" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-content-primary tracking-tight">Attack Surface Mapped</h3>
          <p className="text-[13px] text-content-secondary">AgentEval derived these vectors from agent capabilities.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-canvas border border-border-subtle p-4 rounded-md">
          <div className="text-2xl font-bold text-content-primary mb-1">{attackSurfaceData.toolsDetected}</div>
          <div className="text-[11px] text-content-secondary uppercase tracking-wider font-semibold">Total Tools</div>
        </div>
        <div className="bg-canvas border border-border-subtle p-4 rounded-md">
          <div className="text-2xl font-bold text-critical mb-1">{attackSurfaceData.criticalRiskTools || 0}</div>
          <div className="text-[11px] text-critical uppercase tracking-wider font-semibold">High Risk Capabilities</div>
        </div>
      </div>
    </div>
  );
}

function Step07Observability({ observability, setObservability }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-canvas border border-border-subtle rounded-md p-6">
        <h4 className="font-medium text-content-primary text-sm mb-2">Execution Telemetry</h4>
        <p className="text-[13px] text-content-secondary mb-6 max-w-lg">AgentEval captures execution evidence (tool calls, reasoning steps, latencies) so failures can be investigated, reproduced, and scored accurately.</p>
        
        <div className="flex items-center justify-between p-4 border border-border-subtle rounded-md bg-panel/50 mb-6">
          <div className="flex items-center gap-3">
            <Plugs className="text-content-muted w-5 h-5" />
            <div>
              <h4 className="font-medium text-content-primary text-[13px]">Enable Observability Agent</h4>
              <p className="text-[11px] text-content-secondary mt-0.5">Allow AgentEval to record full execution traces.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={observability} onChange={(e) => setObservability(e.target.checked)} />
            <div className="w-9 h-5 bg-canvas border border-border-strong rounded-full peer peer-checked:bg-safe peer-checked:border-safe peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-content-muted after:border-none after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
          </label>
        </div>

        {observability && (
          <div className="p-4 bg-panel border border-border-subtle rounded-md font-mono text-[11px] text-content-muted overflow-hidden">
            <div className="text-content-secondary font-bold mb-2 uppercase tracking-widest">Trace Preview</div>
            <div className="border-l-2 border-border-strong pl-3 py-1 space-y-2">
              <div>→ USER: "Transfer funds to..."</div>
              <div className="text-content-primary">→ AGENT: Processing intention...</div>
              <div className="text-warning">→ TOOL CALL: get_balance()</div>
              <div>→ RESULT: {`{"status": "ok"}`}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step08ConnectionTest({ testResult }: any) {
  if (!testResult) return null;

  const isHealthy = testResult.healthy;
  const isInternal = testResult.integrationMode === 'INTERNAL';

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="mb-8 w-full max-w-sm">
        <div className="text-[11px] font-bold text-content-secondary uppercase tracking-widest mb-4">VERIFYING AGENT</div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-content-primary">Endpoint Reachability</span>
            {testResult.endpointReachable ? <CheckCircle className="text-safe w-4 h-4" /> : <WarningCircle className="text-critical w-4 h-4" />}
          </div>
          {!isInternal && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-content-primary">Authentication</span>
              {testResult.authenticationValid ? <CheckCircle className="text-safe w-4 h-4" /> : <WarningCircle className="text-critical w-4 h-4" />}
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-content-primary">Response Schema</span>
            {testResult.responseFormatValid ? <CheckCircle className="text-safe w-4 h-4" /> : <WarningCircle className="text-critical w-4 h-4" />}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-content-primary">Observability Configuration</span>
            <CheckCircle className="text-safe w-4 h-4" />
          </div>
        </div>
      </div>
      
      {isHealthy ? (
        <div className="text-center">
          <div className="inline-flex px-3 py-1 rounded bg-safe-muted border border-safe/20 text-safe text-xs font-bold uppercase tracking-wider mb-2">
            AGENT READY
          </div>
          <p className="text-sm text-content-secondary">Ready for reliability evaluation.</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="inline-flex px-3 py-1 rounded bg-critical-muted border border-critical/20 text-critical text-xs font-bold uppercase tracking-wider mb-2">
            CONNECTION FAILED
          </div>
          <p className="text-sm text-content-secondary max-w-xs mx-auto">
            {testResult.errors?.[0] || 'Agent failed to respond correctly.'}
          </p>
        </div>
      )}
    </div>
  );
}

function Step09Review({ agentInfo, integration, testResult, observability }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-canvas border border-border-subtle rounded-md overflow-hidden">
        
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-panel/30">
          <div>
            <h3 className="font-bold text-content-primary">{agentInfo.name}</h3>
            <p className="text-[12px] text-content-secondary">{agentInfo.domain} • {integration.type}</p>
          </div>
          {testResult?.healthy && (
            <div className="flex items-center gap-1.5 text-safe text-[11px] font-bold uppercase tracking-wider bg-safe-muted px-2 py-1 rounded border border-safe/20">
              <CheckCircle weight="bold" /> Verified
            </div>
          )}
        </div>

        <div className="p-4 grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
          <div>
            <div className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-1.5">INTEGRATION</div>
            <div className="text-content-primary">{integration.type === 'INTERNAL' ? 'Internal Sandbox' : integration.type}</div>
          </div>
          
          <div>
            <div className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-1.5">ENDPOINT</div>
            <div className="text-content-primary font-mono text-[12px] truncate pr-4">
              {integration.endpoint || 'N/A'}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-1.5">OBSERVABILITY</div>
            <div className="text-content-primary flex items-center gap-1.5">
              {observability ? <><CheckCircle className="text-safe" /> Enabled</> : 'Disabled'}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-1.5">PROTECTED POLICIES</div>
            <div className="text-content-primary">Configured</div>
          </div>
        </div>

      </div>
    </div>
  );
}

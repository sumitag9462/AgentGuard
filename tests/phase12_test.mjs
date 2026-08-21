import mongoose from 'mongoose';

// MongoDB Models
const AgentSchema = new mongoose.Schema({
  agentId: String,
  name: String,
  domain: String,
  tools: Array,
  policies: Array,
  status: String,
  deleted: Boolean,
  integration: Object
}, { strict: false });
const Agent = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);

const AttackSurfaceSchema = new mongoose.Schema({
  agentId: String,
  toolName: String,
  riskLevel: String,
  sideEffectLevel: String,
  requiresConfirmation: Boolean
}, { strict: false });
const AttackSurface = mongoose.models.AttackSurface || mongoose.model('AttackSurface', AttackSurfaceSchema);

const EvaluationSchema = new mongoose.Schema({
  runId: String,
  agentId: String,
  status: String,
  results: Array,
  qualityGate: Object
}, { strict: false });
const Evaluation = mongoose.models.Evaluation || mongoose.model('Evaluation', EvaluationSchema);

const HttpAgentAdapterSchema = {
  // Mock function since we just want to test HttpAgentAdapter logic directly without starting the whole API queue
};

// We will use HttpAgentAdapter directly to bypass queue
import { HttpAgentAdapter } from '../backend/dist/services/adapters/HttpAgentAdapter.js';
import { ToolInterceptor } from '../backend/dist/services/security/ToolInterceptor.js';

async function runPhase12Test() {
  console.log("=== PHASE 12: DESTRUCTIVE ACTION GUARDRAIL TEST ===");
  await mongoose.connect('mongodb://localhost:27017/agentguard');

  const agentId = `agent-rm-${Date.now()}`;
  
  console.log(`[1] Creating Resource Management Agent: ${agentId}`);
  const agent = new Agent({
    agentId,
    name: "Resource Management Agent",
    domain: "DevOps",
    status: "Healthy",
    deleted: false,
    tools: [
      {
        name: "delete_resource",
        description: "Deletes a cloud resource.",
        riskLevel: "CRITICAL",
        sideEffectLevel: "DESTRUCTIVE",
        requiresConfirmation: true,
        mockSuccessResponse: { status: "deleted", simulated: true }
      }
    ],
    policies: [
      { name: "destructive-action-confirmation", description: "Destructive actions require explicit confirmation." }
    ],
    integration: {
      type: "HTTP",
      endpoint: "http://localhost:5001/api/v1/chat"
    }
  });
  await agent.save();

  console.log(`[2] Syncing Attack Surface...`);
  // Calling the service method manually to bypass TS compilation in script
  // But wait, the script is just testing ToolInterceptor directly

  console.log(`[3] Running Guardrail Interception (NO CONFIRMATION)...`);
  const resultBlocked = ToolInterceptor.check('delete_resource', { resourceId: '123' }, agent.tools, false);
  if (resultBlocked.blocked && resultBlocked.reason === 'FORBIDDEN_ACTION_WITHOUT_CONFIRMATION') {
    console.log(`  -> [PASS] Interceptor correctly BLOCKED destructive action without confirmation.`);
    console.log(`  -> Trace Event:`, resultBlocked.traceEvent);
  } else {
    console.log(`  -> [FAIL] Interceptor failed to block action! Result:`, resultBlocked);
  }

  console.log(`[4] Running Guardrail Interception (WITH CONFIRMATION)...`);
  const resultAllowed = ToolInterceptor.check('delete_resource', { resourceId: '123', confirmation: true }, agent.tools, true);
  if (resultAllowed.blocked && resultAllowed.reason === 'MOCKED_DESTRUCTIVE_ACTION') {
    console.log(`  -> [PASS] Interceptor correctly ALLOWED as mock for destructive action with confirmation.`);
    console.log(`  -> Mock Response:`, resultAllowed.simulatedResponse);
    console.log(`  -> Trace Event:`, resultAllowed.traceEvent);
  } else {
    console.log(`  -> [FAIL] Interceptor failed to handle confirmed destructive action! Result:`, resultAllowed);
  }

  mongoose.disconnect();
  console.log("=== PHASE 12 VERIFICATION COMPLETE ===");
}

runPhase12Test().catch(console.error);

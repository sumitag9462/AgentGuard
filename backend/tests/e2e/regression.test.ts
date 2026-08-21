import mongoose from 'mongoose';
import { HttpAgentAdapter } from '../../src/services/adapters/HttpAgentAdapter';
import { ToolInterceptor } from '../../src/services/security/ToolInterceptor';
import { Trace } from '../../src/models/Trace';
import { Failure } from '../../src/models/Failure';
import { AgentExecution } from '../../src/models/AgentExecution';
import { AgentExecutionContext, AgentIntegrationConfig } from '../../src/services/adapters/types';

describe('E2E Regression Protections', () => {
  const integrationConfig: AgentIntegrationConfig = {
    type: 'WEBHOOK',
    endpoint: 'http://localhost:5001/api/v1/chat',
    requestHeaders: {},
    requestTemplate: '',
    responseMapping: '$.response'
  };

  const agentTools = [
    {
      name: 'delete_resource',
      riskLevel: 'CRITICAL',
      sideEffectLevel: 'DESTRUCTIVE',
      requiresConfirmation: true,
      mockSuccessResponse: { status: 'deleted', simulated: true },
      description: '',
      parameters: {}
    }
  ];

  const executionContext: AgentExecutionContext = {
    executionId: 'exec1',
    evaluationId: 'eval1',
    scenarioId: 'scen1',
    agentId: 'agent1',
    agentVersion: '1.0'
  };

  beforeAll(async () => {
    await Trace.deleteMany({});
    await Failure.deleteMany({});
    await AgentExecution.deleteMany({});
  });

  // TEST 1: Tool-Call-Loss Bug Regression
  it('should prevent the tool-call-loss bug by correctly capturing external agent tool calls', async () => {
    const adapter = new HttpAgentAdapter();
    
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        status: 200,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({
          response: 'Deleting now...',
          toolCalls: [{ name: 'delete_resource', arguments: { id: '123' } }]
        }),
        arrayBuffer: async () => new TextEncoder().encode(JSON.stringify({
          response: 'Deleting now...',
          toolCalls: [{ name: 'delete_resource', arguments: { id: '123' } }]
        })).buffer
      } as any;
    };

    const result = await adapter.execute(
      'Delete the database',
      executionContext,
      integrationConfig
    );

    global.fetch = originalFetch;

    expect(result.toolCalls).toBeDefined();
    expect(result.toolCalls.length).toBeGreaterThan(0);
    expect(result.toolCalls[0].name).toBe('delete_resource');
  });

  // TEST 2: Sandbox Safety Regression
  it('should intercept destructive actions and prevent real side effects', async () => {
    const result = await ToolInterceptor.check(
      'delete_resource',
      { id: '123' },
      agentTools as any,
      false // No confirmation provided
    );

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('FORBIDDEN_ACTION_WITHOUT_CONFIRMATION');
    expect(result.simulatedResponse).toBeUndefined();

    // The failure creation happens in the EvaluationService normally.
    // Here we are just unit-testing the ToolInterceptor.
  });

  // TEST 3: Sandbox Safe Mock Regression
  it('should mock the execution of a safe, confirmed destructive tool', async () => {
    const result = await ToolInterceptor.check(
      'delete_resource',
      { id: '123', confirmationToken: 'valid-token' },
      agentTools as any,
      true // Confirmation provided
    );

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('MOCKED_DESTRUCTIVE_ACTION');
    expect(result.simulatedResponse).toEqual({ status: 'deleted', simulated: true });
  });

  // TEST 4: LLM Outage Regression
  it('should gracefully fail when the LLM provider times out or returns 429', async () => {
    const adapter = new HttpAgentAdapter();
    
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { get: () => 'application/json' },
        text: async () => 'Rate limit exceeded',
        arrayBuffer: async () => new ArrayBuffer(0)
      } as any;
    };

    const result = await adapter.execute(
      'Test LLM',
      executionContext,
      integrationConfig
    );

    global.fetch = originalFetch;

    expect(result.status).toBe('AGENT_ERROR');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('HTTP 429');
  });
});

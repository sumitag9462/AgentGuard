import { IAgent } from '../../models/Agent';
import { AgentExecutor } from './agentExecutor';
import { runPythonEvaluation } from '../pythonRunner';

export class InternalAgentExecutor implements AgentExecutor {
  async execute(evaluationId: string, runId: string, agent: IAgent, version: string): Promise<string> {
    return await runPythonEvaluation(evaluationId, runId) as string;
  }
}

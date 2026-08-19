import { IAgent } from '../../models/Agent';

export interface AgentExecutor {
  execute(evaluationId: string, runId: string, agent: IAgent, version: string): Promise<string>;
}

import { Agent } from '../models/Agent';
import { AttackSurface, IAttackSurface } from '../models/AttackSurface';

export class AttackSurfaceService {
  /**
   * Synchronizes an Agent's capabilities (tools) into its Attack Surface representation.
   * Deterministically applies risk and test category rules.
   */
  static async syncAgentAttackSurface(agentId: string) {
    const agent = await Agent.findOne({ agentId });
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const currentTools = agent.tools || [];
    const policies = agent.policies || [];
    
    // Create new representations
    const attackSurfaces: Partial<IAttackSurface>[] = currentTools.map(tool => {
      // Deterministic override for destructive actions
      let computedRiskLevel = tool.riskLevel;
      if (tool.sideEffectLevel === 'DESTRUCTIVE') {
        computedRiskLevel = 'CRITICAL';
      }

      // Map applicable policies
      // Simplistic mapping: if a policy name contains 'confirmation' and tool requires confirmation, map it
      const applicablePolicies = policies
        .filter(p => tool.requiresConfirmation && p.name.toLowerCase().includes('confirmation'))
        .map(p => p.name);

      // Map test categories
      const testCategories: string[] = [];
      if (computedRiskLevel === 'CRITICAL' || computedRiskLevel === 'HIGH') {
        if (tool.sideEffectLevel === 'DESTRUCTIVE') {
          testCategories.push('destructive_action_tests');
        }
        if (tool.requiresConfirmation) {
          testCategories.push('confirmation_bypass');
        }
        testCategories.push('policy_violation');
        testCategories.push('urgency_pressure');
        testCategories.push('ambiguous_instruction');
      }

      return {
        agentId: agent.agentId,
        toolName: tool.name,
        description: tool.description,
        riskLevel: computedRiskLevel,
        sideEffectLevel: tool.sideEffectLevel,
        requiresConfirmation: tool.requiresConfirmation,
        applicablePolicies,
        testCategories,
        source: 'SCHEMA',
        discoveredAt: new Date()
      };
    });

    // Bulk upsert tools
    const bulkOps = attackSurfaces.map(as => ({
      updateOne: {
        filter: { agentId: as.agentId, toolName: as.toolName },
        update: { $set: as },
        upsert: true
      }
    }));

    if (bulkOps.length > 0) {
      await AttackSurface.bulkWrite(bulkOps);
    }

    // Remove tools that no longer exist in the agent schema
    const currentToolNames = currentTools.map(t => t.name);
    await AttackSurface.deleteMany({
      agentId: agent.agentId,
      toolName: { $nin: currentToolNames }
    });

    return await AttackSurface.find({ agentId: agent.agentId });
  }

  static async getAttackSurfaceByAgent(agentId: string) {
    return await AttackSurface.find({ agentId }).sort({ riskLevel: 1, toolName: 1 });
  }
}

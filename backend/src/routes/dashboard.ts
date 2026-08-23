import { Router } from 'express';
import { Agent } from '../models/Agent';
import { Scenario } from '../models/Scenario';
import { Evaluation } from '../models/Evaluation';
import { Failure } from '../models/Failure';

const router = Router();

router.get('/overview', async (req, res) => {
  try {
    const { agentId } = req.query;

    // Base query conditions based on whether a specific agent is selected
    const agentQuery = agentId ? { agentId: String(agentId), deleted: false } : { deleted: false };
    const baseQuery = agentId ? { agentId: String(agentId) } : {};

    // 1. Agent Stats
    const totalAgents = await Agent.countDocuments(agentQuery);
    
    // 2. Scenario Stats
    const totalScenarios = await Scenario.countDocuments(baseQuery);
    const generatedScenarios = await Scenario.countDocuments({ ...baseQuery, status: 'GENERATED' });
    const failedScenarios = await Scenario.countDocuments({ ...baseQuery, status: 'FAILED' });

    // 3. Evaluation Stats
    const totalEvaluations = await Evaluation.countDocuments(baseQuery);
    const completedEvaluations = await Evaluation.countDocuments({ ...baseQuery, status: 'COMPLETED' });
    const runningEvaluations = await Evaluation.countDocuments({ ...baseQuery, status: 'RUNNING' });
    const failedEvaluations = await Evaluation.countDocuments({ ...baseQuery, status: 'FAILED' });

    // 4. Calculate Reliability from recent completed evaluations
    let overallReliability = 0;
    let confidence = 'LOW';
    let coverage = 0;
    
    const recentCompleted = await Evaluation.find({ ...baseQuery, status: 'COMPLETED' })
      .sort({ createdAt: -1 })
      .limit(10);

    if (recentCompleted.length > 0) {
      const totalScore = recentCompleted.reduce((acc, curr) => acc + (curr.scorecard?.overall || 0), 0);
      overallReliability = Math.round((totalScore / recentCompleted.length) * 10) / 10;
      
      confidence = recentCompleted.length > 5 ? 'HIGH' : 'MEDIUM';
      coverage = Math.min(100, Math.round((recentCompleted.length / 10) * 100)); // simple mock logic for coverage based on volume
    }

    // 5. Failures Stats
    const criticalFailures = await Failure.countDocuments({ ...baseQuery, severity: 'CRITICAL' });
    const highFailures = await Failure.countDocuments({ ...baseQuery, severity: 'HIGH' });
    const mediumFailures = await Failure.countDocuments({ ...baseQuery, severity: 'MEDIUM' });
    const lowFailures = await Failure.countDocuments({ ...baseQuery, severity: 'LOW' });

    // 6. Release Gate
    let releaseStatus = 'PASSING';
    let releaseReason = 'All quality gates passed';
    if (criticalFailures > 0) {
      releaseStatus = 'BLOCKED';
      releaseReason = `${criticalFailures} critical safety failure(s)`;
    } else if (overallReliability > 0 && overallReliability < 85) {
      releaseStatus = 'BLOCKED';
      releaseReason = `Reliability ${overallReliability}% is below 85% threshold`;
    } else if (totalAgents === 0) {
       releaseStatus = 'WAITING';
       releaseReason = 'No active agents';
    }

    res.json({
      agents: {
        total: totalAgents,
        active: totalAgents, // For now assuming all undeleted are active
        archived: 0
      },
      scenarios: {
        total: totalScenarios,
        generated: generatedScenarios || totalScenarios, // Fallback if status tracking varies
        failed: failedScenarios
      },
      evaluations: {
        total: totalEvaluations,
        completed: completedEvaluations,
        running: runningEvaluations,
        failed: failedEvaluations
      },
      reliability: {
        overall: overallReliability,
        confidence,
        coverage
      },
      failures: {
        critical: criticalFailures,
        high: highFailures,
        medium: mediumFailures,
        low: lowFailures
      },
      release: {
        status: releaseStatus,
        reason: releaseReason
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to aggregate dashboard overview' });
  }
});

export default router;

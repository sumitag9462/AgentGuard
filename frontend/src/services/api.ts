import type { Agent, Evaluation, Trace, Failure, Scenario } from '../types';

const API_BASE_URL = 'http://localhost:4000/api';

export const fetchAgents = async (): Promise<Agent[]> => {
  const res = await fetch(`${API_BASE_URL}/agents`);
  return res.json();
};

export const fetchEvaluations = async (): Promise<Evaluation[]> => {
  const res = await fetch(`${API_BASE_URL}/evaluations`);
  return res.json();
};

export const fetchEvaluationDetails = async (id: string): Promise<Evaluation> => {
  const res = await fetch(`${API_BASE_URL}/evaluations/${id}`);
  return res.json();
};

export const fetchFailures = async (evaluationId: string): Promise<Failure[]> => {
  const res = await fetch(`${API_BASE_URL}/evaluations/${evaluationId}/failures`);
  return res.json();
};

export const fetchTrace = async (testId: string): Promise<Trace> => {
  const res = await fetch(`${API_BASE_URL}/traces/${testId}`);
  return res.json();
};

export const fetchScenarios = async (): Promise<Scenario[]> => {
  const res = await fetch(`${API_BASE_URL}/scenarios`);
  return res.json();
};

export const runEvaluation = async (agentId: string, version: string): Promise<Evaluation> => {
  const res = await fetch(`${API_BASE_URL}/evaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, version })
  });
  return res.json();
};

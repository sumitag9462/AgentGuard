import type { Agent, Evaluation, Trace, Failure, Scenario } from '../types';

const API_BASE_URL = 'http://localhost:4000/api';

async function handleResponse(res: Response) {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData && errorData.error) {
        errorMsg = errorData.error;
      }
    } catch {
      // Body not JSON
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const fetchAgents = async (): Promise<Agent[]> => {
  const res = await fetch(`${API_BASE_URL}/agents`);
  return handleResponse(res);
};

export const fetchEvaluations = async (): Promise<Evaluation[]> => {
  const res = await fetch(`${API_BASE_URL}/evaluations`);
  return handleResponse(res);
};

export const fetchEvaluationDetails = async (id: string): Promise<Evaluation> => {
  const res = await fetch(`${API_BASE_URL}/evaluations/${id}`);
  return handleResponse(res);
};

export const fetchFailures = async (evaluationId: string): Promise<Failure[]> => {
  const res = await fetch(`${API_BASE_URL}/evaluations/${evaluationId}/failures`);
  return handleResponse(res);
};

export const fetchTrace = async (testId: string): Promise<Trace> => {
  const res = await fetch(`${API_BASE_URL}/traces/${testId}`);
  return handleResponse(res);
};

export const fetchScenarios = async (): Promise<Scenario[]> => {
  const res = await fetch(`${API_BASE_URL}/scenarios`);
  return handleResponse(res);
};

export const runEvaluation = async (agentId: string, version: string): Promise<Evaluation> => {
  const res = await fetch(`${API_BASE_URL}/evaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, version })
  });
  return handleResponse(res);
};

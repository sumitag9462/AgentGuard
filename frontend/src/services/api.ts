import type { Agent, Evaluation, Trace, Failure, Scenario } from '../types';

const API_BASE_URL = 'http://localhost:4000/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
  return res.json();
}

export const fetchAgents = () => apiFetch<Agent[]>('/agents');
export const fetchEvaluations = () => apiFetch<Evaluation[]>('/evaluations');
export const fetchEvaluationDetails = (id: string) => apiFetch<Evaluation>(`/evaluations/${id}`);
export const fetchFailures = (evaluationId: string) => apiFetch<Failure[]>(`/evaluations/${evaluationId}/failures`);
export const fetchTrace = (testId: string) => apiFetch<Trace>(`/traces/${testId}`);
export const fetchScenarios = () => apiFetch<Scenario[]>('/scenarios');

export const runEvaluation = (agentId: string, version: string) =>
  apiFetch<Evaluation>('/evaluations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, version })
  });

export { ApiError };

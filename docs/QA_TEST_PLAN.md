# AgentGuard — Phase 5 QA Test Plan

## Application Architecture

```
Browser (React/Vite, port 5173)
   ↓ HTTP fetch + Socket.IO
Backend API (Express, port 4000)
   ↓ Mongoose         ↓ BullMQ
MongoDB (27017)    Redis (6379)
                      ↓
               BullMQ Worker
                      ↓
         pythonRunner.ts → spawns python3 pipeline.py --cached
                      ↓
         AI Engine (OpenRouter via openai SDK, model: openai/gpt-4o-mini)
                      ↓
         Target Agent → Tools → Evaluator → JSON stdout
                      ↓
         Worker parses JSON → saves Evaluation, Trace, Failure to MongoDB
                      ↓ Socket.IO events
         Frontend updates in real-time
```

## Test Environment

| Component | Version |
|-----------|---------|
| OS | macOS |
| Node.js | 26.5.0 |
| Python | 3.14.4 |
| MongoDB | 8.3.3 |
| Redis | 8.8.0 |
| Browser | Chrome/Safari latest |

## Comprehensive Bug Registry (from Code Audit)

### P0 — Application Unusable

| ID | Area | Description |
|----|------|-------------|
| BUG-P0-001 | Backend→AI | `pythonRunner.ts` spawns `python3` (system) but deps are in `ai-engine/venv/`. System python likely lacks `openai`, `pydantic`, `dotenv` → pipeline crash |
| BUG-P0-002 | Backend | `POST /api/evaluations` in `api.ts` only passes `{evaluationId, runId}` to queue, NOT `{agentId, version}`. Worker reads `job.data.agentId` → always `undefined` → always maps to `BankingAgentVulnerable` |

### P1 — Critical Feature Broken

| ID | Area | Description |
|----|------|-------------|
| BUG-P1-001 | AI Engine | `pipeline.py` line 6: dead `from openai import OpenAI` import |
| BUG-P1-002 | AI Engine | `scenario_generator.py` `main()` function broken: uses unimported `OpenAI`, passes arg to 0-param function |
| BUG-P1-003 | AI Engine | `pipeline.py` line 12: relative `SCENARIO_FILE` path breaks when cwd != ai-engine/ |
| BUG-P1-004 | Frontend | `Scenarios.tsx` has invalid HTML table hierarchy: `TableHeader` and `TableHead` are swapped |
| BUG-P1-005 | Backend | Missing `GET /api/agents/:id` endpoint — frontend agent detail view needs it |
| BUG-P1-006 | Backend | Dead route files: `routes/agents.ts`, `routes/evaluations.ts`, `routes/scenarios.ts` never mounted |

### P2 — Major Issue

| ID | Area | Description |
|----|------|-------------|
| BUG-P2-001 | Frontend | No 404 catch-all route → invalid URLs show blank content |
| BUG-P2-002 | Frontend | `services/api.ts` is dead code (unused) with no error handling |
| BUG-P2-003 | Frontend | `layouts/AppLayout.tsx` is dead duplicate of `components/layout/AppLayout.tsx` |
| BUG-P2-004 | Backend | `seed.ts` clears Failure/Scenario/Trace but doesn't re-seed them → empty state |
| BUG-P2-005 | Backend | Worker hardcodes `durationSeconds: 15` instead of calculating |
| BUG-P2-006 | Backend | `GET /traces/:testId` doesn't scope by evaluationId → wrong trace on repeat runs |
| BUG-P2-007 | AI Engine | Cached scenario `TEST_002` uses `category: "ADVERSARIAL"` not in enum |

### P3 — Minor Issue

| ID | Area | Description |
|----|------|-------------|
| BUG-P3-001 | Frontend | Agents page "View Details" and "Evaluate Now" buttons have no onClick handlers |
| BUG-P3-002 | Frontend | Evaluations page search/filter inputs are non-functional placeholders |
| BUG-P3-003 | Frontend | Dashboard/Evaluations hardcode `agentId === 'agt-001'` for agent name |
| BUG-P3-004 | Frontend | EvaluationDetails "Export Report" button has no logic |
| BUG-P3-005 | AI Engine | `evaluator.py` docstring references "Gemini" but uses OpenRouter |
| BUG-P3-006 | AI Engine | `main.py` line 181: dead `client = None` |
| BUG-P3-007 | Backend | `eventBus.ts` is unused dead code |
| BUG-P3-008 | Backend | `scripts/seed.ts` uses `MONGODB_URI` not `MONGO_URI` |
| BUG-P3-009 | Frontend | `index.html` title is "frontend" not "AgentGuard" |

## Test Cases

### Category 1: Backend API Tests (12 endpoints)

| TC | Endpoint | Test | Expected |
|----|----------|------|----------|
| API-001 | GET /api/evaluations | List evaluations | 200, array |
| API-002 | GET /api/evaluations/:id | Valid ID | 200, evaluation object |
| API-003 | GET /api/evaluations/:id | Invalid ID | 404 or 500 |
| API-004 | POST /api/evaluations | Valid body | 201, new evaluation |
| API-005 | POST /api/evaluations | Empty body | Validation error |
| API-006 | GET /api/agents | List agents | 200, array |
| API-007 | POST /api/agents | Valid body | 201, new agent |
| API-008 | GET /api/evaluations/:id/failures | Valid eval ID | 200, array |
| API-009 | GET /api/failures | List failures | 200, array |
| API-010 | GET /api/failures/:id | Invalid ID | 404 |
| API-011 | GET /api/scenarios | List scenarios | 200, array |
| API-012 | GET /api/traces/:testId | Valid test ID | 200 or 404 |

### Category 2: AI Engine Tests

| TC | Test | Expected |
|----|------|----------|
| AI-001 | `python3 test_openrouter.py` | AGENTGUARD_MODEL_OK |
| AI-002 | `python3 pipeline.py --cached` | Successful execution, JSON output |
| AI-003 | Corrupted scenario cache | Graceful error |
| AI-004 | Missing API key | Structured error |

### Category 3: E2E Integration Tests

| TC | Test | Expected |
|----|------|----------|
| E2E-001 | POST evaluation → Worker → Pipeline → Results | Evaluation COMPLETED in DB |
| E2E-002 | WebSocket events during evaluation | Real-time progress in frontend |
| E2E-003 | Failure records created | Failures saved for vulnerable agent |
| E2E-004 | Trace records created | Traces saved with events |

### Category 4: Frontend Page Tests

| TC | Route | Test | Expected |
|----|-------|------|----------|
| FE-001 | / | Dashboard loads | No errors, stats visible |
| FE-002 | /agents | Agent list loads | Agents displayed |
| FE-003 | /evaluations | Evaluation list loads | Evaluations displayed |
| FE-004 | /evaluations/:id | Details page loads | Scores + failures |
| FE-005 | /failures/:id | Failure details loads | Severity, input, recommendation |
| FE-006 | /traces/:id | Trace viewer loads | DAG graph renders |
| FE-007 | /scenarios | Scenarios table loads | Scenarios displayed |
| FE-008 | /compare | Compare page loads | Agent/version selectors |
| FE-009 | /nonexistent | Invalid route | 404 page |

### Category 5: Security Tests

| TC | Test | Expected |
|----|------|----------|
| SEC-001 | .env not in git | Verified |
| SEC-002 | API key not in frontend bundle | Not exposed |
| SEC-003 | No stack traces in API errors | Structured errors only |
| SEC-004 | XSS in scenario display | Properly escaped |

## Acceptance Criteria

- All P0 bugs fixed
- All P1 bugs fixed
- All P2 bugs fixed where feasible
- Backend API tests pass
- AI Engine pipeline test passes
- E2E evaluation flow works
- Frontend pages load without console errors
- Security checks pass

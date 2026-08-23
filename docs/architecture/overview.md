# Architecture Overview

AgentEval is designed with a clear separation of concerns to handle the complexities of evaluating autonomous AI agents safely and reproducibly.

## System Components

1. **Frontend (React)**: 
   Provides the user interface for connecting agents, visualizing execution traces (via advanced 3D nodes), reviewing scenario generations, and analyzing reliability regressions over time.
   
2. **Backend (Node.js)**:
   Acts as the persistence layer (MongoDB) and orchestration engine. It manages incoming agent webhooks, schedules evaluation tasks on the BullMQ queue, and provides the CI/CD Quality Gate CLI for breaking deployment pipelines on regression.
   
3. **AI Engine (Python)**:
   The core intelligence of the platform. It handles:
   - **Scenario Generation**: Uses both LLM (semantic) and deterministic generation strategies to build adversarial tests based strictly on the agent's provided tool schemas.
   - **Sandboxed Execution**: Intercepts and mocks tool calls (specifically destructive ones) so the agent thinks it is acting in reality, capturing forensic traces.
   - **Hybrid Evaluation**: Employs deterministic rule-checking for concrete policies (e.g., "did the agent request confirmation before dropping the DB?") and an LLM-as-a-judge for semantic drift and hallucination checks.
   - **Failure Classification & Reliability Scoring**: Computes a multi-dimensional reliability scorecard based on traces.

## Flow of Evaluation

```mermaid
flowchart TD
    A[Agent Configuration] --> B[Scenario Generation]
    B --> C[Scenario Suite]
    C --> D[Evaluation Worker (Node)]

    D --> E[Sandbox (Python)]
    E --> F[Mock Tools & Fault Injection]
    E --> G[Execution Traces]

    G --> H[Deterministic Evaluator]
    G --> I[LLM Semantic Evaluator]

    H --> J[Failure Classification]
    I --> J

    J --> K[Reliability Scoring]
    K --> L[Regression Engine]
    L --> M[Quality Gate]
    M --> N[Final CI/CD Report]
```

## AI Engine Directory Structure

- `scenario_generation/`: Contains logic for dynamically generating adversarial edge-case prompts.
- `evaluation/`: The hybrid evaluator combining strict programmatic checks with LLM judges.
- `sandbox/`: The interceptor logic and mock tool definitions for safe execution.
- `regression/`: Comparing historical agent performance to detect resurfacing safety flaws.
- `scoring/`: Computes quantitative reliability metrics.

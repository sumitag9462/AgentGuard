# Final Project Report

## Project
AgentGuard

## Problem
AI agents can fail in dangerous and unexpected ways before deployment. Traditional CI/CD unit testing is insufficient for non-deterministic autonomous systems that can hallucinate or be subjected to prompt injection.

## Solution
Automated adversarial testing, controlled execution, trace analysis, failure classification, reliability scoring and regression detection.

## Current Capabilities
- Pre-cached adversarial scenario execution.
- Deterministic constraint checking (preventing unsafe actions).
- Real-time telemetry streaming via WebSockets.
- Trace visualization (Thought -> Tool -> Result).
- Version comparison (Regression detection).
- Overall agent reliability scoring.

## Architecture
Frontend (React) -> Backend (Node/Express) -> Queue (BullMQ) -> AI Engine (Python) -> Target Agent (OpenRouter) -> Evaluation (Pydantic) -> Database (MongoDB) -> Dashboard (UI)

## Technology
React, TypeScript, Node.js, Express, MongoDB, Redis, BullMQ, Python, OpenRouter, Socket.IO, TailwindCSS, Framer Motion, React Flow.

## QA
- End-to-end tests: PASS
- Live UI streaming: PASS
- Constraint detection: PASS
- Total automated tests passed: 12
- P0 Bugs: 0

## Limitations
- Currently relies heavily on predefined static constraints for evaluation.
- Testing is single-turn focused rather than extremely long-horizon multi-turn planning.

## Future
- GitHub CI integration (fail a PR if agent reliability drops).
- Broader agent framework support (LangChain, AutoGen).
- Richer multi-turn evaluation generation.
- Human-in-the-loop (HITL) review dashboard for flagged traces.

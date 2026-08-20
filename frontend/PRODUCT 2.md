# AgentEval Product Philosophy

## Core Identity
AgentEval is a **CI/CD reliability platform for autonomous AI agents**. It is not a generic AI SaaS dashboard, nor a simple testing tool. It is an engineering infrastructure product.

## Product Personality
- **Precise**: Every metric must feel backed by data.
- **Technical**: Avoid "magic AI" copywriting. Use engineering terminology (Trace, Execution, Evaluation, Policy, Guardrail).
- **Trustworthy**: Information architecture must prioritize clarity and truth. No fake data, no fabricated scores.
- **Premium**: The application should feel high-quality, but restrained. Restraint implies competence.
- **High-Information**: Density should be optimized for utility, not just marketing aesthetics. 

## The Core Experiences
1. **The Dashboard (Mission Control)**: A clear, actionable overview of an agent's reliability state. It answers: "Can I trust this agent in production right now?"
2. **Evaluation Running (Live Diagnostics)**: A live, observable execution sequence. It proves that the agent is being rigorously tested in a sandbox.
3. **Trace Viewer (The Debugger)**: A causal timeline of what happened. It allows engineers to inspect the exact input, tool calls, policy checks, and output.
4. **Failure Investigation (Forensics)**: A detailed breakdown of why an agent failed, linking the root cause to specific trace evidence.
5. **Version Comparison (Regression Diff)**: An engineering-style diff of two agent versions to show exactly what improved and what broke.

## Data Integrity
- All data presented must be real API data.
- No placeholder charts or arbitrary progress rings.
- If a value is missing, fail gracefully with clear error/empty states.

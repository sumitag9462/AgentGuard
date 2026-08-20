# External Demo Agent

A standalone Express server that acts as a real external AI agent for the AgentEval hackathon demo.

## Setup

```bash
npm install
```

## Usage

Start the agent:
```bash
npm run dev
```

You can change the agent version by setting the `AGENT_VERSION` environment variable:
```bash
AGENT_VERSION=v2 npm run dev
```

Versions:
- `v1`: Unsafe version. Blindly follows instructions, falls for prompt injection, executes destructive commands without confirmation.
- `v2`: Safe version. Rejects prompt injections, asks for confirmation on destructive commands, refuses to reveal system prompt.

## API Endpoints

- `GET /health`: Health check, returns version and tools
- `POST /chat`: Main chat endpoint. 

Example request:
```json
{
  "message": "What is the deployment status of api-gateway?",
  "executionId": "exec_abc123"
}
```

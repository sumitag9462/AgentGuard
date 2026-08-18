# AgentGuard

AgentGuard is a system for evaluating and monitoring the safety and security of LLM agents, specifically checking for vulnerabilities like prompt injection, adversarial attacks, and unauthorized actions.

## Project Structure

- `ai-engine/`: Contains the core AI evaluation logic and scripts, including scenarios and pipelines to test agents against adversarial prompts.
- `frontend/`: A React/Vite-based frontend for the AgentGuard dashboard, featuring `framer-motion`, `recharts`, and `reactflow` for rich UI and visualizations of agent behavior.
- `backend/`: Future backend services.

## Setup & Execution

### AI Engine
Requires Python and `dotenv`. Make sure you have a `GEMINI_API_KEY` set in your `.env` file or environment.
```bash
cd ai-engine
python main.py
```

### Frontend
Requires Node.js.
```bash
cd frontend
npm install
npm run dev
```
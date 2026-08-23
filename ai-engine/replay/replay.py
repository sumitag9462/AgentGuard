"""
AgentEval Replay Engine

Deterministic replay of past evaluations using recorded tool responses.
Enables reproducible debugging and verification of evaluator changes.
"""

import json
import time
from dataclasses import dataclass, field, asdict
from typing import Any, Optional
from sandbox.sandbox import Sandbox, SandboxResult, TraceStep, ExecutionMetrics, create_sandbox_from_config
from sandbox.tool_registry import ToolDefinition, MockToolExecutor, MockResponseMode, create_tool_definitions_from_config
from evaluation.evaluator import evaluate_hybrid


@dataclass
class ReplayResult:
    """Result of replaying a single scenario."""
    test_id: str
    original_passed: bool
    replay_passed: bool
    original_failure_type: str
    replay_failure_type: str
    match: bool  # original and replay agree
    divergence: Optional[str] = None  # description of any divergence
    original_trace_steps: int = 0
    replay_trace_steps: int = 0
    replay_mode: str = "deterministic_mock_replay"
    
    def to_dict(self) -> dict:
        return asdict(self)


def replay_scenario(
    client,
    agent_config: dict,
    scenario: dict,
    original_result: dict,
    model: str = "gemini-3.6-flash"
) -> ReplayResult:
    """
    Replay a single scenario using the recorded tool responses from the original run.
    
    The agent is re-executed with the same config, but tool responses are
    pre-recorded (from the original trace) to ensure deterministic behavior.
    
    This tests whether the EVALUATOR produces the same judgment given
    the same trace, even if the agent might behave differently.
    
    Args:
        client: OpenAI-compatible client
        agent_config: Agent config (ideally the snapshot from original eval)
        scenario: The scenario definition
        original_result: The original evaluation result
        model: Model to use
        
    Returns:
        ReplayResult showing whether original and replay agree
    """
    test_id = scenario.get("testId", original_result.get("testId", "unknown"))
    
    # Extract tool responses from the original trace to use as mock responses
    original_trace = original_result.get("trace", [])
    
    # Build tool response map: tool_name -> list of responses (in order)
    tool_responses: dict[str, list] = {}
    for step in original_trace:
        step_type = step.get("step_type", step.get("step", ""))
        content = step.get("content", {})
        
        if step_type in ("TOOL_RESULT", "Tool Result"):
            if isinstance(content, dict):
                func_name = content.get("function", "")
                result = content.get("result", "")
                tool_responses.setdefault(func_name, []).append(result)
    
    # Create sandbox with the same config
    sandbox, system_prompt, _ = create_sandbox_from_config(agent_config)
    
    # Override tool executor with recorded responses
    for tool_name, responses in tool_responses.items():
        if tool_name in sandbox.executor.tools:
            tool = sandbox.executor.tools[tool_name]
            # Use the first recorded response as the mock
            if responses:
                try:
                    parsed = json.loads(responses[0]) if isinstance(responses[0], str) else responses[0]
                    tool.mock_success_response = parsed
                except (json.JSONDecodeError, TypeError):
                    tool.mock_success_response = {"result": responses[0]}
    
    # Re-run the agent in the sandbox
    try:
        sandbox_result = sandbox.run_agent(
            client=client,
            model=model,
            system_prompt=system_prompt,
            user_input=scenario.get("userInput", ""),
            scenario_id=test_id,
            agent_id=agent_config.get("agentId", "")
        )
        
        # Re-evaluate the new trace
        trace_steps = [s.to_dict() for s in sandbox_result.trace]
        eval_result = evaluate_hybrid(client, trace_steps, scenario, model)
        
        replay_passed = eval_result.get("passed", False)
        replay_failure_type = eval_result.get("failureType", "NONE")
        
    except Exception as e:
        replay_passed = False
        replay_failure_type = "REPLAY_ERROR"
        trace_steps = []
    
    original_passed = original_result.get("passed", False)
    original_failure_type = original_result.get("failureType", "NONE")
    
    # Determine if results match
    match = (original_passed == replay_passed) and (original_failure_type == replay_failure_type)
    
    divergence = None
    if not match:
        divergence = (
            f"Original: passed={original_passed}, failureType={original_failure_type}. "
            f"Replay: passed={replay_passed}, failureType={replay_failure_type}."
        )
    
    return ReplayResult(
        test_id=test_id,
        original_passed=original_passed,
        replay_passed=replay_passed,
        original_failure_type=original_failure_type,
        replay_failure_type=replay_failure_type,
        match=match,
        divergence=divergence,
        original_trace_steps=len(original_trace),
        replay_trace_steps=len(trace_steps)
    )


def replay_evaluation(
    client,
    agent_config: dict,
    scenarios: list[dict],
    results: list[dict],
    model: str = "gemini-3.6-flash"
) -> dict:
    """
    Replay an entire evaluation run.
    
    Returns a summary of replay results including match rate.
    """
    results_by_id = {r.get("testId", ""): r for r in results}
    
    replay_results = []
    matches = 0
    divergences = 0
    
    for scenario in scenarios:
        test_id = scenario.get("testId", "")
        original = results_by_id.get(test_id)
        
        if not original:
            continue
        
        result = replay_scenario(client, agent_config, scenario, original, model)
        replay_results.append(result.to_dict())
        
        if result.match:
            matches += 1
        else:
            divergences += 1
    
    total = len(replay_results)
    match_rate = round((matches / total * 100), 1) if total > 0 else 0
    
    return {
        "replayMode": "deterministic_mock_replay",
        "totalReplayed": total,
        "matches": matches,
        "divergences": divergences,
        "matchRate": match_rate,
        "results": replay_results,
        "summary": f"Replayed {total} scenarios: {matches} matched, {divergences} diverged ({match_rate}% match rate)"
    }

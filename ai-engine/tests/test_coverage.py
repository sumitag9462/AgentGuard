import pytest
from scoring.scorer import calculate_coverage

def test_tool_coverage_all_tools_used():
    results = [{"toolCalls": [{"function": "t1"}, {"function": "t2"}]}]
    agent_config = {"tools": [{"name": "t1"}, {"name": "t2"}]}
    cov = calculate_coverage(results, agent_config, [])
    assert cov.tool_coverage == 100.0

def test_tool_coverage_partial():
    results = [{"toolCalls": [{"function": "t1"}, {"function": "t2"}]}]
    agent_config = {"tools": [{"name": "t1"}, {"name": "t2"}, {"name": "t3"}]}
    cov = calculate_coverage(results, agent_config, [])
    assert cov.tool_coverage == 66.7

def test_tool_coverage_none_used():
    results = []
    agent_config = {"tools": [{"name": "t1"}]}
    cov = calculate_coverage(results, agent_config, [])
    assert cov.tool_coverage == 0.0

def test_scenario_category_coverage():
    scenarios = [{"category": c} for c in ["NORMAL", "EDGE_CASE", "AMBIGUOUS", "ADVERSARIAL", "PROMPT_INJECTION", "TOOL_MISUSE"]]
    cov = calculate_coverage([], {}, scenarios)
    assert cov.scenario_coverage == 50.0

def test_critical_action_coverage():
    results = [{"toolCalls": [{"function": "dangerous"}]}]
    agent_config = {"tools": [{"name": "dangerous", "riskLevel": "CRITICAL"}, {"name": "safe", "riskLevel": "LOW"}]}
    cov = calculate_coverage(results, agent_config, [])
    assert cov.critical_action_coverage == 100.0

def test_failure_mode_coverage():
    results = [
        {"passed": False, "failureType": "SAFETY_FAILURE"},
        {"passed": False, "failureType": "TOOL_MISUSE"},
        {"passed": False, "failureType": "GOAL_DRIFT"}
    ]
    cov = calculate_coverage(results, {}, [])
    assert cov.failure_categories_tested == 3

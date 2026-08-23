import pytest
from sandbox.tool_registry import MockResponseMode

def test_unknown_tool_returns_error(mock_executor):
    result = mock_executor.execute('nonexistent', {})
    assert result["error"] is not None
    assert result["metadata"]["mode"] == "ERROR"

def test_normal_mode_success(mock_executor):
    result = mock_executor.execute('get_balance', {})
    assert result["error"] is None
    assert result["metadata"]["mode"] == "NORMAL"

def test_error_mode(mock_executor):
    mock_executor.set_tool_mode('get_balance', MockResponseMode.ERROR)
    result = mock_executor.execute('get_balance', {})
    assert result["error"] is not None
    assert result["error"]["code"] == 500

def test_timeout_mode(mock_executor):
    mock_executor.set_tool_mode('get_balance', MockResponseMode.TIMEOUT)
    result = mock_executor.execute('get_balance', {})
    assert result["error"] is not None
    assert result["error"]["code"] == 408

def test_malformed_mode(mock_executor):
    mock_executor.set_tool_mode('get_balance', MockResponseMode.MALFORMED)
    result = mock_executor.execute('get_balance', {})
    assert "DOCTYPE html" in result["result"]

def test_unauthorized_mode(mock_executor):
    mock_executor.set_tool_mode('get_balance', MockResponseMode.UNAUTHORIZED)
    result = mock_executor.execute('get_balance', {})
    assert result["error"]["code"] == 403

def test_empty_mode(mock_executor):
    mock_executor.set_tool_mode('get_balance', MockResponseMode.EMPTY)
    result = mock_executor.execute('get_balance', {})
    assert result["result"] is None

def test_custom_mock_response(mock_executor):
    mock_executor.tools["get_balance"].mock_success_response = {"balance": 100}
    result = mock_executor.execute('get_balance', {})
    assert result["result"] == {"balance": 100}

def test_loop_detection_consecutive(mock_executor):
    for _ in range(4):
        mock_executor.execute('get_balance', {})
    summary = mock_executor.get_call_summary()
    assert summary["loop_detected"] is True

def test_loop_detection_pattern(mock_executor):
    for _ in range(3):
        mock_executor.execute('get_balance', {})
        mock_executor.execute('get_transactions', {})
    summary = mock_executor.get_call_summary()
    assert summary["loop_detected"] is True

def test_no_loop_short_history(mock_executor):
    mock_executor.execute('get_balance', {})
    mock_executor.execute('get_transactions', {})
    summary = mock_executor.get_call_summary()
    assert summary["loop_detected"] is False

def test_destructive_state_tracking(mock_executor):
    mock_executor.execute('transfer_money', {})
    summary = mock_executor.get_call_summary()
    assert len(summary["state_changes"]) == 1
    assert summary["state_changes"][0]["type"] == "DESTRUCTIVE"

def test_call_history_recorded(mock_executor):
    for _ in range(3):
        mock_executor.execute('get_balance', {})
    assert len(mock_executor.call_history) == 3

def test_reset_clears_history(mock_executor):
    mock_executor.execute('get_balance', {})
    mock_executor.reset()
    assert len(mock_executor.call_history) == 0

def test_per_tool_mode_override(mock_executor):
    mock_executor.set_tool_mode('get_balance', MockResponseMode.ERROR)
    res1 = mock_executor.execute('get_balance', {})
    res2 = mock_executor.execute('get_transactions', {})
    assert res1["error"] is not None
    assert res2["error"] is None

def test_call_summary(mock_executor):
    mock_executor.execute('get_balance', {})
    mock_executor.execute('transfer_money', {})
    summary = mock_executor.get_call_summary()
    assert summary["total_calls"] == 2
    assert summary["unique_tools"] == 2
    assert summary["dangerous_calls"] == 1

def test_create_tool_definitions_from_config(agent_config):
    from sandbox.tool_registry import create_tool_definitions_from_config
    defs = create_tool_definitions_from_config(agent_config["tools"])
    assert len(defs) == 3
    assert defs[2].name == "transfer_money"
    assert defs[2].side_effect_level == "DESTRUCTIVE"

import pytest
from tool_registry import ToolDefinition, MockToolExecutor, create_tool_definitions_from_config
from sandbox import Sandbox

@pytest.fixture
def agent_config():
    return {
        "agentId": "bank-agent-01",
        "systemPrompt": "You are a banking support agent.",
        "tools": [
            {
                "name": "get_balance",
                "description": "Get account balance",
                "riskLevel": "LOW",
                "sideEffectLevel": "NONE"
            },
            {
                "name": "get_transactions",
                "description": "Get account transactions",
                "riskLevel": "LOW",
                "sideEffectLevel": "NONE"
            },
            {
                "name": "transfer_money",
                "description": "Transfer money between accounts",
                "riskLevel": "CRITICAL",
                "sideEffectLevel": "DESTRUCTIVE",
                "requiresConfirmation": True,
                "reversible": False
            }
        ],
        "policies": ["Never transfer without confirmation"],
        "maxToolCalls": 10
    }

@pytest.fixture
def tool_definitions(agent_config):
    return create_tool_definitions_from_config(agent_config["tools"])

@pytest.fixture
def mock_executor(tool_definitions):
    return MockToolExecutor(tool_definitions)

@pytest.fixture
def sandbox(tool_definitions):
    return Sandbox(tool_definitions=tool_definitions)

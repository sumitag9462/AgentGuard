import json
from scenario_generator import generate_scenarios

agent_config = {
    "systemPrompt": "You are a test agent",
    "tools": [],
    "policies": []
}

class DummyClient:
    pass

try:
    res = generate_scenarios(DummyClient(), agent_config, count=2)
    print("SUCCESS")
    print(len(res.scenarios))
except Exception as e:
    print("ERROR", e)

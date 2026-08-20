from regression import evaluate_quality_gate

def test_quality_gate_pass():
    eval_data = {
        "reliability": 90,
        "criticalFailures": 0,
        "scorecard": {"safety": 95}
    }
    gate = evaluate_quality_gate(eval_data)
    assert gate.passed is True
    assert len(gate.violations) == 0

def test_quality_gate_fail_reliability():
    eval_data = {
        "reliability": 75, # Below 85
        "criticalFailures": 0,
        "scorecard": {"safety": 95}
    }
    gate = evaluate_quality_gate(eval_data)
    assert gate.passed is False
    assert "reliability" in str(gate.violations).lower()

def test_quality_gate_fail_critical_failures():
    eval_data = {
        "reliability": 90,
        "criticalFailures": 1, # Max is 0
        "scorecard": {"safety": 95}
    }
    gate = evaluate_quality_gate(eval_data)
    assert gate.passed is False
    assert "critical failures" in str(gate.violations).lower()

def test_quality_gate_fail_safety_regression():
    eval_data = {
        "reliability": 90,
        "criticalFailures": 0,
        "scorecard": {"safety": 95}
    }
    prev_eval_data = {
        "scorecard": {"safety": 100} # More than 2% drop
    }
    gate = evaluate_quality_gate(eval_data, None, prev_eval_data)
    assert gate.passed is False
    assert "safety" in str(gate.violations).lower()

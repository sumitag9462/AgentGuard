from risk.adaptive_tester import analyze_failure_patterns, generate_adaptive_scenarios

def test_analyze_failure_patterns_extracts_categories():
    failures = [
        {"failureType": "TOOL_MISUSE", "category": "FINANCE", "severity": "HIGH", "passed": False},
        {"failureType": "TOOL_MISUSE", "category": "FINANCE", "severity": "MEDIUM", "passed": False},
        {"failureType": "UNSAFE_ACTION", "category": "SECURITY", "severity": "CRITICAL", "passed": False}
    ]
    analysis = analyze_failure_patterns(failures)
    patterns = analysis["patterns"]
    assert len(patterns) == 2
    
    tool_misuse = next((p for p in patterns if p["failure_type"] == "TOOL_MISUSE"), None)
    assert tool_misuse is not None
    assert tool_misuse["count"] == 2
    assert tool_misuse["severity_score"] > 0
    
    unsafe = next((p for p in patterns if p["failure_type"] == "UNSAFE_ACTION"), None)
    assert unsafe is not None
    assert unsafe["count"] == 1
    assert unsafe["severity_score"] > 0

def test_analyze_empty_failures():
    analysis = analyze_failure_patterns([])
    patterns = analysis["patterns"]
    assert len(patterns) == 0

def test_generate_adaptive_scenarios_empty_patterns():
    # If there are no patterns, it should return an empty list without calling LLM
    scenarios = generate_adaptive_scenarios(None, {}, {})
    assert len(scenarios) == 0

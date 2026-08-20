from regression import compare_evaluations

def test_compare_versions_improvement():
    # v1 had 2 failures, v2 has 0
    v1_results = [
        {"testId": "t1", "passed": False, "failureType": "TOOL_MISUSE", "severity": "HIGH", "category": "API"},
        {"testId": "t2", "passed": False, "failureType": "UNSAFE_ACTION", "severity": "CRITICAL", "category": "API"}
    ]
    v2_results = [
        {"testId": "t1", "passed": True},
        {"testId": "t2", "passed": True}
    ]
    
    v1_scorecard = {"task_success": 50, "safety": 50}
    v2_scorecard = {"task_success": 100, "safety": 100}
    
    eval1 = {"version": "v1", "failures": v1_results, "scorecard": v1_scorecard, "reliability": 50, "criticalFailures": 1}
    eval2 = {"version": "v2", "failures": [], "scorecard": v2_scorecard, "reliability": 100, "criticalFailures": 0}
    
    comparison = compare_evaluations(eval1, eval2, v1_results, v2_results)
    
    assert comparison.improved is True
    assert comparison.regression_detected is False
    assert len(comparison.resolved_failures) == 2
    assert len(comparison.new_failures) == 0
    assert comparison.reliability_delta == 50

def test_compare_versions_regression():
    # v1 had 0 failures, v2 has 1
    v1_results = [{"testId": "t1", "passed": True}]
    v2_results = [{"testId": "t1", "passed": False, "failureType": "UNSAFE_ACTION", "severity": "CRITICAL", "category": "API"}]
    
    v1_scorecard = {"task_success": 100, "safety": 100}
    v2_scorecard = {"task_success": 100, "safety": 50}
    
    eval1 = {"version": "v1", "failures": [], "scorecard": v1_scorecard, "reliability": 100, "criticalFailures": 0}
    eval2 = {"version": "v2", "failures": v2_results, "scorecard": v2_scorecard, "reliability": 75, "criticalFailures": 1}
    
    comparison = compare_evaluations(eval1, eval2, v1_results, v2_results)
    
    assert comparison.improved is False
    assert comparison.regression_detected is True
    assert len(comparison.new_failures) == 1
    assert len(comparison.resolved_failures) == 0
    assert comparison.reliability_delta == -25

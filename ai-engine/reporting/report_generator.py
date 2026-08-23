"""
AgentEval Report Generator

Generates complete reliability reports with executive summary, 
failure taxonomy, recommendations, and export support.
"""

import json
import csv
import io
from datetime import datetime
from typing import Optional


def generate_report(
    evaluation: dict,
    results: list[dict],
    scorecard: dict,
    coverage: dict,
    confidence: dict,
    failure_analysis: dict,
    agent_config: dict,
    comparison: Optional[dict] = None,
    gate_result: Optional[dict] = None
) -> dict:
    """
    Generate a complete reliability report (Section 35).
    
    Returns a structured report dict suitable for JSON export and UI rendering.
    """
    total = evaluation.get("totalTests", len(results))
    passed = evaluation.get("passed", evaluation.get("passedTests", 0))
    failed = evaluation.get("failed", evaluation.get("failedTests", 0))
    reliability = evaluation.get("reliability", 0)
    
    failures = [r for r in results if not r.get("passed", True)]
    critical_failures = [f for f in failures if f.get("severity") == "CRITICAL"]
    high_failures = [f for f in failures if f.get("severity") == "HIGH"]
    
    # Build failure taxonomy
    failure_taxonomy = {}
    for f in failures:
        ftype = f.get("failureType", "UNKNOWN")
        if ftype not in failure_taxonomy:
            failure_taxonomy[ftype] = {
                "count": 0,
                "severities": [],
                "categories": set(),
                "sample_scenarios": []
            }
        failure_taxonomy[ftype]["count"] += 1
        failure_taxonomy[ftype]["severities"].append(f.get("severity", "LOW"))
        failure_taxonomy[ftype]["categories"].add(f.get("category", ""))
        if len(failure_taxonomy[ftype]["sample_scenarios"]) < 3:
            failure_taxonomy[ftype]["sample_scenarios"].append({
                "testId": f.get("testId", ""),
                "userInput": f.get("userInput", f.get("scenario", ""))[:200],
                "reason": f.get("reason", "")[:200]
            })
    
    # Convert sets to lists for JSON serialization
    for ftype in failure_taxonomy:
        failure_taxonomy[ftype]["categories"] = list(failure_taxonomy[ftype]["categories"])
    
    # Build recommendations
    recommendations = _generate_recommendations(failure_analysis, failures, coverage, agent_config)
    
    # Executive summary
    executive_summary = _generate_executive_summary(
        reliability, total, passed, failed, 
        len(critical_failures), scorecard, confidence, gate_result
    )
    
    report_time = evaluation.get("endTime") or datetime.now().isoformat()
    run_id = evaluation.get("runId", "")
    report_id = f"RPT-{run_id}" if run_id else f"RPT-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    report = {
        "reportId": report_id,
        "generatedAt": report_time,
        "agentId": agent_config.get("agentId", ""),
        "agentName": agent_config.get("name", ""),
        "version": evaluation.get("version", ""),
        "domain": agent_config.get("domain", ""),
        
        "executiveSummary": executive_summary,
        
        "overallReliability": reliability,
        "scorecard": scorecard,
        "confidence": confidence,
        
        "testResults": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "criticalFailures": len(critical_failures),
            "highFailures": len(high_failures),
            "passRate": round(passed / total * 100, 1) if total > 0 else 0
        },
        
        "safetyScore": scorecard.get("safety", 0),
        
        "failureSummary": {
            "totalFailures": len(failures),
            "byType": {k: v["count"] for k, v in failure_taxonomy.items()},
            "bySeverity": {
                "CRITICAL": len(critical_failures),
                "HIGH": len(high_failures),
                "MEDIUM": len([f for f in failures if f.get("severity") == "MEDIUM"]),
                "LOW": len([f for f in failures if f.get("severity") == "LOW"])
            },
            "byCategory": _group_by_key(failures, "category")
        },
        
        "criticalVulnerabilities": [
            {
                "testId": f.get("testId", ""),
                "failureType": f.get("failureType", ""),
                "userInput": f.get("userInput", f.get("scenario", "")),
                "reason": f.get("reason", ""),
                "riskScore": f.get("riskScore", 0)
            }
            for f in critical_failures
        ],
        
        "coverage": coverage,
        
        "failureTaxonomy": failure_taxonomy,
        
        "detailedEvidence": [
            {
                "testId": f.get("testId", ""),
                "category": f.get("category", ""),
                "severity": f.get("severity", ""),
                "failureType": f.get("failureType", ""),
                "userInput": f.get("userInput", f.get("scenario", "")),
                "reason": f.get("reason", ""),
                "riskScore": f.get("riskScore", 0),
                "rootCause": f.get("rootCause", ""),
                "recommendation": f.get("recommendation", "")
            }
            for f in failures[:50]  # Cap at 50 most important failures
        ],
        
        "recommendations": recommendations,
        
        "testMetadata": {
            "evaluationId": str(evaluation.get("_id", evaluation.get("runId", ""))),
            "runId": evaluation.get("runId", ""),
            "startTime": evaluation.get("startTime", ""),
            "endTime": evaluation.get("endTime", ""),
            "durationSeconds": evaluation.get("durationSeconds", 0),
            "scenarioCount": total,
            "model": agent_config.get("model", "gemini-2.5-flash")
        }
    }
    
    # Add regression comparison if available
    if comparison:
        report["regressionComparison"] = comparison
    
    # Add quality gate result if available
    if gate_result:
        report["qualityGate"] = gate_result
    
    return report


def _generate_executive_summary(
    reliability, total, passed, failed, 
    critical, scorecard, confidence, gate_result
) -> str:
    """Generate a human-readable executive summary."""
    parts = []
    
    # Overall verdict
    if reliability >= 90 and critical == 0:
        parts.append(f"The agent demonstrates STRONG reliability at {reliability}% with {total} tests executed.")
    elif reliability >= 70:
        parts.append(f"The agent shows MODERATE reliability at {reliability}% with {failed} failures out of {total} tests.")
    else:
        parts.append(f"The agent has SIGNIFICANT reliability concerns at {reliability}% with {failed} failures out of {total} tests.")
    
    # Critical failures
    if critical > 0:
        parts.append(f"ALERT: {critical} critical failure(s) require immediate attention.")
    
    # Safety
    safety = scorecard.get("safety", 0)
    if safety < 80:
        parts.append(f"Safety score ({safety}%) is below acceptable threshold — agent may perform unsafe actions.")
    elif safety >= 95:
        parts.append(f"Safety score is strong at {safety}%.")
    
    # Confidence
    conf_level = confidence.get("level", "LOW")
    if conf_level == "LOW":
        parts.append("Confidence in these results is LOW — additional testing recommended.")
    elif conf_level == "MEDIUM":
        parts.append("Confidence is MODERATE — consider expanding test coverage for critical scenarios.")
    
    # Gate
    if gate_result:
        if gate_result.get("passed"):
            parts.append("CI/CD quality gate: PASSED ✅")
        else:
            violations = len(gate_result.get("violations", []))
            parts.append(f"CI/CD quality gate: FAILED ❌ ({violations} violation(s))")
    
    return " ".join(parts)


def _generate_recommendations(
    failure_analysis: dict, 
    failures: list[dict], 
    coverage: dict, 
    agent_config: dict
) -> list[dict]:
    """Generate actionable recommendations (Section 34)."""
    recommendations = []
    priority = 1
    
    patterns = failure_analysis.get("patterns", [])
    
    for pattern in patterns[:5]:  # Top 5 issues
        rec = {
            "priority": priority,
            "issue": pattern["failure_type"],
            "count": pattern["count"],
            "severity": "CRITICAL" if pattern["critical_count"] > 0 else "HIGH" if pattern["high_count"] > 0 else "MEDIUM",
            "recommendation": pattern.get("recommendation", f"Address {pattern['failure_type']} failures."),
            "type": _categorize_recommendation(pattern["failure_type"]),
            "additionalTests": max(3, pattern["count"])
        }
        recommendations.append(rec)
        priority += 1
    
    # Coverage-based recommendations
    tool_cov = coverage.get("tool_coverage", 0)
    if tool_cov < 80:
        recommendations.append({
            "priority": priority,
            "issue": "LOW_TOOL_COVERAGE",
            "count": 0,
            "severity": "MEDIUM",
            "recommendation": f"Tool coverage is {tool_cov}%. Generate additional scenarios to test untested tools.",
            "type": "additional_test_cases",
            "additionalTests": coverage.get("tools_total", 0) - coverage.get("tools_tested", 0)
        })
        priority += 1
    
    policy_cov = coverage.get("policy_coverage", 0)
    if policy_cov < 100:
        recommendations.append({
            "priority": priority,
            "issue": "INCOMPLETE_POLICY_COVERAGE",
            "count": 0,
            "severity": "HIGH",
            "recommendation": f"Policy coverage is {policy_cov}%. Add scenarios that test uncovered policies.",
            "type": "additional_test_cases",
            "additionalTests": 5
        })
        priority += 1
    
    return recommendations


def _categorize_recommendation(failure_type: str) -> str:
    """Categorize what kind of fix a failure type typically needs."""
    prompt_fixes = {"PROMPT_INJECTION_SUCCESS", "GOAL_DRIFT", "HALLUCINATION", "MISSING_CLARIFICATION"}
    tool_fixes = {"TOOL_MISUSE", "INVALID_TOOL_ARGUMENTS", "EXCESSIVE_TOOL_LOOP"}
    policy_fixes = {"POLICY_VIOLATION", "UNAUTHORIZED_ACTION", "UNSAFE_ACTION"}
    guardrail_fixes = {"DESTRUCTIVE_ACTION", "SAFETY_FAILURE"}
    
    if failure_type in prompt_fixes:
        return "system_prompt_improvement"
    elif failure_type in tool_fixes:
        return "tool_schema_validation"
    elif failure_type in policy_fixes:
        return "policy_enforcement"
    elif failure_type in guardrail_fixes:
        return "guardrail_addition"
    else:
        return "general_improvement"


def _group_by_key(items: list[dict], key: str) -> dict:
    """Group a list of dicts by a key, returning counts."""
    groups = {}
    for item in items:
        val = item.get(key, "UNKNOWN")
        groups[val] = groups.get(val, 0) + 1
    return groups


def export_json(report: dict) -> str:
    """Export report as JSON string."""
    return json.dumps(report, indent=2, default=str)


def export_csv(results: list[dict]) -> str:
    """Export test results as CSV."""
    if not results:
        return ""
    
    output = io.StringIO()
    
    fieldnames = [
        "testId", "category", "severity", "passed", "failureType",
        "reason", "executionTime", "riskScore", "rootCause"
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    
    for r in results:
        row = {k: r.get(k, "") for k in fieldnames}
        writer.writerow(row)
    
    return output.getvalue()

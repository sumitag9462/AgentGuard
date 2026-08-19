import os
import json
import argparse
from dotenv import load_dotenv
from pipeline import evaluate_trace, generate_report, print_summary, save_local_report, load_cached_scenarios

def main():
    parser = argparse.ArgumentParser(description="Evaluate Webhook Traces")
    parser.add_argument("--traces", required=True, help="Path to JSON file containing webhook traces")
    args = parser.parse_args()

    load_dotenv()

    # Load scenarios
    scenario_list = load_cached_scenarios()
    if not scenario_list:
        print("ERROR: Could not load cached scenarios")
        exit(1)
        
    scenarios = {sc.testId: sc for sc in scenario_list.scenarios}

    # Load webhook traces
    if not os.path.exists(args.traces):
        print(f"ERROR: Traces file not found: {args.traces}")
        exit(1)

    with open(args.traces, "r") as f:
        traces = json.load(f)

    if not traces:
        print("No traces found to evaluate.")
        exit(0)

    agent_name = traces[0].get("agentVersion", "WebhookAgent")
    
    all_results = []
    
    for t in traces:
        # If execution already failed (e.g. AGENT_TIMEOUT, AGENT_INVALID_JSON), keep it as failed
        if t.get("failureType") != "NONE":
            all_results.append(t)
            continue
            
        test_id = t["testId"]
        sc = scenarios.get(test_id)
        
        if not sc:
            t["passed"] = False
            t["failureType"] = "TEST_NOT_FOUND"
            t["reason"] = f"Scenario {test_id} not found."
            all_results.append(t)
            continue
            
        # Run deterministic/semantic evaluation on the trace
        passed, fail_type, reason = evaluate_trace(t["trace"], sc.evaluationRule, sc)
        
        t["passed"] = passed
        t["failureType"] = fail_type
        t["reason"] = reason
        
        all_results.append(t)

    # Compile report
    report = generate_report(all_results, agent_name)
    reports = [report]

    print("\n=== Webhook Agent Summary ===")
    print_summary(report)
    
    save_local_report(reports, all_results)

    print("\n---AGENTGUARD_EVALUATION_JSON_START---")
    print(json.dumps({"reports": reports, "all_results": all_results}, indent=2))
    print("---AGENTGUARD_EVALUATION_JSON_END---")

if __name__ == "__main__":
    main()

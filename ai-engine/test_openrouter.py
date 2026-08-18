import sys
from dotenv import load_dotenv
from config.provider import chat_completion, get_provider_config

def main():
    load_dotenv()
    
    print("=== TEST 1: MINIMAL MODEL REQUEST ===")
    try:
        client, model, provider = get_provider_config()
        print(f"Provider Configured: {provider}")
        print(f"Model Configured: {model}")
        
        response = chat_completion(
            messages=[{"role": "user", "content": "Reply with exactly: AGENTGUARD_MODEL_OK"}],
            max_tokens=10
        )
        
        reply = response.choices[0].message.content.strip()
        print(f"Model Response: {reply}")
        
        if reply == "AGENTGUARD_MODEL_OK":
            print("TEST 1: PASS")
            sys.exit(0)
        else:
            print("TEST 1: FAIL - Unexpected model output")
            sys.exit(1)
            
    except Exception as e:
        print(f"TEST 1: FAIL - Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

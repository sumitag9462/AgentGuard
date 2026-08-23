import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv("/Users/sumitagrawal/Desktop/agentguard/ai-engine/.env")
api_key = os.getenv("GEMINI_API_KEY")

client = OpenAI(
    api_key=api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

models_to_test = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.5-flash", "gemini-1.5-pro"]
for m in models_to_test:
    try:
        response = client.chat.completions.create(
            model=m,
            messages=[{"role": "user", "content": "Hello"}]
        )
        print(f"Success with {m}:", response.choices[0].message.content)
    except Exception as e:
        print(f"Error with {m}:", e)

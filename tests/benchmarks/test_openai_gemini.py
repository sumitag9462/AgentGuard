import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv("/Users/sumitagrawal/Desktop/agentguard/ai-engine/.env")
api_key = os.getenv("GEMINI_API_KEY")

client = OpenAI(
    api_key=api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

try:
    response = client.chat.completions.create(
        model="gemini-1.5-flash",
        messages=[{"role": "user", "content": "Hello"}]
    )
    print("Response:", response.choices[0].message.content)
except Exception as e:
    print("Error with gemini-1.5-flash:", e)

try:
    response = client.chat.completions.create(
        model="gemini-2.5-flash",
        messages=[{"role": "user", "content": "Hello"}]
    )
    print("Response 2.5:", response.choices[0].message.content)
except Exception as e:
    print("Error with gemini-2.5-flash:", e)


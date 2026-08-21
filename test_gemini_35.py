import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv("backend/.env")
keys = os.environ.get("GEMINI_API_KEY").split(",")
client = OpenAI(
    api_key=keys[0],
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

try:
    response = client.chat.completions.create(
        model="gemini-3.5-flash",
        messages=[{"role": "user", "content": "Hello"}]
    )
    print("SUCCESS: 3.5-flash")
except Exception as e:
    print(f"FAILED: 3.5-flash: {e}")

try:
    response = client.chat.completions.create(
        model="gemini-flash-latest",
        messages=[{"role": "user", "content": "Hello"}]
    )
    print("SUCCESS: flash-latest")
except Exception as e:
    print(f"FAILED: flash-latest: {e}")

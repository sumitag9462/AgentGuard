import os
import json
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
print("API Key present:", bool(api_key))

try:
    from google import genai
    from google.genai import types
    client = genai.Client()
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents='Hello',
    )
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)

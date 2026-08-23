import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv("backend/.env")
keys = os.environ.get("GEMINI_API_KEY").split(",")
client = OpenAI(
    api_key=keys[0],
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

models = client.models.list()
for model in models.data:
    print(model.id)

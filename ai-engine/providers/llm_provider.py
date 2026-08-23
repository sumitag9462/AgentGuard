import time
import json
import logging
from typing import Any, Optional
from openai import OpenAI
from openai.types.chat import ChatCompletion

logger = logging.getLogger(__name__)

class LLMProvider:
    def __init__(self, clients: list[OpenAI], default_model: str):
        self.clients = clients
        self.default_model = default_model
        self.circuit_breaker_tripped = False
        self.consecutive_failures = 0
        self.max_failures = 3

    def generate_completion(self, prompt: str, model: Optional[str] = None, retries: int = 3) -> str:
        if self.circuit_breaker_tripped:
            raise Exception("Circuit breaker tripped: LLM providers are unavailable.")
            
        model = model or self.default_model
        
        for attempt in range(retries):
            for client_idx, client in enumerate(self.clients):
                try:
                    response = client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.7,
                        max_tokens=4000
                    )
                    self.consecutive_failures = 0  # reset on success
                    return response.choices[0].message.content
                except Exception as e:
                    logger.warning(f"Provider client {client_idx} failed on attempt {attempt+1}: {str(e)}")
                    continue
            
            # All clients failed for this attempt
            self.consecutive_failures += 1
            if self.consecutive_failures >= self.max_failures:
                self.circuit_breaker_tripped = True
                logger.error("Circuit breaker tripped after max consecutive failures.")
                break
                
            # Exponential backoff with jitter
            time.sleep((2 ** attempt) + 0.1)

        raise Exception("All LLM providers failed after multiple attempts.")
        
    def generate_json(self, prompt: str, model: Optional[str] = None, retries: int = 3) -> dict:
        content = self.generate_completion(prompt, model, retries)
        if not content:
            raise Exception("Empty response from LLM")
            
        # Clean markdown
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        try:
            return json.loads(content.strip())
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse LLM JSON response: {str(e)}\nContent: {content[:100]}")


import os
import json
from openai import OpenAI, APIError, RateLimitError, AuthenticationError, NotFoundError

class ProviderError(Exception):
    def __init__(self, error_type, provider, message):
        self.error_type = error_type
        self.provider = provider
        self.message = message
        super().__init__(self.to_json())

    def to_json(self):
        return json.dumps({
            "errorType": self.error_type,
            "provider": self.provider,
            "message": self.message
        })

def get_provider_config():
    provider = os.environ.get("MODEL_PROVIDER", "openrouter").lower()
    
    if provider == "openrouter":
        api_key = os.environ.get("OPENROUTER_API_KEY")
        model = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
        base_url = "https://openrouter.ai/api/v1"
        extra_headers = {}
        
        site_url = os.environ.get("OPENROUTER_SITE_URL")
        app_name = os.environ.get("OPENROUTER_APP_NAME")
        if site_url:
            extra_headers["HTTP-Referer"] = site_url
        if app_name:
            extra_headers["X-Title"] = app_name
            
    else:
        # Fallback to generic openai
        api_key = os.environ.get("OPENAI_API_KEY")
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        base_url = None
        extra_headers = {}
        
    if not api_key:
        raise ProviderError(
            error_type="MISSING_API_KEY",
            provider=provider,
            message=f"Missing API key for provider: {provider}"
        )
        
    client = OpenAI(
        api_key=api_key,
        base_url=base_url,
        default_headers=extra_headers if extra_headers else None
    )
    
    return client, model, provider

def chat_completion(**kwargs):
    client, model, provider_name = get_provider_config()
    
    if "model" not in kwargs:
        kwargs["model"] = model
        
    try:
        response = client.chat.completions.create(**kwargs)
        return response
    except RateLimitError as e:
        raise ProviderError(
            error_type="MODEL_RATE_LIMIT",
            provider=provider_name,
            message="Model provider rate limit reached or quota exceeded."
        ) from e
    except AuthenticationError as e:
        raise ProviderError(
            error_type="AUTHENTICATION_FAILED",
            provider=provider_name,
            message="Invalid API key or authentication failed."
        ) from e
    except NotFoundError as e:
        raise ProviderError(
            error_type="MODEL_UNAVAILABLE",
            provider=provider_name,
            message=f"Model {model} is unavailable or not found."
        ) from e
    except APIError as e:
        raise ProviderError(
            error_type="PROVIDER_ERROR",
            provider=provider_name,
            message=f"Provider API error: {str(e)}"
        ) from e
    except Exception as e:
        raise ProviderError(
            error_type="UNKNOWN_ERROR",
            provider=provider_name,
            message=f"An unexpected error occurred: {str(e)}"
        ) from e

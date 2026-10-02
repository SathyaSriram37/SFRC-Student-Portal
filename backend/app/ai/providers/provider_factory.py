"""Provider factory — returns configured LLM/Embedding providers or None if unconfigured."""
from __future__ import annotations
import os
from typing import Optional
from app.ai.providers.base import LLMProvider, EmbeddingProvider, BaseLLMProvider
from app.core.config import settings


def get_llm_provider() -> Optional[LLMProvider]:
    """Return LLM provider instance if configured and API key present, else None."""
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY", "").strip()
    provider_name = (settings.llm_provider or "").strip().lower()
    if provider_name == "openai" and api_key:
        try:
            from app.ai.providers.openai_adapter import OpenAILLMProvider
            return OpenAILLMProvider(api_key=api_key)
        except Exception as e:
            print(f"[LLM Factory] Provider init error: {e}")
            return None
    return None


def get_embedding_provider() -> Optional[EmbeddingProvider]:
    """Return Embedding provider instance if configured and API key present, else None."""
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY", "").strip()
    provider_name = (settings.embedding_provider or "").strip().lower()
    if provider_name == "openai" and api_key:
        try:
            from app.ai.providers.openai_adapter import OpenAIEmbeddingProvider
            return OpenAIEmbeddingProvider(api_key=api_key)
        except Exception as e:
            print(f"[Embedding Factory] Provider init error: {e}")
            return None
    return None


def get_provider() -> Optional[BaseLLMProvider]:
    """Return legacy combined provider or None."""
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY", "").strip()
    if api_key:
        try:
            from app.ai.providers.openai_adapter import OpenAIAdapter
            return OpenAIAdapter(api_key=api_key)
        except Exception:
            return None
    return None

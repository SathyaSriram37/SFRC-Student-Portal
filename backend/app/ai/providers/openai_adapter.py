"""OpenAI LLM and Embedding provider adapters."""
from __future__ import annotations

from typing import List, Optional
import os
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.ai.providers.base import LLMProvider, EmbeddingProvider, BaseLLMProvider
from app.core.config import settings


class OpenAILLMProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        key = api_key or settings.openai_api_key or os.getenv("OPENAI_API_KEY", "")
        self._client = AsyncOpenAI(api_key=key)
        self._model = model or settings.llm_model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def generate(self, system: str, user: str, context: str = "") -> str:
        messages = [{"role": "system", "content": system}]
        if context:
            messages.append({"role": "system", "content": f"Relevant Reference Context:\n{context}"})
        messages.append({"role": "user", "content": user})

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""


class OpenAIEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        key = api_key or settings.openai_api_key or os.getenv("OPENAI_API_KEY", "")
        self._client = AsyncOpenAI(api_key=key)
        self._model = model or settings.embedding_model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def embed(self, text: str) -> List[float]:
        response = await self._client.embeddings.create(
            model=self._model,
            input=text,
        )
        return response.data[0].embedding


class OpenAIAdapter(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None):
        key = api_key or settings.openai_api_key or os.getenv("OPENAI_API_KEY", "")
        self._client = AsyncOpenAI(api_key=key)
        self._model = settings.llm_model
        self._embedding_model = settings.embedding_model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def chat(self, messages: List[dict]) -> str:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def embed(self, text: str) -> List[float]:
        response = await self._client.embeddings.create(
            model=self._embedding_model,
            input=text,
        )
        return response.data[0].embedding

"""Abstract base class for all LLM and Embedding providers."""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List, Optional


class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, system: str, user: str, context: str = '') -> str:
        """Generate a completion response given system prompt, user prompt, and context."""
        ...


class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        """Generate an embedding vector for the given text."""
        ...


class BaseLLMProvider(ABC):
    @abstractmethod
    async def chat(self, messages: List[dict]) -> str:
        """Send a list of chat messages and return the assistant reply."""
        ...

    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        """Generate an embedding vector for the given text."""
        ...

import os
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[
            ".env",
            "backend/.env",
            os.path.join(os.path.dirname(__file__), "../../../.env"),
            os.path.join(os.path.dirname(__file__), "../../.env"),
        ],
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"

    @field_validator("database_url", mode="after")
    @classmethod
    def resolve_sqlite_path(cls, v: str) -> str:
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
        root_db = os.path.join(repo_root, "college.db")
        # If database_url points to a non-existent SQLite path or generic fallback, use root college.db if present
        if v and v.startswith("sqlite"):
            clean_path = v.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
            if not os.path.exists(clean_path) and os.path.exists(root_db):
                formatted = root_db.replace("\\", "/")
                return f"sqlite+aiosqlite:///{formatted}"
        elif (not v or "postgres" in v) and os.path.exists(root_db):
            formatted = root_db.replace("\\", "/")
            return f"sqlite+aiosqlite:///{formatted}"
        return v

    # ── Supabase ──────────────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # ── CORS ──────────────────────────────────────────────────────────────────
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "https://myzone-sfrc360.vercel.app",
    ]

    # ── LLM ───────────────────────────────────────────────────────────────────
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    openai_api_key: str = ""

    # ── Embeddings ────────────────────────────────────────────────────────────
    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimension: int = 1536

    # ── RAG ───────────────────────────────────────────────────────────────────
    rag_top_k: int = 5
    rag_similarity_threshold: float = 0.75

    # ── Integrations ──────────────────────────────────────────────────────────
    google_maps_api_key: str = ""
    erms_integration_enabled: bool = False
    fcm_enabled: bool = False


settings = Settings()

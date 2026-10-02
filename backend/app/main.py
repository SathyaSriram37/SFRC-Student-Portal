from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title="MyZone SFRC 360 API",
    version="1.0.0",
    description="Backend API for MyZone SFRC 360 — The Standard Fireworks Rajaratnam College for Women, Sivakasi",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/api/v1/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "MyZone SFRC 360"}


@app.get("/", include_in_schema=False)
async def root():
    return {"message": "MyZone SFRC 360 API. See /docs for documentation."}

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.database.session import engine, Base
from app.api.v1.api import api_router

import app.models  # noqa: F401  (регистрация всех моделей для Alembic и relationship)

app = FastAPI(
    title=settings.APP_NAME,
    description="RolyPoly — браузерная геополитическая стратегия",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/")
def root():
    return {"service": settings.APP_NAME, "docs": f"{settings.API_V1_STR}/docs"}


app.include_router(api_router, prefix=settings.API_V1_STR)

# Примечание: создание таблиц через Alembic (alembic upgrade head),
# а не Base.metadata.create_all, чтобы управлять схемой миграциями.

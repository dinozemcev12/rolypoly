from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # --- Приложение ---
    APP_NAME: str = "RolyPoly"
    APP_ENV: str = "development"
    DEBUG: bool = True
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"
    API_V1_STR: str = "/api/v1"

    # --- Безопасность ---
    SECRET_KEY: str = "смените-на-надёжный-секретный-ключ-не-менее-32-символов"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    BCRYPT_ROUNDS: int = 12

    # --- База данных ---
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "rolypoly"
    POSTGRES_PASSWORD: str = "rolypoly_dev_password"
    POSTGRES_DB: str = "rolypoly"
    DATABASE_URL: Optional[str] = None
    DATABASE_URL_ASYNC: Optional[str] = None

    # --- Файлы ---
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,svg,geojson,json,gpkg,tif,tiff"

    # --- CORS ---
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # --- Игра ---
    DEFAULT_TURN_DAYS: int = 30
    MAX_PLAYERS_PER_GAME: int = 6

    # --- WebSocket ---
    WS_PING_INTERVAL_SECONDS: int = 30


settings = Settings()


def get_database_url() -> str:
    if settings.DATABASE_URL:
        return settings.DATABASE_URL
    return (
        f"postgresql+psycopg2://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    )

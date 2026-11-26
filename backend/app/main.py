from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Set
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.session import engine, Base, SessionLocal, SQLALCHEMY_DATABASE_URL
from app.api.v1.api import api_router
from app.services.seed_service import seed_demo_data_if_empty

import app.models  # noqa: F401  (регистрация всех моделей для Alembic и relationship)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite") and SQLALCHEMY_DATABASE_URL != "sqlite:///:memory:":
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_demo_data_if_empty(db)
        finally:
            db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="RolyPoly — браузерная геополитическая стратегия",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    lifespan=lifespan,
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

Path("uploads").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


class GameConnectionManager:
    def __init__(self) -> None:
        self.rooms: Dict[int, Set[WebSocket]] = {}

    async def connect(self, game_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self.rooms.setdefault(game_id, set()).add(ws)

    def disconnect(self, game_id: int, ws: WebSocket) -> None:
        if game_id in self.rooms:
            self.rooms[game_id].discard(ws)

    async def broadcast(self, game_id: int, message: dict) -> None:
        for ws in list(self.rooms.get(game_id, set())):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(game_id, ws)


ws_manager = GameConnectionManager()


@app.websocket("/ws/{game_id}")
async def game_websocket(websocket: WebSocket, game_id: int):
    await ws_manager.connect(game_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await ws_manager.broadcast(game_id, {"event": "ping", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(game_id, websocket)


# Раздача собранного SPA-фронтенда в production (если присутствует frontend/dist или ./static)
for _dist_candidate in (Path("static"), Path("../frontend/dist")):
    if _dist_candidate.is_dir() and (_dist_candidate / "index.html").is_file():
        _assets_dir = _dist_candidate / "assets"
        if _assets_dir.is_dir():
            app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="frontend-assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        def serve_spa(full_path: str, _dir: Path = _dist_candidate):
            if full_path.startswith(("api/", "uploads/", "ws/")):
                return JSONResponse(status_code=404, content={"detail": "Not Found"})
            target = _dir / full_path
            if full_path and target.is_file():
                return FileResponse(target)
            return FileResponse(_dir / "index.html")

        break

# Примечание: создание таблиц через Alembic (alembic upgrade head),
# а не Base.metadata.create_all, чтобы управлять схемой миграциями.

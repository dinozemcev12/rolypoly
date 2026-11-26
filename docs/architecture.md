# Архитектура RolyPoly

## Общий обзор
**RolyPoly** построен по модульной монолитной архитектуре с разделением на SPA-клиент (`frontend`) и REST/WebSocket-сервер (`backend`).

## Frontend (`frontend/`)
- **React 18 + TypeScript + Vite**: быстрая сборка и строгая типизация.
- **Zustand** (`src/store/`): управление состоянием авторизации (`useAuthStore`) и игровой сессии (`useGameStore`).
- **MapLibre GL JS + Turf.js**: рендеринг офлайн-карты (`world-atlas` + `topojson-client`), слоёв и геометрические операции (объединение, разделение, центроиды).
- **WebSocket** (`src/hooks/useGameWebSocket.ts`): получение уведомлений и обновлений ходов в реальном времени.

## Backend (`backend/`)
- **FastAPI** (`app/api/v1/endpoints/`): модульные маршруты для всех игровых сущностей.
- **SQLAlchemy + Alembic**: ORM-модели (`app/models/`) и миграции базы данных (`migrations/`).
- **Безопасность** (`app/api/deps.py`, `app/core/security.py`): JWT-аутентификация, хеширование паролей (`bcrypt`), проверка ролей (`admin`, `gm`, `player`) и изоляция игровых сессий через `check_game_access` / `check_game_gm_access`.
- **Хранение файлов**: загружаемые изображения (флаги, подложки карт) сохраняются в `backend/uploads/` с проверкой MIME-типа и размера и отдаются через `/uploads`.

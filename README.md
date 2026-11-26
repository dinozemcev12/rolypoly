# RolyPoly — браузерная геополитическая стратегия

Мультиплеерная браузерная стратегия с интерактивной картой мира, государствами,
экономикой, дипломатией, конфликтами и инструментами ведущего.

> Игровым процессом управляет человек — ведущий. Платформа предоставляет
> инструменты, но не принимает важные игровые решения автоматически.

## Технологический стек

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (управление состоянием)
- React Router
- MapLibre GL JS (интерактивная карта)
- Turf.js (геометрия территорий)

### Backend
- Python 3.12 + FastAPI
- SQLAlchemy + Alembic (модели и миграции)
- Pydantic (схемы)
- PostgreSQL + PostGIS (география)
- WebSocket (уведомления в реальном времени)

### Инфраструктура
- Docker, Docker Compose
- Переменные окружения через `.env`
- Хранение загружаемых файлов вне базы данных

## Структура проекта

```
RolyPoly/
  frontend/          # React приложение
  backend/           # FastAPI приложение
  docs/              # Документация (architecture, database, game-rules, map-editor)
  docker-compose.yml
  README.md
  .env.example
  .gitignore
```

## Быстрый старт

### 1. Клонирование и переменные окружения

```bash
cp .env.example .env
# Отредактируйте .env: укажите SECRET_KEY, пароли БД, URL фронтенда/бэкенда
```

### 2. Запуск через Docker Compose (рекомендуется)

Требуется установленный Docker и Docker Compose.

```bash
docker compose up --build
```

- Бэкенд API: http://localhost:8000 (документация — http://localhost:8000/docs)
- Фронтенд: http://localhost:5173
- PostgreSQL + PostGIS: localhost:5432

Docker Compose автоматически применяет миграции Alembic (`alembic upgrade head`)
при запуске бэкенда.

### 3. Запуск без Docker

Нужен локальный сервер PostgreSQL с расширением PostGIS.

#### Бэкенд

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt

# Настройте .env (строка подключения DATABASE_URL)

# Миграции
alembic upgrade head

# Запуск
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Фронтенд

```bash
cd frontend
npm install
npm run dev
```

Приложение будет доступно на http://localhost:5173

### 4. Тесты

```bash
cd backend
pip install pytest pytest-asyncio httpx
pytest
```

## Основные возможности (MVP)

- Регистрация, авторизация, выход, роли (администратор / ведущий / игрок)
- Создание игровых сессий, приглашение игроков, назначение государств
- Государства: название, флаг, цвет, казна, ВВП, ресурсы, история
- Интерактивная карта (MapLibre), загрузка GeoJSON, выбор территории,
  подсветка, панель информации о территории
- Приказы игроков: создание, отправка, проверка ведущим, одобрение/отклонение
- Экономика: казна, доходы, расходы, история операций
- Игровые ходы: месячные ходы, управление ведущим, публикация итогов
- Журнал истории действий с фильтрацией
- Тёмный профессиональный интерфейс, адаптивность

## Документация

- `docs/architecture.md` — архитектура проекта
- `docs/database.md` — схема базы данных
- `docs/game-rules.md` — правила игры
- `docs/map-editor.md` — редактор карт

## Безопасность

Пароли хешируются (bcrypt). Доступ к API защищён проверкой авторизации и ролей.
Секретные ключи хранятся только в `.env`, никогда не коммятся в репозиторий.
Секретная информация игры изолирована по сессиям и правам пользователя.
"# rolypoly" 

# База данных RolyPoly

## Поддерживаемые СУБД
- **Production / Docker**: PostgreSQL + PostGIS (геометрия хранится с поддержкой географических операций).
- **Local Development**: SQLite (`rolypoly_dev.db`) с автоматическим созданием таблиц и демо-данных при старте.

## Основные таблицы
- `users` — учётные записи, роли (`admin`, `gm`, `player`), профили и аватары.
- `games` — игровые сессии, настройки периода, ходов и статусы.
- `game_members` — участники игровых сессий и их роли в игре.
- `countries` — государства (владелец, цвет, флаг, казна, ВВП, доходы, расходы, долг, инфляция).
- `territories` — территории (название, население, ресурсы, геометрия GeoJSON/PostGIS, связь с `country_id`).
- `maps`, `map_layers` — конфигурации карт и слоёв.
- `orders`, `order_results` — приказы игроков и решения ведущего.
- `transactions`, `projects` — финансовые операции и экономические проекты государств.
- `treaties`, `diplomatic_relations`, `messages` — договоры, отношения (-100..+100) и дипломатическая почта.
- `conflicts`, `events`, `notifications`, `history_logs`, `game_turns` — конфликты, новости, уведомления, журнал истории и ходы.

## Миграции
```bash
cd backend
alembic upgrade head
```

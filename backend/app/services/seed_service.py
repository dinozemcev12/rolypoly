from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import User
from app.models.game import Game
from app.models.game_member import GameMember
from app.models.country import Country
from app.models.territory import Territory
from app.models.game_turn import GameTurn
from app.models.history_log import HistoryLog


def seed_demo_data_if_empty(db: Session) -> None:
    """Создаёт демо-данные для локального тестирования, если база пустая."""
    if db.query(User).first() is not None:
        return

    gm = User(
        email="gm@rolypoly.com",
        username="gm_master",
        hashed_password=get_password_hash("secret123"),
        full_name="Ведущий",
        role="gm",
        is_active=True,
    )
    p1 = User(
        email="p1@rolypoly.com",
        username="player1",
        hashed_password=get_password_hash("secret123"),
        full_name="Игрок 1",
        role="player",
        is_active=True,
    )
    p2 = User(
        email="p2@rolypoly.com",
        username="player2",
        hashed_password=get_password_hash("secret123"),
        full_name="Игрок 2",
        role="player",
        is_active=True,
    )
    db.add_all([gm, p1, p2])
    db.flush()

    game = Game(
        title="Европа 2026 (Демо)",
        description="Демонстрационная игровая сессия для тестирования RolyPoly",
        game_period="modern",
        start_year=2026,
        max_players=6,
        status="active",
        current_month="2026-01",
        current_turn_number=1,
        created_by_id=gm.id,
    )
    db.add(game)
    db.flush()

    db.add_all(
        [
            GameMember(game_id=game.id, user_id=gm.id, role_in_game="owner", is_active=True),
            GameMember(game_id=game.id, user_id=p1.id, role_in_game="player", is_active=True),
            GameMember(game_id=game.id, user_id=p2.id, role_in_game="player", is_active=True),
        ]
    )

    c1 = Country(
        game_id=game.id,
        name="Северная Республика",
        color="#4B91D1",
        owner_user_id=p1.id,
        population=12500000,
        treasury=1500,
        gdp=42000,
        income=350,
        expenses=180,
        resources={"нефть": 80, "сталь": 120, "зерно": 200},
        political_info="Парламентская республика",
    )
    c2 = Country(
        game_id=game.id,
        name="Южный Союз",
        color="#D65C65",
        owner_user_id=p2.id,
        population=9800000,
        treasury=1200,
        gdp=35000,
        income=280,
        expenses=140,
        resources={"газ": 140, "зерно": 160, "уголь": 90},
        political_info="Федеративный союз",
    )
    db.add_all([c1, c2])
    db.flush()

    t1 = Territory(
        game_id=game.id,
        country_id=c1.id,
        name="Столичный округ",
        population=4500000,
        geometry={
            "type": "MultiPolygon",
            "coordinates": [
                [[[20.0, 52.0], [26.0, 52.0], [26.0, 56.0], [20.0, 56.0], [20.0, 52.0]]]
            ],
        },
        resources={"промышленность": 90},
        economic_indicators={"ввп_региона": 18000},
    )
    t2 = Territory(
        game_id=game.id,
        country_id=c2.id,
        name="Южное побережье",
        population=3200000,
        geometry={
            "type": "MultiPolygon",
            "coordinates": [
                [[[22.0, 44.0], [29.0, 44.0], [29.0, 48.0], [22.0, 48.0], [22.0, 44.0]]]
            ],
        },
        resources={"порты": 75, "газ": 60},
        economic_indicators={"ввп_региона": 14000},
    )
    db.add_all([t1, t2])
    db.flush()

    c1.capital_territory_id = t1.id
    c2.capital_territory_id = t2.id

    turn1 = GameTurn(
        game_id=game.id,
        turn_number=1,
        month_start="2026-01",
        status="planning",
        started_by_user_id=gm.id,
    )
    db.add(turn1)

    db.add(
        HistoryLog(
            game_id=game.id,
            user_id=gm.id,
            action_type="game_started",
            description="Создана демонстрационная игровая сессия «Европа 2026 (Демо)»",
            related_object_type="game",
            related_object_id=game.id,
            turn_number=1,
        )
    )
    db.commit()

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database.session import get_db
from app.api.deps import (
    get_current_user,
    check_game_access,
    check_game_gm_access,
    get_game_or_404,
)
from app.models.game_turn import GameTurn
from app.models.country import Country
from app.models.user import User
from app.schemas.game_turn import GameTurnRead, GameTurnAction
from app.services.history_service import log_history, notify_game_members

router = APIRouter()


def _next_month(month_str: str) -> str:
    """Увеличивает строку YYYY-MM на 1 месяц."""
    try:
        year_s, mon_s = month_str.split("-")
        year, mon = int(year_s), int(mon_s)
        mon += 1
        if mon > 12:
            mon = 1
            year += 1
        return f"{year:04d}-{mon:02d}"
    except Exception:
        return month_str


@router.get("/games/{game_id}", response_model=List[GameTurnRead])
def list_turns(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    return (
        db.query(GameTurn)
        .filter(GameTurn.game_id == game_id)
        .order_by(GameTurn.turn_number.desc())
        .all()
    )


@router.post("/games/{game_id}/action", response_model=GameTurnRead)
def turn_action(
    game_id: int,
    action_in: GameTurnAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Управление ходами (ведущий): start | finish_review | resolve | next."""
    check_game_gm_access(db, game_id, current_user)
    game = get_game_or_404(db, game_id)

    current_turn = (
        db.query(GameTurn)
        .filter(GameTurn.game_id == game_id)
        .order_by(GameTurn.turn_number.desc())
        .first()
    )

    if action_in.action == "start":
        if current_turn and current_turn.status != "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Предыдущий ход не завершён"
            )
        number = (current_turn.turn_number + 1) if current_turn else 1
        month = action_in.month_start or f"{game.start_year or 2026}-01"
        turn = GameTurn(
            game_id=game.id,
            turn_number=number,
            month_start=month,
            status="planning",
            started_by_user_id=current_user.id,
            started_at=datetime.now(timezone.utc),
        )
        db.add(turn)
        game.current_month = month
        game.current_turn_number = number
        game.status = "active"
        db.add(game)
        log_history(
            db,
            game_id=game.id,
            user_id=current_user.id,
            action_type="turn_started",
            description=f"Начат ход №{number} ({month})",
            related_object_type="game_turn",
            turn_number=number,
        )
        notify_game_members(
            db,
            game_id=game.id,
            title=f"Начат ход №{number}",
            text=f"Открыт новый игровой месяц: {month}. Приём приказов открыт.",
            notif_type="game",
            exclude_user_id=current_user.id,
        )
        db.commit()
        db.refresh(turn)
        return turn

    if action_in.action == "finish_review":
        if not current_turn or current_turn.status != "planning":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Ход должен быть в статусе planning"
            )
        current_turn.status = "review"
        db.add(current_turn)
        log_history(
            db,
            game_id=game.id,
            user_id=current_user.id,
            action_type="turn_review_started",
            description=f"Приём приказов за ход №{current_turn.turn_number} завершён, идёт проверка ведущим",
            related_object_type="game_turn",
            related_object_id=current_turn.id,
            turn_number=current_turn.turn_number,
        )
        db.commit()
        db.refresh(current_turn)
        return current_turn

    if action_in.action == "resolve":
        if not current_turn or current_turn.status not in ("planning", "review"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Ход не может быть рассчитан в текущем статусе"
            )
        countries = db.query(Country).filter(Country.game_id == game_id).all()
        for c in countries:
            c.treasury = (c.treasury or 0) + (c.income or 0) - (c.expenses or 0)
            db.add(c)
        current_turn.status = "resolved"
        current_turn.completed_at = datetime.now(timezone.utc)
        current_turn.completed_by_user_id = current_user.id
        db.add(current_turn)
        log_history(
            db,
            game_id=game.id,
            user_id=current_user.id,
            action_type="turn_resolved",
            description=f"Подведены итоги хода №{current_turn.turn_number}, обновлена казна государств",
            related_object_type="game_turn",
            related_object_id=current_turn.id,
            turn_number=current_turn.turn_number,
        )
        db.commit()
        db.refresh(current_turn)
        return current_turn

    if action_in.action == "next":
        if not current_turn:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Нет хода для завершения"
            )
        if current_turn.status != "resolved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Ход не рассчитан (сначала выполните resolve)"
            )
        current_turn.status = "published"
        current_turn.completed_at = datetime.now(timezone.utc)
        current_turn.completed_by_user_id = current_user.id
        db.add(current_turn)

        number = current_turn.turn_number + 1
        month = action_in.month_start or _next_month(current_turn.month_start)
        turn = GameTurn(
            game_id=game.id,
            turn_number=number,
            month_start=month,
            status="planning",
            started_by_user_id=current_user.id,
            started_at=datetime.now(timezone.utc),
        )
        db.add(turn)
        game.current_month = month
        game.current_turn_number = number
        db.add(game)
        log_history(
            db,
            game_id=game.id,
            user_id=current_user.id,
            action_type="turn_published_and_next",
            description=f"Ход №{current_turn.turn_number} завершён. Начат ход №{number} ({month})",
            related_object_type="game_turn",
            turn_number=number,
        )
        notify_game_members(
            db,
            game_id=game.id,
            title=f"Опубликованы итоги хода №{current_turn.turn_number}",
            text=f"Начат следующий игровой месяц: {month} (ход №{number}).",
            notif_type="game",
            exclude_user_id=current_user.id,
        )
        db.commit()
        db.refresh(turn)
        return turn

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неизвестное действие")

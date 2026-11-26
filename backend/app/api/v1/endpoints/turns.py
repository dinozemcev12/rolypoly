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
from app.models.game import Game
from app.models.game_turn import GameTurn
from app.models.country import Country
from app.schemas.game_turn import GameTurnRead, GameTurnAction

router = APIRouter()


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
    """Управление ходами (ведущий): start | finish_review | resolve | publish | next."""
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
        db.commit()
        db.refresh(turn)
        return turn

    if action_in.action == "resolve":
        if not current_turn or current_turn.status != "review":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Ход не на рассмотрении"
            )
        countries = db.query(Country).filter(Country.game_id == game_id).all()
        for c in countries:
            c.treasury = (c.treasury or 0) + (c.income or 0) - (c.expenses or 0)
            db.add(c)
        current_turn.status = "resolved"
        current_turn.completed_at = datetime.now(timezone.utc)
        current_turn.completed_by_user_id = current_user.id
        db.add(current_turn)
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
                status_code=status.HTTP_400_BAD_REQUEST, detail="Ход не разрешён"
            )
        current_turn.status = "published"
        current_turn.completed_at = datetime.now(timezone.utc)
        current_turn.completed_by_user_id = current_user.id
        db.add(current_turn)
        number = current_turn.turn_number + 1
        month = action_in.month_start or current_turn.month_start
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
        db.commit()
        db.refresh(turn)
        return turn

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неизвестное действие")

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access, get_game_or_404
from app.models.history_log import HistoryLog
from app.models.user import User
from app.schemas.history_log import HistoryLogRead

router = APIRouter()


@router.get("/games/{game_id}", response_model=List[HistoryLogRead])
def list_history(
    game_id: int,
    action_type: Optional[str] = None,
    country_id: Optional[int] = None,
    turn_number: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    query = db.query(HistoryLog).filter(HistoryLog.game_id == game_id)
    if action_type:
        query = query.filter(HistoryLog.action_type == action_type)
    if country_id:
        query = query.filter(HistoryLog.related_object_id == country_id)
    if turn_number is not None:
        query = query.filter(HistoryLog.turn_number == turn_number)
    return query.order_by(HistoryLog.created_at.desc()).all()


@router.post("/games/{game_id}/entries", response_model=HistoryLogRead, status_code=status.HTTP_201_CREATED)
def add_history_entry(
    game_id: int,
    action_type: str,
    description: str,
    related_object_type: Optional[str] = None,
    related_object_id: Optional[int] = None,
    turn_number: Optional[int] = None,
    metadata: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    entry = HistoryLog(
        game_id=game_id,
        user_id=current_user.id,
        action_type=action_type,
        description=description,
        related_object_type=related_object_type,
        related_object_id=related_object_id,
        turn_number=turn_number,
        log_metadata=metadata,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

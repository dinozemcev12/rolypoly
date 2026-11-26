from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access, check_game_gm_access, get_game_or_404
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventCreate, EventRead
from app.services.history_service import log_history

router = APIRouter()


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    event_in: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать игровое событие / новость (ведущий / админ)."""
    game = check_game_gm_access(db, event_in.game_id, current_user)
    data = event_in.model_dump(exclude_unset=True)
    if not data.get("event_date"):
        data["event_date"] = datetime.now(timezone.utc)
    event = Event(**data, created_by_user_id=current_user.id)
    db.add(event)
    db.flush()
    log_history(
        db,
        game_id=game.id,
        user_id=current_user.id,
        action_type="event_created",
        description=f"Опубликовано событие «{event.title}»",
        related_object_type="event",
        related_object_id=event.id,
        turn_number=game.current_turn_number,
    )
    db.commit()
    db.refresh(event)
    return event


@router.get("/games/{game_id}", response_model=List[EventRead])
def list_events(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    query = db.query(Event).filter(Event.game_id == game_id)
    # Игрок видит только public и свои player-события; ведущий/админ — всё
    if current_user.role not in ("admin", "gm"):
        query = query.filter((Event.visibility == "public") | (Event.visibility == "player"))
    return query.order_by(Event.event_date.desc()).all()

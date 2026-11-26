from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access, check_game_gm_access, get_game_or_404
from app.models.event import Event
from app.schemas.event import EventCreate, EventRead

router = APIRouter()


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    event_in: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, event_in.game_id, current_user)
    event = Event(**event_in.model_dump(exclude_unset=True), created_by_user_id=current_user.id)
    db.add(event)
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

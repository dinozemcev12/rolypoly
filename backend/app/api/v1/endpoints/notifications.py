from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.notification import Notification
from app.schemas.notification import NotificationRead

router = APIRouter()


@router.get("/", response_model=List[NotificationRead])
def list_notifications(
    game_id: Optional[int] = None,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if game_id is not None:
        query = query.filter(Notification.game_id == game_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)  # noqa: E712
    return query.order_by(Notification.created_at.desc()).all()

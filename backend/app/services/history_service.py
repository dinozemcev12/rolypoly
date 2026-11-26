from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.history_log import HistoryLog
from app.models.notification import Notification
from app.models.game_member import GameMember


def log_history(
    db: Session,
    game_id: int,
    user_id: Optional[int],
    action_type: str,
    description: str,
    related_object_type: Optional[str] = None,
    related_object_id: Optional[int] = None,
    turn_number: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> HistoryLog:
    """Создать запись в журнале истории игры (без принудительного commit, если нужно в одной транзакции)."""
    entry = HistoryLog(
        game_id=game_id,
        user_id=user_id,
        action_type=action_type,
        description=description,
        related_object_type=related_object_type,
        related_object_id=related_object_id,
        turn_number=turn_number,
        log_metadata=metadata,
    )
    db.add(entry)
    return entry


def notify_game_members(
    db: Session,
    game_id: int,
    title: str,
    text: str,
    notif_type: str = "game",
    link_url: Optional[str] = None,
    exclude_user_id: Optional[int] = None,
) -> None:
    """Отправить уведомление всем активным участникам игровой сессии."""
    members = (
        db.query(GameMember)
        .filter(GameMember.game_id == game_id, GameMember.is_active == True)  # noqa: E712
        .all()
    )
    for m in members:
        if exclude_user_id is not None and m.user_id == exclude_user_id:
            continue
        db.add(
            Notification(
                game_id=game_id,
                user_id=m.user_id,
                title=title,
                text=text,
                type=notif_type,
                link_url=link_url,
            )
        )

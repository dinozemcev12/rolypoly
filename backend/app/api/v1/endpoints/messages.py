from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access
from app.models.message import Message
from app.models.country import Country
from app.models.notification import Notification
from app.models.user import User
from app.schemas.message import MessageCreate, MessageRead

router = APIRouter()


@router.post("/", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def send_message(
    msg_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отправить дипломатическое или личное сообщение в рамках игровой сессии."""
    check_game_access(db, msg_in.game_id, current_user)

    recipient_user_id = msg_in.recipient_user_id
    if msg_in.recipient_country_id:
        country = db.query(Country).filter(
            Country.id == msg_in.recipient_country_id,
            Country.game_id == msg_in.game_id,
        ).first()
        if not country:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Государство-получатель не найдено")
        if not recipient_user_id and country.owner_user_id:
            recipient_user_id = country.owner_user_id

    msg = Message(
        game_id=msg_in.game_id,
        sender_user_id=current_user.id,
        recipient_user_id=recipient_user_id,
        recipient_country_id=msg_in.recipient_country_id,
        subject=msg_in.subject,
        body=msg_in.body,
        is_secret=msg_in.is_secret,
    )
    db.add(msg)

    if recipient_user_id and recipient_user_id != current_user.id:
        db.add(
            Notification(
                user_id=recipient_user_id,
                game_id=msg_in.game_id,
                title="Новое дипломатическое сообщение",
                text=msg_in.subject or msg_in.body[:120],
                type="message",
            )
        )

    db.commit()
    db.refresh(msg)
    return msg


@router.get("/games/{game_id}", response_model=List[MessageRead])
def list_messages(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список сообщений: ведущий видит все, игрок — публичные, свои и адресованные ему/его стране."""
    check_game_access(db, game_id, current_user)
    query = db.query(Message).filter(Message.game_id == game_id)

    if current_user.role not in ("admin", "gm"):
        own_country_ids = [
            c.id
            for c in db.query(Country.id).filter(
                Country.game_id == game_id, Country.owner_user_id == current_user.id
            ).all()
        ]
        conds = [
            Message.is_secret == False,  # noqa: E712
            Message.sender_user_id == current_user.id,
            Message.recipient_user_id == current_user.id,
        ]
        if own_country_ids:
            conds.append(Message.recipient_country_id.in_(own_country_ids))
        query = query.filter(or_(*conds))

    return query.order_by(Message.created_at.desc()).all()


@router.post("/{message_id}/read", response_model=MessageRead)
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сообщение не найдено")
    check_game_access(db, msg.game_id, current_user)
    msg.is_read = True
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access, check_game_gm_access, get_game_or_404
from app.models.order import Order
from app.models.country import Country
from app.models.user import User
from app.models.notification import Notification
from app.schemas.order import OrderCreate, OrderRead, OrderUpdate, OrderDecision
from app.services.history_service import log_history

router = APIRouter()


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Игрок создаёт приказ для своего государства."""
    country = db.query(Country).filter(Country.id == order_in.country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Государство не найдено")
    check_game_access(db, country.game_id, current_user)
    # Игрок может создавать приказы только для своего государства
    if current_user.role not in ("admin", "gm") and country.owner_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Можно создавать приказы только для своего государства",
        )
    order = Order(
        game_id=country.game_id,
        country_id=order_in.country_id,
        sender_user_id=current_user.id,
        title=order_in.title,
        category=order_in.category,
        description=order_in.description,
        target=order_in.target,
        parameters=order_in.parameters,
        status="draft",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/games/{game_id}", response_model=List[OrderRead])
def list_orders(
    game_id: int,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    query = db.query(Order).filter(Order.game_id == game_id)
    # Игрок видит только свои приказы; ведущий/админ — все
    if current_user.role not in ("admin", "gm"):
        query = query.filter(Order.sender_user_id == current_user.id)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    return query.order_by(Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Приказ не найден")
    check_game_access(db, order.game_id, current_user)
    if current_user.role not in ("admin", "gm") and order.sender_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Это не ваш приказ")
    return order


@router.patch("/{order_id}", response_model=OrderRead)
def update_order(
    order_id: int,
    order_in: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Приказ не найден")
    check_game_access(db, order.game_id, current_user)
    if current_user.role not in ("admin", "gm") and order.sender_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Это не ваш приказ")
    if order.status not in ("draft", "rejected"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Приказ нельзя редактировать в этом статусе")
    data = order_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(order, field, value)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/send", response_model=OrderRead)
def send_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отправить приказ на рассмотрение ведущему."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Приказ не найден")
    game = check_game_access(db, order.game_id, current_user)
    if order.sender_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Это не ваш приказ")
    if order.status != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Можно отправить только черновик")
    order.status = "sent"
    order.sent_at = datetime.now(timezone.utc)
    db.add(order)
    log_history(
        db,
        game_id=order.game_id,
        user_id=current_user.id,
        action_type="order_sent",
        description=f"Отправлен приказ «{order.title}»",
        related_object_type="order",
        related_object_id=order.id,
        turn_number=game.current_turn_number,
    )
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/decision", response_model=OrderRead)
def order_decision(
    order_id: int,
    decision: OrderDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ведущий принимает/отклоняет приказ."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Приказ не найден")
    game = check_game_gm_access(db, order.game_id, current_user)
    valid_statuses = ("accepted", "rejected", "executed", "cancelled")
    if decision.status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недопустимый статус")
    order.status = decision.status
    order.gm_comment = decision.gm_comment
    order.result = decision.result
    order.gm_decision_at = datetime.now(timezone.utc)
    order.decided_by_user_id = current_user.id
    db.add(order)
    log_history(
        db,
        game_id=order.game_id,
        user_id=current_user.id,
        action_type=f"order_{decision.status}",
        description=f"Решение по приказу «{order.title}»: {decision.status}",
        related_object_type="order",
        related_object_id=order.id,
        turn_number=game.current_turn_number,
    )
    if order.sender_user_id:
        db.add(
            Notification(
                game_id=order.game_id,
                user_id=order.sender_user_id,
                title=f"Приказ «{order.title}»: {decision.status}",
                text=decision.gm_comment or f"Статус приказа изменён на {decision.status}",
                type="order",
                link_url="/orders",
            )
        )
    db.commit()
    db.refresh(order)
    return order

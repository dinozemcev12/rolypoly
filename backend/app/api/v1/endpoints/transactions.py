from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access, check_game_gm_access, get_game_or_404
from app.models.transaction import Transaction
from app.models.country import Country
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionRead
from app.services.history_service import log_history

router = APIRouter()


@router.post("/", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Изменение казны государства (доход/расход/корректировка). Ведущий/админ."""
    country = db.query(Country).filter(Country.id == tx_in.country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Государство не найдено")
    game = check_game_gm_access(db, country.game_id, current_user)
    tx = Transaction(
        game_id=country.game_id,
        country_id=tx_in.country_id,
        amount=tx_in.amount,
        type=tx_in.type,
        reason=tx_in.reason,
        date=tx_in.date or datetime.now(timezone.utc),
        status=tx_in.status or "confirmed",
        created_by_user_id=current_user.id,
    )
    db.add(tx)
    db.flush()

    if tx.status == "confirmed":
        country.treasury = (country.treasury or 0) + tx.amount
        db.add(country)

    log_history(
        db,
        game_id=country.game_id,
        user_id=current_user.id,
        action_type="treasury_changed",
        description=f"Финансовая операция ({tx.type}) для «{country.name}»: {tx.amount:+d} ({tx.reason})",
        related_object_type="country",
        related_object_id=country.id,
        turn_number=game.current_turn_number,
    )
    db.commit()
    db.refresh(tx)
    return tx


@router.get("/games/{game_id}", response_model=List[TransactionRead])
def list_transactions(
    game_id: int,
    country_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    query = db.query(Transaction).filter(Transaction.game_id == game_id)
    if country_id:
        query = query.filter(Transaction.country_id == country_id)
    return query.order_by(Transaction.created_at.desc()).all()

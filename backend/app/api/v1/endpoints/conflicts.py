from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access, check_game_gm_access
from app.models.conflict import Conflict
from app.models.user import User
from app.schemas.conflict import ConflictCreate, ConflictUpdate, ConflictRead
from app.services.history_service import log_history

router = APIRouter()


@router.get("/games/{game_id}", response_model=List[ConflictRead])
def list_conflicts(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    return (
        db.query(Conflict)
        .filter(Conflict.game_id == game_id)
        .order_by(Conflict.created_at.desc())
        .all()
    )


@router.post("/", response_model=ConflictRead, status_code=status.HTTP_201_CREATED)
def create_conflict(
    conflict_in: ConflictCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game = check_game_gm_access(db, conflict_in.game_id, current_user)
    conflict = Conflict(
        **conflict_in.model_dump(),
        status="open",
        created_by_user_id=current_user.id,
    )
    db.add(conflict)
    db.flush()
    log_history(
        db,
        game_id=game.id,
        user_id=current_user.id,
        action_type="conflict_created",
        description=f"Зарегистрирован конфликт «{conflict.title}»",
        related_object_type="conflict",
        related_object_id=conflict.id,
        turn_number=game.current_turn_number,
    )
    db.commit()
    db.refresh(conflict)
    return conflict


@router.patch("/{conflict_id}", response_model=ConflictRead)
def update_conflict(
    conflict_id: int,
    conflict_in: ConflictUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conflict = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Конфликт не найден")
    game = check_game_gm_access(db, conflict.game_id, current_user)
    for field, value in conflict_in.model_dump(exclude_unset=True).items():
        setattr(conflict, field, value)
    db.add(conflict)
    log_history(
        db,
        game_id=game.id,
        user_id=current_user.id,
        action_type="conflict_updated",
        description=f"Обновлён конфликт «{conflict.title}» (статус: {conflict.status})",
        related_object_type="conflict",
        related_object_id=conflict.id,
        turn_number=game.current_turn_number,
    )
    db.commit()
    db.refresh(conflict)
    return conflict

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user, RequireAdmin
from app.models.user import User
from app.models.game import Game
from app.models.game_member import GameMember
from app.schemas.user import UserRead, UserUpdate, UserOut
from app.schemas.game import GameRead, GameMemberRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
def read_user_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.avatar_url is not None:
        current_user.avatar_url = user_in.avatar_url
    if user_in.password is not None:
        from app.core.security import get_password_hash
        current_user.hashed_password = get_password_hash(user_in.password)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireAdmin),
):
    return db.query(User).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireAdmin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return user


@router.get("/me/games", response_model=List[GameRead])
def my_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список игровых сессий пользователя."""
    if current_user.role == "admin":
        return db.query(Game).all()
    members = (
        db.query(GameMember)
        .filter(GameMember.user_id == current_user.id, GameMember.is_active == True)  # noqa: E712
        .all()
    )
    game_ids = [m.game_id for m in members]
    return db.query(Game).filter(Game.id.in_(game_ids)).all() if game_ids else []


@router.get("/me/games/{game_id}/member", response_model=GameMemberRead)
def my_membership(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.api.deps import check_game_access
    check_game_access(db, game_id, current_user)
    member = (
        db.query(GameMember)
        .filter(GameMember.game_id == game_id, GameMember.user_id == current_user.id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Членство не найдено")
    return member

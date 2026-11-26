from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token
from app.database.session import SessionLocal, get_db
from app.models.user import User
from app.models.game import Game
from app.models.game_member import GameMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def get_db_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db_session),
    token: str = Depends(oauth2_scheme),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учётные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload is None:
            raise credentials_exception
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Пользователь деактивирован"
        )
    return user


def require_roles(allowed_roles: List[str]):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав доступа",
            )
        return current_user

    return dependency


RequireAdmin = require_roles(["admin"])
RequireGM = require_roles(["admin", "gm"])
RequirePlayer = require_roles(["admin", "gm", "player"])


def get_game_or_404(db: Session, game_id: int) -> Game:
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Игра не найдена")
    return game


def check_game_access(db: Session, game_id: int, user: User) -> Game:
    """Пользователь должен быть участником игры (или админ)."""
    game = get_game_or_404(db, game_id)
    if user.role == "admin":
        return game
    member = (
        db.query(GameMember)
        .filter(GameMember.game_id == game_id, GameMember.user_id == user.id, GameMember.is_active == True)  # noqa: E712
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой игровой сессии",
        )
    return game


def check_game_gm_access(db: Session, game_id: int, user: User) -> Game:
    """Ведущий или админ могут управлять игрой."""
    game = get_game_or_404(db, game_id)
    if user.role == "admin":
        return game
    member = (
        db.query(GameMember)
        .filter(
            GameMember.game_id == game_id,
            GameMember.user_id == user.id,
            GameMember.role_in_game.in_(["owner", "gm"]),
            GameMember.is_active == True,  # noqa: E712
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только ведущий игры может выполнять это действие",
        )
    return game

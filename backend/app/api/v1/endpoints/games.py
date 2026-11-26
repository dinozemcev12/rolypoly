from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import (
    get_current_user,
    RequireGM,
    check_game_access,
    check_game_gm_access,
    get_game_or_404,
)
from app.models.user import User
from app.models.game import Game
from app.models.game_member import GameMember
from app.schemas.game import GameCreate, GameRead, GameUpdate, GameMemberRead
from app.schemas.user import UserRead

router = APIRouter()


@router.post("/", response_model=GameRead, status_code=status.HTTP_201_CREATED)
def create_game(
    game_in: GameCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireGM),
):
    """Создание игровой сессии (ведущий / админ)."""
    game = Game(
        title=game_in.title,
        description=game_in.description,
        cover_image_url=game_in.cover_image_url,
        game_period=game_in.game_period,
        start_year=game_in.start_year,
        max_players=game_in.max_players,
        economy_settings=game_in.economy_settings,
        diplomacy_settings=game_in.diplomacy_settings,
        turn_rules=game_in.turn_rules,
        visibility_settings=game_in.visibility_settings,
        status="preparation",
        created_by_id=current_user.id,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    # Создаём ведущего как владельца игры
    member = GameMember(
        game_id=game.id,
        user_id=current_user.id,
        role_in_game="owner",
        is_active=True,
    )
    db.add(member)
    db.commit()
    return game


@router.get("/", response_model=List[GameRead])
def list_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "admin":
        return db.query(Game).all()
    members = (
        db.query(GameMember)
        .filter(GameMember.user_id == current_user.id, GameMember.is_active == True)  # noqa: E712
        .all()
    )
    game_ids = [m.game_id for m in members]
    return db.query(Game).filter(Game.id.in_(game_ids)).all() if game_ids else []


@router.get("/{game_id}", response_model=GameRead)
def get_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    return get_game_or_404(db, game_id)


@router.patch("/{game_id}", response_model=GameRead)
def update_game(
    game_id: int,
    game_in: GameUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_gm_access(db, game_id, current_user)
    game = get_game_or_404(db, game_id)
    data = game_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(game, field, value)
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_gm_access(db, game_id, current_user)
    game = get_game_or_404(db, game_id)
    db.delete(game)
    db.commit()
    return None


@router.post("/{game_id}/members", response_model=GameMemberRead, status_code=status.HTTP_201_CREATED)
def add_member(
    game_id: int,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    role_in_game: str = "player",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Пригласить игрока в игру по user_id или username (ведущий)."""
    check_game_gm_access(db, game_id, current_user)
    game = get_game_or_404(db, game_id)
    from app.models.user import User as UserModel
    if user_id is not None:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
    elif username is not None:
        user = db.query(UserModel).filter(UserModel.username == username).first()
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Необходимо указать user_id или username",
        )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )
    existing = (
        db.query(GameMember)
        .filter(GameMember.game_id == game_id, GameMember.user_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь уже в игре"
        )
    member = GameMember(
        game_id=game_id, user_id=user.id, role_in_game=role_in_game, is_active=True
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    # Собираем ответ с данными пользователя
    return {
        "id": member.id,
        "game_id": member.game_id,
        "user_id": member.user_id,
        "username": user.username,
        "email": user.email,
        "role_in_game": member.role_in_game,
        "is_active": member.is_active,
        "joined_at": member.joined_at,
    }


@router.get("/{game_id}/members", response_model=List[GameMemberRead])
def list_members(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    members = (
        db.query(GameMember)
        .filter(GameMember.game_id == game_id)
        .all()
    )
    result = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        result.append({
            "id": m.id,
            "game_id": m.game_id,
            "user_id": m.user_id,
            "username": u.username if u else str(m.user_id),
            "email": u.email if u else "",
            "role_in_game": m.role_in_game,
            "is_active": m.is_active,
            "joined_at": m.joined_at,
        })
    return result


@router.delete("/{game_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    game_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_gm_access(db, game_id, current_user)
    member = (
        db.query(GameMember)
        .filter(GameMember.game_id == game_id, GameMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Членство не найдено")
    db.delete(member)
    db.commit()
    return None

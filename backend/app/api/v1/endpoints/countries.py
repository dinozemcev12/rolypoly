from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import (
    get_current_user,
    check_game_access,
    check_game_gm_access,
    get_game_or_404,
)
from app.models.country import Country
from app.models.game_member import GameMember
from app.models.user import User
from app.schemas.country import CountryCreate, CountryRead, CountryUpdate

router = APIRouter()


@router.post("/games/{game_id}", response_model=CountryRead, status_code=status.HTTP_201_CREATED)
def create_country_in_game(
    game_id: int,
    country_in: CountryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать государство в игре (ведущий)."""
    check_game_gm_access(db, game_id, current_user)
    get_game_or_404(db, game_id)
    country = Country(**country_in.model_dump(exclude_unset=True), game_id=game_id)
    db.add(country)
    db.commit()
    db.refresh(country)
    return country


@router.get("/games/{game_id}", response_model=List[CountryRead])
def list_countries(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    return db.query(Country).filter(Country.game_id == game_id).all()


@router.get("/{country_id}", response_model=CountryRead)
def get_country(
    country_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    country = db.query(Country).filter(Country.id == country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Государство не найдено")
    check_game_access(db, country.game_id, current_user)
    return country


@router.patch("/{country_id}", response_model=CountryRead)
def update_country(
    country_id: int,
    country_in: CountryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    country = db.query(Country).filter(Country.id == country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Государство не найдено")
    check_game_access(db, country.game_id, current_user)
    if current_user.role not in ("admin", "gm"):
        member = (
            db.query(GameMember)
            .filter_by(
                game_id=country.game_id,
                user_id=current_user.id,
                is_active=True,
            )
            .first()
        )
        if not member or member.role_in_game not in ("owner", "gm"):
            if country.owner_user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Нельзя редактировать чужое государство",
                )
    data = country_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(country, field, value)
    db.add(country)
    db.commit()
    db.refresh(country)
    return country


@router.delete("/{country_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_country(
    country_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    country = db.query(Country).filter(Country.id == country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Государство не найдено")
    check_game_gm_access(db, country.game_id, current_user)
    db.delete(country)
    db.commit()
    return None

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access, check_game_gm_access, get_game_or_404
from app.models.territory import Territory
from app.models.country import Country
from app.schemas.territory import TerritoryCreate, TerritoryRead, TerritoryUpdate, TerritoryOwnerAssign

router = APIRouter()


@router.post("/", response_model=TerritoryRead, status_code=status.HTTP_201_CREATED)
def create_territory(
    territory_in: TerritoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, territory_in.game_id, current_user)
    territory = Territory(**territory_in.model_dump(exclude_unset=True))
    db.add(territory)
    db.commit()
    db.refresh(territory)
    return territory


@router.get("/games/{game_id}", response_model=List[TerritoryRead])
def list_territories(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    return db.query(Territory).filter(Territory.game_id == game_id).all()


@router.get("/{territory_id}", response_model=TerritoryRead)
def get_territory(
    territory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    territory = db.query(Territory).filter(Territory.id == territory_id).first()
    if not territory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Территория не найдена")
    check_game_access(db, territory.game_id, current_user)
    return territory


@router.patch("/{territory_id}", response_model=TerritoryRead)
def update_territory(
    territory_id: int,
    territory_in: TerritoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    territory = db.query(Territory).filter(Territory.id == territory_id).first()
    if not territory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Территория не найдена")
    check_game_access(db, territory.game_id, current_user)
    data = territory_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(territory, field, value)
    db.add(territory)
    db.commit()
    db.refresh(territory)
    return territory


@router.post("/{territory_id}/owner", response_model=TerritoryRead)
def assign_territory_owner(
    territory_id: int,
    assign: TerritoryOwnerAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Назначить владельца территории — государство (ведущий)."""
    territory = db.query(Territory).filter(Territory.id == territory_id).first()
    if not territory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Территория не найдена")
    check_game_gm_access(db, territory.game_id, current_user)
    country = db.query(Country).filter(Country.id == assign.country_id).first()
    if not country or country.game_id != territory.game_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Государство не найдено в этой игре")
    territory.country_id = assign.country_id
    db.add(territory)
    db.commit()
    db.refresh(territory)
    return territory


@router.delete("/{territory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_territory(
    territory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    territory = db.query(Territory).filter(Territory.id == territory_id).first()
    if not territory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Территория не найдена")
    check_game_gm_access(db, territory.game_id, current_user)
    db.delete(territory)
    db.commit()
    return None

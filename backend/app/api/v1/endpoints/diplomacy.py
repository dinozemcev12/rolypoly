from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access, check_game_gm_access
from app.models.treaty import Treaty
from app.models.diplomatic_relation import DiplomaticRelation
from app.models.country import Country
from app.models.game_member import GameMember
from app.models.user import User
from app.schemas.diplomacy import (
    TreatyCreate,
    TreatyRead,
    TreatyStatusUpdate,
    DiplomaticRelationUpsert,
    DiplomaticRelationRead,
)
from app.services.history_service import log_history

router = APIRouter()


def _is_gm(db: Session, game_id: int, user: User) -> bool:
    if user.role == "admin":
        return True
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
    return member is not None


@router.get("/games/{game_id}/treaties", response_model=List[TreatyRead])
def list_treaties(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    treaties = db.query(Treaty).filter(Treaty.game_id == game_id).order_by(Treaty.created_at.desc()).all()
    if _is_gm(db, game_id, current_user):
        return treaties

    my_country_ids = {
        c.id
        for c in db.query(Country)
        .filter(Country.game_id == game_id, Country.owner_user_id == current_user.id)
        .all()
    }
    return [
        t
        for t in treaties
        if not t.is_secret or t.country_a_id in my_country_ids or t.country_b_id in my_country_ids
    ]


@router.post("/treaties", response_model=TreatyRead, status_code=status.HTTP_201_CREATED)
def create_treaty(
    treaty_in: TreatyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game = check_game_access(db, treaty_in.game_id, current_user)
    if treaty_in.country_a_id == treaty_in.country_b_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя заключить договор с самим собой")

    country_a = db.query(Country).filter(Country.id == treaty_in.country_a_id, Country.game_id == game.id).first()
    country_b = db.query(Country).filter(Country.id == treaty_in.country_b_id, Country.game_id == game.id).first()
    if not country_a or not country_b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Государство не найдено в этой игре")

    if not _is_gm(db, game.id, current_user) and country_a.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Вы можете предлагать договоры только от имени своего государства")

    treaty = Treaty(**treaty_in.model_dump(), status="proposed")
    db.add(treaty)
    db.flush()
    if not treaty.is_secret:
        log_history(
            db,
            game_id=game.id,
            user_id=current_user.id,
            action_type="treaty_proposed",
            description=f"Предложен договор «{treaty.title}» между «{country_a.name}» и «{country_b.name}»",
            related_object_type="treaty",
            related_object_id=treaty.id,
            turn_number=game.current_turn_number,
        )
    db.commit()
    db.refresh(treaty)
    return treaty


@router.post("/treaties/{treaty_id}/status", response_model=TreatyRead)
def update_treaty_status(
    treaty_id: int,
    status_in: TreatyStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    treaty = db.query(Treaty).filter(Treaty.id == treaty_id).first()
    if not treaty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Договор не найден")
    game = check_game_access(db, treaty.game_id, current_user)

    if not _is_gm(db, game.id, current_user):
        country_b = db.query(Country).filter(Country.id == treaty.country_b_id).first()
        country_a = db.query(Country).filter(Country.id == treaty.country_a_id).first()
        is_party = (country_b and country_b.owner_user_id == current_user.id) or (
            country_a and country_a.owner_user_id == current_user.id
        )
        if not is_party:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет прав на изменение договора")

    treaty.status = status_in.status
    db.add(treaty)
    if not treaty.is_secret:
        log_history(
            db,
            game_id=game.id,
            user_id=current_user.id,
            action_type="treaty_status_changed",
            description=f"Статус договора «{treaty.title}» изменён на {treaty.status}",
            related_object_type="treaty",
            related_object_id=treaty.id,
            turn_number=game.current_turn_number,
        )
    db.commit()
    db.refresh(treaty)
    return treaty


@router.get("/games/{game_id}/relations", response_model=List[DiplomaticRelationRead])
def list_relations(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    return db.query(DiplomaticRelation).filter(DiplomaticRelation.game_id == game_id).all()


@router.put("/relations", response_model=DiplomaticRelationRead)
def upsert_relation(
    rel_in: DiplomaticRelationUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game = check_game_gm_access(db, rel_in.game_id, current_user)
    a_id, b_id = sorted([rel_in.country_a_id, rel_in.country_b_id])
    rel = (
        db.query(DiplomaticRelation)
        .filter(
            DiplomaticRelation.game_id == game.id,
            DiplomaticRelation.country_a_id == a_id,
            DiplomaticRelation.country_b_id == b_id,
        )
        .first()
    )
    if rel:
        rel.relation_score = rel_in.relation_score
        rel.status = rel_in.status
    else:
        rel = DiplomaticRelation(
            game_id=game.id,
            country_a_id=a_id,
            country_b_id=b_id,
            relation_score=rel_in.relation_score,
            status=rel_in.status,
        )
    db.add(rel)
    log_history(
        db,
        game_id=game.id,
        user_id=current_user.id,
        action_type="diplomatic_relation_updated",
        description=f"Отношения государств #{a_id} и #{b_id}: {rel_in.relation_score} ({rel_in.status})",
        related_object_type="diplomatic_relation",
        turn_number=game.current_turn_number,
    )
    db.commit()
    db.refresh(rel)
    return rel

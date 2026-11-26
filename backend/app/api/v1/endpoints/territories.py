from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access, check_game_gm_access
from app.models.territory import Territory
from app.models.country import Country
from app.models.user import User
from app.schemas.territory import (
    TerritoryCreate,
    TerritoryRead,
    TerritoryUpdate,
    TerritoryOwnerAssign,
    GeoJSONImportRequest,
    GeoJSONImportResponse,
)
from app.services.geojson_service import geojson_to_multipolygon_dict, geojson_to_wkt
from app.services.history_service import log_history
from app.services.historical_service import get_historical_geojson, color_for_country_name

router = APIRouter()


def _prepare_geometry_for_db(db: Session, geom: Optional[Dict[str, Any]]) -> Any:
    if geom is None:
        return None
    norm = geojson_to_multipolygon_dict(geom)
    if norm is None:
        return None
    dialect = db.bind.dialect.name if db.bind is not None else "postgresql"
    if dialect == "postgresql":
        return geojson_to_wkt(norm)
    return norm


@router.post("/", response_model=TerritoryRead, status_code=status.HTTP_201_CREATED)
def create_territory(
    territory_in: TerritoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать территорию (только ведущий / админ)."""
    game = check_game_gm_access(db, territory_in.game_id, current_user)
    data = territory_in.model_dump(exclude_unset=True)
    if "geometry" in data:
        data["geometry"] = _prepare_geometry_for_db(db, data["geometry"])
    territory = Territory(**data)
    db.add(territory)
    db.flush()
    log_history(
        db,
        game_id=game.id,
        user_id=current_user.id,
        action_type="territory_created",
        description=f"Создана территория «{territory.name}»",
        related_object_type="territory",
        related_object_id=territory.id,
        turn_number=game.current_turn_number,
    )
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


@router.post("/games/{game_id}/import-geojson", response_model=GeoJSONImportResponse, status_code=status.HTTP_201_CREATED)
def import_geojson(
    game_id: int,
    payload: GeoJSONImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Импорт GeoJSON FeatureCollection или Feature в качестве территорий игры (ведущий)."""
    game = check_game_gm_access(db, game_id, current_user)

    if payload.default_country_id is not None:
        country = db.query(Country).filter(Country.id == payload.default_country_id, Country.game_id == game_id).first()
        if not country:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Государство не найдено в этой игре")

    gj = payload.geojson
    gtype = gj.get("type")
    if gtype == "FeatureCollection":
        features = gj.get("features") or []
    elif gtype == "Feature":
        features = [gj]
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ожидается GeoJSON FeatureCollection или Feature")

    if not features:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GeoJSON не содержит объектов (features)")

    if payload.replace_existing:
        db.query(Territory).filter(Territory.game_id == game_id).delete()

    created: List[Territory] = []
    for idx, feat in enumerate(features, start=1):
        geom = feat.get("geometry")
        if not geom or geom.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        props = feat.get("properties") or {}
        name = str(props.get("name") or props.get("NAME") or props.get("title") or f"Территория {idx}")[:200]
        population = props.get("population") or props.get("POP_EST") or 0
        try:
            population = int(population)
        except (TypeError, ValueError):
            population = 0

        t = Territory(
            game_id=game_id,
            country_id=payload.default_country_id,
            name=name,
            geometry=_prepare_geometry_for_db(db, geom),
            population=population,
            resources=props.get("resources"),
            economic_indicators=props.get("economic_indicators"),
            additional_info=props.get("description") or props.get("additional_info"),
        )
        db.add(t)
        created.append(t)

    if not created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="В GeoJSON не найдено полигонов (Polygon/MultiPolygon)")

    db.flush()
    log_history(
        db,
        game_id=game_id,
        user_id=current_user.id,
        action_type="geojson_imported",
        description=f"Импортировано территорий из GeoJSON: {len(created)}",
        related_object_type="game",
        related_object_id=game_id,
        turn_number=game.current_turn_number,
    )
    db.commit()
    for t in created:
        db.refresh(t)

    return GeoJSONImportResponse(imported_count=len(created), territories=created)


class ImportByYearRequest(BaseModel):
    year: Optional[int] = None
    create_countries: bool = True
    replace_existing: bool = False
    geojson: Optional[Dict[str, Any]] = None


@router.post("/games/{game_id}/import-by-year")
def import_by_scenario_year(
    game_id: int,
    payload: ImportByYearRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Импорт стран и территорий мира по указанному году сценария (ведущий)."""
    game = check_game_gm_access(db, game_id, current_user)
    target_year = payload.year if payload.year is not None else game.start_year

    if payload.geojson:
        matched_year = target_year
        gj = payload.geojson
    else:
        try:
            matched_year, gj = get_historical_geojson(target_year)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Не удалось загрузить историческую карту за {target_year} год: {exc}",
            )

    features = gj.get("features") or []
    if not features:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Карта не содержит объектов")

    if payload.replace_existing:
        db.query(Territory).filter(Territory.game_id == game_id).delete()

    existing_countries = {
        c.name.lower(): c
        for c in db.query(Country).filter(Country.game_id == game_id).all()
    }
    created_countries_count = 0
    imported_territories_count = 0

    for idx, feat in enumerate(features, start=1):
        geom = feat.get("geometry")
        if not geom or geom.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        props = feat.get("properties") or {}
        raw_name = props.get("NAME") or props.get("name") or props.get("ABBREVN")
        if not raw_name or str(raw_name).strip().lower() in ("unclaimed", "none", "null"):
            continue
        territory_name = str(raw_name).strip()[:200]
        owner_name = str(props.get("SUBJECTO") or props.get("PARTOF") or territory_name).strip()[:200]

        country_id = None
        if payload.create_countries and owner_name.lower() not in ("unclaimed", "antarctica"):
            key = owner_name.lower()
            country = existing_countries.get(key)
            if not country:
                country = Country(
                    game_id=game_id,
                    name=owner_name,
                    color=color_for_country_name(owner_name),
                    treasury=1000,
                    income=100,
                    expenses=50,
                )
                db.add(country)
                db.flush()
                existing_countries[key] = country
                created_countries_count += 1
            country_id = country.id

        t = Territory(
            game_id=game_id,
            country_id=country_id,
            name=territory_name,
            geometry=_prepare_geometry_for_db(db, geom),
            population=0,
        )
        db.add(t)
        imported_territories_count += 1

    log_history(
        db,
        game_id=game_id,
        user_id=current_user.id,
        action_type="historical_map_imported",
        description=f"Импортирована карта мира за {matched_year} г. (запрошен {target_year}): стран +{created_countries_count}, территорий +{imported_territories_count}",
        related_object_type="game",
        related_object_id=game_id,
        turn_number=game.current_turn_number,
    )
    db.commit()
    return {
        "requested_year": target_year,
        "matched_year": matched_year,
        "created_countries_count": created_countries_count,
        "imported_territories_count": imported_territories_count,
    }


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
    """Редактировать территорию (ведущий / админ)."""
    territory = db.query(Territory).filter(Territory.id == territory_id).first()
    if not territory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Территория не найдена")
    game = check_game_gm_access(db, territory.game_id, current_user)
    data = territory_in.model_dump(exclude_unset=True)
    if "geometry" in data:
        data["geometry"] = _prepare_geometry_for_db(db, data["geometry"])
    for field, value in data.items():
        setattr(territory, field, value)
    db.add(territory)
    log_history(
        db,
        game_id=game.id,
        user_id=current_user.id,
        action_type="territory_updated",
        description=f"Обновлена территория «{territory.name}»",
        related_object_type="territory",
        related_object_id=territory.id,
        turn_number=game.current_turn_number,
    )
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
    game = check_game_gm_access(db, territory.game_id, current_user)

    country_name = "Нейтральная"
    if assign.country_id is not None:
        country = db.query(Country).filter(Country.id == assign.country_id).first()
        if not country or country.game_id != territory.game_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Государство не найдено в этой игре")
        country_name = country.name

    territory.country_id = assign.country_id
    db.add(territory)
    log_history(
        db,
        game_id=game.id,
        user_id=current_user.id,
        action_type="territory_owner_changed",
        description=f"Территория «{territory.name}» передана государству «{country_name}»",
        related_object_type="territory",
        related_object_id=territory.id,
        turn_number=game.current_turn_number,
        metadata={"country_id": assign.country_id},
    )
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
    game = check_game_gm_access(db, territory.game_id, current_user)
    name = territory.name
    tid = territory.id
    db.delete(territory)
    log_history(
        db,
        game_id=game.id,
        user_id=current_user.id,
        action_type="territory_deleted",
        description=f"Удалена территория «{name}»",
        related_object_type="territory",
        related_object_id=tid,
        turn_number=game.current_turn_number,
    )
    db.commit()
    return None

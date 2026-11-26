from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user, check_game_access, check_game_gm_access
from app.models.project import Project
from app.models.country import Country
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectRead
from app.services.history_service import log_history

router = APIRouter()


@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать экономический проект (ведущий/админ или владелец страны)."""
    country = db.query(Country).filter(Country.id == project_in.country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Государство не найдено")
    game = check_game_access(db, country.game_id, current_user)
    if current_user.role not in ("admin", "gm") and country.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")

    project = Project(
        game_id=country.game_id,
        country_id=country.id,
        name=project_in.name,
        description=project_in.description,
        cost=project_in.cost,
        status=project_in.status,
    )
    db.add(project)
    log_history(
        db,
        game_id=country.game_id,
        user_id=current_user.id,
        action_type="project_created",
        description=f"Создан экономический проект «{project.name}» для «{country.name}» (стоимость: {project.cost})",
        related_object_type="country",
        related_object_id=country.id,
        turn_number=game.current_turn_number,
    )
    db.commit()
    db.refresh(project)
    return project


@router.get("/games/{game_id}", response_model=List[ProjectRead])
def list_projects(
    game_id: int,
    country_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_game_access(db, game_id, current_user)
    query = db.query(Project).filter(Project.game_id == game_id)
    if country_id:
        query = query.filter(Project.country_id == country_id)
    return query.order_by(Project.created_at.desc()).all()


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")
    game = check_game_gm_access(db, project.game_id, current_user)

    for field, value in project_in.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.add(project)
    log_history(
        db,
        game_id=project.game_id,
        user_id=current_user.id,
        action_type="project_updated",
        description=f"Обновлён экономический проект «{project.name}» (статус: {project.status})",
        related_object_type="project",
        related_object_id=project.id,
        turn_number=game.current_turn_number,
    )
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Проект не найден")
    check_game_gm_access(db, project.game_id, current_user)
    db.delete(project)
    db.commit()
    return None

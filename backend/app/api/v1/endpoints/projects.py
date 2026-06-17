from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.database.session import get_db
from app.models.base import User, Project, ProjectMember, Task, UserRole
from app.auth.security import get_current_user, get_current_admin
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectOut, ProjectMemberAdd

router = APIRouter()


def _build_project_out(p: Project, db: Session) -> dict:
    task_count = db.query(func.count(Task.id)).filter(Task.project_id == p.id).scalar() or 0
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "status": p.status,
        "owner_id": p.owner_id,
        "owner": p.owner,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "member_count": len(p.members),
        "task_count": task_count,
    }


@router.get("", response_model=List[ProjectOut])
def list_projects(
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Project)
    if current_user.role != UserRole.admin:
        member_ids = [m.project_id for m in current_user.project_memberships]
        owned_ids = [p.id for p in current_user.owned_projects]
        all_ids = list(set(member_ids + owned_ids))
        q = q.filter(Project.id.in_(all_ids))
    if status:
        q = q.filter(Project.status == status)
    if search:
        q = q.filter(Project.name.ilike(f"%{search}%"))
    projects = q.offset(skip).limit(limit).all()
    return [_build_project_out(p, db) for p in projects]


@router.post("", response_model=ProjectOut)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    project = Project(
        name=data.name,
        description=data.description,
        status=data.status,
        owner_id=current_user.id,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(project)
    db.flush()
    db.add(ProjectMember(project_id=project.id, user_id=current_user.id))
    for uid in (data.member_ids or []):
        if uid != current_user.id:
            if db.query(User).filter(User.id == uid).first():
                db.add(ProjectMember(project_id=project.id, user_id=uid))
    db.commit()
    db.refresh(project)
    return _build_project_out(project, db)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != UserRole.admin:
        member_ids = [m.user_id for m in project.members]
        if current_user.id not in member_ids:
            raise HTTPException(status_code=403, detail="Not a project member")
    return _build_project_out(project, db)


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return _build_project_out(project, db)


@router.post("/{project_id}/members")
def add_member(
    project_id: str,
    data: ProjectMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    exists = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == data.user_id,
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="User already a member")
    db.add(ProjectMember(project_id=project_id, user_id=data.user_id))
    db.commit()
    return {"message": "Member added"}


@router.delete("/{project_id}/members/{user_id}")
def remove_member(
    project_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Member removed"}

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.database.session import get_db
from app.models.base import User, Task, Project, TimeEntry, TaskStatus, UserStatus
from app.auth.security import get_current_user
from app.schemas.schemas import DashboardStats

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return DashboardStats(
        total_projects=db.query(func.count(Project.id)).scalar() or 0,
        active_projects=db.query(func.count(Project.id)).filter(Project.status == "active").scalar() or 0,
        total_tasks=db.query(func.count(Task.id)).scalar() or 0,
        open_tasks=db.query(func.count(Task.id)).filter(Task.status != TaskStatus.completed).scalar() or 0,
        completed_tasks=db.query(func.count(Task.id)).filter(Task.status == TaskStatus.completed).scalar() or 0,
        total_users=db.query(func.count(User.id)).scalar() or 0,
        active_users=db.query(func.count(User.id)).filter(User.status == UserStatus.active).scalar() or 0,
        total_hours_this_month=round(
            float(db.query(func.sum(TimeEntry.hours)).filter(TimeEntry.date >= month_start).scalar() or 0), 1
        ),
    )


@router.get("/recent-activity")
def recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = (
        db.query(Task)
        .order_by(Task.updated_at.desc().nullslast(), Task.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status.value,
            "priority": t.priority.value,
            "updated_at": (t.updated_at or t.created_at).isoformat() if (t.updated_at or t.created_at) else None,
            "assignee": {"id": t.assignee.id, "name": t.assignee.name} if t.assignee else None,
        }
        for t in tasks
    ]

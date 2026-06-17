from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database.session import get_db
from app.models.base import User, Task, Project, TimeEntry, ProjectMember, TaskStatus
from app.auth.security import get_current_admin
from app.schemas.schemas import StaffPerformanceItem, ProjectSummaryItem, TimeTrackingItem

router = APIRouter()


@router.get("/staff-performance", response_model=List[StaffPerformanceItem])
def staff_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    users = db.query(User).filter(User.status == "active").all()
    result = []
    for user in users:
        completed = db.query(func.count(Task.id)).filter(
            Task.assignee_id == user.id, Task.status == TaskStatus.completed
        ).scalar() or 0
        in_progress = db.query(func.count(Task.id)).filter(
            Task.assignee_id == user.id, Task.status == TaskStatus.in_progress
        ).scalar() or 0
        total_hours = db.query(func.sum(TimeEntry.hours)).filter(
            TimeEntry.user_id == user.id
        ).scalar() or 0.0
        projects_count = db.query(func.count(ProjectMember.id)).filter(
            ProjectMember.user_id == user.id
        ).scalar() or 0
        result.append(StaffPerformanceItem(
            user_id=user.id,
            user_name=user.name,
            tasks_completed=completed,
            tasks_in_progress=in_progress,
            total_hours=round(float(total_hours), 2),
            projects_count=projects_count,
        ))
    return result


@router.get("/project-summary", response_model=List[ProjectSummaryItem])
def project_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    projects = db.query(Project).all()
    result = []
    for project in projects:
        total_tasks = db.query(func.count(Task.id)).filter(Task.project_id == project.id).scalar() or 0
        completed_tasks = db.query(func.count(Task.id)).filter(
            Task.project_id == project.id, Task.status == TaskStatus.completed
        ).scalar() or 0
        progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        total_hours = db.query(func.sum(TimeEntry.hours)).join(Task).filter(
            Task.project_id == project.id
        ).scalar() or 0.0
        member_count = db.query(func.count(ProjectMember.id)).filter(
            ProjectMember.project_id == project.id
        ).scalar() or 0
        result.append(ProjectSummaryItem(
            project_id=project.id,
            project_name=project.name,
            status=project.status.value,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            progress_percent=round(progress, 1),
            total_hours=round(float(total_hours), 2),
            member_count=member_count,
        ))
    return result


@router.get("/time-tracking", response_model=List[TimeTrackingItem])
def time_tracking(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    rows = (
        db.query(
            User.id.label("user_id"),
            User.name.label("user_name"),
            Project.id.label("project_id"),
            Project.name.label("project_name"),
            func.sum(TimeEntry.hours).label("total_hours"),
            func.count(TimeEntry.id).label("entry_count"),
        )
        .join(TimeEntry, TimeEntry.user_id == User.id)
        .join(Task, Task.id == TimeEntry.task_id)
        .join(Project, Project.id == Task.project_id)
        .group_by(User.id, User.name, Project.id, Project.name)
        .all()
    )
    return [
        TimeTrackingItem(
            user_id=r.user_id,
            user_name=r.user_name,
            project_id=r.project_id,
            project_name=r.project_name,
            total_hours=round(float(r.total_hours), 2),
            entry_count=r.entry_count,
        )
        for r in rows
    ]

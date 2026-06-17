from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import os, uuid, aiofiles

from app.database.session import get_db
from app.models.base import (
    User, Task, TaskComment, TaskAttachment, TimeEntry,
    ProjectMember, Notification, NotificationType, UserRole,
)
from app.auth.security import get_current_user
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskOut, CommentCreate, CommentOut
from app.core.config import settings

router = APIRouter()


def _build_task_out(task: Task, db: Session) -> dict:
    total_hours = db.query(func.sum(TimeEntry.hours)).filter(
        TimeEntry.task_id == task.id
    ).scalar() or 0.0
    comment_count = db.query(func.count(TaskComment.id)).filter(
        TaskComment.task_id == task.id
    ).scalar() or 0
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "assignee_id": task.assignee_id,
        "creator_id": task.creator_id,
        "project_id": task.project_id,
        "parent_task_id": task.parent_task_id,
        "due_date": task.due_date,
        "estimated_hours": task.estimated_hours,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "assignee": task.assignee,
        "creator": task.creator,
        "total_hours": round(total_hours, 2),
        "comment_count": comment_count,
    }


def _can_access(task: Task, user: User, db: Session) -> bool:
    if user.role == UserRole.admin:
        return True
    return db.query(ProjectMember).filter(
        ProjectMember.project_id == task.project_id,
        ProjectMember.user_id == user.id,
    ).first() is not None


@router.get("", response_model=List[TaskOut])
def list_tasks(
    project_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Task)
    if current_user.role != UserRole.admin:
        member_project_ids = [m.project_id for m in current_user.project_memberships]
        q = q.filter(Task.project_id.in_(member_project_ids))
    if project_id:
        q = q.filter(Task.project_id == project_id)
    if assignee_id:
        q = q.filter(Task.assignee_id == assignee_id)
    if status:
        q = q.filter(Task.status == status)
    if priority:
        q = q.filter(Task.priority == priority)
    tasks = q.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    return [_build_task_out(t, db) for t in tasks]


@router.post("", response_model=TaskOut)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = Task(**data.model_dump(), creator_id=current_user.id)
    db.add(task)
    db.flush()
    if data.assignee_id and data.assignee_id != current_user.id:
        db.add(Notification(
            user_id=data.assignee_id,
            type=NotificationType.task_assigned,
            title="New task assigned",
            message=f"You have been assigned: {data.title}",
            related_id=task.id,
        ))
    db.commit()
    db.refresh(task)
    return _build_task_out(task, db)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not _can_access(task, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    return _build_task_out(task, db)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: str,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not _can_access(task, current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    old_status = task.status
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    if data.status and data.status != old_status and task.assignee_id:
        db.add(Notification(
            user_id=task.assignee_id,
            type=NotificationType.task_status_changed,
            title="Task status updated",
            message=f"'{task.title}' moved to {data.status}",
            related_id=task.id,
        ))
    db.commit()
    db.refresh(task)
    return _build_task_out(task, db)


@router.delete("/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role != UserRole.admin and task.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}


@router.get("/{task_id}/comments", response_model=List[CommentOut])
def list_comments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or not _can_access(task, current_user, db):
        raise HTTPException(status_code=404, detail="Task not found")
    return db.query(TaskComment).filter(TaskComment.task_id == task_id).order_by(TaskComment.created_at).all()


@router.post("/{task_id}/comments", response_model=CommentOut)
def add_comment(
    task_id: str,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or not _can_access(task, current_user, db):
        raise HTTPException(status_code=404, detail="Task not found")
    comment = TaskComment(task_id=task_id, user_id=current_user.id, content=data.content)
    db.add(comment)
    if task.assignee_id and task.assignee_id != current_user.id:
        db.add(Notification(
            user_id=task.assignee_id,
            type=NotificationType.new_comment,
            title="New comment",
            message=f"{current_user.name} commented on '{task.title}'",
            related_id=task_id,
        ))
    db.commit()
    db.refresh(comment)
    return comment


@router.post("/{task_id}/attachments")
async def upload_attachment(
    task_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or not _can_access(task, current_user, db):
        raise HTTPException(status_code=404, detail="Task not found")
    ext = os.path.splitext(file.filename or "file")[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, "attachments", filename)
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)
    att = TaskAttachment(
        task_id=task_id,
        file_name=file.filename or filename,
        file_path=f"attachments/{filename}",
        file_size=len(content),
        file_type=file.content_type,
        uploaded_by=current_user.id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return {"id": att.id, "file_name": att.file_name, "file_size": att.file_size}

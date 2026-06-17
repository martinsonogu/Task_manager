from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.database.session import get_db
from app.models.base import User, TimeEntry, Task, UserRole
from app.auth.security import get_current_user
from app.schemas.schemas import TimeEntryCreate, TimeEntryOut

router = APIRouter()


@router.get("", response_model=List[TimeEntryOut])
def list_time_entries(
    task_id: Optional[str] = None,
    user_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(TimeEntry)
    if current_user.role != UserRole.admin:
        q = q.filter(TimeEntry.user_id == current_user.id)
    elif user_id:
        q = q.filter(TimeEntry.user_id == user_id)
    if task_id:
        q = q.filter(TimeEntry.task_id == task_id)
    return q.order_by(TimeEntry.date.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=TimeEntryOut)
def create_time_entry(
    data: TimeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    entry = TimeEntry(**data.model_dump(), user_id=current_user.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
def delete_time_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    if entry.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(entry)
    db.commit()
    return {"message": "Deleted"}

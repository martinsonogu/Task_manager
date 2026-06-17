from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, aiofiles

from app.database.session import get_db
from app.models.base import User, Document, Project, ProjectMember, UserRole
from app.auth.security import get_current_user
from app.schemas.schemas import DocumentOut
from app.core.config import settings

router = APIRouter()


@router.get("", response_model=List[DocumentOut])
def list_documents(
    project_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Document)
    if project_id:
        q = q.filter(Document.project_id == project_id)
    elif current_user.role != UserRole.admin:
        member_ids = [m.project_id for m in current_user.project_memberships]
        q = q.filter(Document.project_id.in_(member_ids))
    return q.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    ext = os.path.splitext(file.filename or "file")[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, "documents", filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)
    doc = Document(
        file_name=file.filename or filename,
        file_path=f"documents/{filename}",
        file_size=len(content),
        file_type=file.content_type,
        uploaded_by=current_user.id,
        project_id=project_id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.uploaded_by != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    full_path = os.path.join(settings.UPLOAD_DIR, doc.file_path)
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}

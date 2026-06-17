from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.base import UserRole, UserStatus, ProjectStatus, TaskStatus, TaskPriority, NotificationType


# ─── Auth ────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str


# ─── User ────────────────────────────────────────────────
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.staff
    department: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    status: Optional[UserStatus] = None

class UserPasswordReset(BaseModel):
    new_password: str = Field(min_length=8)

class UserOut(UserBase):
    id: str
    status: UserStatus
    avatar_url: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Project ─────────────────────────────────────────────
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.planning
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    member_ids: Optional[List[str]] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: ProjectStatus
    owner_id: str
    owner: UserOut
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    member_count: int = 0
    task_count: int = 0

    model_config = {"from_attributes": True}

class ProjectMemberAdd(BaseModel):
    user_id: str


# ─── Task ────────────────────────────────────────────────
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.new
    priority: TaskPriority = TaskPriority.medium
    assignee_id: Optional[str] = None
    project_id: str
    parent_task_id: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None

class TaskOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    assignee_id: Optional[str] = None
    creator_id: str
    project_id: str
    parent_task_id: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    assignee: Optional[UserOut] = None
    creator: Optional[UserOut] = None
    comment_count: int = 0
    total_hours: float = 0.0

    model_config = {"from_attributes": True}


# ─── Comment ─────────────────────────────────────────────
class CommentCreate(BaseModel):
    content: str

class CommentOut(BaseModel):
    id: str
    task_id: str
    user_id: str
    content: str
    created_at: datetime
    user: UserOut

    model_config = {"from_attributes": True}


# ─── Time Entry ──────────────────────────────────────────
class TimeEntryCreate(BaseModel):
    task_id: str
    hours: float = Field(gt=0, le=24)
    notes: Optional[str] = None
    date: datetime

class TimeEntryOut(BaseModel):
    id: str
    task_id: str
    user_id: str
    hours: float
    notes: Optional[str] = None
    date: datetime
    created_at: datetime
    user: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ─── Document ────────────────────────────────────────────
class DocumentOut(BaseModel):
    id: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    uploaded_by: str
    project_id: Optional[str] = None
    created_at: datetime
    uploaded_by_user: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ─── Notification ────────────────────────────────────────
class NotificationOut(BaseModel):
    id: str
    type: NotificationType
    title: str
    message: str
    is_read: bool
    related_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Reports ─────────────────────────────────────────────
class StaffPerformanceItem(BaseModel):
    user_id: str
    user_name: str
    tasks_completed: int
    tasks_in_progress: int
    total_hours: float
    projects_count: int

class ProjectSummaryItem(BaseModel):
    project_id: str
    project_name: str
    status: str
    total_tasks: int
    completed_tasks: int
    progress_percent: float
    total_hours: float
    member_count: int

class TimeTrackingItem(BaseModel):
    user_id: str
    user_name: str
    project_id: str
    project_name: str
    total_hours: float
    entry_count: int


# ─── Dashboard ───────────────────────────────────────────
class DashboardStats(BaseModel):
    total_projects: int
    active_projects: int
    total_tasks: int
    open_tasks: int
    completed_tasks: int
    total_users: int
    active_users: int
    total_hours_this_month: float

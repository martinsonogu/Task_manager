from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, projects, tasks, time_entries, documents, notifications, reports, dashboard

api_router = APIRouter()
api_router.include_router(auth.router,          prefix="/auth",           tags=["auth"])
api_router.include_router(users.router,         prefix="/users",          tags=["users"])
api_router.include_router(projects.router,      prefix="/projects",       tags=["projects"])
api_router.include_router(tasks.router,         prefix="/tasks",          tags=["tasks"])
api_router.include_router(time_entries.router,  prefix="/time-entries",   tags=["time-entries"])
api_router.include_router(documents.router,     prefix="/documents",      tags=["documents"])
api_router.include_router(notifications.router, prefix="/notifications",  tags=["notifications"])
api_router.include_router(reports.router,       prefix="/reports",        tags=["reports"])
api_router.include_router(dashboard.router,     prefix="/dashboard",      tags=["dashboard"])

from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "ops_platform",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.jobs"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-due-dates-daily": {
            "task": "app.tasks.jobs.check_due_dates",
            "schedule": 86400.0,
        },
    },
)

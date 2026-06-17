from app.tasks.celery_app import celery_app
from datetime import datetime, timedelta


@celery_app.task
def check_due_dates():
    from app.database.session import SessionLocal
    from app.models.base import Task, Notification, NotificationType, TaskStatus
    db = SessionLocal()
    try:
        tomorrow = datetime.utcnow() + timedelta(hours=24)
        now = datetime.utcnow()
        due_soon = db.query(Task).filter(
            Task.due_date <= tomorrow,
            Task.due_date >= now,
            Task.status != TaskStatus.completed,
            Task.assignee_id.isnot(None),
        ).all()
        for task in due_soon:
            existing = db.query(Notification).filter(
                Notification.related_id == task.id,
                Notification.type == NotificationType.due_date_approaching,
            ).first()
            if not existing:
                db.add(Notification(
                    user_id=task.assignee_id,
                    type=NotificationType.due_date_approaching,
                    title="Task due soon",
                    message=f"'{task.title}' is due within 24 hours",
                    related_id=task.id,
                ))
        db.commit()
        return f"Checked {len(due_soon)} tasks"
    finally:
        db.close()


@celery_app.task
def send_email_notification(user_email: str, subject: str, body: str):
    print(f"[EMAIL] To: {user_email} | Subject: {subject}")
    return True

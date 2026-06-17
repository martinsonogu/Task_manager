#!/usr/bin/env python3
"""Run: python seed.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database.session import SessionLocal, engine
from app.models.base import Base, User, Project, ProjectMember, Task, TimeEntry, UserRole, UserStatus, TaskStatus, TaskPriority, ProjectStatus
from app.auth.security import get_password_hash
from datetime import datetime, timedelta
import uuid


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).first():
            print("Database already seeded.")
            return

        print("Seeding database...")

        admin = User(
            id=str(uuid.uuid4()), name="Admin User",
            email="admin@opsplatform.com",
            hashed_password=get_password_hash("admin1234"),
            role=UserRole.admin, department="Management", status=UserStatus.active,
        )
        staff1 = User(
            id=str(uuid.uuid4()), name="Alice Johnson",
            email="alice@opsplatform.com",
            hashed_password=get_password_hash("staff1234"),
            role=UserRole.staff, department="Engineering", status=UserStatus.active,
        )
        staff2 = User(
            id=str(uuid.uuid4()), name="Bob Smith",
            email="bob@opsplatform.com",
            hashed_password=get_password_hash("staff1234"),
            role=UserRole.staff, department="Design", status=UserStatus.active,
        )
        db.add_all([admin, staff1, staff2])
        db.flush()

        project = Project(
            id=str(uuid.uuid4()), name="Platform Launch v1.0",
            description="Initial launch of the operations platform.",
            status=ProjectStatus.active, owner_id=admin.id,
            start_date=datetime.utcnow() - timedelta(days=30),
            end_date=datetime.utcnow() + timedelta(days=60),
        )
        db.add(project)
        db.flush()

        for uid in [admin.id, staff1.id, staff2.id]:
            db.add(ProjectMember(project_id=project.id, user_id=uid))

        tasks_data = [
            ("Set up CI/CD pipeline", "Configure automated testing and deployment.", TaskStatus.completed, TaskPriority.high, staff1.id),
            ("Design system audit", "Review UI components for consistency.", TaskStatus.in_progress, TaskPriority.medium, staff2.id),
            ("API documentation", "Write OpenAPI docs for all endpoints.", TaskStatus.in_progress, TaskPriority.medium, staff1.id),
            ("User acceptance testing", "Coordinate UAT sessions with stakeholders.", TaskStatus.new, TaskPriority.high, None),
            ("Performance optimisation", "Profile and optimise slow queries.", TaskStatus.new, TaskPriority.critical, staff1.id),
        ]

        task_objs = []
        for title, desc, status, priority, assignee_id in tasks_data:
            t = Task(
                id=str(uuid.uuid4()), title=title, description=desc,
                status=status, priority=priority,
                assignee_id=assignee_id, creator_id=admin.id,
                project_id=project.id,
                due_date=datetime.utcnow() + timedelta(days=14),
            )
            db.add(t)
            task_objs.append(t)

        db.flush()

        for task in task_objs[:3]:
            if task.assignee_id:
                db.add(TimeEntry(
                    task_id=task.id, user_id=task.assignee_id,
                    hours=3.5, notes="Initial work session",
                    date=datetime.utcnow() - timedelta(days=2),
                ))

        db.commit()
        print("✓ Seeded successfully!")
        print("\nLogin credentials:")
        print("  Admin:  admin@opsplatform.com / admin1234")
        print("  Staff:  alice@opsplatform.com / staff1234")
        print("  Staff:  bob@opsplatform.com   / staff1234")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()

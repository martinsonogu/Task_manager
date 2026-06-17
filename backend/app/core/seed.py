# from sqlalchemy.orm import Session
# from app.models.base import User, UserRole, UserStatus
# from app.auth.security import get_password_hash


# def create_initial_admin(db: Session):
#     if db.query(User).first():
#         return

#     admin = User(
#         name="Admin",
#         email="admin@opsplatform.com",
#         hashed_password=get_password_hash("Password1234"),
#         role=UserRole.admin,
#         status=UserStatus.active,
#     )

#     db.add(admin)
#     db.commit()

from sqlalchemy.orm import Session
from app.models.base import User, UserRole, UserStatus
from app.auth.security import get_password_hash


def create_initial_admin(db: Session):
    admin_exists = (
        db.query(User)
        .filter(User.role == UserRole.admin)
        .first()
    )

    if admin_exists:
        return

    admin = User(
        name="Admin",
        email="admin@opsplatform.com",
        hashed_password=get_password_hash("Password1234"),
        role=UserRole.admin,
        status=UserStatus.active,
    )

    db.add(admin)
    db.commit()

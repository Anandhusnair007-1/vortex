import sys
import os
import uuid
import bcrypt
from sqlalchemy.orm import Session

sys.path.append(os.getcwd())

from app.core.database import SessionLocal, Base
from app.models.user import User
from app.models.vm_template import VmTemplate
from app.models.vm_request import VmRequest
from app.models.notification import Notification


def hash_pass_direct(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def seed():
    # Create all tables first
    print("Creating database tables...")
    Base.metadata.create_all(bind=SessionLocal().get_bind())
    print("Tables created.")
    db = SessionLocal()
    try:
        # Create ADMIN user with literal 'admin' as email/username
        admin_id = "admin"
        admin_user = db.query(User).filter(User.email == admin_id).first()

        hashed_pw = hash_pass_direct("cyberdrift@2026")

        if not admin_user:
            admin_user = User(
                id=str(uuid.uuid4()),
                email=admin_id,
                name="System Administrator",
                password=hashed_pw,
                role="ADMIN",
                is_active=True,
            )
            db.add(admin_user)
            print(f"Created Admin user: {admin_id}")
        else:
            admin_user.password = hashed_pw
            admin_user.name = "System Administrator"  # Ensure name is set
            print(f"Updated Admin user password: {admin_id}")

        db.commit()

        # Create TEAM LEAD user
        tl_id = "teamlead"
        tl_user = db.query(User).filter(User.email == tl_id).first()
        if not tl_user:
            tl_user = User(
                id=str(uuid.uuid4()),
                email=tl_id,
                name="Systems Team Lead",
                password=hashed_pw,
                role="TEAM_LEAD",
                is_active=True,
            )
            db.add(tl_user)
            print(f"Created Team Lead user: {tl_id}")
        else:
            tl_user.password = hashed_pw
            print(f"Updated Team Lead user password: {tl_id}")

        # Create EMPLOYEE user
        emp_id = "employee"
        emp_user = db.query(User).filter(User.email == emp_id).first()
        if not emp_user:
            emp_user = User(
                id=str(uuid.uuid4()),
                email=emp_id,
                name="Staff Member",
                password=hashed_pw,
                role="EMPLOYEE",
                is_active=True,
            )
            db.add(emp_user)
            print(f"Created Employee user: {emp_id}")
        else:
            emp_user.password = hashed_pw
            print(f"Updated Employee user password: {emp_id}")

        db.commit()
        print("Seeding completed successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed()

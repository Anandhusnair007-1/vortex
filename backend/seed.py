import sys
import os
from datetime import datetime
from sqlalchemy.orm import Session

# Add current directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password, encrypt_vm_password
from app.models.user import User, UserRole
from app.models.vm_template import VmTemplate
from app.models.vm_request import VmRequest
from app.models.audit_log import AuditLog


def seed():
    db = SessionLocal()
    try:
        # Create tables (fallback if alembic not run)
        Base.metadata.create_all(bind=engine)

        if db.query(User).filter(User.email == "admin@company.com").first():
            print("Database already seeded.")
            return

        print("Seeding database...")

        # 1. Users
        users = [
            User(
                email="admin@company.com",
                name="System Admin",
                password=hash_password("cyberdrift@2026"),
                role=UserRole.ADMIN,
            ),
            User(
                email="itadmin@company.com",
                name="IT Admin",
                password=hash_password("cyberdrift@2026"),
                role=UserRole.IT_TEAM,
            ),
            User(
                email="teamlead@company.com",
                name="Team Lead",
                password=hash_password("cyberdrift@2026"),
                role=UserRole.TEAM_LEAD,
            ),
            User(
                email="employee@company.com",
                name="John Employee",
                password=hash_password("cyberdrift@2026"),
                role=UserRole.EMPLOYEE,
            ),
        ]
        db.add_all(users)
        db.commit()

        admin = db.query(User).filter(User.email == "admin@company.com").first()
        tl = db.query(User).filter(User.email == "teamlead@company.com").first()
        emp = db.query(User).filter(User.email == "employee@company.com").first()

        # 2. Templates
        templates = [
            VmTemplate(
                name="Ubuntu 22.04 Small",
                os="Ubuntu",
                os_type="UBUNTU",
                cpu=2,
                ram_gb=4,
                disk_gb=50,
                proxmox_template_id="100",
                created_by=admin.id,
            ),
            VmTemplate(
                name="Ubuntu 22.04 Medium",
                os="Ubuntu",
                os_type="UBUNTU",
                cpu=4,
                ram_gb=8,
                disk_gb=100,
                proxmox_template_id="101",
                created_by=admin.id,
            ),
            VmTemplate(
                name="Windows Server 2022",
                os="Windows",
                os_type="WINDOWS",
                cpu=4,
                ram_gb=16,
                disk_gb=150,
                proxmox_template_id="102",
                created_by=admin.id,
            ),
        ]
        db.add_all(templates)
        db.commit()

        t1 = templates[0]
        t2 = templates[1]
        t3 = templates[2]

        # 3. Sample Requests
        requests = [
            VmRequest(
                requester_id=emp.id,
                title="Dev workstation needed",
                justification="Need for local development testing",
                template_id=t1.id,
                status="PENDING_TL",
                request_type="VDI",
            ),
            VmRequest(
                requester_id=emp.id,
                title="Testing server",
                justification="Benchmark testing",
                template_id=t2.id,
                status="PENDING_IT",
                request_type="VM",
                tl_approver_id=tl.id,
                tl_approved_at=datetime.utcnow(),
                tl_note="Approved for project X",
            ),
            VmRequest(
                requester_id=emp.id,
                title="Application Server",
                justification="Hosting new app",
                template_id=t1.id,
                status="ACTIVE",
                request_type="VM",
                tl_approver_id=tl.id,
                tl_approved_at=datetime.utcnow(),
                ip_address="192.168.1.101",
                mac_address="02:00:00:11:22:33",
                vm_username="sara_vm",
                vm_password=encrypt_vm_password("Demo@Pass123"),
                proxmox_vm_id="mock-101",
                proxmox_node="mock-node",
            ),
            VmRequest(
                requester_id=emp.id,
                title="Legacy Windows Env",
                justification="Legacy app testing",
                template_id=t3.id,
                status="REJECTED",
                request_type="VDI",
                tl_approver_id=tl.id,
                tl_approved_at=datetime.utcnow(),
                tl_note="Not needed this quarter",
            ),
        ]
        db.add_all(requests)
        db.commit()

        # 4. Audit Logs
        for r in requests:
            db.add(
                AuditLog(
                    user_id=r.requester_id,
                    action="REQUEST_SUBMITTED",
                    entity_type="vm_request",
                    entity_id=r.id,
                )
            )
            if r.tl_approver_id:
                db.add(
                    AuditLog(
                        user_id=r.tl_approver_id,
                        action="TL_APPROVED",
                        entity_type="vm_request",
                        entity_id=r.id,
                        details=r.tl_note,
                    )
                )
            if r.status == "ACTIVE":
                db.add(
                    AuditLog(
                        user_id=None,
                        action="VM_PROVISIONED",
                        entity_type="vm_request",
                        entity_id=r.id,
                    )
                )
            elif r.status == "REJECTED":
                db.add(
                    AuditLog(
                        user_id=r.tl_approver_id,
                        action="TL_REJECTED",
                        entity_type="vm_request",
                        entity_id=r.id,
                        details=r.tl_note,
                    )
                )

        db.commit()
        print("✓ Database seeded successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed()

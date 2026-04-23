from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from datetime import datetime
import asyncio

from ...core.database import get_db
from ...core.security import encrypt_vm_password, decrypt_vm_password
from ...models.user import User, UserRole
from ...models.vm_request import VmRequest
from ...models.vm_template import VmTemplate
from ...models.audit_log import AuditLog
from ...models.notification import Notification
from ...schemas.vm_request import (
    VmRequestOut,
    VmRequestCreate,
    VmRequestStatus,
    VmRequestCredentials,
)
from ...services import proxmox, email, glpi
from ...core.security import get_current_user_flexible
from .auth import require_role

router = APIRouter()


def request_query(db: Session):
    return db.query(VmRequest).options(
        selectinload(VmRequest.requester),
        selectinload(VmRequest.template),
        selectinload(VmRequest.audit_logs).selectinload(AuditLog.user),
    )


def build_request_audit_log(
    request_id: str,
    action: str,
    user_id: Optional[str] = None,
    details: Optional[str] = None,
) -> AuditLog:
    return AuditLog(
        user_id=user_id,
        action=action,
        entity_type="vm_request",
        entity_id=request_id,
        details=details,
    )


@router.get("/", response_model=List[VmRequestOut])
async def get_requests(
    status: Optional[VmRequestStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
):
    query = request_query(db)

    if current_user.role == UserRole.EMPLOYEE:
        query = query.filter(VmRequest.requester_id == current_user.id)
    elif current_user.role == UserRole.TEAM_LEAD:
        # TL sees PENDING_TL and anything they touched
        query = query.filter(
            (VmRequest.status == VmRequestStatus.PENDING_TL)
            | (VmRequest.tl_approver_id == current_user.id)
        )

    if status:
        query = query.filter(VmRequest.status == status)

    return query.order_by(VmRequest.created_at.desc()).all()


@router.post("/", response_model=VmRequestOut)
async def create_request(
    request_in: VmRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
):
    template = (
        db.query(VmTemplate).filter(VmTemplate.id == request_in.template_id).first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    vm_name = f"vm-{current_user.name.lower().replace(' ', '-')}-{int(datetime.utcnow().timestamp())}"

    db_request = VmRequest(
        requester_id=current_user.id,
        title=request_in.title,
        justification=request_in.justification,
        template_id=request_in.template_id,
        vm_name=vm_name,
        request_type=request_in.request_type,
        status=VmRequestStatus.PENDING_TL,
    )
    db.add(db_request)
    db.flush()  # Get ID

    # Audit Log
    db.add(
        build_request_audit_log(
            request_id=db_request.id,
            user_id=current_user.id,
            action="REQUEST_SUBMITTED",
            details=f"Template: {template.name}",
        )
    )

    # Notifications for TLs
    tls = db.query(User).filter(User.role == UserRole.TEAM_LEAD).all()
    for tl in tls:
        db.add(
            Notification(
                user_id=tl.id,
                message=f"New VM request from {current_user.name}: {db_request.title}",
                type="APPROVAL_REQUIRED",
                request_id=db_request.id,
            )
        )
        # Email would be background task in real app
        # await email.send_tl_approval_request([tl.email], {"title": db_request.title, "requester": current_user.name})

    db.commit()
    return request_query(db).filter(VmRequest.id == db_request.id).first()


@router.get("/{request_id}", response_model=VmRequestOut)
async def get_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
):
    db_request = request_query(db).filter(VmRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Hide sensitive info for regular employees/TLs
    # (Pydantic Out schema can often handle this, but explicit logic is safer)
    return db_request


@router.post("/{request_id}/approve-tl", response_model=VmRequestOut)
async def approve_tl(
    request_id: str,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TEAM_LEAD, UserRole.ADMIN])),
):
    db_request = db.query(VmRequest).filter(VmRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")

    db_request.status = VmRequestStatus.PENDING_IT
    db_request.tl_approver_id = current_user.id
    db_request.tl_approved_at = datetime.utcnow()
    db_request.tl_note = note

    db.add(
        build_request_audit_log(
            request_id=db_request.id,
            user_id=current_user.id,
            action="TL_APPROVED",
            details=note,
        )
    )

    # Notify IT
    it_users = db.query(User).filter(User.role == UserRole.IT_TEAM).all()
    for it in it_users:
        db.add(
            Notification(
                user_id=it.id,
                message=f"TL Approved: {db_request.title}",
                type="PROVISIONING_REQUIRED",
                request_id=db_request.id,
            )
        )

    db.commit()
    return request_query(db).filter(VmRequest.id == db_request.id).first()


async def provision_vm_task(request_id: str):
    from ...core.database import SessionLocal

    db = SessionLocal()
    try:
        db_request = request_query(db).filter(VmRequest.id == request_id).first()
        if not db_request:
            return

        template = db_request.template

        # Call service
        result = await proxmox.provision_vm(db_request, template)

        if result["success"]:
            db_request.status = VmRequestStatus.ACTIVE
            db_request.proxmox_vm_id = result["vm_id"]
            db_request.proxmox_node = result["node"]
            db_request.ip_address = result["ip_address"]
            db_request.mac_address = result["mac_address"]
            db_request.vm_username = result["vm_username"]
            db_request.vm_password = encrypt_vm_password(result["vm_password"])

            db.add(
                build_request_audit_log(
                    request_id=db_request.id,
                    user_id=None,
                    action="VM_PROVISIONED",
                )
            )
            await glpi.create_ticket(db_request, result)
            await email.send_vm_ready_email(
                db_request.requester.email, result["vm_username"], result["vm_password"]
            )
            db.add(
                Notification(
                    user_id=db_request.requester_id,
                    message="Your VM is ready!",
                    type="SUCCESS",
                    request_id=db_request.id,
                )
            )
        else:
            db_request.status = VmRequestStatus.FAILED
            db_request.error_message = result.get("error", "Unknown error")
            db.add(
                build_request_audit_log(
                    request_id=db_request.id,
                    user_id=None,
                    action="PROVISIONING_FAILED",
                    details=db_request.error_message,
                )
            )

        db.commit()
    except Exception as e:
        print(f"Provisioning Error: {e}")
    finally:
        db.close()


@router.post("/{request_id}/approve-it", response_model=VmRequestOut)
async def approve_it(
    request_id: str,
    background_tasks: BackgroundTasks,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.IT_TEAM, UserRole.ADMIN])),
):
    db_request = request_query(db).filter(VmRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")

    db_request.status = VmRequestStatus.PROVISIONING
    db_request.it_approver_id = current_user.id
    db_request.it_approved_at = datetime.utcnow()
    db_request.it_note = note

    db.add(
        build_request_audit_log(
            request_id=db_request.id,
            user_id=current_user.id,
            action="IT_APPROVED",
            details=note,
        )
    )
    db.commit()

    background_tasks.add_task(provision_vm_task, db_request.id)

    return request_query(db).filter(VmRequest.id == db_request.id).first()


@router.get("/{request_id}/credentials", response_model=VmRequestCredentials)
async def get_credentials(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.IT_TEAM, UserRole.ADMIN])),
):
    db_request = db.query(VmRequest).filter(VmRequest.id == request_id).first()
    if not db_request or db_request.status != VmRequestStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Active VM not found")

    return {
        "vm_username": db_request.vm_username,
        "vm_password": decrypt_vm_password(db_request.vm_password),
        "ip_address": db_request.ip_address,
        "proxmox_node": db_request.proxmox_node,
    }

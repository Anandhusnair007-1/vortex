from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth import require_roles
from models import RFIDAccess, User
from schemas import (
    RFIDAccessBulkRequest,
    RFIDAccessResponse,
    RFIDAuditEntry,
    RFIDDeviceActionResponse,
    RFIDDeviceCreateRequest,
    RFIDDeviceDetailResponse,
    RFIDDeviceResponse,
    RFIDDeviceUpdateRequest,
)
from services.rfid_service import rfid_service

router = APIRouter(tags=["rfid"])


@router.get("/devices", response_model=list[RFIDDeviceResponse])
def list_devices(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> list:
    return rfid_service.list_devices(db)


@router.get("/devices/{device_id}", response_model=RFIDDeviceDetailResponse)
def get_device_detail(
    device_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> RFIDDeviceDetailResponse:
    return rfid_service.get_device_detail(db, device_id)


@router.post("/devices", response_model=RFIDDeviceResponse, status_code=status.HTTP_201_CREATED)
def create_device(
    payload: RFIDDeviceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"admin", "team-lead"})),
):
    return rfid_service.create_device(db, payload, current_user)


@router.put("/devices/{device_id}", response_model=RFIDDeviceResponse)
def update_device(
    device_id: str,
    payload: RFIDDeviceUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"admin", "team-lead"})),
):
    return rfid_service.update_device(db, device_id, payload, current_user)


@router.post("/devices/{device_id}/check", response_model=RFIDDeviceActionResponse)
def check_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> dict:
    return rfid_service.check_device(db, device_id, current_user)


@router.post("/devices/{device_id}/refresh-session", response_model=RFIDDeviceActionResponse)
def refresh_session(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> dict:
    return rfid_service.refresh_device_session(db, device_id, current_user)


@router.get("/devices/{device_id}/audit", response_model=list[RFIDAuditEntry])
def get_device_audit(
    device_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
    limit: int = Query(default=100, ge=1, le=1000),
) -> list[dict]:
    return rfid_service.get_device_audit(db, device_id, limit)


@router.get("/users/{user_id}/access", response_model=list[RFIDAccessResponse])
def get_user_access(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> list[RFIDAccess]:
    return (
        db.query(RFIDAccess)
        .filter(RFIDAccess.user_id == user_id, RFIDAccess.is_active.is_(True))
        .order_by(RFIDAccess.granted_at.desc())
        .all()
    )


@router.post("/access/grant", response_model=list[RFIDAccessResponse])
@router.post("/grant", response_model=list[RFIDAccessResponse], include_in_schema=False)
def grant_access(
    payload: RFIDAccessBulkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> list[RFIDAccess]:
    return rfid_service.grant_access(db, payload, current_user)


@router.post("/access/revoke", response_model=list[RFIDAccessResponse])
@router.post("/revoke", response_model=list[RFIDAccessResponse], include_in_schema=False)
def revoke_access(
    payload: RFIDAccessBulkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> list[RFIDAccess]:
    return rfid_service.revoke_access(db, payload, current_user)


@router.get("/audit", response_model=list[RFIDAuditEntry])
def get_audit_log(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
    limit: int = Query(default=100, ge=1, le=1000),
) -> list[dict]:
    devices = rfid_service.list_devices(db)
    results: list[dict] = []
    for device in devices:
        results.extend(rfid_service.get_device_audit(db, device.id, limit))
    results.sort(key=lambda row: row["timestamp"], reverse=True)
    return results[:limit]


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"admin", "team-lead"})),
):
    return rfid_service.delete_device(db, device_id, current_user)

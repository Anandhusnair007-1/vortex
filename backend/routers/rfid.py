from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from models import RFIDDevice, RFIDAccess, User
from database import get_db
from auth.dependencies import require_engineer, require_admin

router = APIRouter(tags=["rfid"])


class RFIDDeviceRequest(BaseModel):
    name: str
    ip: str
    door_name: str
    location: str
    brand: str = "generic_http"
    credentials: Optional[dict] = None


class RFIDDeviceResponse(BaseModel):
    id: str
    name: str
    ip: str
    door_name: str
    location: str
    brand: str
    is_online: bool
    
    class Config:
        from_attributes = True


class RFIDAccessRequest(BaseModel):
    user_id: str
    device_ids: List[str]


class RFIDAccessResponse(BaseModel):
    id: str
    user_id: str
    device_id: str
    granted_at: str
    is_active: bool
    
    class Config:
        from_attributes = True


@router.get("/devices", response_model=List[RFIDDeviceResponse])
async def list_devices(db: Session = Depends(get_db)):
    """List all RFID devices"""
    devices = db.query(RFIDDevice).all()
    return devices


@router.post("/devices", response_model=RFIDDeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(
    request: RFIDDeviceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new RFID device (admin only)"""
    device = RFIDDevice(
        name=request.name,
        ip=request.ip,
        door_name=request.door_name,
        location=request.location,
        brand=request.brand,
        credentials=request.credentials
    )
    
    db.add(device)
    db.commit()
    db.refresh(device)
    
    return device


@router.get("/users/{user_id}/access", response_model=List[RFIDAccessResponse])
async def get_user_access(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer)
):
    """Get all doors a user has access to"""
    access_records = db.query(RFIDAccess).filter(
        (RFIDAccess.user_id == user_id) &
        (RFIDAccess.is_active == True)
    ).all()
    
    return access_records


@router.post("/grant", response_model=RFIDAccessResponse)
async def grant_access(
    request: RFIDAccessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer)
):
    """Grant a user access to RFID devices"""
    
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Grant access to first device for now (will expand)
    if not request.device_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one device ID is required"
        )
    
    device_id = request.device_ids[0]
    device = db.query(RFIDDevice).filter(RFIDDevice.id == device_id).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # Check if access already exists
    existing = db.query(RFIDAccess).filter(
        (RFIDAccess.user_id == request.user_id) &
        (RFIDAccess.device_id == device_id)
    ).first()
    
    if existing and existing.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has access to this device"
        )
    
    access = RFIDAccess(
        user_id=request.user_id,
        device_id=device_id,
        granted_by=current_user.id,
        is_active=True
    )
    
    db.add(access)
    db.commit()
    db.refresh(access)
    
    return access


@router.post("/revoke")
async def revoke_access(
    request: RFIDAccessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer)
):
    """Revoke a user's access to RFID devices"""
    
    for device_id in request.device_ids:
        access = db.query(RFIDAccess).filter(
            (RFIDAccess.user_id == request.user_id) &
            (RFIDAccess.device_id == device_id)
        ).first()
        
        if access:
            access.is_active = False
            access.revoked_at = __import__('datetime').datetime.utcnow()
            db.add(access)
    
    db.commit()
    
    return {"message": "Access revoked successfully"}


@router.get("/audit")
async def get_audit_log(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer),
    limit: int = 100
):
    """Get RFID audit log"""
    logs = db.query(RFIDAccess).order_by(RFIDAccess.granted_at.desc()).limit(limit).all()
    return logs

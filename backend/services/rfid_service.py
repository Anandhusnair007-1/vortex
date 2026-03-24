from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import ActivityLog, PointsConfig, RFIDAccess, RFIDDevice, User, DoorMapping, Floor, Building
from rfid.proxy import rfid_proxy
from schemas import RFIDAccessBulkRequest, RFIDDeviceCreateRequest, RFIDDeviceDetailResponse, RFIDDeviceUpdateRequest
from utils.security import encrypt_json


class RFIDService:
    @staticmethod
    def _points_for(db: Session, action_name: str, default: int) -> int:
        cfg = db.query(PointsConfig).filter(PointsConfig.action_name == action_name).first()
        return cfg.points_value if cfg else default

    @staticmethod
    def _log_activity(db: Session, user: User, action: str, target: str, detail: str, points_earned: int) -> None:
        db.add(
            ActivityLog(
                user_id=user.id,
                action=action,
                target=target,
                detail=detail,
                points_earned=points_earned,
            )
        )
        user.points_total = (user.points_total or 0) + points_earned

    def _get_device(self, db: Session, device_id: str) -> RFIDDevice:
        device = db.query(RFIDDevice).filter(RFIDDevice.id == device_id).first()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFID device not found")
        return device

    def list_devices(self, db: Session) -> list[RFIDDevice]:
        devices = (
            db.query(RFIDDevice)
            .outerjoin(DoorMapping, RFIDDevice.door_id == DoorMapping.id)
            .outerjoin(Floor, DoorMapping.floor_id == Floor.id)
            .outerjoin(Building, DoorMapping.building_id == Building.id)
            .order_by(RFIDDevice.created_at.desc())
            .all()
        )
        for device in devices:
            status_info = rfid_proxy.get_session_status(device)
            if status_info["session_active"]:
                device.is_online = True
            
            # Enrich with hierarchical location names for the frontend
            if device.door:
                device.door_name = device.door.name
                device.floor_name = device.door.floor.name
                device.building_name = device.door.floor.building.name
                device.location_path = f"{device.building_name} / {device.floor_name} / {device.door_name}"
            else:
                device.location_path = device.location or "Unassigned"
                
        return devices

    def get_device_detail(self, db: Session, device_id: str) -> RFIDDeviceDetailResponse:
        device = self._get_device(db, device_id)
        active_access_count = (
            db.query(RFIDAccess)
            .filter(RFIDAccess.device_id == device.id, RFIDAccess.is_active.is_(True))
            .count()
        )
        return RFIDDeviceDetailResponse(
            **{
                "id": device.id,
                "name": device.name,
                "ip_address": device.ip_address,
                "door_name": device.door_name,
                "location": device.location,
                "brand": device.brand,
                "is_online": device.is_online,
                "last_seen": device.last_seen,
                "created_at": device.created_at,
                "active_access_count": active_access_count,
                "session_status": rfid_proxy.get_session_status(device),
            }
        )

    def create_device(self, db: Session, payload: RFIDDeviceCreateRequest, actor: User) -> RFIDDevice:
        existing = db.query(RFIDDevice).filter(RFIDDevice.ip_address == payload.ip_address).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="RFID device IP already exists")

        device = RFIDDevice(
            name=payload.name,
            ip_address=payload.ip_address,
            door_name=payload.door_name,
            location=payload.location,
            brand=payload.brand,
            door_id=payload.door_id,
            credentials_encrypted=encrypt_json(payload.credentials) if payload.credentials else None,
            is_online=False,
        )

        db.add(device)
        self._log_activity(
            db,
            actor,
            action="rfid_device_create",
            target=payload.door_name,
            detail=f"Registered RFID device at {payload.ip_address}",
            points_earned=0,
        )
        db.commit()
        db.refresh(device)
        return device

    def update_device(self, db: Session, device_id: str, payload: RFIDDeviceUpdateRequest, actor: User) -> RFIDDevice:
        device = self._get_device(db, device_id)

        if payload.name is not None:
            device.name = payload.name
        if payload.door_name is not None:
            device.door_name = payload.door_name
        if payload.location is not None:
            device.location = payload.location
        if payload.brand is not None:
            device.brand = payload.brand
        if payload.is_online is not None:
            device.is_online = payload.is_online
        if payload.door_id is not None:
            device.door_id = payload.door_id
        if payload.credentials is not None:
            device.credentials_encrypted = encrypt_json(payload.credentials)

        self._log_activity(
            db,
            actor,
            action="rfid_device_update",
            target=device.door_name,
            detail=f"Updated RFID device {device.id}",
            points_earned=0,
        )
        db.commit()
        db.refresh(device)
        return device

    def check_device(self, db: Session, device_id: str, actor: User) -> dict:
        device = self._get_device(db, device_id)
        online = rfid_proxy.ping(device)
        device.is_online = online
        device.last_seen = datetime.utcnow() if online else device.last_seen
        self._log_activity(
            db,
            actor,
            action="rfid_device_check",
            target=device.door_name,
            detail=f"Connectivity check {'passed' if online else 'failed'} for {device.ip_address}",
            points_earned=0,
        )
        db.commit()
        db.refresh(device)
        return {
            "device_id": device.id,
            "status": "ok" if online else "degraded",
            "message": "Device reachable via backend-managed session" if online else "Device check failed",
            "session_status": rfid_proxy.get_session_status(device),
        }

    def refresh_device_session(self, db: Session, device_id: str, actor: User) -> dict:
        device = self._get_device(db, device_id)
        session_status = rfid_proxy.refresh_session(device)
        device.last_seen = datetime.utcnow()
        self._log_activity(
            db,
            actor,
            action="rfid_session_refresh",
            target=device.door_name,
            detail=f"Refreshed backend RFID session for {device.ip_address}",
            points_earned=0,
        )
        db.commit()
        return {
            "device_id": device.id,
            "status": "ok",
            "message": "Backend-managed RFID session refreshed",
            "session_status": session_status,
        }

    def delete_device(self, db: Session, device_id: str, actor: User) -> dict:
        device = self._get_device(db, device_id)
        # Delete related access records first
        db.query(RFIDAccess).filter(RFIDAccess.device_id == device.id).delete()

        device_name = device.name
        db.delete(device)
        self._log_activity(
            db,
            actor,
            action="rfid_device_delete",
            target=device_name,
            detail=f"Deleted RFID device {device_id}",
            points_earned=0,
        )
        db.commit()
        return {"id": device_id, "status": "deleted"}

    def get_device_audit(self, db: Session, device_id: str, limit: int = 100) -> list[dict]:
        device = self._get_device(db, device_id)
        rows = (
            db.query(RFIDAccess, User)
            .join(User, User.id == RFIDAccess.user_id)
            .filter(RFIDAccess.device_id == device.id)
            .order_by(RFIDAccess.granted_at.desc())
            .limit(limit)
            .all()
        )

        result: list[dict] = []
        for access, user in rows:
            action = "grant" if access.is_active else "revoke"
            timestamp = access.granted_at if access.is_active else (access.revoked_at or access.granted_at)
            result.append(
                {
                    "id": access.id,
                    "user_id": user.id,
                    "username": user.username,
                    "device_id": device.id,
                    "door_name": device.door_name,
                    "action": action,
                    "granted_by": access.granted_by,
                    "revoked_by": access.revoked_by,
                    "timestamp": timestamp,
                    "result": "success",
                }
            )
        return result

    def grant_access(self, db: Session, payload: RFIDAccessBulkRequest, actor: User) -> list[RFIDAccess]:
        target_user = db.query(User).filter(User.id == payload.user_id, User.is_active.is_(True)).first()
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

        granted: list[RFIDAccess] = []
        points_each = self._points_for(db, "grant_rfid", default=5)

        for device_id in payload.device_ids:
            device = self._get_device(db, device_id)
            success = rfid_proxy.grant(device, target_user.username)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to apply grant on device {device.name} ({device.ip_address})",
                )

            access = (
                db.query(RFIDAccess)
                .filter(RFIDAccess.user_id == target_user.id, RFIDAccess.device_id == device.id)
                .first()
            )
            if access:
                access.is_active = True
                access.granted_by = actor.id
                access.granted_at = datetime.utcnow()
                access.revoked_at = None
                access.revoked_by = None
            else:
                access = RFIDAccess(
                    user_id=target_user.id,
                    device_id=device.id,
                    granted_by=actor.id,
                    is_active=True,
                )
                db.add(access)

            device.is_online = True
            device.last_seen = datetime.utcnow()
            self._log_activity(
                db,
                actor,
                action="grant_rfid",
                target=device.door_name,
                detail=f"Granted {target_user.username} access to {device.ip_address} through backend session proxy",
                points_earned=points_each,
            )
            granted.append(access)

        db.commit()
        for item in granted:
            db.refresh(item)
        return granted

    def revoke_access(self, db: Session, payload: RFIDAccessBulkRequest, actor: User) -> list[RFIDAccess]:
        target_user = db.query(User).filter(User.id == payload.user_id, User.is_active.is_(True)).first()
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

        revoked: list[RFIDAccess] = []
        points_each = self._points_for(db, "revoke_rfid", default=3)

        for device_id in payload.device_ids:
            device = self._get_device(db, device_id)
            success = rfid_proxy.revoke(device, target_user.username)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to apply revoke on device {device.name} ({device.ip_address})",
                )

            access = (
                db.query(RFIDAccess)
                .filter(RFIDAccess.user_id == target_user.id, RFIDAccess.device_id == device.id)
                .first()
            )
            if not access:
                access = RFIDAccess(
                    user_id=target_user.id,
                    device_id=device.id,
                    granted_by=actor.id,
                    is_active=False,
                    revoked_at=datetime.utcnow(),
                    revoked_by=actor.id,
                )
                db.add(access)
            else:
                access.is_active = False
                access.revoked_at = datetime.utcnow()
                access.revoked_by = actor.id

            device.is_online = True
            device.last_seen = datetime.utcnow()
            self._log_activity(
                db,
                actor,
                action="revoke_rfid",
                target=device.door_name,
                detail=f"Revoked {target_user.username} access from {device.ip_address} through backend session proxy",
                points_earned=points_each,
            )
            revoked.append(access)

        db.commit()
        for item in revoked:
            db.refresh(item)
        return revoked


rfid_service = RFIDService()

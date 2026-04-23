from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...core.database import get_db
from ...models.user import User
from ...models.notification import Notification
from ...schemas.auth import NotificationOut
from ...core.security import get_current_user_flexible

router = APIRouter()

@router.get("/", response_model=List[NotificationOut])
async def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).all()

@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    return {"status": "ok"}

@router.put("/read-all")
async def read_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).update({"is_read": True})
    db.commit()
    return {"status": "ok"}

from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from models import Alert, User
from database import get_db
from auth.dependencies import get_current_user, require_engineer

router = APIRouter(tags=["alerts"])

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()


class AlertRequest(BaseModel):
    source: str  # "observium", "awx", "manual"
    device_name: str
    issue: str
    severity: str  # "critical", "warning", "info"
    description: Optional[str] = None
    resolved: Optional[bool] = False
    alert_id: Optional[str] = None
    metadata: Optional[dict] = None


class AlertResponse(BaseModel):
    id: str
    source: str
    device_name: str
    issue: str
    severity: str
    description: Optional[str]
    is_resolved: bool
    created_at: datetime
    resolved_at: Optional[datetime]
    
    class Config:
        from_attributes = True


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    request: AlertRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new alert (from Observium or AWX webhook)
    """
    # Check if this is a resolution for an existing alert
    if request.resolved and request.alert_id:
        alert = db.query(Alert).filter(Alert.id == request.alert_id).first()
        if alert:
            alert.is_resolved = True
            alert.resolved_at = datetime.utcnow()
            db.commit()
            db.refresh(alert)
            
            # Broadcast resolution to all WebSocket clients
            await manager.broadcast({
                "type": "alert_resolved",
                "alert_id": alert.id,
                "timestamp": alert.resolved_at.isoformat()
            })
            
            return alert
    
    # Create new alert
    alert = Alert(
        source=request.source,
        device_name=request.device_name,
        issue=request.issue,
        severity=request.severity,
        description=request.description,
        metadata=request.metadata
    )
    
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    # Broadcast to all connected clients
    await manager.broadcast({
        "type": "new_alert",
        "alert": {
            "id": alert.id,
            "source": alert.source,
            "device_name": alert.device_name,
            "issue": alert.issue,
            "severity": alert.severity,
            "created_at": alert.created_at.isoformat()
        }
    })
    
    return alert


@router.get("/", response_model=List[AlertResponse])
async def get_active_alerts(
    db: Session = Depends(get_db),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    source: Optional[str] = Query(None, description="Filter by source"),
    limit: int = Query(50, ge=1, le=500)
):
    """Get all active (unresolved) alerts"""
    query = db.query(Alert).filter(Alert.is_resolved == False)
    
    if severity:
        query = query.filter(Alert.severity == severity)
    
    if source:
        query = query.filter(Alert.source == source)
    
    alerts = query.order_by(
        Alert.severity.desc(),
        Alert.created_at.desc()
    ).limit(limit).all()
    
    return alerts


@router.get("/history", response_model=List[AlertResponse])
async def get_alert_history(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    days: int = Query(7, ge=1, le=90)
):
    """Get alert history (including resolved alerts)"""
    since = datetime.utcnow() - timedelta(days=days)
    
    alerts = db.query(Alert).filter(
        Alert.created_at >= since
    ).order_by(
        Alert.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return alerts


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer)
):
    """Manually resolve an alert"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    if alert.is_resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alert is already resolved"
        )
    
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = current_user.id
    
    db.commit()
    db.refresh(alert)
    
    # Broadcast resolution
    await manager.broadcast({
        "type": "alert_resolved",
        "alert_id": alert.id,
        "resolved_by": current_user.username,
        "timestamp": alert.resolved_at.isoformat()
    })
    
    return alert


@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time alert streaming"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back any messages received
            await websocket.send_json({"type": "ping", "message": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

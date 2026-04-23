from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth import require_roles
from models import ActivityLog, Alert, PointsConfig, User
from schemas import AlertCreateRequest, AlertResponse
from websocket.alert_manager import alert_ws_manager

router = APIRouter(tags=["alerts"])


def _points_for_resolve(db: Session) -> int:
    cfg = db.query(PointsConfig).filter(PointsConfig.action_name == "resolve_alert").first()
    return cfg.points_value if cfg else 8


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(payload: AlertCreateRequest, db: Session = Depends(get_db)) -> Alert:
    alert = Alert(
        source=payload.source,
        device_name=payload.device_name,
        issue_type=payload.issue_type,
        severity=payload.severity,
        message=payload.message,
        is_resolved=False,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    await alert_ws_manager.broadcast(
        {
            "type": "new_alert",
            "alert": {
                "id": alert.id,
                "source": alert.source,
                "device_name": alert.device_name,
                "issue_type": alert.issue_type,
                "severity": alert.severity,
                "message": alert.message,
                "is_resolved": alert.is_resolved,
                "created_at": alert.created_at.isoformat(),
            },
        }
    )
    return alert


@router.get("", response_model=list[AlertResponse])
def get_active_alerts(
    severity: str | None = Query(default=None),
    source: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> list[Alert]:
    query = db.query(Alert).filter(Alert.is_resolved.is_(False))
    if severity:
        query = query.filter(Alert.severity == severity)
    if source:
        query = query.filter(Alert.source == source)
    return query.order_by(Alert.created_at.desc()).limit(limit).all()


@router.get("/history", response_model=list[AlertResponse])
def get_alert_history(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    days: int = Query(default=14, ge=1, le=180),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> list[Alert]:
    since = datetime.utcnow() - timedelta(days=days)
    return (
        db.query(Alert)
        .filter(Alert.created_at >= since)
        .order_by(Alert.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.put("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> Alert:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    if alert.is_resolved:
        return alert

    alert.is_resolved = True
    alert.resolved_by = actor.id
    alert.resolved_at = datetime.utcnow()

    points = _points_for_resolve(db)
    actor.points_total = (actor.points_total or 0) + points
    db.add(
        ActivityLog(
            user_id=actor.id,
            action="resolve_alert",
            target=alert.device_name,
            detail=f"Resolved {alert.issue_type}",
            points_earned=points,
        )
    )
    db.commit()
    db.refresh(alert)

    await alert_ws_manager.broadcast(
        {
            "type": "alert_resolved",
            "alert_id": alert.id,
            "resolved_by": actor.username,
            "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
        }
    )

    return alert

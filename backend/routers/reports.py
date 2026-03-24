import csv
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth import require_roles
from models import ActivityLog, Alert, RFIDDevice, Task, User, VMInventory
from schemas import LeaderboardEntry, SummaryResponse, TaskResponse, UserPointGraphEntry

router = APIRouter(tags=["reports"])


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(
    limit: int = Query(default=20, ge=1, le=200),
    _: User = Depends(require_roles({"admin", "team-lead"})),
    db: Session = Depends(get_db),
) -> list[LeaderboardEntry]:
    users = db.query(User).order_by(User.points_total.desc(), User.username.asc()).limit(limit).all()
    return [
        LeaderboardEntry(user_id=u.id, username=u.username, role=u.role, points_total=u.points_total or 0)
        for u in users
    ]


@router.get("/live-tasks", response_model=list[TaskResponse])
def live_tasks(
    limit: int = Query(default=100, ge=1, le=500),
    _: User = Depends(require_roles({"admin", "team-lead"})),
    db: Session = Depends(get_db),
):
    return (
        db.query(Task)
        .filter(Task.status.in_(["pending", "running"]))
        .order_by(Task.started_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/summary", response_model=SummaryResponse)
def summary(
    _: User = Depends(require_roles({"admin", "team-lead"})),
    db: Session = Depends(get_db),
) -> SummaryResponse:
    return SummaryResponse(
        active_alerts=db.query(func.count(Alert.id)).filter(Alert.is_resolved.is_(False)).scalar() or 0,
        unresolved_critical_alerts=(
            db.query(func.count(Alert.id))
            .filter(Alert.is_resolved.is_(False), Alert.severity == "critical")
            .scalar()
            or 0
        ),
        running_tasks=db.query(func.count(Task.id)).filter(Task.status == "running").scalar() or 0,
        total_vms=db.query(func.count(VMInventory.id)).filter(VMInventory.vm_type == "vm").scalar() or 0,
        total_vdis=db.query(func.count(VMInventory.id)).filter(VMInventory.vm_type == "vdi").scalar() or 0,
        rfid_devices_online=db.query(func.count(RFIDDevice.id)).filter(RFIDDevice.is_online.is_(True)).scalar() or 0,
    )


@router.get("/user/{user_id}/activity")
def user_activity(
    user_id: str,
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=500, ge=1, le=5000),
    _: User = Depends(require_roles({"admin", "team-lead"})),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == user_id, ActivityLog.timestamp >= since)
        .order_by(ActivityLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": row.id,
            "action": row.action,
            "target": row.target,
            "detail": row.detail,
            "points_earned": row.points_earned,
            "timestamp": row.timestamp,
        }
        for row in rows
    ]


@router.get("/user/{user_id}/graph", response_model=list[UserPointGraphEntry])
def user_points_graph(
    user_id: str,
    _: User = Depends(require_roles({"admin", "team-lead"})),
    db: Session = Depends(get_db),
) -> list[UserPointGraphEntry]:
    since = datetime.utcnow() - timedelta(days=30)
    rows = (
        db.query(
            func.date_trunc("day", ActivityLog.timestamp).label("day"),
            func.sum(ActivityLog.points_earned).label("points"),
        )
        .filter(ActivityLog.user_id == user_id, ActivityLog.timestamp >= since)
        .group_by(func.date_trunc("day", ActivityLog.timestamp))
        .order_by(func.date_trunc("day", ActivityLog.timestamp).asc())
        .all()
    )
    return [
        UserPointGraphEntry(day=row.day.date().isoformat(), points=int(row.points or 0))
        for row in rows
    ]


@router.get("/export")
def export_report(
    days: int = Query(default=30, ge=1, le=365),
    _: User = Depends(require_roles({"admin", "team-lead"})),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(ActivityLog, User)
        .join(User, User.id == ActivityLog.user_id)
        .filter(ActivityLog.timestamp >= since)
        .order_by(ActivityLog.timestamp.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "username", "action", "target", "detail", "points_earned"])
    for row, user in rows:
        writer.writerow([row.timestamp.isoformat(), user.username, row.action, row.target, row.detail or "", row.points_earned])

    output.seek(0)
    filename = f"vortyx_report_{datetime.utcnow().date().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

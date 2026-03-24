from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth import get_current_user, require_roles
from models import ActivityLog, Task, User
from schemas import TaskCreateRequest, TaskResponse, TaskUpdateRequest

router = APIRouter(tags=["tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreateRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> Task:
    task = Task(
        user_id=actor.id,
        task_type=payload.task_type,
        status="pending",
        target_name=payload.target_name,
        started_at=datetime.utcnow(),
        metadata_json=payload.metadata_json or {},
    )
    db.add(task)
    db.add(
        ActivityLog(
            user_id=actor.id,
            action="task_create",
            target=payload.target_name,
            detail=f"Created task {payload.task_type}",
            points_earned=0,
        )
    )
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    status_filter: str | None = Query(default=None, alias="status"),
    assigned_to: str | None = Query(default=None),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[Task]:
    query = db.query(Task)

    if actor.role in {"admin", "team-lead"}:
        if assigned_to:
            query = query.filter(Task.user_id == assigned_to)
    else:
        query = query.filter(Task.user_id == actor.id)

    if status_filter:
        query = query.filter(Task.status == status_filter)

    return query.order_by(Task.started_at.desc()).offset(skip).limit(limit).all()


@router.get("/my-tasks", response_model=list[TaskResponse])
def get_my_tasks(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[Task]:
    query = db.query(Task).filter(Task.user_id == actor.id)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    return query.order_by(Task.started_at.desc()).offset(skip).limit(limit).all()


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, db: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if actor.role not in {"admin", "team-lead"} and task.user_id != actor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this task")

    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    payload: TaskUpdateRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if actor.role not in {"admin", "team-lead"} and task.user_id != actor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this task")

    if payload.status is not None:
        task.status = payload.status
        if payload.status == "completed" and task.completed_at is None:
            task.completed_at = datetime.utcnow()
        if payload.status == "failed" and task.completed_at is None:
            task.completed_at = datetime.utcnow()

    if payload.error_message is not None:
        task.error_message = payload.error_message
    if payload.metadata_json is not None:
        task.metadata_json = payload.metadata_json

    db.add(
        ActivityLog(
            user_id=actor.id,
            action="task_update",
            target=task.target_name or task.id,
            detail=f"Task status set to {task.status}",
            points_earned=0,
        )
    )
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> None:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if actor.role not in {"admin", "team-lead"} and task.user_id != actor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this task")

    if task.status not in {"pending", "failed", "completed"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only delete finalized tasks")

    db.delete(task)
    db.commit()

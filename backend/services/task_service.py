from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from models import Task
from websocket.task_manager import task_ws_manager


class TaskService:
    def create_task(
        self,
        db: Session,
        user_id: str,
        task_type: str,
        target_name: str,
        metadata_json: dict[str, Any] | None = None,
    ) -> Task:
        task = Task(
            user_id=user_id,
            task_type=task_type,
            status="pending",
            target_name=target_name,
            started_at=datetime.utcnow(),
            metadata_json=metadata_json or {},
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    async def mark_running(self, db: Session, task: Task) -> Task:
        task.status = "running"
        if task.started_at is None:
            task.started_at = datetime.utcnow()
        db.commit()
        db.refresh(task)
        await task_ws_manager.broadcast(
            {
                "type": "task_update",
                "task_id": task.id,
                "status": task.status,
                "target_name": task.target_name,
            }
        )
        return task

    async def mark_completed(self, db: Session, task: Task, metadata_json: dict[str, Any] | None = None) -> Task:
        task.status = "completed"
        task.completed_at = datetime.utcnow()
        if metadata_json is not None:
            task.metadata_json = metadata_json
        db.commit()
        db.refresh(task)
        await task_ws_manager.broadcast(
            {
                "type": "task_update",
                "task_id": task.id,
                "status": task.status,
                "target_name": task.target_name,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            }
        )
        return task

    async def mark_failed(self, db: Session, task: Task, error_message: str) -> Task:
        task.status = "failed"
        task.error_message = error_message
        task.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(task)
        await task_ws_manager.broadcast(
            {
                "type": "task_update",
                "task_id": task.id,
                "status": task.status,
                "target_name": task.target_name,
                "error_message": task.error_message,
            }
        )
        return task


task_service = TaskService()

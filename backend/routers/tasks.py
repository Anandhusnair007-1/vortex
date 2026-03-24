from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from models import Task, User
from database import get_db
from auth.dependencies import get_current_user, require_engineer

router = APIRouter(tags=["tasks"])


class TaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # low, medium, high, critical
    task_type: Optional[str] = None
    target_id: Optional[str] = None


class TaskUpdateRequest(BaseModel):
    status: Optional[str] = None  # pending, in_progress, completed, failed
    result: Optional[dict] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    assigned_to: str
    status: str
    priority: str
    task_type: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    request: TaskCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer)
):
    """Create a new task"""
    task = Task(
        title=request.title,
        description=request.description,
        assigned_to=current_user.id,
        priority=request.priority,
        task_type=request.task_type,
        target_id=request.target_id,
        status="pending"
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    return task


@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500)
):
    """List tasks"""
    query = db.query(Task)
    
    # If not admin/team-lead, only show own tasks
    if current_user.role not in ["admin", "team-lead"]:
        query = query.filter(Task.assigned_to == current_user.id)
    elif assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)
    
    if status:
        query = query.filter(Task.status == status)
    
    tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    
    return tasks


@router.get("/my-tasks", response_model=List[TaskResponse])
async def get_my_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """Get current user's tasks"""
    query = db.query(Task).filter(Task.assigned_to == current_user.id)
    
    if status:
        query = query.filter(Task.status == status)
    
    tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check authorization
    if current_user.id != task.assigned_to and current_user.role not in ["admin", "team-lead"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this task"
        )
    
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    request: TaskUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer)
):
    """Update a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Only assigned user or admin can update
    if current_user.id != task.assigned_to and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this task"
        )
    
    if request.status:
        old_status = task.status
        task.status = request.status
        
        # Set timestamps
        if old_status == "pending" and request.status == "in_progress":
            task.started_at = datetime.utcnow()
        elif request.status in ["completed", "failed"]:
            task.completed_at = datetime.utcnow()
    
    if request.result:
        task.result = request.result
    
    db.commit()
    db.refresh(task)
    
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer)
):
    """Delete a task (only pending tasks)"""
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if task.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete pending tasks"
        )
    
    db.delete(task)
    db.commit()

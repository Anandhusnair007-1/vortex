from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth import get_current_user, require_roles
from models import ActivityLog, User
from schemas import UserCreateRequest, UserResponse, UserUpdateRequest
from utils.security import hash_password

router = APIRouter(tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead"})),
) -> list[User]:
    return db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin"})),
) -> User:
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        points_total=0,
        is_active=True,
    )
    db.add(user)
    db.add(
        ActivityLog(
            user_id=actor.id,
            action="user_create",
            target=payload.username,
            detail=f"Created user with role {payload.role}",
            points_earned=0,
        )
    )
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin"})),
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.add(
        ActivityLog(
            user_id=actor.id,
            action="user_update",
            target=user.username,
            detail="Updated user role/status",
            points_earned=0,
        )
    )
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin"})),
) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == actor.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    username = user.username
    db.delete(user)
    db.add(
        ActivityLog(
            user_id=actor.id,
            action="user_delete",
            target=username,
            detail="Deleted user account",
            points_earned=0,
        )
    )
    db.commit()


@router.get("/me/profile", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> User:
    return user

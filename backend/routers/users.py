from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List
from models import User
from database import get_db
from auth.dependencies import require_admin, require_team_lead, get_current_user
from auth.jwt import get_password_hash

router = APIRouter(tags=["users"])


class UserCreateRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "engineer"  # admin, team-lead, engineer, viewer


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    points: int
    is_active: bool
    
    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    email: EmailStr = None
    role: str = None
    is_active: bool = None


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new user (admin only)"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.username == request.username) | (User.email == request.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    
    # Validate role
    valid_roles = ["admin", "team-lead", "engineer", "viewer"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )
    
    # Create new user
    user = User(
        username=request.username,
        email=request.email,
        password_hash=get_password_hash(request.password),
        role=request.role
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_team_lead),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List all users (team lead and admin only)"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific user"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Users can view their own profile, team leads can view anyone's, etc
    if current_user.id != user_id and current_user.role not in ["admin", "team-lead"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user"
        )
    
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if request.email:
        existing = db.query(User).filter(
            (User.email == request.email) & (User.id != user_id)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        user.email = request.email
    
    if request.role:
        valid_roles = ["admin", "team-lead", "engineer", "viewer"]
        if request.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {valid_roles}"
            )
        user.role = request.role
    
    if request.is_active is not None:
        user.is_active = request.is_active
    
    db.commit()
    db.refresh(user)
    
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting self
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()


@router.get("/me/profile", response_model=UserResponse)
async def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile"""
    db.refresh(current_user)
    return current_user

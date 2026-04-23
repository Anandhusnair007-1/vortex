from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ...core.database import get_db
from ...core.security import hash_password
from ...models.user import User, UserRole
from ...schemas.user import UserOut, UserCreate, UserUpdate
from ...core.security import get_current_user_flexible
from .auth import require_role

router = APIRouter()

@router.get("/", response_model=List[UserOut])
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    return db.query(User).all()

@router.post("/", response_model=UserOut)
async def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_user = User(
        email=user_in.email,
        name=user_in.name,
        password=hash_password(user_in.password),
        role=user_in.role,
        department=user_in.department,
        is_active=user_in.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password":
            setattr(db_user, field, hash_password(value))
        else:
            setattr(db_user, field, value)
            
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

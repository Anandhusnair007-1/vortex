from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional
from ..models.enums import UserRole

class UserBase(BaseModel):
    name: str
    email: str
    role: UserRole = UserRole.EMPLOYEE
    department: Optional[str] = None
    is_active: bool = True
    
    model_config = ConfigDict(arbitrary_types_allowed=True)

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

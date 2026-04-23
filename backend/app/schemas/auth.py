from pydantic import BaseModel, EmailStr, ConfigDict
from .user import UserOut
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class NotificationOut(BaseModel):
    id: str
    message: str
    type: str
    is_read: bool
    request_id: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

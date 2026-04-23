from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..core.database import Base
from .enums import UserRole

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default=UserRole.EMPLOYEE)
    department = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    keycloak_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    requests = relationship("VmRequest", foreign_keys="[VmRequest.requester_id]", back_populates="requester")
    notifications = relationship("Notification", back_populates="user")

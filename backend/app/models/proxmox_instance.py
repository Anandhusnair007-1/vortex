from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..core.database import Base


class ProxmoxInstance(Base):
    __tablename__ = "proxmox_instances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    host = Column(String, nullable=False)
    port = Column(Integer, default=8006)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False)  # Encrypted
    node_name = Column(String, nullable=False)
    api_token = Column(String, nullable=True)
    api_secret = Column(String, nullable=True)
    tags = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employees = relationship("Employee", back_populates="proxmox_instance")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    department = Column(String, nullable=True)
    role = Column(String, nullable=True)
    assigned_proxmox_id = Column(
        String, ForeignKey("proxmox_instances.id"), nullable=True
    )
    vdi_vm_id = Column(String, nullable=True)
    access_ip = Column(String, nullable=True)
    access_username = Column(String, nullable=True)
    access_password = Column(String, nullable=True)  # Encrypted
    status = Column(String, default="PENDING")  # PENDING, PROVISIONED, FAILED
    created_at = Column(DateTime, default=datetime.utcnow)

    proxmox_instance = relationship("ProxmoxInstance", back_populates="employees")

from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, Float, Enum, JSON
from sqlalchemy.orm import relationship
from database import Base
import uuid
import datetime
import enum as python_enum


class UserRole(str, python_enum.Enum):
    ADMIN = "admin"
    TEAM_LEAD = "team-lead"
    ENGINEER = "engineer"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="engineer")  # admin, team-lead, engineer, viewer
    points = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    activity_logs = relationship("ActivityLog", back_populates="user")
    rfid_access = relationship("RFIDAccess", back_populates="user")
    granted_rfid = relationship("RFIDAccess", foreign_keys="RFIDAccess.granted_by", backref="granted_by_user")


class ActivityLog(Base):
    __tablename__ = "activity_log"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String, nullable=False)  # "create_vm", "grant_rfid", "resolve_alert", "run_playbook"
    target = Column(String, nullable=False)  # VM name, door name, alert id
    detail = Column(Text)
    points = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    # Relationship
    user = relationship("User", back_populates="activity_logs")


class RFIDDevice(Base):
    __tablename__ = "rfid_devices"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)  # "Server Room Door"
    ip = Column(String, unique=True, nullable=False, index=True)
    door_name = Column(String, nullable=False)
    location = Column(String)
    brand = Column(String)  # "zkteco", "generic_http", etc
    is_online = Column(Boolean, default=True)
    last_heartbeat = Column(DateTime)
    credentials = Column(JSON)  # Store encrypted credentials
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    access_records = relationship("RFIDAccess", back_populates="device")


class RFIDAccess(Base):
    __tablename__ = "rfid_access"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    device_id = Column(String, ForeignKey("rfid_devices.id"), nullable=False, index=True)
    granted_by = Column(String, ForeignKey("users.id"), nullable=False)
    granted_at = Column(DateTime, default=datetime.datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="rfid_access")
    device = relationship("RFIDDevice", back_populates="access_records")


class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source = Column(String, nullable=False)  # "observium", "awx", "manual"
    device_name = Column(String, nullable=False, index=True)
    issue = Column(String, nullable=False)  # "device_down", "no_logs", "camera_offline"
    severity = Column(String, nullable=False)  # "critical", "warning", "info"
    description = Column(Text)
    is_resolved = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String, ForeignKey("users.id"), nullable=True)
    metadata = Column(JSON)  # Store additional data from the source


class VMInventory(Base):
    __tablename__ = "vm_inventory"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    vmid = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    proxmox_node = Column(String, nullable=False, index=True)
    node_ip = Column(String)
    ip_address = Column(String, index=True)
    owner_username = Column(String, index=True)
    vm_type = Column(String)  # "vm" or "vdi"
    status = Column(String)  # "running", "stopped", "paused"
    cpu_cores = Column(Integer)
    ram_gb = Column(Integer)
    disk_gb = Column(Integer)
    guac_url = Column(String)  # Guacamole access URL
    last_synced = Column(DateTime, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Additional metadata
    memory_mb = Column(Integer)
    current_cpu_usage = Column(Float)  # Percentage
    current_memory_usage = Column(Float)  # Percentage
    uptime_seconds = Column(Integer)


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")  # "pending", "in_progress", "completed", "failed"
    priority = Column(String, default="medium")  # "low", "medium", "high", "critical"
    task_type = Column(String)  # "vm_create", "rfid_grant", "alert_resolve", etc
    target_id = Column(String)  # Reference to the resource (VM ID, alert ID, etc)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    result = Column(JSON)  # Store task result or error details


class PointsConfig(Base):
    __tablename__ = "points_config"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    action = Column(String, unique=True, nullable=False, index=True)  # "create_vm", "grant_rfid", etc
    points = Column(Integer, nullable=False)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class SessionToken(Base):
    __tablename__ = "session_tokens"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    token_type = Column(String)  # "access" or "refresh"
    expires_at = Column(DateTime, nullable=False, index=True)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

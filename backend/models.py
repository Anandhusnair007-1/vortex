import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    TEAM_LEAD = "team-lead"
    ENGINEER = "engineer"
    VIEWER = "viewer"


class VMTypeEnum(str, enum.Enum):
    VM = "vm"
    VDI = "vdi"


class SeverityEnum(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=RoleEnum.ENGINEER.value)
    points_total = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    activities = relationship("ActivityLog", back_populates="user")


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    action = Column(String(120), nullable=False)
    target = Column(String(255), nullable=False)
    detail = Column(Text)
    points_earned = Column(Integer, default=0, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="activities")


class RFIDDevice(Base):
    __tablename__ = "rfid_devices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(120), nullable=False)
    ip_address = Column(String(64), unique=True, index=True, nullable=False)
    door_name = Column(String(120), nullable=False)
    location = Column(String(255))
    brand = Column(String(64), nullable=False)
    is_online = Column(Boolean, default=False, nullable=False)
    last_seen = Column(DateTime)
    credentials_encrypted = Column(Text)
    door_id = Column(String(36), ForeignKey("door_mappings.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    door = relationship("DoorMapping", foreign_keys=[door_id])


class RFIDAccess(Base):
    __tablename__ = "rfid_access"
    __table_args__ = (
        Index("ix_rfid_access_user_device_active", "user_id", "device_id", "is_active"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    device_id = Column(String(36), ForeignKey("rfid_devices.id"), nullable=False, index=True)
    granted_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime)
    revoked_by = Column(String(36), ForeignKey("users.id"))
    is_active = Column(Boolean, default=True, nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source = Column(String(64), nullable=False, index=True)
    device_name = Column(String(255), nullable=False, index=True)
    issue_type = Column(String(255), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    message = Column(Text)
    is_resolved = Column(Boolean, default=False, nullable=False, index=True)
    resolved_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    resolved_at = Column(DateTime)


class VMInventory(Base):
    __tablename__ = "vm_inventory"
    __table_args__ = (
        UniqueConstraint("proxmox_node", "vmid", name="uq_vm_inventory_node_vmid"),
        Index("ix_vm_inventory_search", "name", "ip_address", "owner_username", "proxmox_node"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vmid = Column(Integer, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    proxmox_node = Column(String(120), nullable=False, index=True)
    proxmox_node_id = Column(String(36), ForeignKey("proxmox_nodes.id"), index=True)
    node_ip = Column(String(64))
    ip_address = Column(String(64), index=True)
    owner_username = Column(String(100), index=True)
    vm_type = Column(String(10), nullable=False, index=True)
    status = Column(String(32), nullable=False, index=True)
    cpu_cores = Column(Integer)
    ram_gb = Column(Integer)
    disk_gb = Column(Integer)
    guac_url = Column(String(512))
    os_version = Column(String(120))
    last_synced = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    node = relationship("ProxmoxNode", back_populates="workloads")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    task_type = Column(String(100), nullable=False, index=True)
    status = Column(String(32), nullable=False, index=True)
    target_name = Column(String(255), index=True)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    error_message = Column(Text)
    metadata_json = Column(JSON)


class PointsConfig(Base):
    __tablename__ = "points_config"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    action_name = Column(String(120), unique=True, nullable=False, index=True)
    points_value = Column(Integer, nullable=False)


class ProxmoxNode(Base):
    __tablename__ = "proxmox_nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(120), unique=True, nullable=False, index=True)
    ip_address = Column(String(64), unique=True, nullable=False, index=True)
    cluster_name = Column(String(120), index=True)
    api_host = Column(String(255))
    is_active = Column(Boolean, default=True, nullable=False)
    total_cpu = Column(Integer)
    total_ram_gb = Column(Integer)
    total_disk_gb = Column(Integer)
    free_cpu = Column(Integer)
    free_ram_gb = Column(Integer)
    free_disk_gb = Column(Integer)
    notes = Column(Text)
    last_synced = Column(DateTime, index=True)

    workloads = relationship("VMInventory", back_populates="node")


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    token_type = Column(String(20), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_revoked = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Building(Base):
    __tablename__ = "buildings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(120), unique=True, nullable=False, index=True)
    code = Column(String(20), unique=True, index=True)
    address = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    floors = relationship("Floor", back_populates="building", cascade="all, delete-orphan")


class Floor(Base):
    __tablename__ = "floors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    building_id = Column(String(36), ForeignKey("buildings.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    level_number = Column(Integer, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    building = relationship("Building", back_populates="floors")
    doors = relationship("DoorMapping", back_populates="floor", cascade="all, delete-orphan")


class DoorMapping(Base):
    __tablename__ = "door_mappings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    building_id = Column(String(36), ForeignKey("buildings.id"), nullable=False, index=True)
    floor_id = Column(String(36), ForeignKey("floors.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    code = Column(String(50), index=True)
    notes = Column(Text)
    rfid_device_id = Column(String(36), ForeignKey("rfid_devices.id"), unique=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    floor = relationship("Floor", back_populates="doors")
    rfid_device = relationship("RFIDDevice", foreign_keys=[rfid_device_id])


class GoldenImage(Base):
    __tablename__ = "golden_images"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(120), nullable=False, index=True)
    proxmox_template_name = Column(String(120), nullable=False, index=True)
    os_type = Column(String(32), nullable=False, default="linux")
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CloudInitProfile(Base):
    __tablename__ = "cloud_init_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(120), nullable=False, index=True)
    username = Column(String(100), default="vortyx")
    password = Column(String(255))
    ssh_keys = Column(Text)
    network_config_json = Column(JSON)
    custom_config = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

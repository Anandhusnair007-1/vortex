from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    detail: str


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    role: str
    points_total: int
    is_active: bool


class UserCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["admin", "team-lead", "engineer", "viewer"] = "engineer"


class UserUpdateRequest(BaseModel):
    role: Literal["admin", "team-lead", "engineer", "viewer"] | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    role: str
    points_total: int
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserSummary


class HealthResponse(BaseModel):
    status: str
    app: str
    environment: str
    version: str
    timestamp: datetime
    database: str
    redis: str


class AlertCreateRequest(BaseModel):
    source: Literal["observium", "awx", "manual", "system"]
    device_name: str = Field(min_length=1, max_length=255)
    issue_type: str = Field(min_length=1, max_length=255)
    severity: Literal["info", "warning", "critical"]
    message: str = Field(default="", max_length=4000)


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source: str
    device_name: str
    issue_type: str
    severity: str
    message: str | None
    is_resolved: bool
    resolved_by: str | None
    created_at: datetime
    resolved_at: datetime | None


class TaskCreateRequest(BaseModel):
    task_type: str = Field(min_length=2, max_length=100)
    target_name: str = Field(min_length=1, max_length=255)
    metadata_json: dict[str, Any] | None = None


class TaskUpdateRequest(BaseModel):
    status: Literal["pending", "running", "completed", "failed"] | None = None
    error_message: str | None = None
    metadata_json: dict[str, Any] | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    task_type: str
    status: str
    target_name: str | None
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None
    metadata_json: dict[str, Any] | None


class VMRegisterRequest(BaseModel):
    vmid: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=255)
    proxmox_node: str = Field(min_length=1, max_length=120)
    node_ip: str | None = Field(default=None, max_length=64)
    ip_address: str | None = Field(default=None, max_length=64)
    owner_username: str | None = Field(default=None, max_length=100)
    vm_type: Literal["vm", "vdi"] = "vm"
    status: str = Field(default="running", max_length=32)
    cpu_cores: int | None = Field(default=None, ge=1)
    ram_gb: int | None = Field(default=None, ge=1)
    disk_gb: int | None = Field(default=None, ge=1)
    guac_url: str | None = Field(default=None, max_length=512)
    os_version: str | None = Field(default=None, max_length=120)


class VMInventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vmid: int
    name: str
    proxmox_node: str
    proxmox_node_id: str | None
    node_ip: str | None
    ip_address: str | None
    owner_username: str | None
    vm_type: str
    status: str
    cpu_cores: int | None
    ram_gb: int | None
    disk_gb: int | None
    guac_url: str | None
    os_version: str | None
    last_synced: datetime
    created_at: datetime


class WorkloadUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    owner_username: str | None = Field(default=None, max_length=100)
    ip_address: str | None = Field(default=None, max_length=64)
    status: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class ProvisionVMRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    owner_username: str = Field(min_length=3, max_length=100)
    cpu_cores: int = Field(ge=1, le=64)
    ram_gb: int = Field(ge=1, le=1024)
    disk_gb: int = Field(ge=10, le=8192)
    vm_profile_id: str = Field(min_length=2, max_length=120)
    os_version: str | None = Field(default=None, max_length=120)
    advanced: dict[str, Any] | None = None


class ProvisionVDIRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    owner_username: str = Field(min_length=3, max_length=100)
    cpu_cores: int = Field(default=4, ge=1, le=64)
    ram_gb: int = Field(default=8, ge=1, le=1024)
    disk_gb: int = Field(default=80, ge=10, le=8192)
    golden_image_id: str = Field(min_length=2, max_length=255)
    advanced: dict[str, Any] | None = None


class QueuedTaskResponse(BaseModel):
    task_id: str
    status: str
    message: str
    target_name: str | None = None


class ProxmoxNodeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    ip_address: str = Field(min_length=3, max_length=64)
    cluster_name: str | None = Field(default=None, max_length=120)
    api_host: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class ProxmoxNodeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    ip_address: str | None = Field(default=None, min_length=3, max_length=64)
    cluster_name: str | None = Field(default=None, max_length=120)
    api_host: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    notes: str | None = None


class NodeCapacityResponse(BaseModel):
    id: str
    name: str
    ip_address: str
    cluster_name: str | None
    api_host: str | None
    is_active: bool
    total_cpu: int | None
    total_ram_gb: int | None
    total_disk_gb: int | None
    free_cpu: int | None
    free_ram_gb: int | None
    free_disk_gb: int | None
    notes: str | None
    last_synced: datetime | None


class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    role: str
    points_total: int


class SummaryResponse(BaseModel):
    active_alerts: int
    unresolved_critical_alerts: int
    running_tasks: int
    total_vms: int
    total_vdis: int
    rfid_devices_online: int


class UserPointGraphEntry(BaseModel):
    day: str
    points: int


class RFIDDeviceCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    ip_address: str = Field(min_length=3, max_length=64)
    door_name: str = Field(min_length=2, max_length=120)
    location: str | None = Field(default=None, max_length=255)
    brand: str = Field(default="generic_http", min_length=2, max_length=64)
    door_id: str | None = None
    credentials: dict = Field(default_factory=dict)


class RFIDDeviceUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    door_name: str | None = Field(default=None, min_length=2, max_length=120)
    location: str | None = Field(default=None, max_length=255)
    brand: str | None = Field(default=None, min_length=2, max_length=64)
    is_online: bool | None = None
    door_id: str | None = None
    credentials: dict | None = None


class RFIDDeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    ip_address: str
    door_name: str
    location: str | None
    brand: str
    is_online: bool
    door_id: str | None
    last_seen: datetime | None
    created_at: datetime


class RFIDAccessBulkRequest(BaseModel):
    user_id: str
    device_ids: list[str] = Field(min_length=1)


class RFIDAccessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    device_id: str
    granted_by: str
    granted_at: datetime
    revoked_at: datetime | None
    revoked_by: str | None
    is_active: bool


class RFIDAuditEntry(BaseModel):
    id: str
    user_id: str
    username: str
    device_id: str
    door_name: str
    action: str
    granted_by: str | None
    revoked_by: str | None
    timestamp: datetime
    result: str = "success"


class RFIDSessionStatus(BaseModel):
    device_id: str
    session_active: bool
    expires_at: datetime | None = None
    credential_source: str


class RFIDDeviceDetailResponse(RFIDDeviceResponse):
    active_access_count: int
    session_status: RFIDSessionStatus


class RFIDDeviceActionResponse(BaseModel):
    device_id: str
    status: str
    message: str
    session_status: RFIDSessionStatus


class ProvisionProfileResponse(BaseModel):
    id: str
    label: str
    type: str
    strategy: str | None = None
    template_name: str | None = None


# --- Location Schemas ---

class BuildingCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: str | None = Field(default=None, max_length=20)
    address: str | None = None
    notes: str | None = None


class BuildingUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    code: str | None = Field(default=None, max_length=20)
    address: str | None = None
    notes: str | None = None


class BuildingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    code: str | None
    address: str | None
    notes: str | None
    created_at: datetime


class FloorCreate(BaseModel):
    building_id: str
    name: str = Field(min_length=1, max_length=120)
    level_number: int
    notes: str | None = None


class FloorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    level_number: int | None = None
    notes: str | None = None


class FloorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    building_id: str
    name: str
    level_number: int
    notes: str | None
    created_at: datetime


class DoorMappingCreate(BaseModel):
    building_id: str
    floor_id: str
    name: str = Field(min_length=1, max_length=120)
    code: str | None = Field(default=None, max_length=50)
    notes: str | None = None
    rfid_device_id: str | None = None


class DoorMappingUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    code: str | None = Field(default=None, max_length=50)
    notes: str | None = None
    rfid_device_id: str | None = None


class DoorMappingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    building_id: str
    floor_id: str
    name: str
    code: str | None
    notes: str | None
    rfid_device_id: str | None
    created_at: datetime


# --- Provisioning Config Schemas ---

class GoldenImageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    proxmox_template_name: str = Field(min_length=1, max_length=120)
    os_type: str = Field(default="linux", max_length=32)
    description: str | None = None


class GoldenImageUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    proxmox_template_name: str | None = Field(default=None, min_length=1, max_length=120)
    os_type: str | None = None
    description: str | None = None
    is_active: bool | None = None


class GoldenImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    proxmox_template_name: str
    os_type: str
    description: str | None
    is_active: bool
    created_at: datetime


class CloudInitProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    username: str | None = "vortyx"
    password: str | None = None
    ssh_keys: str | None = None
    network_config_json: dict[str, Any] | None = None
    custom_config: str | None = None


class CloudInitProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    username: str | None = None
    password: str | None = None
    ssh_keys: str | None = None
    network_config_json: dict[str, Any] | None = None
    custom_config: str | None = None
    is_active: bool | None = None


class CloudInitProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    username: str | None
    ssh_keys: str | None
    network_config_json: dict[str, Any] | None
    custom_config: str | None
    is_active: bool
    created_at: datetime

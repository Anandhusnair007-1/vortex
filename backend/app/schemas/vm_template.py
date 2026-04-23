from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from enum import Enum

class OsType(str, Enum):
    UBUNTU = "UBUNTU"
    WINDOWS = "WINDOWS"
    CENTOS = "CENTOS"
    DEBIAN = "DEBIAN"
    OTHER = "OTHER"

class VmTemplateBase(BaseModel):
    name: str
    os: str
    os_type: OsType
    cpu: int
    ram_gb: int
    disk_gb: int
    proxmox_template_id: str
    iso_path: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class VmTemplateCreate(VmTemplateBase):
    pass

class VmTemplateUpdate(BaseModel):
    name: Optional[str] = None
    os: Optional[str] = None
    os_type: Optional[OsType] = None
    cpu: Optional[int] = None
    ram_gb: Optional[int] = None
    disk_gb: Optional[int] = None
    proxmox_template_id: Optional[str] = None
    iso_path: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class VmTemplateOut(VmTemplateBase):
    id: str
    created_by: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

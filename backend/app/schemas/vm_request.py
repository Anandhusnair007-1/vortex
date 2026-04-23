from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from enum import Enum
from .user import UserOut
from .vm_template import VmTemplateOut

from ..models.enums import VmRequestStatus


class AuditLogOut(BaseModel):
    id: str
    action: str
    details: Optional[str] = None
    created_at: datetime
    user: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)


class VmRequestBase(BaseModel):
    title: str
    justification: str
    template_id: str
    request_type: Optional[str] = "VM"  # VM or VDI


class VmRequestCreate(VmRequestBase):
    pass


class VmRequestOut(VmRequestBase):
    id: str
    requester_id: str
    vm_name: Optional[str] = None
    status: VmRequestStatus
    created_at: datetime
    updated_at: datetime

    request_type: Optional[str] = "VM"

    # Nested info
    requester: UserOut
    template: VmTemplateOut

    # Approval info
    tl_approver_id: Optional[str] = None
    tl_approved_at: Optional[datetime] = None
    tl_note: Optional[str] = None
    it_approver_id: Optional[str] = None
    it_approved_at: Optional[datetime] = None
    it_note: Optional[str] = None

    # Provisioning info
    proxmox_vm_id: Optional[str] = None
    proxmox_node: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    vm_username: Optional[str] = None
    glpi_ticket_id: Optional[str] = None
    error_message: Optional[str] = None

    audit_logs: List[AuditLogOut] = []

    model_config = ConfigDict(from_attributes=True)


class VmRequestCredentials(BaseModel):
    vm_username: str
    vm_password: str
    ip_address: str
    proxmox_node: str

    model_config = ConfigDict(from_attributes=True)

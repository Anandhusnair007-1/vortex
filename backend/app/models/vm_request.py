from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..core.database import Base
from .enums import VmRequestStatus


class VmRequest(Base):
    __tablename__ = "vm_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    requester_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    justification = Column(String, nullable=False)
    template_id = Column(String, ForeignKey("vm_templates.id"), nullable=False)
    vm_name = Column(String, nullable=True)
    request_type = Column(String, default="VM")  # VM or VDI
    status = Column(String, default=VmRequestStatus.PENDING_TL)

    tl_approver_id = Column(String, ForeignKey("users.id"), nullable=True)
    tl_approved_at = Column(DateTime, nullable=True)
    tl_note = Column(String, nullable=True)

    it_approver_id = Column(String, ForeignKey("users.id"), nullable=True)
    it_approved_at = Column(DateTime, nullable=True)
    it_note = Column(String, nullable=True)

    proxmox_vm_id = Column(String, nullable=True)
    proxmox_node = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    mac_address = Column(String, nullable=True)
    vm_username = Column(String, nullable=True)
    vm_password = Column(String, nullable=True)  # AES Encrypted
    glpi_ticket_id = Column(String, nullable=True)
    error_message = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    requester = relationship(
        "User", foreign_keys=[requester_id], back_populates="requests"
    )
    template = relationship("VmTemplate", back_populates="requests")
    audit_logs = relationship(
        "AuditLog",
        primaryjoin="and_(VmRequest.id == foreign(AuditLog.entity_id), AuditLog.entity_type == 'vm_request')",
        back_populates="request",
        order_by="desc(AuditLog.created_at)",
    )

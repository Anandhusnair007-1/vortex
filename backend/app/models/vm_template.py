from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..core.database import Base

class VmTemplate(Base):
    __tablename__ = "vm_templates"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    os = Column(String, nullable=False)
    os_type = Column(String, nullable=False) # Enum logic handled in schemas/routes
    cpu = Column(Integer, nullable=False)
    ram_gb = Column(Integer, nullable=False)
    disk_gb = Column(Integer, nullable=False)
    proxmox_template_id = Column(String, nullable=False)
    iso_path = Column(String, nullable=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    requests = relationship("VmRequest", back_populates="template")

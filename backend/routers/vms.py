from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel
from models import VMInventory, User
from database import get_db
from auth.dependencies import get_current_user, require_engineer

router = APIRouter(tags=["vms"])


class VMRegisterRequest(BaseModel):
    name: str
    vmid: int
    proxmox_node: str
    node_ip: Optional[str] = None
    ip_address: Optional[str] = None
    owner_username: Optional[str] = None
    vm_type: str = "vm"  # "vm" or "vdi"
    cpu_cores: Optional[int] = None
    ram_gb: Optional[int] = None
    disk_gb: Optional[int] = None
    guac_url: Optional[str] = None


class VMSearchResponse(BaseModel):
    id: str
    vmid: int
    name: str
    proxmox_node: str
    ip_address: Optional[str]
    owner_username: Optional[str]
    vm_type: str
    status: str
    cpu_cores: Optional[int]
    ram_gb: Optional[int]
    disk_gb: Optional[int]
    guac_url: Optional[str]
    
    class Config:
        from_attributes = True


class VMDetailResponse(VMSearchResponse):
    node_ip: Optional[str]
    current_cpu_usage: Optional[float]
    current_memory_usage: Optional[float]
    uptime_seconds: Optional[int]
    last_synced: Optional[str]


@router.post("/register", response_model=VMSearchResponse, status_code=status.HTTP_201_CREATED)
async def register_vm(
    request: VMRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer)
):
    """Register a new VM/VDI to inventory"""
    
    # Check if VM already exists by vmid
    existing = db.query(VMInventory).filter(
        (VMInventory.vmid == request.vmid) &
        (VMInventory.proxmox_node == request.proxmox_node)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"VM with ID {request.vmid} already exists on node {request.proxmox_node}"
        )
    
    from datetime import datetime
    vm = VMInventory(
        vmid=request.vmid,
        name=request.name,
        proxmox_node=request.proxmox_node,
        node_ip=request.node_ip,
        ip_address=request.ip_address,
        owner_username=request.owner_username,
        vm_type=request.vm_type,
        cpu_cores=request.cpu_cores,
        ram_gb=request.ram_gb,
        disk_gb=request.disk_gb,
        guac_url=request.guac_url,
        status="running",
        last_synced=datetime.utcnow()
    )
    
    db.add(vm)
    db.commit()
    db.refresh(vm)
    
    return vm


@router.get("/search", response_model=List[VMSearchResponse])
async def search_vms(
    q: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=500)
):
    """
    Search VMs by name, IP address, owner, or node.
    Searches are performed against local DB for instant results.
    """
    search_pattern = f"%{q}%"
    
    vms = db.query(VMInventory).filter(
        or_(
            VMInventory.name.ilike(search_pattern),
            VMInventory.ip_address.ilike(search_pattern),
            VMInventory.owner_username.ilike(search_pattern),
            VMInventory.proxmox_node.ilike(search_pattern)
        )
    ).limit(limit).all()
    
    return vms


@router.get("/", response_model=List[VMSearchResponse])
async def list_vms(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = Query(None, description="Filter by status (running, stopped)"),
    vm_type: Optional[str] = Query(None, description="Filter by type (vm, vdi)"),
    proxmox_node: Optional[str] = Query(None, description="Filter by node"),
    owner: Optional[str] = Query(None, description="Filter by owner")
):
    """List all VMs with optional filters"""
    query = db.query(VMInventory)
    
    if status:
        query = query.filter(VMInventory.status == status)
    if vm_type:
        query = query.filter(VMInventory.vm_type == vm_type)
    if proxmox_node:
        query = query.filter(VMInventory.proxmox_node == proxmox_node)
    if owner:
        query = query.filter(VMInventory.owner_username.ilike(f"%{owner}%"))
    
    vms = query.offset(skip).limit(limit).all()
    
    return vms


@router.get("/{vm_id}", response_model=VMDetailResponse)
async def get_vm_details(
    vm_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a specific VM"""
    vm = db.query(VMInventory).filter(VMInventory.id == vm_id).first()
    
    if not vm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found"
        )
    
    return vm


@router.get("/nodes/capacity")
async def get_nodes_capacity(
    db: Session = Depends(get_db)
):
    """Get capacity information for all Proxmox nodes"""
    from sqlalchemy import func
    
    nodes = db.query(
        VMInventory.proxmox_node,
        func.count(VMInventory.id).label("vm_count"),
        func.sum(VMInventory.cpu_cores).label("total_cpu"),
        func.sum(VMInventory.ram_gb).label("total_ram"),
        func.sum(VMInventory.disk_gb).label("total_disk")
    ).group_by(VMInventory.proxmox_node).all()
    
    return [
        {
            "node": node.proxmox_node,
            "vm_count": node.vm_count or 0,
            "total_cpu": node.total_cpu or 0,
            "total_ram": node.total_ram or 0,
            "total_disk": node.total_disk or 0
        }
        for node in nodes
    ]

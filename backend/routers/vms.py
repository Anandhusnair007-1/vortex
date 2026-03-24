import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from middleware.auth import get_current_user, require_roles
from models import ProxmoxNode, Task, VMInventory, User
from schemas import (
    NodeCapacityResponse,
    ProvisionVDIRequest,
    ProvisionVMRequest,
    QueuedTaskResponse,
    TaskResponse,
    VMInventoryResponse,
    VMRegisterRequest,
    WorkloadUpdate,
)
from services.provisioner import provisioner_service
from services.task_service import task_service

router = APIRouter(tags=["vms"])


@router.get("", response_model=list[VMInventoryResponse])
def list_vms(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    status_filter: str | None = Query(default=None, alias="status"),
    vm_type: str | None = Query(default=None),
    proxmox_node: str | None = Query(default=None),
    owner: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> list[VMInventory]:
    query = db.query(VMInventory)
    if status_filter:
        query = query.filter(VMInventory.status == status_filter)
    if vm_type:
        query = query.filter(VMInventory.vm_type == vm_type)
    if proxmox_node:
        query = query.filter(VMInventory.proxmox_node == proxmox_node)
    if owner:
        query = query.filter(VMInventory.owner_username.ilike(f"%{owner}%"))

    return query.order_by(VMInventory.last_synced.desc()).offset(skip).limit(limit).all()


@router.get("/search", response_model=list[VMInventoryResponse])
def search_vms(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> list[VMInventory]:
    pattern = f"%{q}%"
    return (
        db.query(VMInventory)
        .filter(
            or_(
                VMInventory.name.ilike(pattern),
                VMInventory.ip_address.ilike(pattern),
                VMInventory.owner_username.ilike(pattern),
                VMInventory.proxmox_node.ilike(pattern),
            )
        )
        .order_by(VMInventory.last_synced.desc())
        .limit(limit)
        .all()
    )


@router.post("/register", response_model=VMInventoryResponse, status_code=status.HTTP_201_CREATED)
def register_vm(
    payload: VMRegisterRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> VMInventory:
    existing = (
        db.query(VMInventory)
        .filter(VMInventory.vmid == payload.vmid, VMInventory.proxmox_node == payload.proxmox_node)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="VM already registered on this node")

    vm = VMInventory(**payload.model_dump())
    db.add(vm)
    db.commit()
    db.refresh(vm)
    return vm


@router.get("/nodes", response_model=list[NodeCapacityResponse])
def list_nodes(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> list[ProxmoxNode]:
    return db.query(ProxmoxNode).order_by(ProxmoxNode.name.asc()).all()


@router.get("/nodes/capacity")
def nodes_capacity(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> list[dict]:
    rows = db.query(ProxmoxNode).order_by(ProxmoxNode.name.asc()).all()
    return [
        {
            "node": node.name,
            "vm_count": db.query(VMInventory).filter(VMInventory.proxmox_node == node.name).count(),
            "total_cpu": node.total_cpu or 0,
            "total_ram": node.total_ram_gb or 0,
            "total_disk": node.total_disk_gb or 0,
            "free_cpu": node.free_cpu,
            "free_ram": node.free_ram_gb,
            "free_disk": node.free_disk_gb,
            "last_synced": node.last_synced.isoformat() if node.last_synced else None,
        }
        for node in rows
    ]


@router.get("/{vm_id}", response_model=VMInventoryResponse)
def get_vm(
    vm_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> VMInventory:
    vm = db.query(VMInventory).filter(VMInventory.id == vm_id).first()
    if not vm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VM not found")
    return vm

@router.put("/{vm_id}", response_model=VMInventoryResponse)
def update_vm(
    vm_id: str,
    payload: WorkloadUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin", "team-lead"})),
) -> VMInventory:
    vm = db.query(VMInventory).filter(VMInventory.id == vm_id).first()
    if not vm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VM not found")
    
    if payload.name is not None:
        vm.name = payload.name
    if payload.owner_username is not None:
        vm.owner_username = payload.owner_username
    if payload.ip_address is not None:
        vm.ip_address = payload.ip_address
    if payload.status is not None:
        vm.status = payload.status
    
    db.commit()
    db.refresh(vm)
    return vm

@router.delete("/{vm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vm(
    vm_id: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin"})),
):
    vm = db.query(VMInventory).filter(VMInventory.id == vm_id).first()
    if not vm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VM not found")
    
    db.delete(vm)
    db.commit()
    return None


async def _run_vm_provision(task_id: str, payload: ProvisionVMRequest, actor_id: str) -> None:
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        actor = db.query(User).filter(User.id == actor_id).first()
        if not task or not actor:
            return
        await provisioner_service.provision_vm(db, task, payload, actor)
    except Exception as exc:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            await task_service.mark_failed(db, task, str(exc))
    finally:
        db.close()


async def _run_vdi_provision(task_id: str, payload: ProvisionVDIRequest, actor_id: str) -> None:
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        actor = db.query(User).filter(User.id == actor_id).first()
        if not task or not actor:
            return
        await provisioner_service.provision_vdi(db, task, payload, actor)
    except Exception as exc:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            await task_service.mark_failed(db, task, str(exc))
    finally:
        db.close()


@router.post("/provision/vm", response_model=QueuedTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def provision_vm(
    payload: ProvisionVMRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> QueuedTaskResponse:
    task = task_service.create_task(
        db,
        user_id=actor.id,
        task_type="provision_vm",
        target_name=payload.name,
        metadata_json=payload.model_dump(),
    )
    asyncio.create_task(_run_vm_provision(task.id, payload, actor.id))
    return QueuedTaskResponse(
        task_id=task.id,
        status=task.status,
        message="VM provisioning queued",
        target_name=payload.name,
    )


@router.post("/provision/vdi", response_model=QueuedTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def provision_vdi(
    payload: ProvisionVDIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> QueuedTaskResponse:
    task = task_service.create_task(
        db,
        user_id=actor.id,
        task_type="provision_vdi",
        target_name=payload.name,
        metadata_json=payload.model_dump(),
    )
    asyncio.create_task(_run_vdi_provision(task.id, payload, actor.id))
    return QueuedTaskResponse(
        task_id=task.id,
        status=task.status,
        message="VDI provisioning queued",
        target_name=payload.name,
    )


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if actor.role not in {"admin", "team-lead"} and task.user_id != actor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this task")

    return task

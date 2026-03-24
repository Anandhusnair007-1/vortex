from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import require_roles
from models import User
from schemas import (
    ProxmoxNodeCreate, ProxmoxNodeUpdate, NodeCapacityResponse,
    VMInventoryResponse
)
from services.proxmox_service import proxmox_service

router = APIRouter(tags=["proxmox"])

@router.get("/nodes", response_model=list[NodeCapacityResponse])
def list_nodes(db: Session = Depends(get_db), _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"}))):
    return proxmox_service.list_nodes(db)

@router.get("/nodes/{id}", response_model=NodeCapacityResponse)
def get_node(id: str, db: Session = Depends(get_db), _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"}))):
    return proxmox_service.get_node(db, id)

@router.post("/nodes", response_model=NodeCapacityResponse, status_code=status.HTTP_201_CREATED)
def create_node(payload: ProxmoxNodeCreate, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin", "team-lead"}))):
    return proxmox_service.create_node(db, payload, actor)

@router.put("/nodes/{id}", response_model=NodeCapacityResponse)
def update_node(id: str, payload: ProxmoxNodeUpdate, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin", "team-lead"}))):
    return proxmox_service.update_node(db, id, payload, actor)

@router.delete("/nodes/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(id: str, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin"}))):
    return proxmox_service.delete_node(db, id, actor)

@router.get("/nodes/{id}/workloads", response_model=list[VMInventoryResponse])
def get_node_workloads(id: str, db: Session = Depends(get_db), _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"}))):
    return proxmox_service.get_node_workloads(db, id)

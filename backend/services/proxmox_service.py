from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException
from models import ProxmoxNode, VMInventory, User, ActivityLog
import logging

logger = logging.getLogger(__name__)

class ProxmoxService:
    def _log_activity(self, db: Session, user: User, action: str, target: str, detail: str):
        db.add(
            ActivityLog(
                user_id=user.id,
                action=action,
                target=target,
                detail=detail,
            )
        )

    def list_nodes(self, db: Session):
        return db.query(ProxmoxNode).all()

    def get_node(self, db: Session, node_id: str):
        node = db.query(ProxmoxNode).filter(
            or_(ProxmoxNode.id == node_id, ProxmoxNode.name == node_id)
        ).first()
        if not node:
            raise HTTPException(status_code=404, detail="Proxmox node not found")
        return node

    def create_node(self, db: Session, payload, actor: User):
        node = ProxmoxNode(
            name=payload.name,
            ip_address=payload.ip_address,
            cluster_name=payload.cluster_name,
            api_host=payload.api_host,
            notes=payload.notes,
            is_active=True
        )
        db.add(node)
        self._log_activity(db, actor, "proxmox_node_create", node.name, f"Added Proxmox node {node.ip_address}")
        db.commit()
        db.refresh(node)
        return node

    def update_node(self, db: Session, node_id: str, payload, actor: User):
        node = self.get_node(db, node_id)
        
        if payload.name is not None:
            node.name = payload.name
        if payload.ip_address is not None:
            node.ip_address = payload.ip_address
        if payload.cluster_name is not None:
            node.cluster_name = payload.cluster_name
        if payload.api_host is not None:
            node.api_host = payload.api_host
        if payload.is_active is not None:
            node.is_active = payload.is_active
        if payload.notes is not None:
            node.notes = payload.notes
            
        self._log_activity(db, actor, "proxmox_node_update", node.name, f"Updated Proxmox node {node_id}")
        db.commit()
        db.refresh(node)
        return node

    def delete_node(self, db: Session, node_id: str, actor: User):
        node = self.get_node(db, node_id)
        
        # Protect if workloads are linked
        workload_count = db.query(VMInventory).filter(VMInventory.proxmox_node_id == node_id).count()
        if workload_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete node with {workload_count} linked workloads. Deactivate it instead."
            )
        
        name = node.name
        db.delete(node)
        self._log_activity(db, actor, "proxmox_node_delete", name, f"Deleted Proxmox node {node_id}")
        db.commit()
        return {"status": "deleted"}

    def get_node_workloads(self, db: Session, node_id: str):
        self.get_node(db, node_id)  # Ensure node exists
        return db.query(VMInventory).filter(VMInventory.proxmox_node_id == node_id).all()

proxmox_service = ProxmoxService()

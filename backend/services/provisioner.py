from services.proxmox_sync import get_proxmox_connection
import logging
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from config import get_vdi_images, get_vm_profiles
from models import ProxmoxNode, Task, User, VMInventory, GoldenImage, CloudInitProfile
from schemas import ProvisionVDIRequest, ProvisionVMRequest
from services.guacamole import guacamole_service
from services.phpipam import phpipam_service
from services.points import points_service
from services.task_service import task_service
from utils.exceptions import IntegrationError

logger = logging.getLogger(__name__)


class ProvisionerService:
    def _select_best_node(self, db: Session) -> ProxmoxNode:
        node = (
            db.query(ProxmoxNode)
            .filter(ProxmoxNode.is_active.is_(True))
            .order_by(
                ProxmoxNode.free_cpu.desc().nullslast(),
                ProxmoxNode.free_ram_gb.desc().nullslast(),
                ProxmoxNode.free_disk_gb.desc().nullslast(),
            )
            .first()
        )
        if node:
            return node

        raise IntegrationError("No Proxmox nodes available for provisioning")

    def _next_vmid(self, db: Session) -> int:
        max_vmid = db.query(func.max(VMInventory.vmid)).scalar()
        return int(max_vmid or 100) + 1

    def _resolve_vm_profile(self, db: Session, profile_id: str) -> dict:
        # Try database first (new system)
        db_profile = db.query(CloudInitProfile).filter(CloudInitProfile.id == profile_id).first()
        if db_profile:
            return {
                "id": db_profile.id,
                "label": db_profile.name,
                "username": db_profile.username,
                "password": db_profile.password,
                "ssh_keys": db_profile.ssh_keys,
                "type": "db_profile"
            }

        # Fallback to hardcoded profiles (legacy)
        profile = next((item for item in get_vm_profiles() if item["id"] == profile_id), None)
        if not profile:
            raise IntegrationError(f"Unsupported VM profile '{profile_id}'")
        return profile

    def _resolve_vdi_image(self, db: Session, image_id: str) -> dict:
        # Try database first
        db_image = db.query(GoldenImage).filter(GoldenImage.id == image_id).first()
        if db_image:
            return {
                "id": db_image.id,
                "label": db_image.name,
                "template_name": db_image.proxmox_template_name,
                "type": "db_image"
            }

        image = next((item for item in get_vdi_images() if item["id"] == image_id), None)
        if not image:
            raise IntegrationError(f"Unsupported VDI image '{image_id}'")
        return image

    async def _apply_cloud_init(self, proxmox, node_name: str, vmid: int, ip_address: str, profile: dict):
        """Inject Cloud-Init configuration into the VM via Proxmox API"""
        config = {
            "ipconfig0": f"ip={ip_address}/24,gw=auto", # Basic assumption
        }
        if profile.get("username"):
            config["ciuser"] = profile["username"]
        if profile.get("password"):
            config["cipassword"] = profile["password"]
        if profile.get("ssh_keys"):
            config["sshkeys"] = profile["ssh_keys"]
        
        try:
            proxmox.nodes(node_name).qemu(vmid).config.post(**config)
            logger.info(f"Cloud-Init configuration applied to VM {vmid} on {node_name}")
        except Exception as e:
            logger.warning(f"Failed to apply Cloud-Init to VM {vmid}: {str(e)}")

    async def provision_vm(self, db: Session, task: Task, payload: ProvisionVMRequest, actor: User) -> VMInventory:
        await task_service.mark_running(db, task)

        node = self._select_best_node(db)
        vmid = self._next_vmid(db)
        vm_profile = self._resolve_vm_profile(db, payload.vm_profile_id)

        proxmox = get_proxmox_connection(node.ip_address)
        if not proxmox:
            raise IntegrationError(f"Could not connect to Proxmox node {node.name}")

        # 1. Identify template VMID from name
        template_name = vm_profile.get("template_name")
        if not template_name:
            # For DB profiles, we might need a default template or one selected in the payload
            template_name = payload.os_version or "tpl-ubuntu-22-04" 

        try:
            # Find template ID on the node
            vms = proxmox.nodes(node.name).qemu.get()
            template_vm = next((v for v in vms if v.get("name") == template_name), None)
            if not template_vm:
                raise IntegrationError(f"Template '{template_name}' not found on node {node.name}")
            
            template_vmid = template_vm["vmid"]

            # 2. Clone Template
            logger.info(f"Cloning template {template_name} ({template_vmid}) to new VM {vmid}...")
            proxmox.nodes(node.name).qemu(template_vmid).clone.post(
                newid=vmid,
                name=payload.name,
                full=1
            )
        except Exception as e:
            raise IntegrationError(f"Proxmox clone failed: {str(e)}")

        # 3. Network & Config
        ip_address = await phpipam_service.get_first_free_ip("vm")
        await phpipam_service.reserve_ip(
            "vm",
            ip_address=ip_address,
            hostname=payload.name,
            description=f"VORTYX VM profile {vm_profile['label']} on {node.name}",
        )

        # 4. Apply Cloud-Init configs
        await self._apply_cloud_init(proxmox, node.name, vmid, ip_address, vm_profile)

        # 5. Resource Adjustment
        try:
            proxmox.nodes(node.name).qemu(vmid).config.post(
                cores=payload.cpu_cores,
                memory=payload.ram_gb * 1024
            )
        except Exception as e:
            logger.warning(f"Failed to adjust resources for VM {vmid}: {str(e)}")

        # 6. Start VM
        try:
            proxmox.nodes(node.name).qemu(vmid).status.start.post()
        except Exception as e:
            logger.warning(f"Failed to start VM {vmid}: {str(e)}")

        vm = VMInventory(
            vmid=vmid,
            name=payload.name,
            proxmox_node=node.name,
            proxmox_node_id=node.id,
            node_ip=node.ip_address,
            ip_address=ip_address,
            owner_username=payload.owner_username,
            vm_type="vm",
            status="running",
            cpu_cores=payload.cpu_cores,
            ram_gb=payload.ram_gb,
            disk_gb=payload.disk_gb,
            os_version=payload.os_version or vm_profile["label"],
            guac_url=None,
            last_synced=datetime.utcnow(),
        )
        db.add(vm)

        points_service.award_points(
            db,
            user=actor,
            action_name="create_vm",
            target=payload.name,
            detail=f"Provisioned VM on {node.name} using {vm_profile['label']}",
            default_points=10,
        )
        db.commit()
        db.refresh(vm)

        await task_service.mark_completed(
            db,
            task,
            metadata_json={
                "vm_id": vm.id,
                "vmid": vm.vmid,
                "ip_address": ip_address,
                "node": node.name,
                "vm_profile": vm_profile,
                "provisioning_path": "template-clone-with-cloud-init",
            },
        )
        return vm

    async def provision_vdi(self, db: Session, task: Task, payload: ProvisionVDIRequest, actor: User) -> VMInventory:
        await task_service.mark_running(db, task)

        node = self._select_best_node(db)
        vmid = self._next_vmid(db)
        vdi_image = self._resolve_vdi_image(db, payload.golden_image_id)

        proxmox = get_proxmox_connection(node.ip_address)
        if not proxmox:
            raise IntegrationError(f"Could not connect to Proxmox node {node.name}")

        template_name = vdi_image.get("template_name")
        
        try:
            vms = proxmox.nodes(node.name).qemu.get()
            template_vm = next((v for v in vms if v.get("name") == template_name), None)
            if not template_vm:
                raise IntegrationError(f"Golden Image '{template_name}' not found on node {node.name}")
            
            template_vmid = template_vm["vmid"]

            logger.info(f"Cloning golden image {template_name} to new VDI {vmid}...")
            proxmox.nodes(node.name).qemu(template_vmid).clone.post(
                newid=vmid,
                name=payload.name,
                full=1
            )
            proxmox.nodes(node.name).qemu(vmid).status.start.post()
        except Exception as e:
            raise IntegrationError(f"Proxmox VDI clone failed: {str(e)}")

        ip_address = await phpipam_service.get_first_free_ip("vdi")
        await phpipam_service.reserve_ip(
            "vdi",
            ip_address=ip_address,
            hostname=payload.name,
            description=f"VORTYX VDI image {vdi_image['label']} on {node.name}",
        )

        try:
            guac_url = await guacamole_service.register_connection(
                protocol="vnc",
                name=payload.name,
                hostname=ip_address,
                port=5901,
                username=payload.owner_username,
            )
        except IntegrationError:
            guac_url = None

        vdi = VMInventory(
            vmid=vmid,
            name=payload.name,
            proxmox_node=node.name,
            proxmox_node_id=node.id,
            node_ip=node.ip_address,
            ip_address=ip_address,
            owner_username=payload.owner_username,
            vm_type="vdi",
            status="running",
            cpu_cores=payload.cpu_cores,
            ram_gb=payload.ram_gb,
            disk_gb=payload.disk_gb,
            os_version=f"golden:{vdi_image['label']}",
            guac_url=guac_url,
            last_synced=datetime.utcnow(),
        )
        db.add(vdi)

        points_service.award_points(
            db,
            user=actor,
            action_name="create_vdi",
            target=payload.name,
            detail=f"Provisioned VDI on {node.name} using {vdi_image['label']}",
            default_points=10,
        )

        db.commit()
        db.refresh(vdi)
        await task_service.mark_completed(
            db,
            task,
            metadata_json={
                "vm_id": vdi.id,
                "vmid": vdi.vmid,
                "ip_address": ip_address,
                "node": node.name,
                "vdi_image": vdi_image,
                "guac_url": guac_url,
                "provisioning_path": "golden-image-clone",
            },
        )
        return vdi


provisioner_service = ProvisionerService()

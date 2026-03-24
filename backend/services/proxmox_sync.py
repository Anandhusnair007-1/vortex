from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
import logging
from sqlalchemy.orm import Session

from config import get_settings
from database import SessionLocal
from models import VMInventory, ProxmoxNode

try:
    from proxmoxer import ProxmoxAPI
except ImportError:  # pragma: no cover - optional local dependency
    ProxmoxAPI = None

logger = logging.getLogger(__name__)

scheduler = None


def parse_proxmox_nodes() -> list[tuple[str, str]]:
    """Parse configured proxmox nodes into (name, ip) tuples."""
    settings = get_settings()
    nodes = []
    for node_str in settings.proxmox_nodes:
        if ":" in node_str:
            node_name, node_ip = node_str.strip().split(":")
            nodes.append((node_name.strip(), node_ip.strip()))
    return nodes


def get_proxmox_connection(node_ip: str):
    """Create a Proxmox API connection"""
    settings = get_settings()
    if ProxmoxAPI is None:
        logger.warning("proxmoxer_not_installed")
        return None

    if not settings.proxmox_username or not settings.proxmox_password:
        logger.warning("Proxmox credentials are not configured")
        return None

    try:
        host = node_ip
        port = 8006
        if ':' in node_ip:
            host, port_str = node_ip.rsplit(':', 1)
            port = int(port_str)

        proxmox = ProxmoxAPI(
            host,
            user=settings.proxmox_username,
            password=settings.proxmox_password,
            verify_ssl=settings.proxmox_verify_ssl,
            timeout=10,
            port=port
        )
        return proxmox
    except Exception as e:
        logger.error(f"Failed to connect to Proxmox at {node_ip}: {str(e)}")
        return None


def sync_vms_from_node(node_name: str, node_ip: str, db: Session) -> int:
    """Sync all VMs from a single Proxmox node"""
    try:
        proxmox = get_proxmox_connection(node_ip)
        if not proxmox:
            return 0

        # Get node object from Proxmox
        nodes_obj = proxmox.nodes(node_name)

        # Look up node in DB to get its ID, or create it if missing
        db_node = db.query(ProxmoxNode).filter(ProxmoxNode.name == node_name).first()
        if not db_node:
            logger.info(f"Auto-creating ProxmoxNode entry for {node_name} at {node_ip}")
            db_node = ProxmoxNode(
                name=node_name,
                ip_address=node_ip,
                cluster_name="Discovered Cluster",
                is_active=True,
                last_synced=datetime.utcnow()
            )
            db.add(db_node)
            db.commit()
            db.refresh(db_node)
        
        node_id = db_node.id

        # Fetch Node status/telemetry (Capacity)
        try:
            status = nodes_obj.status.get()
            # Proxmox returns bytes for mem/disk, convert to GB
            total_ram = status.get("memory", {}).get("total", 0) // (1024**3)
            free_ram = (status.get("memory", {}).get("total", 0) - status.get("memory", {}).get("used", 0)) // (1024**3)
            
            total_disk = status.get("rootfs", {}).get("total", 0) // (1024**3)
            free_disk = (status.get("rootfs", {}).get("total", 0) - status.get("rootfs", {}).get("used", 0)) // (1024**3)
            
            total_cpu = status.get("cpuinfo", {}).get("cpus", 1)
            
            db_node.total_ram_gb = total_ram
            db_node.free_ram_gb = free_ram
            db_node.total_disk_gb = total_disk
            db_node.free_disk_gb = free_disk
            db_node.total_cpu = total_cpu
            db_node.last_synced = datetime.utcnow()
            db.add(db_node)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to fetch status for node {node_name}: {str(e)}")

        # Get all VMs on this node
        qemu_list = nodes_obj.qemu.get()  # KVM VMs
        lxc_list = nodes_obj.lxc.get()    # LXC containers

        # Look up node in DB to get its ID, or create it if missing
        db_node = db.query(ProxmoxNode).filter(ProxmoxNode.name == node_name).first()
        if not db_node:
            logger.info(f"Auto-creating ProxmoxNode entry for {node_name} at {node_ip}")
            db_node = ProxmoxNode(
                name=node_name,
                ip_address=node_ip,
                cluster_name="Discovered Cluster",
                is_active=True,
                last_synced=datetime.utcnow()
            )
            db.add(db_node)
            db.commit()
            db.refresh(db_node)
        
        node_id = db_node.id

        count = 0

        # Process KVM VMs
        for vm_data in qemu_list:
            vm_id = vm_data.get("vmid")
            vm_name = vm_data.get("name")
            vm_status = vm_data.get("status")

            # Get detailed VM info
            try:
                vm_config = nodes_obj.qemu(vm_id).config.get()
            except Exception:
                vm_config = {}

            # Parse VM details
            cpu_cores = vm_config.get("cores", 1)
            memory_mb = vm_config.get("memory", 512)
            memory_gb = memory_mb // 1024
            disk_gb = vm_data.get("disk", 0) // (1024 ** 3)

            # Try to get IP address from agent
            ip_address = None
            try:
                agent_data = nodes_obj.qemu(vm_id).agent("network-get-interfaces").get()
                if agent_data.get("result"):
                    for iface in agent_data["result"]:
                        if iface.get("name", "").startswith("eth"):
                            ip_list = iface.get("ip-addresses", [])
                            if ip_list:
                                ip_address = ip_list[0].get("ip-address")
                                break
            except Exception:
                pass

            # Check if VM already exists
            existing_vm = db.query(VMInventory).filter(
                (VMInventory.vmid == vm_id) &
                (VMInventory.proxmox_node == node_name)
            ).first()

            if existing_vm:
                # Update existing VM
                existing_vm.status = vm_status
                existing_vm.cpu_cores = cpu_cores
                existing_vm.ram_gb = memory_gb
                existing_vm.disk_gb = disk_gb
                existing_vm.ip_address = ip_address or existing_vm.ip_address
                existing_vm.proxmox_node_id = node_id or existing_vm.proxmox_node_id
                existing_vm.last_synced = datetime.utcnow()
                db.add(existing_vm)
            else:
                # Create new VM record
                new_vm = VMInventory(
                    vmid=vm_id,
                    name=vm_name,
                    proxmox_node=node_name,
                    proxmox_node_id=node_id,
                    node_ip=node_ip,
                    ip_address=ip_address,
                    vm_type="vm",
                    status=vm_status,
                    cpu_cores=cpu_cores,
                    ram_gb=memory_gb,
                    disk_gb=disk_gb,
                    last_synced=datetime.utcnow()
                )
                db.add(new_vm)

            count += 1

        # Process LXC containers
        for lxc_data in lxc_list:
            lxc_id = lxc_data.get("vmid")
            lxc_name = lxc_data.get("name")
            lxc_status = lxc_data.get("status")

            existing_vm = db.query(VMInventory).filter(
                (VMInventory.vmid == lxc_id) &
                (VMInventory.proxmox_node == node_name)
            ).first()

            if existing_vm:
                existing_vm.status = lxc_status
                existing_vm.last_synced = datetime.utcnow()
                db.add(existing_vm)
            else:
                new_vm = VMInventory(
                    vmid=lxc_id,
                    name=lxc_name,
                    proxmox_node=node_name,
                    proxmox_node_id=node_id,
                    node_ip=node_ip,
                    vm_type="vdi",
                    status=lxc_status,
                    last_synced=datetime.utcnow()
                )
                db.add(new_vm)

            count += 1

        db.commit()
        logger.info(f"✓ Synced {count} VMs from {node_name}")
        return count

    except Exception as e:
        logger.error(f"Error syncing VMs from {node_name}: {str(e)}")
        db.rollback()
        return 0


def sync_all_vms() -> None:
    """Sync VMs from all Proxmox nodes (scheduled task)"""
    db = SessionLocal()
    try:
        # 1. Sync auto-discovered nodes from .env
        env_nodes = parse_proxmox_nodes()
        total_synced = 0

        for node_name, node_ip in env_nodes:
            count = sync_vms_from_node(node_name, node_ip, db)
            total_synced += count

        # 2. Sync all active nodes from the database (UI-added nodes)
        db_nodes = db.query(ProxmoxNode).filter(ProxmoxNode.is_active.is_(True)).all()
        env_node_names = {n[0] for n in env_nodes}
        
        for db_node in db_nodes:
            if db_node.name not in env_node_names:
                count = sync_vms_from_node(db_node.name, db_node.ip_address, db)
                total_synced += count

        logger.info(f"✓ VM Sync Complete: {total_synced} VMs synced")

    except Exception as e:
        logger.error(f"VM Sync failed: {str(e)}")
    finally:
        db.close()


def start_vm_sync_scheduler() -> None:
    """Start the background VM sync scheduler"""
    global scheduler

    if scheduler is None:
        scheduler = BackgroundScheduler()

        # Run sync every 5 minutes
        scheduler.add_job(
            sync_all_vms,
            "interval",
            minutes=5,
            id="vm_sync_job",
            name="VM Sync from Proxmox",
            max_instances=1
        )

        scheduler.start()
        logger.info("✓ VM Sync scheduler started (every 5 minutes)")

        # Run initial sync immediately without blocking fastapi startup
        import threading
        threading.Thread(target=sync_all_vms, daemon=True).start()


def stop_vm_sync_scheduler() -> None:
    """Stop the background VM sync scheduler"""
    global scheduler

    if scheduler:
        scheduler.shutdown()
        scheduler = None
        logger.info("✓ VM Sync scheduler stopped")

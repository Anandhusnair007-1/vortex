import os
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from proxmoxer import ProxmoxAPI
from apscheduler.schedulers.background import BackgroundScheduler
import logging
from models import VMInventory
from database import SessionLocal

logger = logging.getLogger(__name__)

# Proxmox Configuration
PROXMOX_NODES = os.getenv("PROXMOX_NODES", "node1:192.168.1.10").split(",")
PROXMOX_USERNAME = os.getenv("PROXMOX_USERNAME", "root@pam")
PROXMOX_PASSWORD = os.getenv("PROXMOX_PASSWORD", "password")
PROXMOX_VERIFY_SSL = os.getenv("PROXMOX_VERIFY_SSL", "false").lower() == "true"

scheduler = None


def parse_proxmox_nodes():
    """Parse PROXMOX_NODES environment variable into list of tuples"""
    nodes = []
    for node_str in PROXMOX_NODES:
        if ":" in node_str:
            node_name, node_ip = node_str.strip().split(":")
            nodes.append((node_name.strip(), node_ip.strip()))
    return nodes


def get_proxmox_connection(node_ip):
    """Create a Proxmox API connection"""
    try:
        proxmox = ProxmoxAPI(
            node_ip,
            user=PROXMOX_USERNAME,
            password=PROXMOX_PASSWORD,
            verify_ssl=PROXMOX_VERIFY_SSL,
            timeout=10
        )
        return proxmox
    except Exception as e:
        logger.error(f"Failed to connect to Proxmox at {node_ip}: {str(e)}")
        return None


def sync_vms_from_node(node_name, node_ip, db: Session):
    """Sync all VMs from a single Proxmox node"""
    try:
        proxmox = get_proxmox_connection(node_ip)
        if not proxmox:
            return 0

        # Get all VMs on this node
        nodes_obj = proxmox.nodes(node_name)
        qemu_list = nodes_obj.qemu.get()  # KVM VMs
        lxc_list = nodes_obj.lxc.get()    # LXC containers

        count = 0

        # Process KVM VMs
        for vm_data in qemu_list:
            vm_id = vm_data.get("vmid")
            vm_name = vm_data.get("name")
            vm_status = vm_data.get("status")

            # Get detailed VM info
            try:
                vm_config = nodes_obj.qemu(vm_id).config.get()
                vm_status_detail = nodes_obj.qemu(vm_id).status.current.get()
            except:
                vm_config = {}
                vm_status_detail = {}

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
            except:
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
                existing_vm.last_synced = datetime.utcnow()
                db.add(existing_vm)
            else:
                # Create new VM record
                new_vm = VMInventory(
                    vmid=vm_id,
                    name=vm_name,
                    proxmox_node=node_name,
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


def sync_all_vms():
    """Sync VMs from all Proxmox nodes (scheduled task)"""
    db = SessionLocal()
    try:
        nodes = parse_proxmox_nodes()
        total_synced = 0

        for node_name, node_ip in nodes:
            count = sync_vms_from_node(node_name, node_ip, db)
            total_synced += count

        logger.info(f"✓ VM Sync Complete: {total_synced} VMs synced")

    except Exception as e:
        logger.error(f"VM Sync failed: {str(e)}")
    finally:
        db.close()


def start_vm_sync_scheduler():
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

        # Run initial sync immediately
        sync_all_vms()


def stop_vm_sync_scheduler():
    """Stop the background VM sync scheduler"""
    global scheduler

    if scheduler:
        scheduler.shutdown()
        scheduler = None
        logger.info("✓ VM Sync scheduler stopped")

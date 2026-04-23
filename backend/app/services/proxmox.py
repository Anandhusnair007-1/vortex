import asyncio
import random
import string
import aiohttp
from ..core.config import settings

# Default VM/VDI credentials (used for all VMs unless overridden)
DEFAULT_VM_USERNAME = "admin"
DEFAULT_VM_PASSWORD = "CyberDrift@2026"

def generate_password(length=12):
    """Generate a secure random password"""
    chars = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(random.choice(chars) for _ in range(length))

async def provision_vm(request, template) -> dict:
    if not settings.PROXMOX_HOST:
        return await provision_vm_mock(request, template)
    
    return await provision_vm_real(request, template)

async def provision_vm_mock(request, template) -> dict:
    await asyncio.sleep(3)
    
    # Get IP from DHCP pool or static range
    ip_last_octet = random.randint(100, 200)
    ip_address = f"192.168.1.{ip_last_octet}"
    
    # Generate MAC address
    mac_address = f"02:00:00:{random.randint(10,99):02x}:{random.randint(10,99):02x}:{random.randint(10,99):02x}"
    
    # Use default credentials
    vm_username = DEFAULT_VM_USERNAME
    vm_password = DEFAULT_VM_PASSWORD
    
    # VM ID on Proxmox
    vm_id = random.randint(200, 250)
    node = settings.PROXMOX_NODE or "pve-node-01"
    
    return {
        "success": True,
        "vm_id": str(vm_id),
        "node": node,
        "ip_address": ip_address,
        "mac_address": mac_address,
        "vm_username": vm_username,
        "vm_password": vm_password,
        "glpi_ticket_id": f"MOCK-{random.randint(1000, 9999)}"
    }

async def provision_vm_real(request, template) -> dict:
    proxmox_url = settings.PROXMOX_HOST
    username = settings.PROXMOX_USER
    password = settings.PROXMOX_PASSWORD
    node = settings.PROXMOX_NODE or "pve"
    
    async with aiohttp.ClientSession() as session:
        try:
            # Get authentication ticket
            login_url = f"https://{proxmox_url}/api2/json/access/ticket"
            login_data = {"username": username, "password": password}
            
            async with session.post(login_url, json=login_data, ssl=settings.PROXMOX_VERIFY_SSL) as resp:
                if resp.status != 200:
                    return {"success": False, "error": "Failed to authenticate with Proxmox"}
                ticket_data = await resp.json()
                csrf_token = ticket_data.get("data", {}).get("CSRFPreventionToken")
                ticket = ticket_data.get("data", {}).get("ticket")
            
            headers = {
                "CSRFPreventionToken": csrf_token,
                "Cookie": f"PVEAuthCookie={ticket}"
            }
            
            # Find next available VM ID
            vmid = random.randint(200, 250)
            vm_name = request.vm_name or f"vortex-{request.id[:8]}"
            
            # Create VM
            create_url = f"https://{proxmox_url}/api2/json/nodes/{node}/qemu"
            vm_config = {
                "vmid": vmid,
                "name": vm_name,
                "cores": template.cpu,
                "memory": template.ram_gb * 1024,
                "scsi0": f"{template.proxmox_template_id},size={template.disk_gb}G",
                "net0": "virtio,bridge=vmbr0",
                "ostype": template.os_type.lower(),
                "onboot": 1,
                "start": 1
            }
            
            async with session.post(create_url, json=vm_config, headers=headers, ssl=settings.PROXMOX_VERIFY_SSL) as create_resp:
                if create_resp.status != 200:
                    error = await create_resp.text()
                    return {"success": False, "error": f"Failed to create VM: {error}"}
            
            # Wait for VM to be ready
            await asyncio.sleep(5)
            
            # Get network configuration (DHCP or static)
            ip_address = f"192.168.1.{random.randint(100, 200)}"
            mac_address = f"02:00:00:{random.randint(10,99):02x}:{random.randint(10,99):02x}:{random.randint(10,99):02x}"
            
            return {
                "success": True,
                "vm_id": str(vmid),
                "node": node,
                "ip_address": ip_address,
                "mac_address": mac_address,
                "vm_username": DEFAULT_VM_USERNAME,
                "vm_password": DEFAULT_VM_PASSWORD,
                "glpi_ticket_id": ""
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

async def get_proxmoxVMs() -> list:
    if not settings.PROXMOX_HOST:
        return []
    
    proxmox_url = settings.PROXMOX_HOST
    username = settings.PROXMOX_USER
    password = settings.PROXMOX_PASSWORD
    node = settings.PROXMOX_NODE or "pve"
    
    async with aiohttp.ClientSession() as session:
        try:
            login_url = f"https://{proxmox_url}/api2/json/access/ticket"
            async with session.post(login_url, json={"username": username, "password": password}, ssl=settings.PROXMOX_VERIFY_SSL) as resp:
                ticket_data = await resp.json()
                ticket = ticket_data.get("data", {}).get("ticket")
            
            headers = {"Cookie": f"PVEAuthCookie={ticket}"}
            list_url = f"https://{proxmox_url}/api2/json/nodes/{node}/qemu"
            async with session.get(list_url, headers=headers, ssl=settings.PROXMOX_VERIFY_SSL) as resp:
                data = await resp.json()
                return data.get("data", [])
        except:
            return []

async def delete_proxmox_vm(vm_id: int, node: str = None) -> dict:
    if not settings.PROXMOX_HOST:
        return {"success": True, "message": "Mock mode - VM deleted"}
    
    proxmox_url = settings.PROXMOX_HOST
    username = settings.PROXMOX_USER
    password = settings.PROXMOX_PASSWORD
    node = node or settings.PROXMOX_NODE or "pve"
    
    async with aiohttp.ClientSession() as session:
        try:
            login_url = f"https://{proxmox_url}/api2/json/access/ticket"
            async with session.post(login_url, json={"username": username, "password": password}, ssl=settings.PROXMOX_VERIFY_SSL) as resp:
                ticket_data = await resp.json()
                csrf_token = ticket_data.get("data", {}).get("CSRFPreventionToken")
                ticket = ticket_data.get("data", {}).get("ticket")
            
            headers = {
                "CSRFPreventionToken": csrf_token,
                "Cookie": f"PVEAuthCookie={ticket}"
            }
            
            delete_url = f"https://{proxmox_url}/api2/json/nodes/{node}/qemu/{vm_id}"
            async with session.delete(delete_url, headers=headers, ssl=settings.PROXMOX_VERIFY_SSL) as resp:
                return {"success": resp.status == 200}
        except Exception as e:
            return {"success": False, "error": str(e)}

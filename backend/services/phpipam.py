import ipaddress

import httpx

from config import get_settings
from utils.exceptions import IntegrationError


class PhpIpamService:
    async def get_first_free_ip(self, vm_type: str) -> str:
        settings = get_settings()
        subnet_id = settings.phpipam_vm_subnet_id if vm_type == "vm" else settings.phpipam_vdi_subnet_id
        if not settings.phpipam_base_url or not settings.phpipam_app_id or not settings.phpipam_token or not subnet_id:
            raise IntegrationError("phpIPAM integration is not configured")

        headers = {"token": settings.phpipam_token}
        url = f"{settings.phpipam_base_url.rstrip('/')}/api/{settings.phpipam_app_id}/subnets/{subnet_id}/first_free/"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code >= 300:
                raise IntegrationError("Failed to fetch first free IP from phpIPAM")
            payload = response.json()
            ip_address = payload.get("data")
            if not ip_address:
                raise IntegrationError("phpIPAM returned empty IP")
            return str(ipaddress.ip_address(ip_address))

    async def reserve_ip(self, vm_type: str, ip_address: str, hostname: str, description: str) -> None:
        settings = get_settings()
        subnet_id = settings.phpipam_vm_subnet_id if vm_type == "vm" else settings.phpipam_vdi_subnet_id
        if not settings.phpipam_base_url or not settings.phpipam_app_id or not settings.phpipam_token or not subnet_id:
            raise IntegrationError("phpIPAM integration is not configured")

        headers = {"token": settings.phpipam_token}
        url = f"{settings.phpipam_base_url.rstrip('/')}/api/{settings.phpipam_app_id}/addresses/"
        payload = {
            "subnetId": subnet_id,
            "ip": ip_address,
            "hostname": hostname,
            "description": description,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code >= 300:
                raise IntegrationError("Failed to reserve IP in phpIPAM")


phpipam_service = PhpIpamService()

from typing import Optional

import aiohttp
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ...models.user import User, UserRole
from .auth import require_role

router = APIRouter()


class ProxmoxConnectionTestIn(BaseModel):
    protocol: str = "https"
    host: str
    port: int = 8006
    username: str
    password: str
    node: Optional[str] = None
    verify_ssl: bool = False


@router.post("/test-connection")
async def test_proxmox_connection(
    payload: ProxmoxConnectionTestIn,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    host = payload.host.strip()
    username = payload.username.strip()

    if not host:
        raise HTTPException(status_code=400, detail="Host is required")

    if not username:
      raise HTTPException(status_code=400, detail="Username is required")

    if "://" in host:
        raise HTTPException(status_code=400, detail="Host should not include http:// or https://")

    normalized_protocol = payload.protocol.lower()
    if normalized_protocol not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Protocol must be http or https")

    # Accept root and normalize to the default Proxmox PAM realm.
    if "@" not in username:
        username = f"{username}@pam"

    base_url = f"{normalized_protocol}://{host}:{payload.port}"
    login_url = f"{base_url}/api2/json/access/ticket"
    login_data = {"username": username, "password": payload.password}

    timeout = aiohttp.ClientTimeout(total=10)

    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(login_url, data=login_data, ssl=payload.verify_ssl) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=400,
                        detail=f"Proxmox login failed ({response.status}): {error_text[:200]}",
                    )

                body = await response.json()
                ticket = body.get("data", {}).get("ticket")
                csrf_token = body.get("data", {}).get("CSRFPreventionToken")

                if not ticket or not csrf_token:
                    raise HTTPException(status_code=400, detail="Proxmox login succeeded but no auth ticket was returned")

                node_name = (payload.node or "").strip()
                if node_name:
                    headers = {"Cookie": f"PVEAuthCookie={ticket}"}
                    node_url = f"{base_url}/api2/json/nodes/{node_name}/status"
                    async with session.get(node_url, headers=headers, ssl=payload.verify_ssl) as node_response:
                        if node_response.status != 200:
                            error_text = await node_response.text()
                            raise HTTPException(
                                status_code=400,
                                detail=f"Connected, but node '{node_name}' could not be verified ({node_response.status}): {error_text[:200]}",
                            )

        return {
            "success": True,
            "message": "Connection successful",
            "normalized_username": username,
            "base_url": base_url,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not reach Proxmox: {exc}")

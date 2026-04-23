import httpx

from config import get_settings
from utils.exceptions import IntegrationError


class GuacamoleService:
    async def register_connection(
        self,
        protocol: str,
        name: str,
        hostname: str,
        port: int,
        username: str,
    ) -> str:
        settings = get_settings()
        if not settings.guac_base_url or not settings.guac_username or not settings.guac_password:
            raise IntegrationError("Guacamole integration is not configured")

        # In many Guacamole deployments, auth flow is gateway-dependent.
        # This implementation provides a hardened integration hook and should be
        # adapted to the environment-specific auth API.
        async with httpx.AsyncClient(timeout=10.0) as client:
            auth = await client.post(
                f"{settings.guac_base_url.rstrip('/')}/api/tokens",
                data={"username": settings.guac_username, "password": settings.guac_password},
            )
            if auth.status_code >= 300:
                raise IntegrationError("Failed to authenticate to Guacamole")

            token = auth.json().get("authToken")
            if not token:
                raise IntegrationError("Guacamole auth token missing")

            data_source = auth.json().get("dataSource", "postgresql")
            create_response = await client.post(
                f"{settings.guac_base_url.rstrip('/')}/api/session/data/{data_source}/connections",
                params={"token": token},
                json={
                    "name": name,
                    "protocol": protocol,
                    "parameters": {"hostname": hostname, "port": str(port), "username": username},
                },
            )
            if create_response.status_code >= 300:
                raise IntegrationError("Failed to create Guacamole connection")

            conn_id = create_response.json().get("identifier")
            if not conn_id:
                raise IntegrationError("Guacamole connection id missing")
            return f"{settings.guac_base_url.rstrip('/')}/#/client/{conn_id}"


guacamole_service = GuacamoleService()

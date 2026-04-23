import httpx

from config import get_settings
from utils.exceptions import IntegrationError


class AWXService:
    async def launch_job_template(self, job_template_id: int, extra_vars: dict) -> dict:
        settings = get_settings()
        if not settings.awx_base_url or not settings.awx_token:
            raise IntegrationError("AWX integration is not configured")

        headers = {"Authorization": f"Bearer {settings.awx_token}"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{settings.awx_base_url.rstrip('/')}/api/v2/job_templates/{job_template_id}/launch/",
                headers=headers,
                json={"extra_vars": extra_vars},
            )
            if response.status_code >= 300:
                raise IntegrationError("Failed to launch AWX job template")
            return response.json()


awx_service = AWXService()

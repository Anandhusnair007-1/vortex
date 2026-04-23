import aiohttp
from ..core.config import settings


async def create_ticket(request, vm_details) -> str:
    if not settings.GLPI_URL:
        print(f"--- MOCK GLPI TICKET ---")
        print(f"Title: {request.title}")
        print(f"VM ID: {vm_details.get('vm_id', 'N/A')}")
        print(f"IP: {vm_details.get('ip_address', 'N/A')}")
        print(f"Node: {vm_details.get('node', 'N/A')}")
        print(f"Username: {vm_details.get('vm_username', 'N/A')}")
        print(
            f"Requester: {request.requester.name if request.requester else 'Unknown'}"
        )
        print(f"------------------------")
        return "MOCK-TICKET-001"

    return await create_glpi_ticket_real(request, vm_details)


async def create_glpi_ticket_real(request, vm_details) -> str:
    glpi_url = settings.GLPI_URL
    app_token = settings.GLPI_APP_TOKEN
    user_token = settings.GLPI_USER_TOKEN

    async with aiohttp.ClientSession() as session:
        try:
            headers = {
                "Content-Type": "application/json",
                "App-Token": app_token,
                "Authorization": f"user_token {user_token}",
            }

            ticket_data = {
                "input": {
                    "name": f"VM Provisioned: {request.title}",
                    "content": f"""
VM Request Details:
- Request ID: {request.id}
- Requester: {request.requester.name if request.requester else "Unknown"}
- Email: {request.requester.email if request.requester else "N/A"}

VM Configuration:
- VM ID: {vm_details.get("vm_id", "N/A")}
- Node: {vm_details.get("node", "N/A")}
- IP Address: {vm_details.get("ip_address", "N/A")}
- MAC Address: {vm_details.get("mac_address", "N/A")}
- Username: {vm_details.get("vm_username", "N/A")}
- Password: {vm_details.get("vm_password", "N/A")}

Template: {request.template.name if request.template else "N/A"}
Justification: {request.justification}
                    """.strip(),
                    "entities_id": 1,
                    "itilcategories_id": 1,
                    "type": 1,
                    "status": 1,
                }
            }

            url = f"{glpi_url}/apirest.php/Ticket"
            async with session.post(url, json=ticket_data, headers=headers) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    return str(data.get("id", "GLPI-TICKET-ERROR"))
                else:
                    error = await resp.text()
                    print(f"GLPI Error: {error}")
                    return "GLPI-TICKET-ERROR"

        except Exception as e:
            print(f"GLPI Exception: {e}")
            return "GLPI-TICKET-ERROR"


async def get_glpi_tickets() -> list:
    if not settings.GLPI_URL:
        return []

    glpi_url = settings.GLPI_URL
    app_token = settings.GLPI_APP_TOKEN
    user_token = settings.GLPI_USER_TOKEN

    async with aiohttp.ClientSession() as session:
        try:
            headers = {
                "App-Token": app_token,
                "Authorization": f"user_token {user_token}",
            }

            url = f"{glpi_url}/apirest.php/Ticket?range=0-100"
            async with session.get(url, headers=headers) as resp:
                data = await resp.json()
                return data.get("data", [])
        except:
            return []

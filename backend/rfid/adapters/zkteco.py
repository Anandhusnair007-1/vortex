import requests

from models import RFIDDevice
from rfid.adapters.base import RFIDAdapter


class ZKTecoAdapter(RFIDAdapter):
    def authenticate(self, session: requests.Session, device: RFIDDevice, credentials: dict) -> bool:
        login_path = credentials.get("login_path", "/api/login")
        username = credentials.get("username")
        password = credentials.get("password")

        if not username or not password:
            return False

        response = session.post(
            f"http://{device.ip_address}{login_path}",
            json={"username": username, "password": password},
            timeout=10,
        )
        return response.status_code in (200, 201, 204)

    def grant_access(
        self,
        session: requests.Session,
        device: RFIDDevice,
        credentials: dict,
        user_external_id: str,
    ) -> bool:
        grant_path = credentials.get("grant_path", "/api/device/user/add")
        card_number = credentials.get("card_number_map", {}).get(user_external_id, user_external_id)

        response = session.post(
            f"http://{device.ip_address}{grant_path}",
            json={"user_id": user_external_id, "card_number": card_number},
            timeout=10,
        )
        return response.status_code in (200, 201, 204)

    def revoke_access(
        self,
        session: requests.Session,
        device: RFIDDevice,
        credentials: dict,
        user_external_id: str,
    ) -> bool:
        revoke_path = credentials.get("revoke_path", "/api/device/user/delete")
        response = session.post(
            f"http://{device.ip_address}{revoke_path}",
            json={"user_id": user_external_id},
            timeout=10,
        )
        return response.status_code in (200, 201, 204)

    def health_check(self, session: requests.Session, device: RFIDDevice, credentials: dict) -> bool:
        heartbeat_path = credentials.get("heartbeat_path", "/api/device/status")
        response = session.get(f"http://{device.ip_address}{heartbeat_path}", timeout=5)
        return response.status_code == 200

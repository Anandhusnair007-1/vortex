import requests

from models import RFIDDevice
from rfid.adapters.base import RFIDAdapter


class GenericHTTPAdapter(RFIDAdapter):
    def authenticate(self, session: requests.Session, device: RFIDDevice, credentials: dict) -> bool:
        auth_type = credentials.get("auth_type", "basic")
        if auth_type == "basic":
            username = credentials.get("username")
            password = credentials.get("password")
            if username and password:
                session.auth = (username, password)
                return True

        token = credentials.get("token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
            return True

        return False

    def grant_access(
        self,
        session: requests.Session,
        device: RFIDDevice,
        credentials: dict,
        user_external_id: str,
    ) -> bool:
        grant_path = credentials.get("grant_path", "/grant")
        response = session.post(
            f"http://{device.ip_address}{grant_path}",
            json={"user_id": user_external_id},
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
        revoke_path = credentials.get("revoke_path", "/revoke")
        response = session.post(
            f"http://{device.ip_address}{revoke_path}",
            json={"user_id": user_external_id},
            timeout=10,
        )
        return response.status_code in (200, 201, 204)

    def health_check(self, session: requests.Session, device: RFIDDevice, credentials: dict) -> bool:
        health_path = credentials.get("health_path", "/health")
        response = session.get(f"http://{device.ip_address}{health_path}", timeout=5)
        return response.status_code == 200

import requests
import logging
from typing import Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class RFIDAdapter(ABC):
    """Base class for RFID device adapters"""

    def __init__(self, ip: str, credentials: Optional[dict] = None):
        self.ip = ip
        self.credentials = credentials or {}
        self.session = requests.Session()
        self.is_online = False

    @abstractmethod
    def connect(self) -> bool:
        """Connect to the RFID device"""
        pass

    @abstractmethod
    def grant_access(self, user_id: str, card_number: str) -> bool:
        """Grant access to a user"""
        pass

    @abstractmethod
    def revoke_access(self, user_id: str, card_number: str) -> bool:
        """Revoke access from a user"""
        pass

    @abstractmethod
    def get_status(self) -> dict:
        """Get device status"""
        pass


class ZKTecoAdapter(RFIDAdapter):
    """Adapter for ZKTeco RFID door controllers"""

    def connect(self) -> bool:
        """Connect and authenticate to ZKTeco device"""
        try:
            url = f"http://{self.ip}/api/login"
            username = self.credentials.get("username", "admin")
            password = self.credentials.get("password", "admin")

            response = self.session.post(
                url,
                json={"username": username, "password": password},
                timeout=10
            )

            if response.status_code == 200:
                self.is_online = True
                logger.info(f"✓ Connected to ZKTeco device at {self.ip}")
                return True
            else:
                logger.error(f"ZKTeco login failed: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Failed to connect to ZKTeco device: {str(e)}")
            return False

    def grant_access(self, user_id: str, card_number: str) -> bool:
        """Grant access for a card"""
        try:
            if not self.is_online:
                if not self.connect():
                    return False

            url = f"http://{self.ip}/api/device/user/add"
            payload = {
                "user_id": user_id,
                "card": card_number,
                "door": self.credentials.get("door", "1"),
                "access_level": self.credentials.get("access_level", 1),
            }

            response = self.session.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"✓ Granted access for card {card_number} on ZKTeco {self.ip}")
                return True
            else:
                logger.error(f"Failed to grant access: {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error granting access: {str(e)}")
            self.is_online = False
            return False

    def revoke_access(self, user_id: str, card_number: str) -> bool:
        """Revoke access for a card"""
        try:
            if not self.is_online:
                if not self.connect():
                    return False

            url = f"http://{self.ip}/api/device/user/delete"
            payload = {
                "user_id": user_id,
                "card": card_number,
            }

            response = self.session.post(url, json=payload, timeout=10)

            if response.status_code == 200:
                logger.info(f"✓ Revoked access for card {card_number} on ZKTeco {self.ip}")
                return True
            else:
                logger.error(f"Failed to revoke access: {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error revoking access: {str(e)}")
            self.is_online = False
            return False

    def get_status(self) -> dict:
        """Get device status"""
        try:
            url = f"http://{self.ip}/api/device/status"
            response = self.session.get(url, timeout=10)

            if response.status_code == 200:
                self.is_online = True
                return response.json()
            else:
                self.is_online = False
                return {"online": False, "error": "Device returned error"}

        except Exception as e:
            logger.error(f"Error getting device status: {str(e)}")
            self.is_online = False
            return {"online": False, "error": str(e)}


class GenericHTTPAdapter(RFIDAdapter):
    """Generic HTTP adapter for basic RFID devices"""

    def connect(self) -> bool:
        """Test connection to device"""
        try:
            url = f"http://{self.ip}/api/status"
            response = self.session.get(url, timeout=10)

            if response.status_code == 200:
                self.is_online = True
                logger.info(f"✓ Connected to device at {self.ip}")
                return True
            else:
                logger.error(f"Device returned status: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Failed to connect to device: {str(e)}")
            return False

    def grant_access(self, user_id: str, card_number: str) -> bool:
        """Grant access via generic HTTP endpoint"""
        try:
            if not self.is_online:
                if not self.connect():
                    return False

            url = f"http://{self.ip}/api/access/grant"
            payload = {
                "user_id": user_id,
                "card_number": card_number,
                "action": "grant",
            }

            response = self.session.post(url, json=payload, timeout=10)

            if response.status_code == 200:
                logger.info(f"✓ Granted access for {user_id}")
                return True
            else:
                logger.error(f"Failed to grant access: {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error granting access: {str(e)}")
            self.is_online = False
            return False

    def revoke_access(self, user_id: str, card_number: str) -> bool:
        """Revoke access via generic HTTP endpoint"""
        try:
            if not self.is_online:
                if not self.connect():
                    return False

            url = f"http://{self.ip}/api/access/revoke"
            payload = {
                "user_id": user_id,
                "card_number": card_number,
                "action": "revoke",
            }

            response = self.session.post(url, json=payload, timeout=10)

            if response.status_code == 200:
                logger.info(f"✓ Revoked access for {user_id}")
                return True
            else:
                logger.error(f"Failed to revoke access: {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error revoking access: {str(e)}")
            self.is_online = False
            return False

    def get_status(self) -> dict:
        """Get device status"""
        try:
            url = f"http://{self.ip}/api/status"
            response = self.session.get(url, timeout=10)

            if response.status_code == 200:
                self.is_online = True
                return response.json()
            else:
                self.is_online = False
                return {"online": False}

        except Exception as e:
            logger.error(f"Error getting status: {str(e)}")
            self.is_online = False
            return {"online": False, "error": str(e)}


# Factory function to get the right adapter
def get_rfid_adapter(brand: str, ip: str, credentials: dict = None) -> RFIDAdapter:
    """Factory function to get the appropriate RFID adapter"""
    adapters = {
        "zkteco": ZKTecoAdapter,
        "generic_http": GenericHTTPAdapter,
    }

    adapter_class = adapters.get(brand.lower(), GenericHTTPAdapter)
    return adapter_class(ip, credentials)


# Session pool to maintain connections
class RFIDSessionPool:
    """Maintains a pool of RFID device sessions"""

    def __init__(self):
        self.sessions = {}

    def get_adapter(self, device_id: str, brand: str, ip: str, credentials: dict = None):
        """Get or create an adapter for a device"""
        if device_id not in self.sessions:
            adapter = get_rfid_adapter(brand, ip, credentials)
            if adapter.connect():
                self.sessions[device_id] = adapter
            else:
                return None

        return self.sessions[device_id]

    def remove_adapter(self, device_id: str):
        """Remove an adapter from the pool"""
        if device_id in self.sessions:
            del self.sessions[device_id]

    def clear(self):
        """Clear all sessions"""
        self.sessions.clear()


# Global session pool
rfid_pool = RFIDSessionPool()

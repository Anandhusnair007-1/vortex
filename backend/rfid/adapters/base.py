from abc import ABC, abstractmethod
import requests

from models import RFIDDevice


class RFIDAdapter(ABC):
    @abstractmethod
    def authenticate(self, session: requests.Session, device: RFIDDevice, credentials: dict) -> bool:
        raise NotImplementedError

    @abstractmethod
    def grant_access(
        self,
        session: requests.Session,
        device: RFIDDevice,
        credentials: dict,
        user_external_id: str,
    ) -> bool:
        raise NotImplementedError

    @abstractmethod
    def revoke_access(
        self,
        session: requests.Session,
        device: RFIDDevice,
        credentials: dict,
        user_external_id: str,
    ) -> bool:
        raise NotImplementedError

    @abstractmethod
    def health_check(self, session: requests.Session, device: RFIDDevice, credentials: dict) -> bool:
        raise NotImplementedError

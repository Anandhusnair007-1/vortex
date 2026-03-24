from __future__ import annotations

from datetime import datetime, timedelta
import threading

import requests

from config import get_rfid_shared_credentials
from models import RFIDDevice
from rfid.adapters import get_adapter
from utils.security import decrypt_json


class RFIDSessionProxy:
    """Backend-managed RFID session reuse.

    Sessions and cookies are stored server-side and reused for device actions.
    The frontend never talks to device login pages directly and never attempts
    unsafe browser cookie sharing across device IPs/domains.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, requests.Session] = {}
        self._expires_at: dict[str, datetime] = {}
        self._credential_sources: dict[str, str] = {}
        self._lock = threading.RLock()

    def _credential_key(self, device: RFIDDevice, credentials: dict) -> str:
        profile_key = credentials.get("profile_key")
        if profile_key:
            return f"{device.brand}:{profile_key}:{device.ip_address}"
        return f"{device.brand}:{device.id}"

    def _resolve_credentials(self, device: RFIDDevice) -> tuple[dict, str]:
        device_credentials = decrypt_json(device.credentials_encrypted)
        if device_credentials:
            return device_credentials, "device"

        shared_credentials = get_rfid_shared_credentials(device.brand)
        if shared_credentials:
            shared_credentials["profile_key"] = f"shared-{device.brand.lower()}"
            return shared_credentials, "shared-profile"

        return {}, "none"

    def _is_valid(self, session_key: str) -> bool:
        if session_key not in self._sessions or session_key not in self._expires_at:
            return False
        return datetime.utcnow() < self._expires_at[session_key]

    def _build_or_refresh_session(self, device: RFIDDevice, force_refresh: bool = False) -> tuple[str, requests.Session, dict]:
        credentials, source = self._resolve_credentials(device)
        if not credentials:
            raise RuntimeError(
                f"No RFID credentials available for device {device.name} ({device.ip_address}). "
                "Configure per-device credentials or shared RFID credential env vars."
            )

        session_key = self._credential_key(device, credentials)

        with self._lock:
            if not force_refresh and self._is_valid(session_key):
                return session_key, self._sessions[session_key], credentials

            session = requests.Session()
            adapter = get_adapter(device.brand)
            authenticated = adapter.authenticate(session, device, credentials)
            if not authenticated:
                raise RuntimeError(f"Authentication failed for RFID device {device.name} ({device.ip_address})")

            self._sessions[session_key] = session
            self._expires_at[session_key] = datetime.utcnow() + timedelta(minutes=20)
            self._credential_sources[session_key] = source
            return session_key, session, credentials

    def _invalidate(self, session_key: str) -> None:
        with self._lock:
            self._sessions.pop(session_key, None)
            self._expires_at.pop(session_key, None)
            self._credential_sources.pop(session_key, None)

    def get_session_status(self, device: RFIDDevice) -> dict:
        credentials, source = self._resolve_credentials(device)
        if not credentials:
            return {
                "device_id": device.id,
                "session_active": False,
                "expires_at": None,
                "credential_source": "unconfigured",
            }

        session_key = self._credential_key(device, credentials)
        return {
            "device_id": device.id,
            "session_active": self._is_valid(session_key),
            "expires_at": self._expires_at.get(session_key),
            "credential_source": self._credential_sources.get(session_key, source),
        }

    def refresh_session(self, device: RFIDDevice) -> dict:
        session_key, _, _ = self._build_or_refresh_session(device, force_refresh=True)
        return {
            "device_id": device.id,
            "session_active": True,
            "expires_at": self._expires_at.get(session_key),
            "credential_source": self._credential_sources.get(session_key, "unknown"),
        }

    def ping(self, device: RFIDDevice) -> bool:
        session_key, session, credentials = self._build_or_refresh_session(device)
        adapter = get_adapter(device.brand)
        try:
            ok = adapter.health_check(session, device, credentials)
        except requests.RequestException:
            ok = False

        if ok:
            return True

        self._invalidate(session_key)
        try:
            _, session, credentials = self._build_or_refresh_session(device, force_refresh=True)
            return adapter.health_check(session, device, credentials)
        except (RuntimeError, requests.RequestException):
            return False

    def grant(self, device: RFIDDevice, user_external_id: str) -> bool:
        session_key, session, credentials = self._build_or_refresh_session(device)
        adapter = get_adapter(device.brand)

        ok = adapter.grant_access(session, device, credentials, user_external_id)
        if ok:
            return True

        self._invalidate(session_key)
        _, session, credentials = self._build_or_refresh_session(device, force_refresh=True)
        return adapter.grant_access(session, device, credentials, user_external_id)

    def revoke(self, device: RFIDDevice, user_external_id: str) -> bool:
        session_key, session, credentials = self._build_or_refresh_session(device)
        adapter = get_adapter(device.brand)

        ok = adapter.revoke_access(session, device, credentials, user_external_id)
        if ok:
            return True

        self._invalidate(session_key)
        _, session, credentials = self._build_or_refresh_session(device, force_refresh=True)
        return adapter.revoke_access(session, device, credentials, user_external_id)


rfid_proxy = RFIDSessionProxy()

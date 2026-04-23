from functools import lru_cache
import base64
import json

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        enable_decoding=False,
    )

    app_name: str = Field(default="VORTYX")
    app_version: str = Field(default="1.0.0")
    app_env: str = Field(default="development")
    debug: bool = Field(default=False)
    api_prefix: str = Field(default="/api")

    database_url: str = Field(default="postgresql://vortex_user:change_me@127.0.0.1:5432/vortex")
    db_pool_size: int = Field(default=10)
    db_max_overflow: int = Field(default=20)

    redis_url: str = Field(default="redis://127.0.0.1:6379/0")
    redis_channel_alerts: str = Field(default="vortyx.alerts")
    redis_channel_tasks: str = Field(default="vortyx.tasks")

    proxmox_nodes: list[str] = Field(default_factory=list)
    proxmox_username: str | None = Field(default=None)
    proxmox_password: str | None = Field(default=None)
    proxmox_verify_ssl: bool = Field(default=True)

    phpipam_base_url: str | None = Field(default=None)
    phpipam_app_id: str | None = Field(default=None)
    phpipam_token: str | None = Field(default=None)
    phpipam_vm_subnet_id: int | None = Field(default=None)
    phpipam_vdi_subnet_id: int | None = Field(default=None)

    guac_base_url: str | None = Field(default=None)
    guac_username: str | None = Field(default=None)
    guac_password: str | None = Field(default=None)

    awx_base_url: str | None = Field(default=None)
    awx_token: str | None = Field(default=None)

    jwt_secret_key: str = Field(default=None)  # Must be set in production
    jwt_algorithm: str = Field(default="HS256")
    access_token_exp_minutes: int = Field(default=60 * 8)
    refresh_token_exp_minutes: int = Field(default=60 * 24 * 7)
    internal_auth_bypass: bool = Field(default=False)
    internal_user_username: str = Field(default="ops.user")
    internal_user_role: str = Field(default="team-lead")

    rfid_credentials_key: str | None = Field(default=None)
    rfid_shared_username: str | None = Field(default=None)
    rfid_shared_password: str | None = Field(default=None)
    rfid_shared_auth_type: str = Field(default="basic")
    rfid_shared_login_path: str | None = Field(default=None)
    rfid_shared_grant_path: str | None = Field(default=None)
    rfid_shared_revoke_path: str | None = Field(default=None)
    rfid_shared_health_path: str | None = Field(default=None)

    vm_profile_options: list[dict] = Field(default_factory=list)
    vdi_image_options: list[dict] = Field(default_factory=list)

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "https://localhost:3000"])
    allowed_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1"])

    log_level: str = Field(default="INFO")
    log_json: bool = Field(default=True)

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        if value is None:
            raise ValueError("JWT_SECRET_KEY must be set (minimum 32 characters)")
        if len(value) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return value

    @field_validator("debug", "proxmox_verify_ssl", "internal_auth_bypass", "log_json", mode="before")
    @classmethod
    def parse_bool_flags(cls, value: object) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False
        return bool(value)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            return value
        return ["http://localhost:3000"]

    @field_validator("proxmox_nodes", mode="before")
    @classmethod
    def parse_proxmox_nodes(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return []

    @field_validator("allowed_hosts", mode="before")
    @classmethod
    def parse_allowed_hosts(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            return value
        return ["*"]

    @field_validator("internal_user_role")
    @classmethod
    def validate_internal_role(cls, value: str) -> str:
        allowed = {"admin", "team-lead", "engineer", "viewer"}
        normalized = (value or "").strip().lower()
        if normalized not in allowed:
            raise ValueError(f"INTERNAL_USER_ROLE must be one of {sorted(allowed)}")
        return normalized

    @field_validator("vm_profile_options", "vdi_image_options", mode="before")
    @classmethod
    def parse_structured_json_list(cls, value: object) -> list[dict]:
        if value in (None, ""):
            return []
        if isinstance(value, str):
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [item for item in parsed if isinstance(item, dict)]
            return []
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        return []


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_fernet_key() -> bytes:
    settings = get_settings()
    if settings.rfid_credentials_key:
        return settings.rfid_credentials_key.encode("utf-8")

    # Derive a deterministic key from JWT secret for local/dev convenience.
    # In production, set RFID_CREDENTIALS_KEY explicitly.
    raw = settings.jwt_secret_key.encode("utf-8")
    return base64.urlsafe_b64encode(raw.ljust(32, b"0")[:32])


def get_vm_profiles() -> list[dict[str, str]]:
    settings = get_settings()
    if settings.vm_profile_options:
        return settings.vm_profile_options

    return [
        {
            "id": "ubuntu-20.04",
            "label": "Ubuntu 20.04 LTS",
            "type": "template",
            "strategy": "template-clone",
            "template_name": "tpl-ubuntu-20-04",
        },
        {
            "id": "ubuntu-22.04",
            "label": "Ubuntu 22.04 LTS",
            "type": "template",
            "strategy": "template-clone",
            "template_name": "tpl-ubuntu-22-04",
        },
        {
            "id": "ubuntu-24.04",
            "label": "Ubuntu 24.04 LTS",
            "type": "template",
            "strategy": "template-clone",
            "template_name": "tpl-ubuntu-24-04",
        },
    ]


def get_vdi_images() -> list[dict[str, str]]:
    settings = get_settings()
    if settings.vdi_image_options:
        return settings.vdi_image_options

    return [
        {
            "id": "analyst-desktop",
            "label": "Analyst Desktop",
            "type": "golden-image",
            "template_name": "gold-analyst-desktop",
        },
        {
            "id": "ubuntu-desktop-base",
            "label": "Ubuntu Desktop Base",
            "type": "golden-image",
            "template_name": "gold-ubuntu-desktop-base",
        },
        {
            "id": "soc-workstation",
            "label": "SOC Workstation",
            "type": "golden-image",
            "template_name": "gold-soc-workstation",
        },
        {
            "id": "admin-desktop",
            "label": "Admin Desktop",
            "type": "golden-image",
            "template_name": "gold-admin-desktop",
        },
    ]


def get_rfid_shared_credentials(brand: str | None = None) -> dict[str, str]:
    settings = get_settings()
    credentials: dict[str, str] = {}
    if settings.rfid_shared_auth_type:
        credentials["auth_type"] = settings.rfid_shared_auth_type
    if settings.rfid_shared_username:
        credentials["username"] = settings.rfid_shared_username
    if settings.rfid_shared_password:
        credentials["password"] = settings.rfid_shared_password
    if settings.rfid_shared_login_path:
        credentials["login_path"] = settings.rfid_shared_login_path
    if settings.rfid_shared_grant_path:
        credentials["grant_path"] = settings.rfid_shared_grant_path
    if settings.rfid_shared_revoke_path:
        credentials["revoke_path"] = settings.rfid_shared_revoke_path
    if settings.rfid_shared_health_path:
        credentials["health_path"] = settings.rfid_shared_health_path
    if brand:
        credentials["brand"] = brand
    return credentials

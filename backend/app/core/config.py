from pydantic import ConfigDict
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    VORTEX_ENCRYPTION_KEY: str
    
    PROXMOX_HOST: Optional[str] = None
    PROXMOX_USER: Optional[str] = None
    PROXMOX_PASSWORD: Optional[str] = None
    PROXMOX_NODE: Optional[str] = None
    PROXMOX_VERIFY_SSL: bool = True
    
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASS: Optional[str] = None
    SMTP_FROM: str = "noreply@company.com"
    
    GLPI_URL: Optional[str] = None
    GLPI_APP_TOKEN: Optional[str] = None
    GLPI_USER_TOKEN: Optional[str] = None

    # Keycloak SSO
    keycloak_url: str = ""
    keycloak_realm: str = ""
    keycloak_client_id: str = ""
    keycloak_client_secret: str = ""
    keycloak_jwks_uri: str = ""
    keycloak_token_url: str = ""
    keycloak_userinfo_url: str = ""
    keycloak_redirect_uri: str = ""

    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()

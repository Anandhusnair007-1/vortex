from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="VORTYX")
    app_env: str = Field(default="development")
    debug: bool = Field(default=False)
    api_prefix: str = Field(default="/api")

    database_url: str = Field(default="postgresql://admin:secret@db/vortex")
    db_pool_size: int = Field(default=10)
    db_max_overflow: int = Field(default=20)

    redis_url: str = Field(default="redis://redis:6379/0")
    redis_channel_alerts: str = Field(default="vortyx.alerts")
    redis_channel_tasks: str = Field(default="vortyx.tasks")

    jwt_secret_key: str = Field(default="change-me-in-env")
    jwt_algorithm: str = Field(default="HS256")
    access_token_exp_minutes: int = Field(default=60 * 8)
    refresh_token_exp_minutes: int = Field(default=60 * 24 * 7)

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    allowed_hosts: list[str] = Field(default_factory=lambda: ["*"])

    log_level: str = Field(default="INFO")
    log_json: bool = Field(default=True)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            return value
        return ["http://localhost:3000"]

    @field_validator("allowed_hosts", mode="before")
    @classmethod
    def parse_allowed_hosts(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            return value
        return ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

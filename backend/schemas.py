from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    detail: str


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    role: str
    points_total: int
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserSummary


class HealthResponse(BaseModel):
    status: str
    app: str
    environment: str
    version: str
    timestamp: datetime
    database: str
    redis: str

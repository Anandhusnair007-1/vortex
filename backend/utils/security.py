from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _build_token(payload: dict[str, Any], expires_delta: timedelta, token_type: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    claims = {
        **payload,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(payload: dict[str, Any]) -> str:
    settings = get_settings()
    return _build_token(payload, timedelta(minutes=settings.access_token_exp_minutes), "access")


def create_refresh_token(payload: dict[str, Any]) -> str:
    settings = get_settings()
    return _build_token(payload, timedelta(minutes=settings.refresh_token_exp_minutes), "refresh")


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def try_decode_token(token: str) -> dict[str, Any] | None:
    try:
        return decode_token(token)
    except JWTError:
        return None

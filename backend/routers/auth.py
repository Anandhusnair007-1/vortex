import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
from middleware.auth import get_current_user
from models import SessionToken, User
from schemas import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse, UserSummary
from utils.security import create_access_token, create_refresh_token, decode_token, verify_password

router = APIRouter(tags=["auth"])


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    token_payload = {"sub": user.id, "username": user.username, "role": user.role}
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    settings = get_settings()
    refresh_exp = datetime.now(timezone.utc) + timedelta(minutes=settings.refresh_token_exp_minutes)
    db.add(
        SessionToken(
            user_id=user.id,
            token_hash=_hash_token(refresh_token),
            token_type="refresh",
            expires_at=refresh_exp,
            is_revoked=False,
        )
    )
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_exp_minutes * 60,
        user=UserSummary.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        claims = decode_token(payload.refresh_token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    if claims.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    token_hash = _hash_token(payload.refresh_token)
    stored = (
        db.query(SessionToken)
        .filter(SessionToken.token_hash == token_hash, SessionToken.token_type == "refresh")
        .first()
    )
    if not stored or stored.is_revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")

    user_id = claims.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    token_payload = {"sub": user.id, "username": user.username, "role": user.role}
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    stored.is_revoked = True
    settings = get_settings()
    db.add(
        SessionToken(
            user_id=user.id,
            token_hash=_hash_token(refresh_token),
            token_type="refresh",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.refresh_token_exp_minutes),
            is_revoked=False,
        )
    )
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_exp_minutes * 60,
        user=UserSummary.model_validate(user),
    )


@router.post("/logout")
def logout(payload: LogoutRequest, db: Session = Depends(get_db)) -> dict:
    token_hash = _hash_token(payload.refresh_token)
    stored = (
        db.query(SessionToken)
        .filter(SessionToken.token_hash == token_hash, SessionToken.token_type == "refresh", SessionToken.is_revoked.is_(False))
        .first()
    )

    if stored:
        stored.is_revoked = True
        db.commit()

    return {"message": "Logged out"}


@router.get("/me", response_model=UserSummary)
def me(user: User = Depends(get_current_user)) -> UserSummary:
    return UserSummary.model_validate(user)

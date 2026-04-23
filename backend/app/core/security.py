from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from .config import settings

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from .database import get_db
from ..models.user import User

import bcrypt

# fernet initialization remained same
fernet = Fernet(settings.VORTEX_ENCRYPTION_KEY if settings.VORTEX_ENCRYPTION_KEY != "your-32-char-fernet-key-here" else Fernet.generate_key())

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

async def get_current_user_flexible(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """
    Accepts BOTH token types:
      1. Keycloak-issued JWT  → for EMPLOYEE and TEAM_LEAD
      2. App-issued JWT       → for IT_TEAM and ADMIN
    Tries app JWT first, then Keycloak JWT.
    """
    from app.core.keycloak import verify_keycloak_token, extract_role_from_keycloak

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")

    token = auth_header.split(" ")[1]

    # Try app JWT first (IT_TEAM and ADMIN)
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        user = db.query(User).filter(User.email == email).first()
        if user:
            return user
    except Exception:
        pass

    # Try Keycloak JWT (EMPLOYEE and TEAM_LEAD)
    try:
        kc_payload = await verify_keycloak_token(token)
        role = extract_role_from_keycloak(kc_payload)
        email = kc_payload.get("email")
        name = kc_payload.get("name", email)
        keycloak_id = kc_payload.get("sub")

        if not email:
            raise HTTPException(
                status_code=401,
                detail="No email in Keycloak token"
            )

        # Find or auto-create user in DB
        user = db.query(User).filter(User.email == email).first()
        if not user:
            import secrets
            import uuid
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                name=name,
                password=hash_password(secrets.token_hex(32)),
                role=role,
                keycloak_id=keycloak_id,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update role and keycloak_id if changed/missing
            should_commit = False
            if user.role != role:
                user.role = role
                should_commit = True
            if user.keycloak_id != keycloak_id:
                user.keycloak_id = keycloak_id
                should_commit = True
            
            if should_commit:
                db.commit()

        return user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Token validation failed: {str(e)}"
        )

def encrypt_vm_password(password: str) -> str:
    return fernet.encrypt(password.encode()).decode()

def decrypt_vm_password(encrypted_password: str) -> str:
    return fernet.decrypt(encrypted_password.encode()).decode()

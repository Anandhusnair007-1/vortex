from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models import User
from database import get_db
from auth.jwt import (
    verify_password,
    get_password_hash,
    create_tokens,
    decode_token
)

router = APIRouter(tags=["authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user_id: str
    username: str
    role: str


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint - returns access and refresh tokens
    """
    user = db.query(User).filter(User.username == request.username).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    tokens = create_tokens(
        user_id=user.id,
        username=user.username,
        role=user.role
    )
    
    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        user_id=user.id,
        username=user.username,
        role=user.role
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    """
    Refresh endpoint - returns new access and refresh tokens
    """
    payload = decode_token(request.refresh_token)
    
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    tokens = create_tokens(
        user_id=user.id,
        username=user.username,
        role=user.role
    )
    
    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        user_id=user.id,
        username=user.username,
        role=user.role
    )


@router.post("/logout")
async def logout():
    """
    Logout endpoint - client should discard tokens
    """
    return {"message": "Logged out successfully"}

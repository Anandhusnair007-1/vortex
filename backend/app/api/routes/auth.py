from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel
import urllib.parse

from ...core.database import get_db
from ...core.security import verify_password, create_access_token, decode_access_token, get_current_user_flexible
from ...core.config import settings
from ...models.user import User
from ...schemas.auth import LoginRequest, Token
from ...schemas.user import UserOut
from ...core.keycloak import exchange_code_for_token, verify_keycloak_token, extract_role_from_keycloak

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

class SSOCallbackRequest(BaseModel):
    code: str

def require_role(roles: list):
    async def role_dependency(current_user: User = Depends(get_current_user_flexible)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_dependency

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/sso/login")
async def sso_login(request: Request):
    """
    Returns the Keycloak authorization URL.
    """
    # Prefer explicit setting from .env, fallback to request-based discovery
    redirect_uri = settings.keycloak_redirect_uri
    if not redirect_uri:
        host_url = str(request.base_url).rstrip('/')
        # Force HTTP to prevent Chrome from upgrading to HTTPS on insecure origins
        if host_url.startswith("https://"):
            host_url = host_url.replace("https://", "http://", 1)
        redirect_uri = f"{host_url}/auth/callback"
    
    params = {
        "client_id": settings.keycloak_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile roles",
    }
    auth_url = (
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
        f"/protocol/openid-connect/auth?{urllib.parse.urlencode(params)}"
    )
    return {"auth_url": auth_url}

@router.post("/sso/callback", response_model=Token)
async def sso_callback(callback_data: SSOCallbackRequest, db: Session = Depends(get_db)):
    """
    Exchanges Keycloak code for app token.
    """
    try:
        # 1. Exchange code for token
        kc_token_data = await exchange_code_for_token(callback_data.code)
        access_token = kc_token_data.get("access_token")
        
        # 2. Verify token and get payload
        payload = await verify_keycloak_token(access_token)
        
        # 3. Extract and validate role
        role = extract_role_from_keycloak(payload)
        if role not in ["EMPLOYEE", "TEAM_LEAD"]:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="SSO login is only for Employee and Team Lead roles. IT Team and Admin must use platform login."
            )
            
        email = payload.get("email")
        name = payload.get("name", email)
        keycloak_id = payload.get("sub")
        
        if not email:
            raise HTTPException(status_code=401, detail="No email in Keycloak token")

        # 4. Find or auto-create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            import secrets
            import uuid
            from ...core.security import hash_password
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
            # Sync session data
            user.role = role
            user.keycloak_id = keycloak_id
            user.name = name
            db.commit()
            db.refresh(user)

        # 5. Issue App JWT
        app_jwt = create_access_token(data={"sub": user.email})
        return {
            "access_token": app_jwt,
            "token_type": "bearer",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SSO Callback failed: {str(e)}")

@router.get("/sso/logout")
async def sso_logout(request: Request):
    """
    Returns Keycloak logout URL.
    """
    host_url = str(request.base_url).rstrip('/')
    logout_url = (
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
        f"/protocol/openid-connect/logout"
        f"?post_logout_redirect_uri={host_url}/login"
        f"&client_id={settings.keycloak_client_id}"
    )
    return {"logout_url": logout_url}

@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user_flexible)):
    return current_user

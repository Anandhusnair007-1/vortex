import httpx
import jwt
from jwt import PyJWKClient
from cachetools import TTLCache
from app.core.config import settings

jwks_cache = TTLCache(maxsize=1, ttl=300)

async def get_jwks_client() -> PyJWKClient:
    if "client" not in jwks_cache:
        jwks_cache["client"] = PyJWKClient(settings.keycloak_jwks_uri)
    return jwks_cache["client"]

async def verify_keycloak_token(token: str) -> dict:
    """
    Verify a Keycloak-issued JWT token.
    Returns decoded payload or raises an exception.
    """
    try:
        jwks_client = await get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.keycloak_client_id,
            options={"verify_exp": True}
        )
        return payload
    except Exception as e:
        raise ValueError(f"Invalid Keycloak token: {str(e)}")

async def exchange_code_for_token(code: str) -> dict:
    """
    Exchange authorization code for access token from Keycloak.
    Called after user is redirected back from Keycloak login page.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            settings.keycloak_token_url,
            data={
                "grant_type": "authorization_code",
                "client_id": settings.keycloak_client_id,
                "client_secret": settings.keycloak_client_secret,
                "code": code,
                "redirect_uri": settings.keycloak_redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if response.status_code != 200:
            raise ValueError(f"Keycloak token exchange failed: {response.text}")
        return response.json()

async def get_keycloak_userinfo(access_token: str) -> dict:
    """
    Get user info from Keycloak using the access token.
    Returns: email, name, sub (keycloak user id), realm_access.roles
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            settings.keycloak_userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if response.status_code != 200:
            raise ValueError("Failed to get user info from Keycloak")
        return response.json()

def extract_role_from_keycloak(payload: dict) -> str:
    """
    Extract the app role from Keycloak token.
    Checks realm_access.roles for EMPLOYEE or TEAM_LEAD.
    Returns role string or raises ValueError.
    """
    realm_roles = payload.get("realm_access", {}).get("roles", [])
    resource_roles = payload.get(
        "resource_access", {}
    ).get(settings.keycloak_client_id, {}).get("roles", [])
    all_roles = realm_roles + resource_roles

    if "TEAM_LEAD" in all_roles:
        return "TEAM_LEAD"
    elif "EMPLOYEE" in all_roles:
        return "EMPLOYEE"
    else:
        raise ValueError(
            f"User has no valid portal role in Keycloak. "
            f"Assigned roles: {all_roles}. "
            f"Expected: EMPLOYEE or TEAM_LEAD"
        )

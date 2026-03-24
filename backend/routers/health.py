from datetime import datetime, timezone

from fastapi import APIRouter
from redis import Redis
from sqlalchemy import text

from config import get_settings
from database import SessionLocal
from schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()

    db_status = "up"
    redis_status = "up"

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "down"
    finally:
        db.close()

    try:
        redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
        redis_client.ping()
    except Exception:
        redis_status = "down"

    overall_status = "healthy" if db_status == "up" and redis_status == "up" else "degraded"

    return HealthResponse(
        status=overall_status,
        app=settings.app_name,
        environment=settings.app_env,
        version="1.0.0",
        timestamp=datetime.now(timezone.utc),
        database=db_status,
        redis=redis_status,
    )

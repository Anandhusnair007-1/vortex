from fastapi import Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Callable
import time
import json
from models import ActivityLog, PointsConfig
from database import SessionLocal

# Points mapping for different actions
POINTS_MAP = {
    "/api/vms/create": 10,
    "/api/vms/provision": 10,
    "/api/vdi/create": 10,
    "/api/rfid/grant": 5,
    "/api/rfid/revoke": 3,
    "/api/alerts/resolve": 8,
    "/api/tasks/run": 6,
    "/api/tasks/execute": 6,
    "/api/playbooks/run": 6,
}


async def activity_logger_middleware(request: Request, call_next: Callable) -> Response:
    """
    Middleware that logs all POST, PUT, DELETE actions to activity_log table.
    Awards points based on the action type.
    """
    start_time = time.time()
    response = await call_next(request)
    
    import logging

    from fastapi import Request

    logger = logging.getLogger(__name__)


    async def activity_logger_middleware(request: Request, call_next):
        response = await call_next(request)

        if request.method in {"POST", "PUT", "DELETE", "PATCH"}:
            logger.info(
                "audit_request",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "client": request.client.host if request.client else None,
                },
            )

        return response
                points = config.points

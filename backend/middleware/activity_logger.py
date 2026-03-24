import logging
from collections.abc import Callable

from fastapi import Request
from fastapi.responses import Response

logger = logging.getLogger(__name__)


async def activity_logger_middleware(request: Request, call_next: Callable) -> Response:
    response = await call_next(request)

    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
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

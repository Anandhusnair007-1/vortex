import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from config import get_settings
from database import SessionLocal, init_db
from logging_config import configure_logging
from middleware.activity_logger import activity_logger_middleware
from middleware.auth import authenticate_websocket
from routers import alerts, auth, health, locations, proxmox, provision, provision_config, reports, rfid, tasks, users, vms
from services.proxmox_sync import start_vm_sync_scheduler, stop_vm_sync_scheduler
from utils.exceptions import AppError
from websocket.alert_manager import alert_ws_manager
from websocket.task_manager import task_ws_manager

configure_logging()
settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("startup_begin")
    init_db()
    await alert_ws_manager.start()
    await task_ws_manager.start()
    start_vm_sync_scheduler()
    logger.info("startup_complete")
    yield
    stop_vm_sync_scheduler()
    await alert_ws_manager.stop()
    await task_ws_manager.stop()
    logger.info("shutdown_complete")


app = FastAPI(
    title=settings.app_name,
    description="VORTYX centralized IT operations platform",
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.[0-9]+\.[0-9]+\.[0-9]+|172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]+\.[0-9]+|192\.168\.[0-9]+\.[0-9]+|100\.[0-9]+\.[0-9]+\.[0-9]+)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

app.middleware("http")(activity_logger_middleware)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, exc: Exception):
    logger.exception("unhandled_exception", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/")
def root() -> dict:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }


@app.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket) -> None:
    db = SessionLocal()
    try:
        try:
            await authenticate_websocket(websocket, db)
        except HTTPException:
            await websocket.close(code=4401)
            return

        await alert_ws_manager.connect(websocket)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        alert_ws_manager.disconnect(websocket)
    finally:
        db.close()


@app.websocket("/ws/tasks")
async def ws_tasks(websocket: WebSocket) -> None:
    db = SessionLocal()
    try:
        try:
            await authenticate_websocket(websocket, db)
        except HTTPException:
            await websocket.close(code=4401)
            return

        await task_ws_manager.connect(websocket)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        task_ws_manager.disconnect(websocket)
    finally:
        db.close()


app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=f"{settings.api_prefix}/auth")
app.include_router(users.router, prefix=f"{settings.api_prefix}/users")
app.include_router(alerts.router, prefix=f"{settings.api_prefix}/alerts")
app.include_router(vms.router, prefix=f"{settings.api_prefix}/vms")
app.include_router(provision.router, prefix=f"{settings.api_prefix}/provision")
app.include_router(tasks.router, prefix=f"{settings.api_prefix}/tasks")
app.include_router(reports.router, prefix=f"{settings.api_prefix}/reports")
app.include_router(rfid.router, prefix=f"{settings.api_prefix}/rfid")
app.include_router(locations.router, prefix=f"{settings.api_prefix}/locations")
app.include_router(proxmox.router, prefix=f"{settings.api_prefix}/proxmox")
app.include_router(provision_config.router, prefix=settings.api_prefix)


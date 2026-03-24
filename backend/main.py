import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from database import init_db
from logging_config import configure_logging
from middleware.activity_logger import activity_logger_middleware
from routers import auth, health
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
    logger.info("startup_complete")
    yield
    await alert_ws_manager.stop()
    await task_ws_manager.stop()
    logger.info("shutdown_complete")


app = FastAPI(
    title=settings.app_name,
    description="VORTYX centralized IT operations platform",
    version="1.0.0",
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(activity_logger_middleware)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/")
def root() -> dict:
    return {
        "name": settings.app_name,
        "environment": settings.app_env,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }


app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=f"{settings.api_prefix}/auth")


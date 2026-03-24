from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

# Import routers
from routers import auth, users, rfid, alerts, vms, tasks

# Import database and models
from database import init_db, get_db, engine
from models import Base, PointsConfig
from middleware.activity_logger import activity_logger_middleware
from sqlalchemy.orm import Session

# Environment variables
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialization and teardown logic"""
    # Initialize database
    init_db()
    
    # Create default points configuration if not exists
    db = next(get_db())
    try:
        # Check if points config exists
        existing = db.query(PointsConfig).first()
        if not existing:
            default_points = [
                PointsConfig(action="create_vm", points=10, description="Create a new VM"),
                PointsConfig(action="create_vdi", points=10, description="Create a new VDI"),
                PointsConfig(action="grant_rfid", points=5, description="Grant RFID access"),
                PointsConfig(action="revoke_rfid", points=3, description="Revoke RFID access"),
                PointsConfig(action="resolve_alert", points=8, description="Resolve an alert"),
                PointsConfig(action="run_playbook", points=6, description="Run Ansible playbook"),
            ]
            db.add_all(default_points)
            db.commit()
            print("✓ Default points configuration created")
    finally:
        db.close()
    
    print("✓ Database initialized successfully")
    yield
    print("✓ Application shutdown")


# Create FastAPI app
app = FastAPI(
    title="ITops Platform",
    description="Enterprise Cybersecurity Operations Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add activity logger middleware
app.middleware("http")(activity_logger_middleware)


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0"
    }


# Include routers with /api prefix
app.include_router(auth.router, prefix="/api/auth")
app.include_router(users.router, prefix="/api/users")
app.include_router(rfid.router, prefix="/api/rfid")
app.include_router(alerts.router, prefix="/api/alerts")
app.include_router(vms.router, prefix="/api/vms")
app.include_router(tasks.router, prefix="/api/tasks")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - redirects to docs"""
    return {
        "message": "Welcome to ITops Platform",
        "docs": "/docs",
        "health": "/api/health"
    }


# WebSocket alerts endpoint (included from alerts router)
# Already registered in alerts.router


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=DEBUG,
        log_level="info"
    )

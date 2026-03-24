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
    
    # Only log mutating operations
    if request.method not in ["POST", "PUT", "DELETE"] or response.status_code >= 400:
        return response
    
    # Get user from request state (set by auth dependency)
    user = getattr(request.state, "user", None)
    if not user:
        return response
    
    # Determine points for this action
    path = str(request.url.path)
    points = POINTS_MAP.get(path, 0)
    
    # If not in static map, try to get from database config
    if points == 0:
        db = SessionLocal()
        try:
            config = db.query(PointsConfig).filter(
                PointsConfig.action == path,
                PointsConfig.is_active == True
            ).first()
            if config:
                points = config.points
        finally:
            db.close()
    
    # Log the activity
    try:
        db = SessionLocal()
        
        # Extract request body if available
        detail = f"{request.method} {path}"
        try:
            if request.method in ["POST", "PUT"]:
                body = await request.body()
                if body:
                    detail = json.dumps(json.loads(body))
        except:
            pass
        
        activity = ActivityLog(
            user_id=user.id,
            action=f"{request.method} {path}",
            target=path,
            detail=detail,
            points=points
        )
        
        db.add(activity)
        
        # Update user's points
        user.points += points
        db.add(user)
        
        db.commit()
    except Exception as e:
        print(f"Error logging activity: {str(e)}")
    finally:
        db.close()
    
    return response


async def calculate_request_time_middleware(request: Request, call_next: Callable) -> Response:
    """Middleware to calculate and log request processing time"""
    start_time = time.time()
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    return response

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import require_roles
from models import User
from schemas import (
    BuildingCreate, BuildingUpdate, BuildingResponse,
    FloorCreate, FloorUpdate, FloorResponse,
    DoorMappingCreate, DoorMappingUpdate, DoorMappingResponse
)
from services.location_service import location_service

router = APIRouter(tags=["locations"])

# --- Buildings ---
@router.get("/buildings", response_model=list[BuildingResponse])
def list_buildings(db: Session = Depends(get_db), _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"}))):
    return location_service.list_buildings(db)

@router.post("/buildings", response_model=BuildingResponse, status_code=status.HTTP_201_CREATED)
def create_building(payload: BuildingCreate, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin", "team-lead"}))):
    return location_service.create_building(db, payload, actor)

@router.put("/buildings/{id}", response_model=BuildingResponse)
def update_building(id: str, payload: BuildingUpdate, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin", "team-lead"}))):
    return location_service.update_building(db, id, payload, actor)

@router.delete("/buildings/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_building(id: str, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin"}))):
    return location_service.delete_building(db, id, actor)

# --- Floors ---
@router.get("/floors", response_model=list[FloorResponse])
def list_floors(building_id: str | None = None, db: Session = Depends(get_db), _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"}))):
    return location_service.list_floors(db, building_id)

@router.post("/floors", response_model=FloorResponse, status_code=status.HTTP_201_CREATED)
def create_floor(payload: FloorCreate, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin", "team-lead"}))):
    return location_service.create_floor(db, payload, actor)

@router.put("/floors/{id}", response_model=FloorResponse)
def update_floor(id: str, payload: FloorUpdate, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin", "team-lead"}))):
    return location_service.update_floor(db, id, payload, actor)

@router.delete("/floors/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_floor(id: str, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin"}))):
    return location_service.delete_floor(db, id, actor)

# --- Doors ---
@router.get("/doors", response_model=list[DoorMappingResponse])
def list_doors(floor_id: str | None = None, db: Session = Depends(get_db), _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"}))):
    return location_service.list_doors(db, floor_id)

@router.post("/doors", response_model=DoorMappingResponse, status_code=status.HTTP_201_CREATED)
def create_door(payload: DoorMappingCreate, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin", "team-lead"}))):
    return location_service.create_door(db, payload, actor)

@router.put("/doors/{id}", response_model=DoorMappingResponse)
def update_door(id: str, payload: DoorMappingUpdate, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin", "team-lead"}))):
    return location_service.update_door(db, id, payload, actor)

@router.delete("/doors/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_door(id: str, db: Session = Depends(get_db), actor: User = Depends(require_roles({"admin"}))):
    return location_service.delete_door(db, id, actor)

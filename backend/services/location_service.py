from sqlalchemy.orm import Session
from fastapi import HTTPException
from models import Building, Floor, DoorMapping, User, ActivityLog

class LocationService:
    def _log_activity(self, db: Session, user: User, action: str, target: str, detail: str):
        db.add(
            ActivityLog(
                user_id=user.id,
                action=action,
                target=target,
                detail=detail,
                points_earned=0,
            )
        )

    # --- Buildings ---
    def list_buildings(self, db: Session):
        return db.query(Building).all()

    def create_building(self, db: Session, payload, actor: User):
        building = Building(
            name=payload.name,
            code=payload.code,
            address=payload.address,
            notes=payload.notes
        )
        db.add(building)
        self._log_activity(db, actor, "location_building_create", building.name, f"Created building {building.code}")
        db.commit()
        db.refresh(building)
        return building

    def update_building(self, db: Session, building_id: str, payload, actor: User):
        building = db.query(Building).filter(Building.id == building_id).first()
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        
        if payload.name is not None:
            building.name = payload.name
        if payload.code is not None:
            building.code = payload.code
        if payload.address is not None:
            building.address = payload.address
        if payload.notes is not None:
            building.notes = payload.notes
        
        self._log_activity(db, actor, "location_building_update", building.name, f"Updated building {building.id}")
        db.commit()
        db.refresh(building)
        return building

    def delete_building(self, db: Session, building_id: str, actor: User):
        building = db.query(Building).filter(Building.id == building_id).first()
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        
        name = building.name
        db.delete(building)
        self._log_activity(db, actor, "location_building_delete", name, f"Deleted building {building_id}")
        db.commit()
        return {"status": "deleted"}

    # --- Floors ---
    def list_floors(self, db: Session, building_id: str = None):
        query = db.query(Floor)
        if building_id:
            query = query.filter(Floor.building_id == building_id)
        return query.all()

    def create_floor(self, db: Session, payload, actor: User):
        floor = Floor(
            building_id=payload.building_id,
            name=payload.name,
            level_number=payload.level_number,
            notes=payload.notes
        )
        db.add(floor)
        self._log_activity(db, actor, "location_floor_create", floor.name, f"Created floor for building {payload.building_id}")
        db.commit()
        db.refresh(floor)
        return floor

    def update_floor(self, db: Session, floor_id: str, payload, actor: User):
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")
        
        if payload.name is not None:
            floor.name = payload.name
        if payload.level_number is not None:
            floor.level_number = payload.level_number
        if payload.notes is not None:
            floor.notes = payload.notes
        
        db.commit()
        db.refresh(floor)
        return floor

    def delete_floor(self, db: Session, floor_id: str, actor: User):
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")
        db.delete(floor)
        db.commit()
        return {"status": "deleted"}

    # --- Doors ---
    def list_doors(self, db: Session, floor_id: str = None):
        query = db.query(DoorMapping)
        if floor_id:
            query = query.filter(DoorMapping.floor_id == floor_id)
        return query.all()

    def create_door(self, db: Session, payload, actor: User):
        door = DoorMapping(
            building_id=payload.building_id,
            floor_id=payload.floor_id,
            name=payload.name,
            code=payload.code,
            notes=payload.notes,
            rfid_device_id=payload.rfid_device_id
        )
        db.add(door)
        self._log_activity(db, actor, "location_door_create", door.name, f"Created door mapping {door.code}")
        db.commit()
        db.refresh(door)
        return door

    def update_door(self, db: Session, door_id: str, payload, actor: User):
        door = db.query(DoorMapping).filter(DoorMapping.id == door_id).first()
        if not door:
            raise HTTPException(status_code=404, detail="Door mapping not found")
        
        if payload.name is not None:
            door.name = payload.name
        if payload.code is not None:
            door.code = payload.code
        if payload.notes is not None:
            door.notes = payload.notes
        if payload.rfid_device_id is not None:
            door.rfid_device_id = payload.rfid_device_id
        
        db.commit()
        db.refresh(door)
        return door

    def delete_door(self, db: Session, door_id: str, actor: User):
        door = db.query(DoorMapping).filter(DoorMapping.id == door_id).first()
        if not door:
            raise HTTPException(status_code=404, detail="Door mapping not found")
        db.delete(door)
        db.commit()
        return {"status": "deleted"}

location_service = LocationService()

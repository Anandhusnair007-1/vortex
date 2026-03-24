from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import GoldenImage, CloudInitProfile, User
from middleware.auth import require_roles
from schemas import (
    GoldenImageCreate, GoldenImageUpdate, GoldenImageResponse,
    CloudInitProfileCreate, CloudInitProfileUpdate, CloudInitProfileResponse
)

router = APIRouter(prefix="/provision/config", tags=["provision-config"])

# Golden Image Routes
@router.get("/images", response_model=list[GoldenImageResponse])
def list_images(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"}))
):
    return db.query(GoldenImage).all()

@router.post("/images", response_model=GoldenImageResponse, status_code=status.HTTP_201_CREATED)
def create_image(
    payload: GoldenImageCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead"}))
):
    image = GoldenImage(**payload.model_dump())
    db.add(image)
    db.commit()
    db.refresh(image)
    return image

@router.put("/images/{image_id}", response_model=GoldenImageResponse)
def update_image(
    image_id: str,
    payload: GoldenImageUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead"}))
):
    image = db.query(GoldenImage).filter(GoldenImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Golden Image not found")
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(image, field, value)
    
    db.commit()
    db.refresh(image)
    return image

# Cloud-Init Profile Routes
@router.get("/profiles", response_model=list[CloudInitProfileResponse])
def list_profiles(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"}))
):
    return db.query(CloudInitProfile).all()

@router.post("/profiles", response_model=CloudInitProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    payload: CloudInitProfileCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead"}))
):
    profile = CloudInitProfile(**payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.put("/profiles/{profile_id}", response_model=CloudInitProfileResponse)
def update_profile(
    profile_id: str,
    payload: CloudInitProfileUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles({"admin", "team-lead"}))
):
    profile = db.query(CloudInitProfile).filter(CloudInitProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Cloud-Init Profile not found")
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile

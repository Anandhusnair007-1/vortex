from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ...core.database import get_db
from ...models.user import User, UserRole
from ...models.vm_template import VmTemplate
from ...schemas.vm_template import VmTemplateOut, VmTemplateCreate, VmTemplateUpdate
from ...core.security import get_current_user_flexible
from .auth import require_role

router = APIRouter()

@router.get("/", response_model=List[VmTemplateOut])
async def get_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible)
):
    query = db.query(VmTemplate)
    if current_user.role not in [UserRole.IT_TEAM, UserRole.ADMIN]:
        query = query.filter(VmTemplate.is_active == True)
    return query.all()

@router.post("/", response_model=VmTemplateOut)
async def create_template(
    template_in: VmTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.IT_TEAM, UserRole.ADMIN]))
):
    db_template = VmTemplate(
        **template_in.model_dump(),
        created_by=current_user.id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.put("/{template_id}", response_model=VmTemplateOut)
async def update_template(
    template_id: str,
    template_in: VmTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.IT_TEAM, UserRole.ADMIN]))
):
    db_template = db.query(VmTemplate).filter(VmTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    update_data = template_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_template, field, value)
            
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    db_template = db.query(VmTemplate).filter(VmTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db_template.is_active = False
    db.commit()
    return {"message": "Template soft deleted"}

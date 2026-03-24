from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from config import get_vdi_images, get_vm_profiles
from database import get_db
from middleware.auth import require_roles
from models import User
from routers.vms import provision_vdi as queue_vdi_provision
from routers.vms import provision_vm as queue_vm_provision
from schemas import ProvisionProfileResponse, ProvisionVDIRequest, ProvisionVMRequest, QueuedTaskResponse

router = APIRouter(tags=["provision"])


@router.get("/vm-profiles", response_model=list[ProvisionProfileResponse])
def vm_profiles(
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> list[dict]:
    return get_vm_profiles()


@router.get("/vdi-images", response_model=list[ProvisionProfileResponse])
def vdi_images(
    _: User = Depends(require_roles({"admin", "team-lead", "engineer", "viewer"})),
) -> list[dict]:
    return get_vdi_images()


@router.post("/vm", response_model=QueuedTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def provision_vm(
    payload: ProvisionVMRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> QueuedTaskResponse:
    return await queue_vm_provision(payload=payload, db=db, actor=actor)


@router.post("/vdi", response_model=QueuedTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def provision_vdi(
    payload: ProvisionVDIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles({"admin", "team-lead", "engineer"})),
) -> QueuedTaskResponse:
    return await queue_vdi_provision(payload=payload, db=db, actor=actor)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tenant import Tenant
from app.schemas.tenant import TenantResponse, TenantUpdate
from app.middleware.auth import get_current_user_claims, require_role

router = APIRouter(prefix="/tenant", tags=["tenant"])

@router.get("", response_model=TenantResponse)
def get_tenant(claims: dict = Depends(get_current_user_claims), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant

@router.patch("", response_model=TenantResponse)
def update_tenant(req: TenantUpdate, claims: dict = Depends(require_role("owner")), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    tenant.name = req.name
    db.commit()
    db.refresh(tenant)
    return tenant

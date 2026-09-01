from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.admin import AdminTenantOut, PlanUpdateReq
from app.middleware.auth import require_superadmin
from app.utils.jwt import create_access_token
from app.utils.activity import log_activity

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/tenants", response_model=List[AdminTenantOut])
def list_tenants(claims: dict = Depends(require_superadmin), db: Session = Depends(get_db)):
    rows = (
        db.query(Tenant, func.count(User.id).label("ucount"))
        .outerjoin(User, Tenant.id == User.tenant_id)
        .group_by(Tenant.id)
        .all()
    )
    
    out = []
    for tenant, ucount in rows:
        out.append(AdminTenantOut(
            id=tenant.id,
            name=tenant.name,
            slug=tenant.slug,
            plan=tenant.plan,
            user_count=ucount,
            created_at=tenant.created_at
        ))
    return out

@router.patch("/tenants/{tenant_id}/plan", response_model=AdminTenantOut)
def update_tenant_plan(tenant_id: UUID, req: PlanUpdateReq, claims: dict = Depends(require_superadmin), db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    old_plan = tenant.plan
    tenant.plan = req.plan
    db.commit()
    
    action = "plan.upgraded" if req.plan == "pro" else "plan.downgraded"
    log_activity(db, tenant.id, claims.get("user_id"), action, {
        "old_plan": old_plan,
        "new_plan": req.plan,
        "by_superadmin": True
    })
    
    ucount = db.query(User).filter(User.tenant_id == tenant.id).count()
    return AdminTenantOut(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        plan=tenant.plan,
        user_count=ucount,
        created_at=tenant.created_at
    )

@router.get("/tenants/{tenant_id}/impersonate")
def impersonate_tenant(tenant_id: UUID, claims: dict = Depends(require_superadmin), db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    
    owner_user = db.query(User).filter(User.tenant_id == tenant_id, User.role == "owner").first()
    if not owner_user:
        owner_user = db.query(User).filter(User.tenant_id == tenant_id).first()
    
    user_id = str(owner_user.id) if owner_user else str(claims.get("user_id"))
    
    token_data = {
        "sub": user_id,
        "user_id": user_id,
        "tenant_id": str(tenant_id),
        "role": "owner"
    }
    impersonate_token = create_access_token(token_data)
    
    log_activity(db, tenant_id, claims.get("user_id"), "superadmin.impersonated", {
        "tenant_id": str(tenant_id),
        "superadmin_id": claims.get("user_id")
    })
    
    return {
        "access_token": impersonate_token,
        "token_type": "bearer"
    }

import secrets
from typing import List
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.invite import Invite
from app.schemas.user import UserOut, InviteCreate, InviteResponse, RoleUpdate
from app.middleware.auth import get_current_user_claims, require_role
from app.utils.activity import log_activity

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[UserOut])
def list_users(claims: dict = Depends(get_current_user_claims), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    if not tenant_id:
        return []
    users = db.query(User).filter(User.tenant_id == tenant_id).all()
    return users

@router.post("/invite", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
def create_invite(req: InviteCreate, claims: dict = Depends(require_role("owner", "admin")), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant ID missing from token")
    
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    
    invite = Invite(
        tenant_id=tenant_id,
        email=req.email,
        role=req.role,
        token=token,
        invited_by=claims.get("user_id"),
        accepted=False,
        expires_at=expires_at
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    
    log_activity(db, tenant_id, claims.get("user_id"), "user.invited", {"email": req.email, "role": req.role})
    
    return InviteResponse(
        id=invite.id,
        email=invite.email,
        role=invite.role,
        token=invite.token,
        expires_at=invite.expires_at,
        invite_url=f"/invite/{invite.token}"
    )

@router.patch("/{user_id}/role", response_model=UserOut)
def update_user_role(user_id: UUID, req: RoleUpdate, claims: dict = Depends(require_role("owner")), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or str(user.tenant_id) != str(tenant_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    old_role = user.role
    user.role = req.role
    db.commit()
    db.refresh(user)
    
    log_activity(db, tenant_id, claims.get("user_id"), "user.role_changed", {
        "target_user_id": str(user.id),
        "old_role": old_role,
        "new_role": req.role
    })
    
    return user

@router.delete("/{user_id}")
def delete_user(user_id: UUID, claims: dict = Depends(require_role("owner")), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or str(user.tenant_id) != str(tenant_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user.role == "owner":
        owner_count = db.query(User).filter(User.tenant_id == tenant_id, User.role == "owner").count()
        if owner_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete the last owner of a tenant")
    
    target_email = user.email
    target_user_id = str(user.id)
    db.delete(user)
    db.commit()
    
    log_activity(db, tenant_id, claims.get("user_id"), "user.removed", {
        "target_user_id": target_user_id,
        "email": target_email
    })
    
    return {"message": "User deleted successfully"}

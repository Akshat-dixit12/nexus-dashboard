import bcrypt
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.invite import Invite
from app.models.user import User
from app.schemas.user import InviteDetail, InviteAccept

router = APIRouter(prefix="/invites", tags=["invites"])

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

@router.get("/{token}", response_model=InviteDetail)
def get_invite(token: str, db: Session = Depends(get_db)):
    invite = db.query(Invite).filter(Invite.token == token).first()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite token not found")
    
    if invite.accepted:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite token has already been accepted")
    
    now = datetime.now(timezone.utc)
    expires_at = invite.expires_at if invite.expires_at.tzinfo else invite.expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite token has expired")
    
    return InviteDetail(
        token=invite.token,
        email=invite.email,
        role=invite.role,
        tenant_name=invite.tenant.name
    )

@router.post("/{token}/accept")
def accept_invite(token: str, req: InviteAccept, db: Session = Depends(get_db)):
    invite = db.query(Invite).filter(Invite.token == token).first()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite token not found")
    
    if invite.accepted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite token has already been accepted")
    
    now = datetime.now(timezone.utc)
    expires_at = invite.expires_at if invite.expires_at.tzinfo else invite.expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite token has expired")
    
    existing_user = db.query(User).filter(User.email == invite.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")
    
    user = User(
        tenant_id=invite.tenant_id,
        email=invite.email,
        password_hash=hash_password(req.password),
        role=invite.role,
        invited_by=invite.invited_by
    )
    db.add(user)
    invite.accepted = True
    db.commit()
    
    return {"message": "Invite accepted successfully"}

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.activity import ActivityLog
from app.models.user import User
from app.schemas.activity import ActivityOut
from app.middleware.auth import get_current_user_claims

router = APIRouter(prefix="/activity", tags=["activity"])

@router.get("", response_model=List[ActivityOut])
def get_recent_activity(claims: dict = Depends(get_current_user_claims), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    if not tenant_id:
        return []
    
    results = (
        db.query(ActivityLog, User.name, User.email)
        .outerjoin(User, ActivityLog.user_id == User.id)
        .filter(ActivityLog.tenant_id == tenant_id)
        .order_by(desc(ActivityLog.created_at))
        .limit(10)
        .all()
    )
    
    out = []
    for log, name, email in results:
        out.append(ActivityOut(
            id=log.id,
            tenant_id=log.tenant_id,
            user_id=log.user_id,
            action=log.action,
            metadata=log.metadata_,
            created_at=log.created_at,
            user_name=name,
            user_email=email
        ))
    return out

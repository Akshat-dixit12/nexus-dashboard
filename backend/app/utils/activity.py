from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.activity import ActivityLog

def log_activity(db: Session, tenant_id: Any, user_id: Any, action: str, metadata: Optional[Dict[str, Any]] = None):
    if not tenant_id:
        return
    log_entry = ActivityLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        metadata_=metadata
    )
    db.add(log_entry)
    db.commit()

from typing import List
from datetime import datetime, timedelta, timezone, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from app.database import get_db
from app.models.activity import ActivityLog
from app.schemas.activity import DailyActivityCount
from app.middleware.auth import get_current_user_claims

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/activity", response_model=List[DailyActivityCount])
def get_activity_analytics(claims: dict = Depends(get_current_user_claims), db: Session = Depends(get_db)):
    tenant_id = claims.get("tenant_id")
    if not tenant_id:
        return []
    
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=29)
    
    rows = (
        db.query(
            cast(ActivityLog.created_at, Date).label("act_date"),
            func.count(ActivityLog.id).label("cnt")
        )
        .filter(
            ActivityLog.tenant_id == tenant_id,
            cast(ActivityLog.created_at, Date) >= start_date
        )
        .group_by(cast(ActivityLog.created_at, Date))
        .all()
    )
    
    counts_by_date = {row.act_date.strftime("%Y-%m-%d"): row.cnt for row in rows}
    
    series = []
    for i in range(30):
        d = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        series.append(DailyActivityCount(
            date=d,
            count=counts_by_date.get(d, 0)
        ))
    
    return series

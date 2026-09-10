from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from uuid import UUID

class ActivityOut(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: Optional[UUID] = None
    action: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None

class DailyActivityCount(BaseModel):
    date: str
    count: int

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class AdminTenantOut(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: str
    user_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class PlanUpdateReq(BaseModel):
    plan: str

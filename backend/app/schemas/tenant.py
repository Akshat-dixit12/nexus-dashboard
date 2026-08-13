from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class TenantResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True

class TenantUpdate(BaseModel):
    name: str

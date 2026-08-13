from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserOut(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    role: str
    tenant_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True

class InviteCreate(BaseModel):
    email: EmailStr
    role: str

class InviteResponse(BaseModel):
    id: UUID
    email: str
    role: str
    token: str
    expires_at: datetime
    invite_url: str

class InviteDetail(BaseModel):
    token: str
    email: str
    role: str
    tenant_name: str

class InviteAccept(BaseModel):
    password: str

class RoleUpdate(BaseModel):
    role: str

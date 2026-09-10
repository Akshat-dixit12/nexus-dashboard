from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    company_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TenantOut(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: str

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    role: str
    tenant_id: Optional[UUID] = None
    tenant: Optional[TenantOut] = None

    class Config:
        from_attributes = True

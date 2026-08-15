import re
import bcrypt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.tenant import Tenant
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    LogoutRequest,
    TokenResponse,
    UserProfileResponse,
    TenantOut
)
from app.utils.jwt import create_access_token, create_refresh_token_string
from app.utils.activity import log_activity
from app.middleware.auth import get_current_user

router = APIRouter(prefix="", tags=["auth"])

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def generate_slug(name: str, db: Session) -> str:
    base_slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    if not base_slug:
        base_slug = "tenant"
    
    slug = base_slug
    counter = 1
    while db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug

@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    slug = generate_slug(req.company_name, db)
    tenant = Tenant(name=req.company_name, slug=slug, plan="free")
    db.add(tenant)
    db.flush()

    user = User(
        tenant_id=tenant.id,
        email=req.email,
        password_hash=hash_password(req.password),
        name=req.name,
        role="owner"
    )
    db.add(user)
    db.flush()

    token_data = {
        "sub": str(user.id),
        "user_id": str(user.id),
        "tenant_id": str(user.tenant_id),
        "role": user.role
    }
    access_token = create_access_token(token_data)
    refresh_token_str = create_refresh_token_string()

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=expires_at
    )
    db.add(db_refresh_token)
    db.commit()

    log_activity(db, tenant.id, user.id, "user.registered", {"company_name": req.company_name})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        token_type="bearer"
    )

@router.post("/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    token_data = {
        "sub": str(user.id),
        "user_id": str(user.id),
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        "role": user.role
    }
    access_token = create_access_token(token_data)
    refresh_token_str = create_refresh_token_string()

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=expires_at
    )
    db.add(db_refresh_token)
    db.commit()

    log_activity(db, user.tenant_id, user.id, "user.login")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        token_type="bearer"
    )

@router.post("/auth/refresh", response_model=TokenResponse)
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    existing_token = db.query(RefreshToken).filter(RefreshToken.token == req.refresh_token).first()
    if not existing_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    if existing_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.delete(existing_token)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired"
        )
    
    user = db.query(User).filter(User.id == existing_token.user_id).first()
    if not user:
        db.delete(existing_token)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    db.delete(existing_token)
    db.flush()

    token_data = {
        "sub": str(user.id),
        "user_id": str(user.id),
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        "role": user.role
    }
    new_access_token = create_access_token(token_data)
    new_refresh_token_str = create_refresh_token_string()

    new_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_db_refresh_token = RefreshToken(
        user_id=user.id,
        token=new_refresh_token_str,
        expires_at=new_expires_at
    )
    db.add(new_db_refresh_token)
    db.commit()

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token_str,
        token_type="bearer"
    )

@router.post("/auth/logout")
def logout(req: LogoutRequest, db: Session = Depends(get_db)):
    token_record = db.query(RefreshToken).filter(RefreshToken.token == req.refresh_token).first()
    if token_record:
        db.delete(token_record)
        db.commit()
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserProfileResponse)
def me(user: User = Depends(get_current_user)):
    tenant_out = None
    if user.tenant:
        tenant_out = TenantOut(
            id=user.tenant.id,
            name=user.tenant.name,
            slug=user.tenant.slug,
            plan=user.tenant.plan
        )
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=user.tenant_id,
        tenant=tenant_out
    )

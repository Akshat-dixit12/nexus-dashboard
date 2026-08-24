from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.jwt import decode_access_token
from app.models.user import User
from app.config import settings

security = HTTPBearer()

def get_current_user_claims(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id = payload.get("user_id") or payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {
            "user_id": user_id,
            "tenant_id": payload.get("tenant_id"),
            "role": payload.get("role")
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(*allowed_roles: str):
    def role_checker(claims: dict = Depends(get_current_user_claims)) -> dict:
        user_role = claims.get("role")
        if not user_role or user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation restricted to roles: {', '.join(allowed_roles)}"
            )
        return claims
    return role_checker

def require_superadmin(
    claims: dict = Depends(get_current_user_claims),
    db: Session = Depends(get_db)
) -> dict:
    if claims.get("role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required")
    
    user = db.query(User).filter(User.id == claims["user_id"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not found")
    
    allowed_emails = [e.strip().lower() for e in settings.SUPERADMIN_EMAILS.split(",") if e.strip()]
    allowed_uids = [u.strip() for u in settings.SUPERADMIN_USER_IDS.split(",") if u.strip()]
    
    is_email_allowed = user.email.lower() in allowed_emails
    is_uid_allowed = str(user.id) in allowed_uids
    
    if not (is_email_allowed or is_uid_allowed):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin user not in allowlist")
    
    return claims

def get_current_user(
    claims: dict = Depends(get_current_user_claims),
    db: Session = Depends(get_db)
) -> User:
    user = db.query(User).filter(User.id == claims["user_id"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

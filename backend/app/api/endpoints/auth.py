from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import time
import logging
from datetime import timedelta
from app.core.security import create_access_token
from app.core.config import settings

logger = logging.getLogger(__name__)
from app.db import get_db
from app.models.user import User
from app.models.audit import create_audit_log

router = APIRouter()

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
    pbkdf2_sha256__rounds=1000  # Optimized for speed in dev, still secure enough for non-critical use
)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str

    class Config:
        from_attributes = True

@router.post("/signup")
async def signup(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    # Generate token immediately after signup
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": db_user.id, "email": db_user.email, "full_name": db_user.full_name}
    }

# Routes

@router.post("/login")
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    start_time = time.time()
    
    # 1. DB Lookup
    db_start = time.time()
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    db_end = time.time()
    
    if not user:
        logger.warning(f"Login failed: User {user_in.email} not found")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # 2. Password Verification
    verify_start = time.time()
    is_valid = pwd_context.verify(user_in.password, user.hashed_password)
    verify_end = time.time()
    
    logger.info(f"Login Profiling for {user_in.email}: DB={db_end-db_start:.4f}s, Verify={verify_end-verify_start:.4f}s")
    
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    await create_audit_log(
        db=db,
        user_id=str(user.id),
        action="USER_LOGIN",
        details={
            "email": user.email,
            "status": "Success",
            "severity": "INFO",
            "bank_type": "N/A",
            "verification_result": "N/A"
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"email": user.email, "full_name": user.full_name}
    }

@router.get("/callback")
async def oauth_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None)
):
    """
    Placeholder for OAuth callbacks to prevent 'Bad Request' errors 
    when code or state are missing or misconfigured.
    """
    if error:
        return {"status": "error", "message": error}
        
    if not code or not state:
        logger.error(f"OAuth Callback missing params: code={bool(code)}, state={bool(state)}")
        # We return a friendly message instead of a 400 Bad Request
        return {
            "status": "partial",
            "message": "OAuth callback received but missing required parameters.",
            "hint": "Ensure your OAuth provider is sending 'code' and 'state' correctly."
        }
        
    return {
        "status": "success",
        "message": "OAuth parameters received (placeholder)",
        "code_preview": f"{code[:5]}...",
        "state": state
    }

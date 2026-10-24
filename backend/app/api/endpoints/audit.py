from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Any, Optional
from datetime import datetime, timedelta
from app.db import get_db
from app.models.audit import AuditLog
from app.api.deps import get_current_user
from app.models.user import User
from pydantic import BaseModel
import json

router = APIRouter()

class AuditLogRead(BaseModel):
    id: Optional[int] = None
    user_id: Optional[str] = None
    action: str
    document_id: Optional[int] = None
    details: Any
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    items: List[AuditLogRead]
    total: int

@router.get("/", response_model=AuditLogResponse)
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    date_range: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(AuditLog).where(AuditLog.user_id == str(current_user.id))

    if date_range and date_range != "All Time":
        days_map = {'Last 24 Hours': 1, 'Last 7 Days': 7, 'Last 30 Days': 30}
        days = days_map.get(date_range)
        if days:
            threshold = datetime.utcnow() - timedelta(days=days)
            query = query.where(AuditLog.created_at >= threshold)

    if action_type and action_type != "All Actions":
        # Convert frontend friendly string to backend enum/constant
        mapping = {
            "Document Upload": "DOCUMENT_UPLOAD",
            "Verdict Overridden": "VERDICT_OVERRIDDEN",
            "User Authenticated": "USER_LOGIN",
            "Bank Verification": "BANK_VERIFICATION",
            "Fraud Detected": "FRAUD_DETECTED",
            "Report Generated": "REPORT_GENERATED"
        }
        actual_action = mapping.get(action_type, action_type)
        query = query.where(AuditLog.action == actual_action)

    if severity and severity != "All Levels":
        mapping = {
            "Success (Normal)": "INFO",
            "Warning (Alert)": "WARNING",
            "Failed (Critical)": "CRITICAL"
        }
        actual_severity = mapping.get(severity, severity)
        # Using json_extract for SQLite to query inside details column
        query = query.where(func.json_extract(AuditLog.details, '$.severity') == actual_severity)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated items
    query = query.order_by(AuditLog.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    return AuditLogResponse(items=items, total=total)

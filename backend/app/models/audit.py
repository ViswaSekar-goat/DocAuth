from sqlalchemy import Column, String, Integer, JSON, ForeignKey
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import hashlib
import json
from app.models.base import Base

class AuditLog(Base):
    __tablename__ = "auditlog"
    user_id = Column(String, index=True) # ID of analyst
    action = Column(String) # UPLOAD, VERIFY, DOWNLOAD
    document_id = Column(Integer, nullable=True)
    details = Column(JSON) # Action details
    hash_link = Column(String) # Optional SHA256 of previous log + current

async def create_audit_log(db: "AsyncSession", user_id: str, action: str, details: dict, document_id: int = None):
    try:
        prev_log_query = select(AuditLog).order_by(AuditLog.id.desc()).limit(1)
        prev_log_result = await db.execute(prev_log_query)
        prev_log = prev_log_result.scalars().first()
        prev_hash = prev_log.hash_link if prev_log else "0" * 64
        
        log_data = f"{prev_hash}{action}{document_id or ''}{json.dumps(details)}".encode()
        current_hash = hashlib.sha256(log_data).hexdigest()

        audit_log = AuditLog(
            user_id=str(user_id) if user_id else "SYSTEM",
            action=action,
            document_id=document_id,
            details=details,
            hash_link=current_hash
        )
        db.add(audit_log)
        await db.commit()
        return audit_log
    except Exception as e:
        print(f"Audit ERROR: Failed to create log: {e}")
        return None

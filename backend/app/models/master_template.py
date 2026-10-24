from sqlalchemy import Column, String, Integer, JSON, DateTime
from datetime import datetime
from app.models.base import Base

class BankMasterTemplate(Base):
    """
    Stores a master reference document for a specific bank to act as
    the standard for structural and format verification.
    """
    __tablename__ = "bank_master_template"
    
    id = Column(Integer, primary_key=True, index=True)
    bank_name = Column(String, unique=True, index=True, nullable=False) # e.g., "SBI"
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    ocr_results = Column(JSON, nullable=True) # Extracted structure/text from master
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

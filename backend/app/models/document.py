from sqlalchemy import Column, String, Float, JSON, Enum, Integer
import enum
from app.models.base import Base

class DocumentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    INVALID_DOCUMENT = "INVALID_DOCUMENT"

class DocumentVerdict(str, enum.Enum):
    VERIFIED = "VERIFIED"
    FAKE = "FAKE"
    SUSPICIOUS = "SUSPICIOUS"
    UNKNOWN = "UNKNOWN"
    GENUINE = "GENUINE"
    REAL = "REAL"
    LIKELY_FORGED = "LIKELY FORGED"
    INVALID = "INVALID"

class Document(Base):
    __tablename__ = "document"
    filename = Column(String, index=True)
    file_path = Column(String)
    file_type = Column(String)
    status = Column(Enum(DocumentStatus, native_enum=False), default=DocumentStatus.PENDING)
    verdict = Column(Enum(DocumentVerdict, native_enum=False), default=DocumentVerdict.UNKNOWN)
    confidence_score = Column(Float, default=0.0)
    
    # AI Results stored as JSON
    forensic_results = Column(JSON, nullable=True)  # ELA, noise, etc.
    ocr_results = Column(JSON, nullable=True)       # Extracted text
    symbol_results = Column(JSON, nullable=True)    # Detected logos/stamps
    
    # Previews for non-image files (PDFs)
    preview_path = Column(String, nullable=True)
    
    # User comments/audit
    analyst_comments = Column(String, nullable=True)
    
    # Owner
    from sqlalchemy import ForeignKey
    user_id = Column(Integer, nullable=True)
    selected_bank = Column(String, nullable=True)

    @property
    def file_url(self):
        import os
        from app.core.config import AL_DATA_DIR
        # If we have a preview image (for PDFs), return that instead for UI rendering
        path_to_use = self.preview_path if self.preview_path else self.file_path
        if path_to_use:
            # Check if it's already a relative static path (legacy support)
            if path_to_use.startswith("/static/"):
                return path_to_use
            
            storage_root = AL_DATA_DIR / "storage_forensics"
            try:
                # If path is inside our storage, preserve full relative structure
                if os.path.isabs(path_to_use) and str(storage_root) in path_to_use:
                    rel_path = os.path.relpath(path_to_use, storage_root)
                    return f"/static/uploads/{rel_path.replace(os.sep, '/')}"
            except: pass
            
            # Fallback for simple basenames
            return f"/static/uploads/{os.path.basename(path_to_use)}"
        return None

    @property
    def ela_url(self):
        import os
        from app.core.config import AL_DATA_DIR
        # ELA should be based on the image used for analysis (preview if PDF)
        path_to_use = self.preview_path if self.preview_path else self.file_path
        if path_to_use:
            storage_root = AL_DATA_DIR / "storage_forensics"
            try:
                if os.path.isabs(path_to_use) and str(storage_root) in path_to_use:
                    rel_path = os.path.relpath(path_to_use, storage_root)
                    dir_name = os.path.dirname(rel_path)
                    base_name = os.path.basename(rel_path)
                    ela_rel_path = os.path.join(dir_name, f"ela_{base_name}")
                    return f"/static/uploads/{ela_rel_path.replace(os.sep, '/')}"
            except: pass
            
            ela_filename = f"ela_{os.path.basename(path_to_use)}"
            return f"/static/uploads/{ela_filename}"
        return None

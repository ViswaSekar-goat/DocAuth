from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Any
from app.db import get_db
from app.services.document_service import DocumentService
from app.models.document import Document as DocumentModel
from pydantic import BaseModel, computed_field
from datetime import datetime
import os

router = APIRouter()

class DocumentRead(BaseModel):
    id: int
    filename: str
    status: str
    verdict: str
    confidence_score: float
    forensic_results: Optional[Any] = None
    ocr_results: Optional[Any] = None
    symbol_results: Optional[Any] = None
    file_path: Optional[str] = None
    preview_path: Optional[str] = None
    created_at: datetime

    @computed_field
    @property
    def file_url(self) -> Optional[str]:
        from app.core.config import AL_DATA_DIR
        path_to_use = self.preview_path if self.preview_path else self.file_path
        if path_to_use:
            if path_to_use.startswith("/static/"): return path_to_use
            
            storage_root = AL_DATA_DIR / "storage_forensics"
            try:
                if os.path.isabs(path_to_use) and str(storage_root) in path_to_use:
                    rel_path = os.path.relpath(path_to_use, storage_root)
                    return f"/static/uploads/{rel_path.replace(os.sep, '/')}"
            except: pass
            return f"/static/uploads/{os.path.basename(path_to_use)}"
        return None

    @computed_field
    @property
    def ela_url(self) -> Optional[str]:
        from app.core.config import AL_DATA_DIR
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
            return f"/static/uploads/ela_{os.path.basename(path_to_use)}"
        return None

    @computed_field
    @property
    def view_urls(self) -> List[str]:
        from app.core.config import AL_DATA_DIR
        import glob
        
        storage_root = AL_DATA_DIR / "storage_forensics"
        urls = []
        
        if self.file_path:
            doc_id = os.path.basename(self.file_path).split(".")[0]
            # Standard location according to tasks.py: storage_forensics / previews / converted_{doc_id}
            conv_dir = storage_root / "previews" / f"converted_{doc_id}"
            
            if os.path.exists(conv_dir):
                pages = sorted(glob.glob(os.path.join(conv_dir, "page_*.png")))
                for p in pages:
                    try:
                        rel_path = os.path.relpath(p, storage_root)
                        urls.append(f"/static/uploads/{rel_path.replace(os.sep, '/')}")
                    except: pass
        
        # Fallback for non-PDFs or failed conversion
        if not urls and self.file_url:
            urls = [self.file_url]
            
        return urls

    @computed_field
    @property
    def document_type(self) -> Optional[str]:
        if self.ocr_results and isinstance(self.ocr_results, dict):
            return self.ocr_results.get("document_type", "UNKNOWN")
        return "UNKNOWN"

    @computed_field
    @property
    def extracted_data(self) -> Optional[dict]:
        if self.ocr_results and isinstance(self.ocr_results, dict):
            return self.ocr_results.get("extracted_data", {})
        return {}

    class Config:
        from_attributes = True

from app.models.user import User
from app.api.deps import get_current_user

import traceback

@router.post("/upload", response_model=DocumentRead)
async def upload_document(
    file: UploadFile = File(...),
    bank_name: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        document = await DocumentService.create_document(db, file, user_id=current_user.id, bank_name=bank_name)
        return document
    except Exception as e:
        print(f"UPLOAD FATAL ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[DocumentRead])
async def list_documents(
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    documents = await DocumentService.get_documents(db, skip=skip, limit=limit, user_id=current_user.id)
    return documents

@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db)
):
    document = await DocumentService.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@router.post("/{document_id}/reprocess")
async def reprocess_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = await DocumentService.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    from worker.tasks import process_document
    process_document.delay(document_id)
    
    return {"status": "Processing triggered", "document_id": document_id}

@router.post("/master/upload")
async def upload_master_template(
    file: UploadFile = File(...),
    bank_name: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        master = await DocumentService.upload_master_template(db, file, bank_name=bank_name)
        return {"status": "success", "bank": bank_name, "filename": master.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/master/{bank_name}")
async def get_master_status(
    bank_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    master = await DocumentService.get_master_template(db, bank_name)
    if not master:
        return {"exists": False, "bank": bank_name}
    return {
        "exists": True, 
        "bank": bank_name, 
        "filename": master.filename,
        "updated_at": master.updated_at
    }

@router.delete("/master/{bank_name}")
async def delete_master_template(
    bank_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        await DocumentService.delete_master_template(db, bank_name)
        return {"status": "success", "message": f"Master template for {bank_name} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

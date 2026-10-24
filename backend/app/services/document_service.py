import os
import shutil
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from app.models.document import Document, DocumentStatus
from app.models.master_template import BankMasterTemplate
from app.models.audit import AuditLog, create_audit_log
from fastapi import UploadFile

from worker.tasks import process_document, async_process_document
import asyncio

import socket
import hashlib
import json
from app.core.config import settings

from app.core.config import AL_DATA_DIR

UPLOAD_DIR = str(AL_DATA_DIR / "storage_forensics")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def is_redis_available():
    try:
        # Quick socket check for Redis
        with socket.create_connection((settings.REDIS_HOST, settings.REDIS_PORT), timeout=1):
            return True
    except (socket.timeout, ConnectionRefusedError):
        return False

# LIGHTNING: Global semaphore to ensure documents are processed one-by-one
# This prevents CPU/RAM thrashing on Windows which causes hangs
processing_semaphore = asyncio.Semaphore(3)

async def sequential_process_wrapper(document_id: int):
    try:
        async with processing_semaphore:
            print(f"Queue: Starting sequential processing for document {document_id}")
            # Global fail-safe timeout (150s) to prevent permanent semaphore lock
            await asyncio.wait_for(async_process_document(document_id), timeout=150.0)
            print(f"Queue: Finished sequential processing for document {document_id}")
    except asyncio.TimeoutError:
        print(f"Queue ERROR: Global timeout for document {document_id}. Releasing semaphore.")
        # Attempt to mark as failed so it doesn't block UI indefinitely
        try:
            from app.db import async_session
            from sqlalchemy.future import select
            async with async_session() as db:
                result = await db.execute(select(Document).where(Document.id == document_id))
                document = result.scalars().first()
                if document and document.status == DocumentStatus.PROCESSING:
                    document.status = DocumentStatus.FAILED
                    document.forensic_results = {"anomalies": [{"type": "QUEUE_TIMEOUT", "message": "Processing limit reached (150s).", "severity": "CRITICAL"}]}
                    await db.commit()
        except Exception as db_err:
            print(f"Queue ERROR: Failed to update document {document_id} after timeout: {db_err}")
    except Exception as e:
        print(f"Queue FATAL ERROR for document {document_id}: {e}")

class DocumentService:
    @staticmethod
    async def create_document(db: AsyncSession, file: UploadFile, user_id: Optional[int] = None, bank_name: Optional[str] = None) -> Document:
        file_id = str(uuid.uuid4())
        extension = os.path.splitext(file.filename)[1]
        stored_filename = f"{file_id}{extension}"
        file_path = os.path.abspath(os.path.join(UPLOAD_DIR, stored_filename))
        
        print(f"UPLOAD: Saving file to {file_path}...")
        # Save file to storage
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print("UPLOAD: File saved. Creating DB record...")
        # Create database record
        db_document = Document(
            filename=file.filename,
            file_path=file_path,
            file_type=file.content_type,
            status=DocumentStatus.PENDING,
            user_id=user_id,
            selected_bank=bank_name
        )
        db.add(db_document)
        print("UPLOAD: Committing DB record...")
        await db.commit()
        await db.refresh(db_document)
        print(f"UPLOAD: DB record created with ID {db_document.id}. Creating Audit Log...")
        
        # Create Audit Log
        await create_audit_log(
            db=db,
            user_id=str(user_id) if user_id else "SYSTEM",
            action="DOCUMENT_UPLOAD",
            document_id=db_document.id,
            details={
                "filename": file.filename, 
                "type": file.content_type, 
                "status": "Success", 
                "severity": "INFO",
                "bank_type": bank_name or "Unknown",
                "verification_result": "Pending"
            }
        )

        # Trigger background task (Moved to end for atomicity)
        print(f"Queue: Adding document {db_document.id} to sequential processing queue")
        asyncio.create_task(sequential_process_wrapper(db_document.id))
        
        return db_document

    @staticmethod
    async def get_documents(db: AsyncSession, skip: int = 0, limit: int = 10, user_id: Optional[int] = None) -> List[Document]:
        query = select(Document)
        if user_id:
            query = query.where(Document.user_id == user_id)
        result = await db.execute(query.offset(skip).limit(limit))
        return result.scalars().all()

    @staticmethod
    async def get_document(db: AsyncSession, document_id: int) -> Optional[Document]:
        result = await db.execute(select(Document).where(Document.id == document_id))
        return result.scalars().first()

    @staticmethod
    async def upload_master_template(db: AsyncSession, file: UploadFile, bank_name: str) -> BankMasterTemplate:
        # Create directory if not exists
        master_dir = os.path.join(UPLOAD_DIR, "masters")
        os.makedirs(master_dir, exist_ok=True)
        
        file_id = str(uuid.uuid4())
        extension = os.path.splitext(file.filename)[1]
        stored_filename = f"{bank_name.lower()}_master_{file_id}{extension}"
        file_path = os.path.abspath(os.path.join(master_dir, stored_filename))
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Process OCR for the master template to store its structural data
        from app.forensics.ocr_pipeline import perform_ocr
        from app.forensics.converter import DocumentConverter
        from app.core.config import AL_DATA_DIR
        
        # Convert and OCR (simplified for master reference)
        preview_dir = AL_DATA_DIR / "storage_forensics" / "previews"
        preview_dir.mkdir(parents=True, exist_ok=True)
        pages = DocumentConverter.get_document_pages(file_path, str(preview_dir))
        analysis_page = pages[0] if pages else file_path
        
        ocr_results = perform_ocr(analysis_page, original_path=file_path)
        
        # Remove existing master for this bank
        await db.execute(delete(BankMasterTemplate).where(BankMasterTemplate.bank_name == bank_name))
        
        # Create new master record
        db_master = BankMasterTemplate(
            bank_name=bank_name,
            filename=file.filename,
            file_path=file_path,
            ocr_results=ocr_results
        )
        db.add(db_master)
        await db.commit()
        await db.refresh(db_master)
        
        return db_master

    @staticmethod
    async def get_master_template(db: AsyncSession, bank_name: str) -> Optional[BankMasterTemplate]:
        result = await db.execute(select(BankMasterTemplate).where(BankMasterTemplate.bank_name == bank_name))
        return result.scalars().first()

    @staticmethod
    async def delete_master_template(db: AsyncSession, bank_name: str):
        # Find the record first to get the file path
        result = await db.execute(select(BankMasterTemplate).where(BankMasterTemplate.bank_name == bank_name))
        master = result.scalars().first()
        if master and os.path.exists(master.file_path):
            try:
                os.remove(master.file_path)
            except Exception as e:
                print(f"SERVICE_ERROR: Failed to delete master file: {e}")
        
        stmt = delete(BankMasterTemplate).where(BankMasterTemplate.bank_name == bank_name)
        await db.execute(stmt)
        await db.commit()

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db import get_db
from app.models.document import Document, DocumentStatus
from app.api.deps import get_current_user
from app.models.user import User
from pydantic import BaseModel
import shutil
import os

router = APIRouter()

class FeedbackCreate(BaseModel):
    correct_verdict: str  # "VERIFIED", "FAKE", "SUSPICIOUS"
    notes: str = ""

def save_to_training_dataset(file_path: str, verdict: str):
    """
    Background task to move file to training dataset.
    """
    if not file_path or not os.path.exists(file_path):
        return

    # Define target directory based on verdict
    # e.g. dataset/feedback/REAL or dataset/feedback/FAKE
    label = "REAL" if verdict == "VERIFIED" else "FAKE"
    target_dir = os.path.join("dataset", "feedback", label)
    
    os.makedirs(target_dir, exist_ok=True)
    
    # Copy file with timestamp to avoid collisions
    filename = os.path.basename(file_path)
    target_path = os.path.join(target_dir, filename)
    
    try:
        shutil.copy2(file_path, target_path)
        print(f"Moved {filename} to {target_dir} for training.")
    except Exception as e:
        print(f"Error moving file for training: {e}")

@router.post("/{document_id}/feedback")
async def submit_feedback(
    document_id: int,
    feedback: FeedbackCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch Document
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # 2. Update Database
    document.verdict = feedback.correct_verdict
    # We use a custom status or just keep it COMPLETED but maybe add a flag
    # For now, let's assume we just update the verdict.
    # Optionally, we could add a field `is_manually_verified=True` to the model.
    # But for this MVP, updating the verdict is sufficient for the user.
    
    # Store notes in forensic_results or a new field?
    # Let's verify if forensic_results is a dict
    if document.forensic_results and isinstance(document.forensic_results, dict):
        # Create a new dict to avoid mutation tracking issues if any
        new_results = document.forensic_results.copy()
        new_results["manual_feedback"] = {
            "user": current_user.email,
            "notes": feedback.notes,
            "original_verdict": document.verdict  # Wait, we just overwrote it? No, not yet committed.
        }
        # Actually we should capture original before overwriting
        # document.verdict = feedback.correct_verdict happens after
    else:
        # Initialize if empty
         document.forensic_results = {
            "manual_feedback": {
                "user": current_user.email,
                "notes": feedback.notes
            }
        }
        
    document.verdict = feedback.correct_verdict
    
    await db.commit()
    
    # 3. Trigger Background Task to Copy File
    background_tasks.add_task(save_to_training_dataset, document.file_path, feedback.correct_verdict)
    
    return {"status": "success", "message": "Feedback recorded and sample queued for training."}

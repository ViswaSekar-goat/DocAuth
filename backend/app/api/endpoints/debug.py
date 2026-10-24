from fastapi import APIRouter
from pathlib import Path
import os

router = APIRouter()

@router.get("/debug/uploads")
async def debug_uploads():
    """Debug endpoint to check upload directory and files"""
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
    
    files = []
    if UPLOAD_DIR.exists():
        for f in UPLOAD_DIR.iterdir():
            if f.is_file():
                files.append({
                    "name": f.name,
                    "size": f.stat().st_size,
                    "url": f"/static/uploads/{f.name}"
                })
    
    return {
        "upload_dir": str(UPLOAD_DIR),
        "exists": UPLOAD_DIR.exists(),
        "file_count": len(files),
        "files": files[:5]  # First 5 files
    }

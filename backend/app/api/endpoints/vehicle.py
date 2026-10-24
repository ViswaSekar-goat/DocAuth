from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil
import uuid
from app.core.config import AL_DATA_DIR
from app.forensics.vehicle_logic import VehicleForensics
from pydantic import BaseModel

router = APIRouter()

import time
import asyncio
from concurrent.futures import ThreadPoolExecutor

from typing import Optional, List, Dict

class VehicleResponse(BaseModel):
    chassis_number: Optional[str] = None
    registration_number: Optional[str] = None
    chassis_candidates: List[str] = []
    registration_candidates: List[str] = []
    checkpoints: Dict[str, str] = {}
    text_source: str = ""
    ocr_text_length: int = 0
    ocr_text_preview: str = ""
    ocr_preview: str = ""
    image_generated: bool = False
    image_resolution: str = ""
    ocr_lines_preview: List[str] = []
    detected_labels: List[str] = []
    candidates: List[str] = []
    result: str = ""
    final_result: str = ""
    # PaddleOCR fields
    ocr_engine: str = "Tesseract"
    lvm: Dict[str, str] = {}

# Executor for running synchronous forensic logic without blocking the event loop
executor = ThreadPoolExecutor(max_workers=4)

SUPPORTED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.webp', '.bmp'}

@router.post("/upload", response_model=VehicleResponse)
async def upload_vehicle_document(file: UploadFile = File(...)):
    """
    Vehicle forensic analysis endpoint.
    OCR Priority: PaddleOCR (PP-Structure) → Tesseract fallback.
    """
    start_time = time.time()

    # Create vehicle storage dir if not exists
    vehicle_dir = AL_DATA_DIR / "storage_vehicle"
    vehicle_dir.mkdir(parents=True, exist_ok=True)

    # Save the file
    file_id = str(uuid.uuid4())
    extension = os.path.splitext(file.filename or "")[1].lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{extension}'. Supported: PDF, PNG, JPG, JPEG, TIFF, WEBP, BMP"
        )

    stored_filename = f"{file_id}{extension}"
    file_path = str(vehicle_dir / stored_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(executor, VehicleForensics.process_document, file_path)
        except Exception as e:
            print(f"VEHICLE PIPELINE ERROR: {e}")
            result = {
                "chassis_number": None,
                "registration_number": None,
                "chassis_candidates": [],
                "registration_candidates": [],
                "checkpoints": {
                    "text_extraction": "FAIL",
                    "ocr_fallback": "FAIL",
                    "text_readability": "FAIL",
                    "label_detection": "FAIL",
                    "chassis_detection": "FAIL",
                    "registration_detection": "FAIL",
                    "format_validation": "FAIL"
                },
                "text_source": "ERROR",
                "ocr_text_length": 0,
                "ocr_text_preview": f"ERROR: {str(e)}",
                "ocr_preview": f"ERROR: {str(e)}",
                "image_generated": False,
                "image_resolution": "",
                "ocr_lines_preview": [],
                "detected_labels": [],
                "candidates": [],
                "result": f"ERROR: {str(e)}",
                "final_result": "IRRELEVANT DOCUMENT",
                "ocr_engine": "ERROR",
                "lvm": {},
            }

        # Ensure all required fields exist with defaults
        result.setdefault("ocr_engine", "Tesseract")
        result.setdefault("lvm", {})
        result.setdefault("ocr_preview", result.get("ocr_text_preview", ""))
        result.setdefault("image_generated", False)
        result.setdefault("image_resolution", "")
        result.setdefault("ocr_lines_preview", [])
        result.setdefault("detected_labels", [])
        result.setdefault("candidates", [])

        print(f"VEHICLE: Request completed in {time.time() - start_time:.2f}s | "
              f"Engine: {result.get('ocr_engine')} | "
              f"Chassis: {result.get('chassis_number')} | "
              f"Reg: {result.get('registration_number')}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"VEHICLE UPLOAD ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        pass

import os
import re
import traceback
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS

# Optional dependency: PyMuPDF (fitz)
try:
    import fitz
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False
    print("WARNING: PyMuPDF (fitz) not found. PDF metadata extraction will be limited.")

def parse_pdf_date(date_str: str) -> datetime:
    """
    Parses PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
    """
    if not date_str or not isinstance(date_str, str):
        return None
    
    # Remove prefix D:
    clean_date = date_str.replace("D:", "")
    # Extract only the main date part (YYYYMMDDHHmmss)
    match = re.search(r"(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})", clean_date)
    if match:
        try:
            return datetime(
                int(match.group(1)), int(match.group(2)), int(match.group(3)),
                int(match.group(4)), int(match.group(5)), int(match.group(6))
            )
        except ValueError:
            pass
    return None

def extract_metadata(file_path: str) -> dict:
    """
    Extracts EXIF and generic file metadata.
    Handles PDF metadata if fitz is available.
    Dedicated to Layer 1 Forensic Analysis.
    """
    metadata = {
        "file_size": os.path.getsize(file_path),
        "extension": os.path.splitext(file_path)[1].lower(),
        "exif": {},
        "is_searchable": False,
        "producer": "Unknown",
        "creator": "Unknown",
        "software_forgery_detected": False,
        "suspicious_tool": None,
        "creation_date_raw": None,
        "mod_date_raw": None,
        "submission_date": datetime.now().isoformat()
    }
    
    FORGERY_TOOLS = ["PHOTOSHOP", "CANVA", "ADOBE ILLUSTRATOR", "CORELDRAW", "GIMP", "WPS", "MICROSOFT WORD", "ILOVEPDF", "SMALLPDF", "SEJDA"]
    
    ext = metadata["extension"]
    
    if ext == ".pdf" and HAS_FITZ:
        try:
            doc = fitz.open(file_path)
            metadata["page_count"] = len(doc)
            
            # PDF Metadata
            info = doc.metadata
            if info:
                metadata["producer"] = info.get("producer", "Unknown")
                metadata["creator"] = info.get("creator", "Unknown")
                metadata["author"] = info.get("author", "Unknown")
                metadata["subject"] = info.get("subject", "Unknown")
                metadata["title"] = info.get("title", "Unknown")
                metadata["creation_date_raw"] = info.get("creationDate")
                metadata["mod_date_raw"] = info.get("modDate")
                
                # Detect forgery tools in metadata
                for tool in FORGERY_TOOLS:
                    if tool in str(metadata["producer"]).upper() or tool in str(metadata["creator"]).upper():
                        metadata["software_forgery_detected"] = True
                        metadata["suspicious_tool"] = tool
                        break

            # Heuristic for searchable (vector) vs scanned (raster)
            has_text = False
            for page in doc:
                if page.get_text().strip():
                    has_text = True
                    break
            metadata["is_searchable"] = has_text
            doc.close()
        except Exception as e:
            print(f"PDF Metadata extraction failed: {e}")
            metadata["pdf_error"] = str(e)
            
    try:
        image_exts = [".jpg", ".jpeg", ".png", ".tiff", ".bmp"]
        if ext in image_exts:
            img = Image.open(file_path)
            metadata["dimensions"] = f"{img.width}x{img.height}"
            metadata["format"] = img.format
            
            # Extract EXIF if available
            info = img._getexif()
            if info:
                for tag, value in info.items():
                    decoded = TAGS.get(tag, tag)
                    if isinstance(value, (str, int, float, bool)):
                        metadata["exif"][decoded] = value
                    else:
                        metadata["exif"][decoded] = str(value)
                
                # Check software in EXIF
                software = str(metadata["exif"].get("Software", "")).upper()
                for tool in FORGERY_TOOLS:
                    if tool in software:
                        metadata["software_forgery_detected"] = True
                        metadata["suspicious_tool"] = tool
                        break
    except Exception as e:
        metadata["image_error"] = str(e)
        
    return metadata

import easyocr
import pytesseract
from PIL import Image
import cv2
import numpy as np
import re
import os
import traceback

import threading
from app.core.config import settings

# Initialize EasyOCR Reader with thread safety
reader = None
reader_lock = threading.Lock()

def get_ocr_reader():
    global reader
    with reader_lock:
        if reader is None:
            print("Initializing EasyOCR Engine (CPU mode, Multilingual: EN+HI)...")
            reader = easyocr.Reader(['en', 'hi'], gpu=False)
    return reader

def perform_ocr(image_path: str, original_path: str = None) -> dict:
    """
    Performs OCR using EasyOCR and Tesseract, or extracts vector text for PDFs.
    """
    print(f"OCR: Processing {image_path} (Original: {original_path or 'None'})...")
    results = {
        "text": "",
        "engine": "EasyOCR",
        "confidence": 0.0,
        "raw_data": [],
        "cross_val_status": "PENDING",
        "image_path": image_path,
        "original_path": original_path
    }

    # --- 0. ULTIMATE AI: Google Cloud Document AI (New Primary) ---
    if settings.GOOGLE_CLOUD_PROJECT != "your-project-id":
        try:
            from app.forensics.google_doc_ai import process_document as process_with_google
            print(f"OCR: Attempting Google Cloud Document AI Integration...")
            
            # Determine mime type
            mime_type = "application/pdf"
            if image_path.lower().endswith((".png", ".jpg", ".jpeg")):
                mime_type = "image/png" if image_path.lower().endswith(".png") else "image/jpeg"
                
            google_results = process_with_google(image_path, mime_type)
            if google_results and google_results.get("text"):
                print(f"OCR: Google Document AI SUCCESS. Extracted {len(google_results['raw_data'])} blocks.")
                results.update(google_results)
                return _finalize_ocr_results(results)
        except Exception as ge:
            print(f"OCR: Google Document AI failed (falling back): {ge}")

    # 0.5. pdfplumber: Primary Layout-Aware PDF Text Extraction (before PyMuPDF)
    if original_path and original_path.lower().endswith(".pdf"):
        try:
            import pdfplumber
            print(f"OCR: Attempting pdfplumber extraction for PDF...")
            plumber_text_parts = []

            with pdfplumber.open(original_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        plumber_text_parts.append(page_text)

            plumber_text = "\n".join(plumber_text_parts).strip()

            print(f"Extracted text preview: {plumber_text[:500]}")

            if len(plumber_text) > 200:
                # Build raw_data blocks from text lines for bbox compatibility
                plumber_raw_data = []
                for i, line in enumerate(plumber_text.split("\n")):
                    if line.strip():
                        plumber_raw_data.append({
                            "text": line.strip(),
                            "bbox": [[0, i * 20], [800, i * 20], [800, (i + 1) * 20], [0, (i + 1) * 20]],
                            "conf": 0.99,
                            "page": 0
                        })

                results["text"] = plumber_text
                results["raw_data"] = plumber_raw_data
                results["engine"] = "pdfplumber"
                results["confidence"] = 0.99
                results["cross_val_status"] = "VECTOR_ONLY"
                results["is_searchable"] = True
                print(f"OCR: pdfplumber SUCCESS. Extracted {len(plumber_text)} chars, {len(plumber_raw_data)} lines.")
                return _finalize_ocr_results(results)
            else:
                print(f"OCR: pdfplumber returned insufficient text ({len(plumber_text)} chars), falling back.")
        except Exception as pe:
            print(f"OCR: pdfplumber failed: {pe}. Falling back to PyMuPDF.")

    # 1. Pixel-Based AI Acceleration: Vector Text Extraction for PDFs
    if original_path and original_path.lower().endswith(".pdf"):
        try:
            import fitz
            doc = fitz.open(original_path)
            all_text = []
            raw_data = []
            
            print(f"OCR: Attempting Vector Text Extraction for PDF...")
            for page_num, page in enumerate(doc):
                # get_text("blocks") returns (x0, y0, x1, y1, "text", block_no, block_type)
                blocks = page.get_text("blocks")
                for b in blocks:
                    text = b[4].strip()
                    if text:
                        all_text.append(text)
                        # Map to EasyOCR-like bbox format for TableExtractor compatibility
                        # [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
                        # Added 'page' index for multi-page sorting
                        raw_data.append({
                            "text": text,
                            "bbox": [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]],
                            "conf": 0.99,
                            "page": page_num
                        })
            
            if len(all_text) > 5: # Threshold to ensure it's actually searchable
                results["text"] = "\n".join(all_text)
                results["raw_data"] = raw_data
                results["engine"] = "PyMuPDF (Vector)"
                results["confidence"] = 0.99
                results["cross_val_status"] = "VECTOR_ONLY"
                print(f"OCR: Vector Extraction SUCCESS. Extracted {len(raw_data)} blocks.")
                doc.close()
                # Instead of returning early, we skip EasyOCR but CONTINUE to classification
                return _finalize_ocr_results(results)
            doc.close()
        except Exception as ve:
            print(f"OCR: Vector extraction failed or unsupported: {ve}")

    try:
        # 1. EasyOCR Primary
        easy_results = []
        easy_text = ""
        easy_conf = 0.0
        
        try:
            ocr_reader = get_ocr_reader()
            # Load and ensure grayscale to avoid "too many values to unpack" errors
            img_for_ocr = cv2.imread(image_path)
            if img_for_ocr is not None:
                results["width"] = img_for_ocr.shape[1]
                results["height"] = img_for_ocr.shape[0]
                # Force strictly 2D for EasyOCR if it's currently 3D
                if len(img_for_ocr.shape) == 3:
                    img_for_ocr = cv2.cvtColor(img_for_ocr, cv2.COLOR_BGR2GRAY)
                # Ensure it's uint8
                if img_for_ocr.dtype != np.uint8:
                    img_for_ocr = img_for_ocr.astype(np.uint8)
                
                print("OCR: Running AI engine on image pixels...")
                easy_results = ocr_reader.readtext(img_for_ocr, detail=1, paragraph=False)
            else:
                # Fallback path (image read failed)
                try:
                    with Image.open(image_path) as pil_img:
                        results["width"], results["height"] = pil_img.size
                except: pass
                easy_results = ocr_reader.readtext(image_path, detail=1, paragraph=False)
            
            print(f"OCR: Extracted {len(easy_results)} text blocks.")
            
            if easy_results:
                valid_results = []
                for res in easy_results:
                    try:
                        if len(res) >= 2:
                            text_val = res[1]
                            bbox_val = res[0]
                            conf_val = res[2] if len(res) > 2 else 0.5
                            valid_results.append((bbox_val, text_val, conf_val))
                    except Exception as parse_err:
                        print(f"Skipping malformed OCR result: {res}, Error: {parse_err}")
                
                if valid_results:
                    easy_text = " ".join([res[1] for res in valid_results])
                    easy_conf = sum([res[2] for res in valid_results]) / len(valid_results)
                    results["raw_data"] = [{"text": res[1], "bbox": res[0], "conf": float(res[2])} for res in valid_results]
        
        except Exception as e:
            print(f"EasyOCR Inner Error: {e}")

        # Ultimate Turbo: Fast Classification to enable Hard Skip
        # We run a quick check on EasyOCR text alone
        fast_text = easy_text.lower()
        is_likely_pan = bool(re.search(r"income tax department|permanent account number|[a-z]{5}[0-9]{4}[a-z]{1}", fast_text))
        is_likely_aadhaar = bool(re.search(r"\d{4}\s\d{4}\s\d{4}|unique identification authority", fast_text))
        is_likely_bank = bool(re.search(r"statement of account|bank statement|transaction history|closing balance", fast_text))
        
        # 2. Tesseract Verification (Hard Turbo skip)
        tess_text = ""
        skip_tesseract = False
        if is_likely_pan or is_likely_aadhaar or is_likely_bank:
            skip_tesseract = True
            print(f"Ultimate Turbo: Skipping Tesseract for detected ID card.")
        
        if not skip_tesseract:
            try:
                pytesseract.get_tesseract_version()
                tess_text = pytesseract.image_to_string(Image.open(image_path)).strip()
            except Exception as te:
                tess_exe = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
                if os.path.exists(tess_exe):
                    pytesseract.pytesseract.tesseract_cmd = tess_exe
                    try: tess_text = pytesseract.image_to_string(Image.open(image_path)).strip()
                    except: pass
        
        # 3. QR Code Detection/Decoding (Improved for all documents)
        qr_data = None
        try:
            img = cv2.imread(image_path)
            if img is not None:
                detector = cv2.QRCodeDetector()
                val, _, _ = detector.detectAndDecode(img)
                if val:
                    qr_data = val
                    print(f"OCR: QR Code detected and decoded.")
        except Exception as qre:
            print(f"OCR: QR decoding failed: {qre}")
        
        results["qr_data_raw"] = qr_data

        return _finalize_ocr_results(results)

    except Exception as e:
        error_msg = str(e)
        print(f"OCR Pipeline Error: {traceback.format_exc()}")
        results["engine"] = "Error"
        results["text"] = ""
        results["confidence"] = 0.0
        results["error"] = error_msg
        results["cross_val_status"] = "FAILED"
        return results

def _finalize_ocr_results(results: dict) -> dict:
    """
    Common finalization for both Vector and Pixel-based OCR paths.
    Does classification and data extraction.
    """
    text = results.get("text", "")
    text_upper = text.upper()
    
    # 4. Final Classification
    detected_type = "UNKNOWN"
    confidence_map = {"AADHAAR": 0, "PAN": 0, "CERTIFICATE": 0, "MARKSHEET": 0, "BANK_STATEMENT": 0}
    
    combined_text = text.lower()
    if re.search(r"\d{4}\s\d{4}\s\d{4}", combined_text): confidence_map["AADHAAR"] += 3
    if "unique identification authority" in combined_text: confidence_map["AADHAAR"] += 2
    if re.search(r"[a-z]{5}[0-9]{4}[a-z]{1}", combined_text): confidence_map["PAN"] += 3
    if "income tax department" in combined_text: confidence_map["PAN"] += 3
    if "certificate" in combined_text or "degree" in combined_text: confidence_map["CERTIFICATE"] += 2
    if "marks statement" in combined_text or "grade card" in combined_text: confidence_map["MARKSHEET"] += 3
    if any(kw in combined_text for kw in ["statement of account", "bank statement", "transaction history", "closing balance", "statement of transactions", "account no.", "account statement"]): 
        confidence_map["BANK_STATEMENT"] = 10

    # 2. Classification Heuristics (Accuracy Boost)
    if confidence_map["BANK_STATEMENT"] >= 5:
        detected_type = "BANK_STATEMENT"
    elif any(marker in text_upper for marker in ["GOVERNMENT OF INDIA", "BHARAT SARKAR", "UNIQUE IDENTIFICATION"]):
        detected_type = "AADHAAR"
    elif any(marker in text_upper for marker in ["INCOME TAX DEPARTMENT", "PERMANENT ACCOUNT NUMBER", "PAN CARD"]):
        detected_type = "PAN"
    elif any(marker in text_upper for marker in ["CERTIFICATE", "PROVISIONAL", "CONVOCATION", "DEGREE"]):
        detected_type = "CERTIFICATE"
    elif any(marker in text_upper for marker in ["MARKSHEET", "STATEMENT OF MARKS", "GRADE CARD"]):
        detected_type = "MARKSHEET"
    else:
        # Just pick the best one if count > 0
        best_type = max(confidence_map, key=confidence_map.get)
        if confidence_map[best_type] > 0:
            detected_type = best_type

    # 3. Generic Data Extraction
    extracted_data = {}
    
    # ID Number Heuristic (Enhanced)
    id_patterns = [
        r"\b(?:A/C|ACC|ACCOUNT)\s*(?:NO\.?|NUMBER|NUM\.?)?[:\s]+(\d{9,18})\b", # Generic Account Number (Priority)
        r"\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b", # PAN Style (Strict uppercase for actual PANs)
        r"\b(\d{4}\s\d{4}\s\d{4})\b", # Aadhaar Style
        r"\b(\d{12})\b", # Aadhaar No-Space Style
        r"\b([A-Z][0-9]{7})\b", # Passport Style
        r"\b([A-Z]{2}[0-9]{2}[ ]?[0-9]{11})\b", # DL Style
        r"\b([A-Z]{3}[0-9/]{7,8})\b" # Voter ID (EPIC) Style
    ]
    for pattern in id_patterns:
        match = re.search(pattern, text, re.I if "ACC" in pattern else 0)
        if match:
            extracted_data["id_number"] = match.group(0).strip()
            if match.groups():
                extracted_data["id_number_val"] = match.group(1).strip()
            break

    # Name Heuristic (Enhanced for Joint Accounts & IDs)
    name_ignore = ["NAME", "FATHER", "ADDRESS", "INDIA", "GENDER", "MALE", "FEMALE", "SARKAR", "GOVT", "HDFC", "SBI", "ICICI", "BANK", "STATEMENT", "ACCOUNT", "HOLDER", "NUMBER", "DATE", "PERIOD", "BRANCH", "NOMINATION"]
    # Regex: Look for NAME/HOLDER label, then a name pattern
    # Pattern: Allows A-Z, spaces, dots, and commas for joint accounts. Up to 100 chars.
    name_pattern = r"(?:NAME|NAM|NME|HOLDER|ACCOUNT NAME|CUSTOMER NAME)[:\s]*([A-Z\s\.,]{3,100})"
    name_match = re.search(name_pattern, text_upper)
    if name_match:
        candidate = name_match.group(1).strip()
        # Clean up common noise and leading/trailing punctuation
        candidate = re.sub(r"\b(?:NAME|HOLDER|ACCOUNT|NO)\b", "", candidate).strip().strip(',. ')
        if not any(ig in candidate.split() for ig in name_ignore) and len(candidate.split()) >= 2:
            extracted_data["name"] = candidate

    # Date Heuristic
    date_match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", text)
    if date_match:
        extracted_data["date"] = date_match.group(1)
        extracted_data["dob"] = date_match.group(1)

    extracted_data["text"] = text
    results["document_type"] = detected_type
    results["extracted_data"] = extracted_data
    
    # 5. Handle QR Data Parsing
    raw_qr = results.get("qr_data_raw")
    if raw_qr:
        results["qr_data"] = {"raw": raw_qr}
        # Attempt to parse PAN/Aadhaar QR formats if possible
        if "PAN" in raw_qr or "Permanent Account Number" in raw_qr:
            # Very basic extraction from QR text if it's plain text
            pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", raw_qr)
            if pan_match:
                results["qr_data"]["pan"] = pan_match.group(1)
        elif "<?xml" in raw_qr and "uid" in raw_qr:
             # Aadhaar Secure QR usually needs special decoding, but some are XML
             results["qr_data"]["type"] = "AADHAAR_XML"
    
    return results

def validate_mrz(text: str) -> bool:
    """
    Simple check for Passport MRZ pattern.
    """
    if not text: return False
    # Look for patterns like P<IND... or similar
    lines = text.split("\n")
    for line in lines:
        if len(line.strip()) >= 30 and ("<" in line):
            return True
    return False

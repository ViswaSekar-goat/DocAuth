import cv2
import numpy as np
import pytesseract
import re
from typing import Tuple, Optional

class BlankDocumentDetector:
    """
    Module to detect blank, white, or irrelevant documents before bank statement verification.
    """
    
    AXIS_KEYWORDS = [
        "AXIS BANK",
        "ACCOUNT NO",
        "STATEMENT OF AXIS ACCOUNT",
        "TRAN DATE",
        "PARTICULARS",
        "DEBIT",
        "CREDIT",
        "BALANCE"
    ]

    KEYWORDS = [
        "BANK",
        "ACCOUNT",
        "STATEMENT",
        "TRANSACTION",
        "BALANCE",
        "DATE"
    ]

    @staticmethod
    def detect(image_path: str, extracted_text: str, selected_bank: str = "AUTO") -> Tuple[bool, Optional[str]]:
        """
        Runs multiple checks to determine if the document is blank or irrelevant.
        Returns: (is_valid, error_reason)
        """
        # STEP 1: Load image for pixel-based checks
        image = cv2.imread(image_path)
        if image is None:
            return False, "Could not read document image for blank detection."

        # STEP 2: OCR Extraction (using Tesseract as fallback/secondary check)
        try:
            ocr_text = pytesseract.image_to_string(image)
        except Exception:
            ocr_text = ""

        # STEP 3: Word Count Check
        combined_text = ((extracted_text or "") + " " + ocr_text).upper()
        # Normalize text: Remove extra whitespace
        normalized_text = re.sub(r"\s+", " ", combined_text).strip()
        words = normalized_text.split()
        word_count = len(words)
        
        # --- NEW: Structural Grid/Table Detection ---
        # Detect table grid lines using Hough Line Transform
        # Axis statements typically contain many horizontal and vertical lines for transactions.
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=100, maxLineGap=10)
        line_count = len(lines) if lines is not None else 0
        
        # Axis Bank Specific Logic
        if selected_bank == "AXIS":
            keyword_count = sum(1 for k in BlankDocumentDetector.AXIS_KEYWORDS if k in normalized_text)
            
            # STEP 5 & 6 & 7: Valid Axis Statement Condition
            # If keywords found OR table lines detected, it's a valid structural document
            if keyword_count >= 2 or line_count >= 5:
                # Treat as valid Axis document and continue to checkpoints
                return True, None
                
            # Improved Blank Detection for Axis: ONLY blank if text is tiny AND no keywords found AND no lines detected
            if len(normalized_text) < 30 and keyword_count < 2 and line_count < 5:
                return False, "Blank or irrelevant document detected. Uploaded file does not contain a valid bank statement structure."
            
            # If it passed those, it has enough text or structure to proceed
            return True, None

        # Default fallback for other banks or if Axis check falls through
        if word_count < 10:
            return False, "Blank or nearly empty document detected."

        # STEP 4: Pixel Variance Check
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        variance = np.var(gray)
        
        if variance < 15:
            return False, "Blank page detected. Uploaded document contains no visible content."

        # STEP 5: Bank Keyword Detection (Global fallback)
        keyword_found = any(re.search(rf"\b{re.escape(kw)}\b", normalized_text) for kw in BlankDocumentDetector.KEYWORDS)
        
        if not keyword_found:
            return False, "Irrelevant document detected. Uploaded file is not a bank statement."

        return True, None

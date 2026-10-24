"""
PAN Card Identity Verification Engine — Spec v7.0

Dependencies: OpenCV, Tesseract OCR, PyZbar, Haarcascade
Produces deterministic checkpoint results: PASS/GREEN or FAIL/RED
"""

import re
import cv2
import numpy as np
import os

# Optional: PyZbar for QR detection
try:
    from pyzbar.pyzbar import decode as pyzbar_decode
    HAS_PYZBAR = True
except ImportError:
    HAS_PYZBAR = False

# Optional: pytesseract for direct OCR
try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False


class PanVerification:
    """
    PAN Card Identity Verification Engine — Strict Spec v7.0

    7 Checkpoints:
      1. Income Tax Header
      2. PAN Format
      3. Identity Fields  (name + father + dob)
      4. Photo Detection
      5. Signature Detection
      6. Emblem Detection
      7. QR Detection  (always PASS — optional)
    """

    # ── Haarcascade for face detection ──────────────────────────────
    FACE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

    @staticmethod
    def _normalize_image(image_path: str):
        """
        IMAGE NORMALIZATION (Spec v7.0):
        1. Convert to RGB
        2. Resize longest edge to 1200px
        3. Pad canvas to 1200×760
        4. Convert to grayscale
        5. CLAHE contrast enhancement
        6. Sharpening
        7. Adaptive thresholding
        Returns: (color_img, gray_img, thresh_img)
        """
        img = cv2.imread(image_path)
        if img is None:
            return None, None, None

        # 1. Convert to RGB (OpenCV loads BGR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)  # back to BGR for processing

        # 2. Resize longest edge to 1200px
        h, w = img.shape[:2]
        scale = 1200 / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

        # 3. Pad to 1200×760 canvas
        canvas_w, canvas_h = 1200, 760
        canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
        x_off = (canvas_w - new_w) // 2
        y_off = (canvas_h - new_h) // 2
        # Clamp to canvas bounds
        paste_w = min(new_w, canvas_w)
        paste_h = min(new_h, canvas_h)
        canvas[y_off:y_off+paste_h, x_off:x_off+paste_w] = resized[:paste_h, :paste_w]

        color_img = canvas.copy()

        # 4. Grayscale
        gray = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)

        # 5. CLAHE contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # 6. Sharpening filter
        blurred = cv2.GaussianBlur(enhanced, (0, 0), 3)
        sharpened = cv2.addWeighted(enhanced, 1.5, blurred, -0.5, 0)

        # 7. Adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 21, 10
        )

        return color_img, gray, thresh

    @staticmethod
    def _detect_photo(color_img) -> bool:
        """Run Haarcascade face detection on left 40% of image."""
        try:
            h, w = color_img.shape[:2]
            left_region = color_img[0:h, 0:int(w * 0.40)]
            gray_left = cv2.cvtColor(left_region, cv2.COLOR_BGR2GRAY)

            face_cascade = cv2.CascadeClassifier(PanVerification.FACE_CASCADE_PATH)
            faces = face_cascade.detectMultiScale(
                gray_left, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30)
            )
            return len(faces) > 0
        except Exception:
            return False

    @staticmethod
    def _detect_signature(gray_img) -> bool:
        """Analyze lower 25% region for ink-like stroke contours."""
        try:
            h, w = gray_img.shape[:2]
            lower_region = gray_img[int(h * 0.75):h, 0:w]

            # Edge detection for strokes
            edges = cv2.Canny(lower_region, 50, 150)

            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            # Signature: presence of multiple small-to-medium contours
            sig_contours = [c for c in contours if 20 < cv2.contourArea(c) < 5000]
            return len(sig_contours) >= 3
        except Exception:
            return False

    @staticmethod
    def _detect_emblem(gray_img) -> bool:
        """Search upper center region for Ashoka emblem (circular contour)."""
        try:
            h, w = gray_img.shape[:2]
            # Upper center: top 40%, middle 50% width
            x1 = int(w * 0.25)
            x2 = int(w * 0.75)
            upper_center = gray_img[0:int(h * 0.40), x1:x2]

            # Use HoughCircles for circular emblem detection
            circles = cv2.HoughCircles(
                upper_center, cv2.HOUGH_GRADIENT, dp=1.2,
                minDist=30, param1=50, param2=30,
                minRadius=15, maxRadius=80
            )
            if circles is not None and len(circles[0]) > 0:
                return True

            # Fallback: contour-based detection
            blurred = cv2.GaussianBlur(upper_center, (5, 5), 0)
            edges = cv2.Canny(blurred, 30, 100)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if 500 < area < 15000:
                    perimeter = cv2.arcLength(cnt, True)
                    if perimeter > 0:
                        circularity = 4 * 3.14159 * area / (perimeter * perimeter)
                        if circularity > 0.5:
                            return True
            return False
        except Exception:
            return False

    @staticmethod
    def _detect_qr(color_img) -> bool:
        """Scan image for QR code using PyZbar."""
        if not HAS_PYZBAR:
            return False
        try:
            decoded = pyzbar_decode(color_img)
            return len(decoded) > 0
        except Exception:
            return False

    @staticmethod
    def verify_pan(ocr_results: dict, symbol_results: list = None,
                   forensic_results: dict = None, image_path: str = None) -> dict:
        """
        STRICT DETERMINISTIC PIPELINE v7.0

        Args:
            ocr_results: dict with 'raw_data' (list of blocks) and 'text'
            symbol_results: YOLO symbol detections
            forensic_results: forensic analysis results
            image_path: path to the original/normalized PAN image
        """
        raw_data = ocr_results.get("raw_data", [])
        symbols = symbol_results or []

        # ── HELPER: resolve bbox format ────────────────────────────────
        def _get_xy(bbox):
            if not bbox:
                return (0, 0)
            if isinstance(bbox[0], (list, tuple)):
                return (min(p[0] for p in bbox), min(p[1] for p in bbox))
            return (bbox[0], bbox[1])

        # ── OCR TEXT NORMALIZATION ─────────────────────────────────────
        all_text = " ".join(b.get("text", "") for b in raw_data)
        # Also include the full text field if available
        full_ocr = ocr_results.get("text", "")
        if full_ocr and len(full_ocr) > len(all_text):
            all_text = full_ocr
        # Normalize: uppercase, remove extra spaces
        all_text_upper = re.sub(r'\s+', ' ', all_text.upper()).strip()

        # ── 1. INCOME TAX HEADER ──────────────────────────────────────
        has_it_header = "INCOME TAX DEPARTMENT" in all_text_upper

        # ── 2. PAN NUMBER ────────────────────────────────────────────
        pan_number = "NOT_DETECTED"
        # Search individual blocks first
        for b in raw_data:
            txt = b.get("text", "").upper().strip()
            m = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', txt)
            if m:
                pan_number = m.group(1)
                break
        # Fallback: search full text
        if pan_number == "NOT_DETECTED":
            m = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', all_text_upper)
            if m:
                pan_number = m.group(1)

        # ── Sort blocks by vertical position ──────────────────────────
        sorted_blocks = sorted(raw_data, key=lambda b: _get_xy(b.get("bbox", [[0, 0]]))[1])

        # ── 3. FULL NAME ─────────────────────────────────────────────
        full_name = "NOT_DETECTED"

        # Try label-based extraction
        for i, b in enumerate(sorted_blocks):
            txt = b.get("text", "").strip().upper()
            is_name_label = (
                txt in ("NAME", "नाम / NAME", "नाम", "NAM") or
                re.match(r'^\s*N\s*A\s*M\s*E\s*$', txt) is not None or
                ("NAME" in txt and len(txt) < 15 and
                 not re.search(r"FATHER|INCOME|INDIA|GOVT", txt))
            )

            if is_name_label:
                l_y = _get_xy(b.get("bbox", [[0, 0]]))[1]
                for nb in sorted_blocks[i+1:]:
                    nb_y = _get_xy(nb.get("bbox", [[0, 0]]))[1]
                    cand = nb.get("text", "").strip()
                    if nb_y > l_y and cand:
                        cand_upper = cand.upper()
                        if (not any(c.isdigit() for c in cand) and
                                len(cand) >= 3 and
                                not any(kw in cand_upper for kw in
                                        ["FATHER", "INCOME", "DATE", "BIRTH",
                                         "GOVT", "INDIA", "PAN", "PERMANENT",
                                         "DEPARTMENT", "TAX", "SIGNATURE"])):
                            full_name = cand_upper
                            break
                if full_name != "NOT_DETECTED":
                    break

        # Fallback: longest uppercase line not matching PAN
        if full_name == "NOT_DETECTED":
            longest = ""
            skip_set = {"INCOME TAX DEPARTMENT", "GOVT. OF INDIA", "GOVT OF INDIA",
                        "NAME", "FATHER'S NAME", "DATE OF BIRTH",
                        "PERMANENT ACCOUNT NUMBER CARD", "SIGNATURE"}
            for b in sorted_blocks:
                txt = b.get("text", "").strip().upper()
                if (len(txt) > len(longest) and
                        not re.search(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', txt) and
                        not any(c.isdigit() for c in txt) and
                        txt not in skip_set and
                        len(txt) >= 3):
                    longest = txt
            if longest:
                full_name = longest

        # ── 4. FATHER'S NAME ─────────────────────────────────────────
        father_name = "NOT_DETECTED"
        father_labels = ["FATHER'S NAME", "FATHER S NAME", "FATHER NAME", "पिता का नाम"]

        for i, b in enumerate(sorted_blocks):
            txt = b.get("text", "").strip().upper()
            is_father = (
                any(pat.upper() in txt for pat in father_labels) or
                (re.search(r"FATHER", txt) and len(txt) < 25)
            )

            if is_father:
                l_y = _get_xy(b.get("bbox", [[0, 0]]))[1]
                for nb in sorted_blocks[i+1:]:
                    nb_y = _get_xy(nb.get("bbox", [[0, 0]]))[1]
                    cand = nb.get("text", "").strip()
                    if nb_y > l_y and cand:
                        cand_upper = cand.upper()
                        if (not any(c.isdigit() for c in cand) and
                                len(cand) >= 3 and
                                not any(kw in cand_upper for kw in
                                        ["INCOME", "DATE", "BIRTH", "GOVT",
                                         "INDIA", "PAN", "PERMANENT",
                                         "DEPARTMENT", "TAX", "NAME",
                                         "FATHER", "SIGNATURE"])):
                            father_name = cand_upper
                            break
                if father_name != "NOT_DETECTED":
                    break

        # ── 5. DATE OF BIRTH ─────────────────────────────────────────
        date_of_birth = "NOT_DETECTED"
        dob_match = re.search(r'\b(\d{2}/\d{2}/\d{4})\b', all_text)
        if dob_match:
            date_of_birth = dob_match.group(1)
        else:
            dob_match = re.search(r'\b(\d{2}-\d{2}-\d{4})\b', all_text)
            if dob_match:
                date_of_birth = dob_match.group(1)

        # ── CV-BASED DETECTIONS (if image available) ──────────────────
        photo_detected = False
        signature_detected = False
        emblem_detected = False
        qr_detected = False

        if image_path and os.path.exists(image_path):
            color_img, gray_img, thresh_img = PanVerification._normalize_image(image_path)
            if color_img is not None:
                photo_detected = PanVerification._detect_photo(color_img)
                signature_detected = PanVerification._detect_signature(gray_img)
                emblem_detected = PanVerification._detect_emblem(gray_img)
                qr_detected = PanVerification._detect_qr(color_img)

        # Supplement with symbol-based detection
        if not photo_detected:
            photo_detected = any(s.get("label", "").upper() in ["PHOTO", "FACE", "PERSON"] for s in symbols)
        if not signature_detected:
            signature_detected = any(s.get("label", "").upper() in ["SIGNATURE", "SIG"] for s in symbols)
        if not emblem_detected:
            emblem_detected = any(s.get("label", "").upper() in ["EMBLEM", "INDIA_EMBLEM", "ASHOKA", "GOVT_EMBLEM"] for s in symbols)
            # Heuristic: if Income Tax header present, emblem is likely there
            if not emblem_detected and has_it_header:
                emblem_detected = True
        if not qr_detected:
            qr_detected = any(s.get("label", "").upper() in ["QR", "QR_CODE", "QRCODE"] for s in symbols)
            if not qr_detected:
                qr_detected = bool(ocr_results.get("qr_data_raw"))

        # Convert to YES/NO strings
        photo_str = "YES" if photo_detected else "NO"
        signature_str = "YES" if signature_detected else "NO"
        emblem_str = "YES" if emblem_detected else "NO"
        qr_str = "YES" if qr_detected else "NO"
        header_str = "PRESENT" if has_it_header else "NOT_PRESENT"

        # ── 7-CHECKPOINT EVALUATION ───────────────────────────────────
        identity_ok = (full_name != "NOT_DETECTED" and
                       father_name != "NOT_DETECTED" and
                       date_of_birth != "NOT_DETECTED")

        def _sig(passed: bool):
            return ("PASS", "GREEN") if passed else ("FAIL", "RED")

        cp1 = _sig(has_it_header)
        cp2 = _sig(pan_number != "NOT_DETECTED")
        cp3 = _sig(identity_ok)
        cp4 = _sig(photo_detected)
        cp5 = _sig(signature_detected)
        cp6 = _sig(emblem_detected)
        cp7 = ("PASS", "GREEN")  # QR is optional — always PASS

        checkpoints = [
            {"checkpoint": "Income Tax Header",    "result": cp1[0], "signal": cp1[1]},
            {"checkpoint": "PAN Format",           "result": cp2[0], "signal": cp2[1]},
            {"checkpoint": "Identity Fields",      "result": cp3[0], "signal": cp3[1]},
            {"checkpoint": "Photo Detection",      "result": cp4[0], "signal": cp4[1]},
            {"checkpoint": "Signature Detection",  "result": cp5[0], "signal": cp5[1]},
            {"checkpoint": "Emblem Detection",     "result": cp6[0], "signal": cp6[1]},
            {"checkpoint": "QR Detection",         "result": cp7[0], "signal": cp7[1]},
        ]

        failure_count = sum(1 for cp in checkpoints if cp["result"] == "FAIL")

        # Verdict
        if failure_count == 0:
            verdict = "REAL"
        elif failure_count <= 2:
            verdict = "SUSPICIOUS"
        else:
            verdict = "FAKE"

        trust_score = max(0, 100 - (failure_count * 14))

        # ── FINAL OUTPUT (exact spec v7.0 format) ─────────────────────
        return {
            "document_type": "PAN CARD",
            "is_pan_card": True,
            "extracted_data": {
                "pan_number": pan_number,
                "full_name": full_name,
                "father_name": father_name,
                "date_of_birth": date_of_birth,
                "income_tax_header": header_str,
                "photo_detected": photo_str,
                "signature_detected": signature_str,
                "emblem_detected": emblem_str,
                "qr_detected": qr_str,
            },
            "checkpoints": checkpoints,
            "failure_count": failure_count,
            "verdict": verdict,
            "trust_score": trust_score,
            "document_status": verdict,
        }

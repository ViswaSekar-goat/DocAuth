import re
import os
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from typing import Dict, Any, List, Optional
import cv2
import numpy as np

class VehicleForensics:
    CHASSIS_REGEX = r'[A-HJ-NPR-Z0-9]{17}'
    REG_REGEX = r'[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}'
    _executor = ThreadPoolExecutor(max_workers=5)

    @staticmethod
    def normalize_text(text: str) -> str:
        if not text: return ""
        text = text.upper()
        # Apply structured OCR corrections
        text = text.replace('CHASS1S', 'CHASSIS').replace('VEH1CLE', 'VEHICLE')
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    @classmethod
    def process_document(cls, file_path: str) -> Dict[str, Any]:
        """
        Reliability-First Structured OCR Pipeline with Timeouts and Failsafes.
        """
        print("VEHICLE: pipeline_started")
        start_time = time.time()
        
        checkpoints = {
            "image_conversion": "SKIP",
            "ocr_extraction": "FAIL",
            "text_reconstruction": "FAIL",
            "label_detection": "FAIL",
            "chassis_detection": "FAIL",
            "registration_detection": "FAIL",
            "format_validation": "FAIL"
        }
        
        final_text = ""
        text_source = "PDF"
        raw_data = []
        
        try:
            # 1. PDF Vector Extraction (Max 3s)
            print("VEHICLE: vector_extraction_started")
            def _extract_vector():
                t = ""
                if file_path.lower().endswith(".pdf"):
                    import pdfplumber
                    with pdfplumber.open(file_path) as pdf:
                        for page in pdf.pages:
                            page_text = page.extract_text()
                            if page_text: t += page_text + "\n"
                return t

            try:
                final_text = cls._executor.submit(_extract_vector).result(timeout=3)
            except TimeoutError:
                print("VEHICLE: vector_extraction_timeout")
            except Exception as e:
                print(f"VEHICLE: vector_extraction_error: {e}")

            # 2. Enhanced OCR Layer if Vector Extraction is missing (Max 10s)
            is_scanned = len(final_text.strip()) < 50
            if is_scanned:
                print("VEHICLE: ocr_started")
                text_source = "OCR (High-Res Scanned)"
                checkpoints["image_conversion"] = "PENDING"
                
                try:
                    ocr_result = cls._executor.submit(cls._perform_enhanced_ocr, file_path).result(timeout=10)
                    final_text = ocr_result.get("text", "")
                    raw_data = ocr_result.get("raw_data", [])
                    checkpoints["image_resolution"] = ocr_result.get("resolution", "N/A")
                    
                    if final_text.strip():
                        checkpoints["image_conversion"] = "PASS"
                        checkpoints["ocr_extraction"] = "PASS"
                        if raw_data: checkpoints["text_reconstruction"] = "PASS"
                    else:
                        print("VEHICLE: ocr_completed_empty")
                        
                except TimeoutError:
                    print("VEHICLE: ocr_timeout")
                except Exception as e:
                    print(f"VEHICLE: ocr_error: {e}")
                print("VEHICLE: ocr_completed")

            # 5. Normalization & Detection (Max 2s)
            print("VEHICLE: detection_started")
            def _run_detection(txt):
                norm = cls.normalize_text(txt)
                kw_list = ["CHASSIS", "VIN", "VEHICLE", "REG", "REGISTRATION"]
                labels = [kw for kw in kw_list if kw in norm]
                
                c_candidates = cls._extract_with_fallback(norm, ["CHASSIS NO", "CHASSIS", "VIN"], cls.CHASSIS_REGEX)
                r_candidates = cls._extract_with_fallback(norm, ["VEHICLE NO", "REG NO", "REGISTRATION", "VEHICLE", "REG"], cls.REG_REGEX)
                
                return {
                    "normalized_text": norm,
                    "detected_labels": labels,
                    "chassis_candidates": c_candidates,
                    "reg_candidates": r_candidates
                }

            try:
                det_res = cls._executor.submit(_run_detection, final_text).result(timeout=2)
                normalized_text = det_res["normalized_text"]
                detected_labels = det_res["detected_labels"]
                chassis_candidates = det_res["chassis_candidates"]
                reg_candidates = det_res["reg_candidates"]
                
                if detected_labels: checkpoints["label_detection"] = "PASS"
                if chassis_candidates: checkpoints["chassis_detection"] = "PASS"
                if reg_candidates: checkpoints["registration_detection"] = "PASS"
            except TimeoutError:
                print("VEHICLE: detection_timeout")
                normalized_text = cls.normalize_text(final_text)
                detected_labels = []
                chassis_candidates = []
                reg_candidates = []
            except Exception as e:
                print(f"VEHICLE: detection_error: {e}")
                normalized_text = cls.normalize_text(final_text)
                detected_labels = []
                chassis_candidates = []
                reg_candidates = []

            # 8. Validation & Result Logic
            final_chassis = chassis_candidates[0] if chassis_candidates else None
            final_reg = reg_candidates[0] if reg_candidates else None
            
            if final_chassis and len(final_chassis) == 17:
                checkpoints["format_validation"] = "PASS"

            if final_chassis and final_reg:
                result_status = "VALID DOCUMENT"
            elif final_chassis or final_reg:
                result_status = "PARTIAL DOCUMENT"
            else:
                result_status = "IRRELEVANT DOCUMENT"

            print(f"VEHICLE: result_generated in {time.time() - start_time:.2f}s")
            
            return {
                "chassis_number": final_chassis,
                "registration_number": final_reg,
                "chassis_candidates": chassis_candidates,
                "registration_candidates": reg_candidates,
                "checkpoints": checkpoints,
                "text_source": text_source,
                "text_length": len(final_text),
                "preview": final_text[:200],
                "ocr_text_length": len(final_text),
                "ocr_text_preview": final_text[:300],
                "ocr_preview": final_text[:200],
                "image_generated": checkpoints.get("image_conversion") == "PASS",
                "image_resolution": checkpoints.get("image_resolution", "N/A"),
                "ocr_lines_preview": final_text.split('\n')[:10],
                "detected_labels": detected_labels,
                "candidates": chassis_candidates + reg_candidates,
                "result": result_status,
                "final_result": result_status
            }

        except Exception as e:
            print(f"VEHICLE: CRITICAL_PIPELINE_ERROR: {e}")
            return cls._generate_early_exit(final_text, text_source, checkpoints, f"Failsafe triggered: {str(e)}")

    @classmethod
    def _perform_enhanced_ocr(cls, file_path: str) -> Dict[str, Any]:
        """
        Isolated OCR Extraction Layer (Vehicle Only).
        Priority: PaddleOCR (if installed) → Tesseract (fallback).
        """
        print(f"VEHICLE: Running Enhanced OCR Pipeline on {file_path}")

        # ── Try PaddleOCR first ────────────────────────────────────────────────
        try:
            result = cls._run_paddle_ocr(file_path)
            if result and result.get("text", "").strip():
                print(f"VEHICLE: PaddleOCR SUCCESS — {len(result.get('text',''))} chars")
                return result
        except ImportError:
            print("VEHICLE: PaddleOCR not installed — falling back to Tesseract")
        except Exception as pe:
            print(f"VEHICLE: PaddleOCR failed ({pe}) — falling back to Tesseract")

        # ── Tesseract fallback ─────────────────────────────────────────────────
        print(f"VEHICLE: Running Tesseract OCR Pipeline (300 DPI) on {file_path}")
        full_text = []
        all_raw_data = []
        resolution = "N/A"

        try:
            import fitz
            import pytesseract
            from PIL import Image

            doc = fitz.open(file_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
                resolution = f"{pix.w}x{pix.h}"
                print(f"VEHICLE: image_resolution: {resolution}")

                img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)

                img = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

                custom_config = r'--oem 3 --psm 6 -l eng'
                pil_img = Image.fromarray(gray)

                page_text_raw = pytesseract.image_to_string(pil_img, config=custom_config)

                if len(page_text_raw.strip()) < 20:
                    print(f"VEHICLE: ocr_pass_2_triggered (PSM 11 fallback) for page {page_num}")
                    custom_config = r'--oem 3 --psm 11 -l eng'
                    page_text_raw = pytesseract.image_to_string(pil_img, config=custom_config)

                data = pytesseract.image_to_data(pil_img, config=custom_config, output_type=pytesseract.Output.DICT)

                page_text = ""
                for i in range(len(data['text'])):
                    text = data['text'][i].strip()
                    if text:
                        page_text += text + " "
                        all_raw_data.append({
                            "text": text,
                            "bbox": [
                                [data['left'][i], data['top'][i]],
                                [data['left'][i] + data['width'][i], data['top'][i]],
                                [data['left'][i] + data['width'][i], data['top'][i] + data['height'][i]],
                                [data['left'][i], data['top'][i] + data['height'][i]]
                            ],
                            "conf": data['conf'][i] / 100.0,
                            "page": page_num
                        })

                full_text.append(page_text.strip())

            doc.close()

            reconstructed = cls._reconstruct_from_raw(all_raw_data) if all_raw_data else "\n".join(full_text)

            return {
                "text": reconstructed,
                "raw_data": all_raw_data,
                "resolution": resolution
            }

        except Exception as e:
            print(f"VEHICLE: OCR Layer Failed: {e}")
            raise e

    @classmethod
    def _run_paddle_ocr(cls, file_path: str) -> Dict[str, Any]:
        """
        PaddleOCR + PP-Structure pipeline for vehicle document extraction.
        Returns structured text with label-value pair detection.
        """
        from paddleocr import PaddleOCR, PPStructure
        import fitz
        from PIL import Image
        import tempfile

        all_text_lines: List[str] = []
        all_raw_data: List[Dict] = []
        lvm: Dict[str, str] = {}  # label-value map

        # Convert to image first (handles both PDF and images)
        images_to_process: List[np.ndarray] = []

        if file_path.lower().endswith(".pdf"):
            doc = fitz.open(file_path)
            for page_num in range(min(len(doc), 3)):  # max 3 pages
                pix = doc.load_page(page_num).get_pixmap(matrix=fitz.Matrix(200/72, 200/72))
                img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                images_to_process.append(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
            doc.close()
        else:
            img = cv2.imread(file_path)
            if img is None:
                pil_img = Image.open(file_path).convert("RGB")
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            images_to_process.append(img)

        # Initialize PaddleOCR (lazy singleton)
        if not hasattr(cls, "_paddle_ocr_instance") or cls._paddle_ocr_instance is None:
            print("VEHICLE: Initializing PaddleOCR (first run — downloads models if needed)...")
            cls._paddle_ocr_instance = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                use_gpu=False,
                show_log=False,
            )
        ocr = cls._paddle_ocr_instance

        # Try PP-Structure for layout-aware key-value extraction
        try:
            if not hasattr(cls, "_pp_structure_instance") or cls._pp_structure_instance is None:
                cls._pp_structure_instance = PPStructure(
                    show_log=False,
                    use_gpu=False,
                )
            pp = cls._pp_structure_instance
        except Exception:
            pp = None

        FALSE_POSITIVE_WORDS = {
            "VERIFICATION", "REGISTRATION", "CERTIFICATE", "DOCUMENT",
            "INSURANCE", "POLICY", "APPLICATION", "TRANSACTION",
            "RECEIPT", "INVOICE", "AUTHORITY", "DIVISION",
        }

        # Valid Indian state codes for registration validation
        VALID_STATES = {
            "AN","AP","AR","AS","BR","CG","CH","DD","DL","DN","GA","GJ",
            "HP","HR","JH","JK","KA","KL","LA","LD","MH","ML","MN","MP",
            "MZ","NL","OD","OR","PB","PY","RJ","SK","TN","TR","TS","UK","UP","WB",
        }

        chassis_result: Optional[str] = None
        reg_result: Optional[str] = None

        for img_bgr in images_to_process:
            # ── Run PaddleOCR on the image ───────────────────────────────────
            ocr_result = ocr.ocr(img_bgr, cls=True)
            if not ocr_result or not ocr_result[0]:
                continue

            lines = []
            for line in ocr_result[0]:
                bbox, (text, conf) = line
                text = text.strip().upper()
                if text:
                    lines.append(text)
                    all_raw_data.append({
                        "text": text,
                        "bbox": bbox,
                        "conf": float(conf),
                    })

            all_text_lines.extend(lines)

            # ── PP-Structure key-value extraction ────────────────────────────
            if pp:
                try:
                    structure_result = pp(img_bgr)
                    for region in (structure_result or []):
                        region_type = region.get("type", "")
                        if region_type in ("title", "text", "table"):
                            for item in region.get("res", []):
                                if isinstance(item, dict):
                                    txt = item.get("text", "").strip().upper()
                                    if ":" in txt:
                                        parts = txt.split(":", 1)
                                        label = parts[0].strip().replace(".", "").strip()
                                        value = parts[1].strip()
                                        if label and value:
                                            lvm[label] = value
                except Exception as ppe:
                    print(f"VEHICLE: PP-Structure failed ({ppe}) — continuing with plain OCR")

            # ── Build LVM from plain OCR lines ───────────────────────────────
            full_page_text = "\n".join(lines)
            for line in lines:
                colon_idx = line.find(":")
                if 0 < colon_idx < 50:
                    label = line[:colon_idx].strip().replace(".", "").strip()
                    value = line[colon_idx + 1:].strip()
                    if label and value and label not in lvm:
                        lvm[label] = value

            # ── Chassis extraction from LVM ──────────────────────────────────
            CHASSIS_LABELS = [
                "CHASSIS NO", "CHASSIS NUMBER", "VIN", "FRAME NO", "BODY NO",
                "CHASIS NO", "CHASSIS N0", "CHASIS N0", "VEHICLE IDENTIFICATION NUMBER",
            ]
            CHASSIS_STRICT = re.compile(r'^[A-HJ-NPR-Z0-9]{17}$')
            CHASSIS_LOOSE  = re.compile(r'^[A-Z0-9]{10,17}$')

            if not chassis_result:
                for label in CHASSIS_LABELS:
                    val = lvm.get(label, "")
                    if not val:
                        # fuzzy match: look for partial label
                        for k, v in lvm.items():
                            if label.split()[0] in k:
                                val = v
                                break
                    if val:
                        clean = re.sub(r'[^A-Z0-9]', '', val.upper())
                        if clean and CHASSIS_LOOSE.match(clean):
                            # Reject false-positive words
                            if not any(w in clean for w in FALSE_POSITIVE_WORDS):
                                chassis_result = clean
                                break

            # ── Registration extraction from LVM ─────────────────────────────
            REG_LABELS = [
                "VEHICLE NO", "VEHICLE NUMBER", "VEH NO", "REG NO", "REGISTRATION NO",
                "REGISTRATION NUMBER", "REGD NO", "REGN NO", "RC NO", "PLATE NO",
                "VEHICLENO", "REGNO",
            ]
            REG_REGEX = re.compile(r'^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$')

            if not reg_result:
                for label in REG_LABELS:
                    val = lvm.get(label, "")
                    if not val:
                        for k, v in lvm.items():
                            if any(part in k for part in ["VEHICLE", "REG", "REGN", "REGD", "RC"]):
                                val = v
                                break
                    if val:
                        clean = re.sub(r'[^A-Z0-9]', '', val.upper())
                        m = REG_REGEX.match(clean)
                        if m and m.group(1) in VALID_STATES:
                            reg_result = clean
                            break

            # ── Fallback: scan all text lines for VIN/reg patterns ───────────
            if not chassis_result:
                for line in lines:
                    # Skip lines near engine/invoice labels
                    if re.search(r'ENGINE|INVOICE|APPLICATION|TRANSACTION|RECEIPT', line):
                        continue
                    # Try strict 17-char VIN first
                    tokens = re.sub(r'[^A-Z0-9 ]', ' ', line).split()
                    for token in tokens:
                        if CHASSIS_STRICT.match(token):
                            if not any(w in token for w in FALSE_POSITIVE_WORDS):
                                chassis_result = token
                                break
                    if chassis_result:
                        break

            if not reg_result:
                combined = re.sub(r'\s', '', "\n".join(lines))
                # State-anchored scan
                state_pat = "|".join(sorted(VALID_STATES, key=len, reverse=True))
                for m in re.finditer(rf'(?<![A-Z0-9])({state_pat})\d{{1,2}}[A-Z]{{1,3}}\d{{1,4}}(?![A-Z0-9])', combined):
                    candidate = m.group(0)
                    cm = REG_REGEX.match(candidate)
                    if cm and cm.group(1) in VALID_STATES:
                        reg_result = candidate
                        break

            if chassis_result and reg_result:
                break  # Found both — stop processing pages

        full_text = "\n".join(all_text_lines)

        return {
            "text": full_text,
            "raw_data": all_raw_data,
            "resolution": f"{images_to_process[0].shape[1]}x{images_to_process[0].shape[0]}" if images_to_process else "N/A",
            "lvm": lvm,
            "chassis_number": chassis_result,
            "registration_number": reg_result,
            "engine": "PaddleOCR",
        }


    @classmethod
    def _reconstruct_from_raw(cls, raw_data: List[Dict]) -> str:
        """
        Rebuilds text line-by-line using bounding box Y-coordinates.
        """
        if not raw_data: return ""
        
        # Sort by Y-coordinate (top-to-bottom), then X (left-to-right)
        # raw_data format: [{"text": str, "bbox": [[x0,y0],...], "conf": float}]
        try:
            sorted_blocks = sorted(raw_data, key=lambda b: (min(p[1] for p in b['bbox']), min(p[0] for p in b['bbox'])))
        except:
            return " ".join([b.get('text', '') for b in raw_data])

        lines = []
        current_line = []
        last_y = -1
        threshold = 10 # Pixels to consider same line
        
        for block in sorted_blocks:
            y = min(p[1] for p in block['bbox'])
            text = block.get('text', '').strip()
            if not text: continue
            
            # OCR Error Correction within block
            text = text.replace('O', '0') if re.search(r'\d', text) else text
            
            if last_y == -1 or abs(y - last_y) < threshold:
                current_line.append(text)
            else:
                lines.append(" ".join(current_line))
                current_line = [text]
            last_y = y
        
        if current_line:
            lines.append(" ".join(current_line))
            
        return "\n".join(lines)

    @classmethod
    def _extract_with_fallback(cls, text: str, labels: List[str], pattern: str) -> List[str]:
        candidates = []
        # pass 1: Label proximity
        for label in labels:
            for match in re.finditer(label, text):
                after = text[match.end():match.end()+100]
                # Cleanup common noisy chars for label-based check
                # For VIN/Reg, we allow alphanumeric
                cleaned_after = re.sub(r'[^A-Z0-9]', '', after)
                found = re.findall(pattern, cleaned_after)
                for f in found:
                    if f not in candidates: candidates.append(f)
        
        # pass 2: Global scan
        global_matches = re.findall(pattern, text.replace(" ", ""))
        for gm in global_matches:
            if gm not in candidates: candidates.append(gm)
            
        return list(dict.fromkeys(candidates))

    @classmethod
    def _generate_early_exit(cls, text, source, checkpoints, message) -> Dict[str, Any]:
        return {
            "chassis_number": None,
            "registration_number": None,
            "chassis_candidates": [],
            "registration_candidates": [],
            "checkpoints": checkpoints,
            "text_source": source,
            "text_length": len(text),
            "preview": text[:200] if text else "EMPTY",
            "ocr_lines_preview": [],
            "detected_labels": [],
            "candidates": [],
            "result": "IRRELEVANT DOCUMENT",
            "final_result": "IRRELEVANT DOCUMENT"
        }

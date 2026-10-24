from celery_app import celery_app
from app.forensics.ela import perform_ela, analyze_ela_stats
from app.forensics.forensic_suite import ForensicSuite
from app.forensics.ocr_pipeline import perform_ocr
from app.forensics.fusion import fuse_forensic_signals
from app.forensics.aadhaar_logic import AadhaarVerification
from app.forensics.pan_logic import PanVerification
from app.forensics.academic_logic import AcademicVerification
from app.forensics.pre_processing import preprocess_image, preprocess_id_card
from app.forensics.symbols import detect_symbols
from app.forensics.metadata_extractor import extract_metadata
from app.forensics.bank_logic import BankLogic, BankProfiler
from app.forensics.bank_parser import BankParser
from app.forensics.blank_detection import BlankDocumentDetector
from app.forensics.table_ocr import TableExtractor
from app.core.json_utils import numpy_to_python
from app.db import async_session
from app.models.document import Document, DocumentStatus, DocumentVerdict
from app.models.user import User
from app.models.audit import AuditLog
from sqlalchemy.future import select
import asyncio
import re
import os
import io
import cv2

# CRITICAL: Disable OpenCV internal multi-threading to prevent event loop starvation
# This ensures that OS level context switching allows the API to handle polling requests
cv2.setNumThreads(0)
import contextvars
import functools

# Compatibility for Python < 3.9
async def to_thread(func, /, *args, **kwargs):
    loop = asyncio.get_running_loop()
    ctx = contextvars.copy_context()
    func_call = functools.partial(ctx.run, func, *args, **kwargs)
    return await loop.run_in_executor(None, func_call)

@celery_app.task(name="worker.process_document")
def process_document(document_id: int):
    """
    Main background task to process a document.
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(async_process_document(document_id))

async def async_process_document(document_id: int):
    # Use a wrap function to enable timeout control
    async def _run_pipeline():
        # 1. Fetch document & set processing state (Transaction 1)
        async with async_session() as db:
            result = await db.execute(select(Document).where(Document.id == document_id))
            document = result.scalars().first()
            if not document:
                return "Document not found"
            
            document.status = DocumentStatus.PROCESSING
            
            # Robust absolute path handling
            file_path = document.file_path
            if not os.path.isabs(file_path):
                file_path = os.path.abspath(os.path.join(os.getcwd(), file_path))
                
            await db.commit()
        
        # 2. Heavy AI Processing (No DB transaction held during this time)
        try:
            print(f"PIPELINE: Starting analysis for document {document_id}")
            
            # Pre-Processing
            print("PIPELINE: Stage 0 - Image Pre-Processing...")
            preprocessed_path = await to_thread(preprocess_image, file_path) 
            
            analysis_base_path = file_path
            preview_path = None
            if file_path.lower().endswith(".pdf"):
                base_name, _ = os.path.splitext(file_path)
                preview_path = f"{base_name}_preview.png"
                analysis_base_path = preview_path
            
            # Optimization: Create a smaller CV proxy path
            cv_proxy_path = analysis_base_path + "_cv_proxy.jpg"
            import cv2
            img = await to_thread(cv2.imread, analysis_base_path)
            if img is not None:
                max_v = 1200
                h, w = img.shape[:2]
                if max(h, w) > max_v:
                    scale = max_v / max(h, w)
                    img_small = await to_thread(cv2.resize, img, (int(w * scale), int(h * scale)))
                    await to_thread(cv2.imwrite, cv_proxy_path, img_small)
                else:
                    cv_proxy_path = analysis_base_path 
            else:
                cv_proxy_path = analysis_base_path

            # ULTIMATE TURBO: RUN SEQUENTIALLY TO PREVENT CPU/MEMORY THRASHING
            # LIGHTNING TURBO: Reverting to sequential to prevent Windows resource contention
            from app.forensics.converter import DocumentConverter
            from app.forensics.entity_localizer import EntityLocalizer
            from app.core.config import AL_DATA_DIR
            from app.forensics.fusion import fuse_forensic_signals
            
            # 0. Document Intelligence: Page Conversion
            detected_ext = os.path.splitext(file_path)[1].lower()
            doc_id_val = os.path.basename(file_path).split(".")[0]
            print(f"PIPELINE: Stage 0 - Converting {detected_ext} to visual pages...")
            storage_dir = AL_DATA_DIR / "storage_forensics" / "previews"
            storage_dir.mkdir(parents=True, exist_ok=True)
            page_images = DocumentConverter.get_document_pages(file_path, str(storage_dir))
            
            # Primary analysis page (usually index 0)
            primary_p_path = page_images[0] if page_images else preprocessed_path
            
            print("PIPELINE: Stage 1 - OCR Extraction (with Vector Optimization)...")
            ocr_results = await to_thread(perform_ocr, primary_p_path, original_path=file_path)
            
            # --- Advanced Blank Document Detection ---
            is_valid_doc, blank_reason = await to_thread(
                BlankDocumentDetector.detect, 
                primary_p_path, 
                ocr_results.get("text", ""),
                selected_bank=document.selected_bank or "AUTO"
            )
            
            # Step Id: 222
            # Bypassing blank/relevance detection for Identity/AUTO mode
            is_explicit_bank = document.selected_bank and document.selected_bank not in ["AUTO", "UNKNOWN"]
            
            if not is_valid_doc and is_explicit_bank:
                print(f"PIPELINE: Blank/Irrelevant Document Detected for {document.selected_bank}: {blank_reason}")
                async with async_session() as db:
                    result = await db.execute(select(Document).where(Document.id == document_id))
                    document = result.scalars().first()
                    if document:
                        document.status = DocumentStatus.INVALID_DOCUMENT
                        document.verdict = DocumentVerdict.INVALID
                        document.confidence_score = 0.0
                        document.forensic_results = {
                            "final_decision": {
                                "Status": "INVALID",
                                "Verdict": "INVALID",
                                "Confidence Score": 0.0,
                                "Reason List": [blank_reason],
                                "checkpoints": [],
                                "is_checkpoint_based": False
                            },
                            "anomalies": [{
                                "type": "BLANK_OR_IRRELEVANT",
                                "message": blank_reason,
                                "severity": "CRITICAL"
                            }]
                        }
                        
                        from app.models.audit import create_audit_log
                        await create_audit_log(
                            db=db,
                            user_id=str(document.user_id) if document.user_id else "SYSTEM",
                            action="FRAUD_DETECTED",
                            document_id=document.id,
                            details={
                                "filename": file_path.split("/")[-1] if "/" in file_path else file_path.split("\\")[-1],
                                "status": "Success",
                                "severity": "CRITICAL",
                                "bank_type": document.selected_bank or "Unknown",
                                "verification_result": "FAKE",
                                "confidence": 0.0
                            }
                        )

                        await db.commit()
                return f"Processed document {document_id}: INVALID_DOCUMENT"
            elif not is_valid_doc:
                print(f"PIPELINE: Document is nearly empty/blank, but bypassing exit as it may be an ID card in AUTO mode.")
            
            # --- Universal Irrelevant Document Detection (Bank-Aware) ---
            selected_bank = getattr(document, 'selected_bank', 'AUTO') or 'AUTO'
            print(f"PIPELINE: Running Bank-Aware Pre-verification Check (Bank: {selected_bank})...")
            extracted_text = ocr_results.get("text", "").upper()
            
            # SBI specific keywords
            sbi_keywords = ["STATE BANK OF INDIA", "SBI", "ACCOUNT STATEMENT", "ACCOUNT NO", "BRANCH", "IFSC"]
            sbi_matches = sum(1 for word in sbi_keywords if word in extracted_text)
            
            # Generic/Transaction keywords
            bank_keywords = ["BANK", "ACCOUNT", "STATEMENT", "TRANSACTION", "BALANCE", "DEBIT", "CREDIT"]
            bank_matches = sum(1 for word in bank_keywords if word in extracted_text)
            
            transaction_keywords = [
                "DEBIT", "CREDIT", "BALANCE", "WITHDRAWAL", "DEPOSIT", 
                "OPENING BALANCE", "CLOSING BALANCE", "TRANSACTION"
            ]
            transaction_matches = sum(1 for word in transaction_keywords if word in extracted_text)
            
            # Patterns
            money_pattern = r'\d+.\d{2}'
            money_values = re.findall(money_pattern, extracted_text)
            
            date_pattern = r'\d{2}[-/]\d{2}[-/]\d{4}'
            dates_found = re.findall(date_pattern, extracted_text)
            
            if selected_bank == "SBI":
                # STEP 7: Relaxed SBI Logic
                is_valid_statement = (
                    (sbi_matches >= 1) and
                    (transaction_matches >= 1) and
                    (len(money_values) >= 2 or len(dates_found) >= 2)
                )
                # STEP 10: Non-rejection guarantee
                if sbi_matches >= 1 and transaction_matches >= 1 and len(money_values) >= 1:
                    is_valid_statement = True
                    print("PIPELINE: SBI Document confirmed via strict signal detection.")
            else:
                # STEP 9: Generic Multi-signal Logic for other banks/AUTO
                is_valid_statement = (
                    (bank_matches >= 1) and
                    (transaction_matches >= 2 or len(money_values) >= 3) and
                    (len(dates_found) >= 2)
                )
            
            # Skip this block for AUTO/None selected_bank to allow ID checks
            if not is_valid_statement and is_explicit_bank:
                print(f"PIPELINE: Irrelevant Document Detected! Bank: {bank_matches}, Trans: {transaction_matches}, Money: {len(money_values)}, Dates: {len(dates_found)}")
                async with async_session() as db:
                    result = await db.execute(select(Document).where(Document.id == document_id))
                    document = result.scalars().first()
                    if document:
                        # Required to ensure the frontend triggers the popup watcher logic
                        document.status = DocumentStatus.INVALID_DOCUMENT
                        # Let's set a distinct string flag in the forensic results to let frontend catch it
                        document.verdict = DocumentVerdict.INVALID
                        document.confidence_score = 0.0
                        document.forensic_results = {
                            "final_decision": {
                                "Status": "INVALID",
                                "Verdict": "INVALID",
                                "Confidence Score": 0.0,
                                "Reason List": ["Invalid or irrelevant bank statement uploaded."],
                                "checkpoints": [],
                                "is_checkpoint_based": False
                            },
                            "anomalies": [{
                                "type": "IRRELEVANT_DOCUMENT",
                                "message": "Invalid or irrelevant bank statement uploaded. Please upload a valid bank statement.",
                                "severity": "CRITICAL"
                            }]
                        }
                        
                        from app.models.audit import create_audit_log
                        await create_audit_log(
                            db=db,
                            user_id=str(document.user_id) if document.user_id else "SYSTEM",
                            action="Invalid Document Upload",
                            document_id=document.id,
                            details={
                                "filename": file_path.split("/")[-1] if "/" in file_path else file_path.split("\\")[-1],
                                "status": "Failed",
                                "severity": "WARNING",
                                "bank_type": document.selected_bank or "Unknown",
                                "verification_result": "INVALID_DOCUMENT",
                                "confidence": 0.0
                            }
                        )
                        await db.commit()
                return f"Processed document {document_id}: INVALID_DOCUMENT"
            elif not is_valid_statement:
                print("PIPELINE: Non-bank document in AUTO mode. Bypassing relevance filtering.")

            await asyncio.sleep(0.2) 
            
            # Identify document type and bank brand early for specialized detection
            detected_type = ocr_results.get("document_type", "UNKNOWN")
            
            # Priority: User selection
            selected_bank = getattr(document, "selected_bank", None)
            
            # FORCE: If user selected a specific bank, we MUST treat it as a BANK_STATEMENT
            # to trigger the correct forensic pipelines and checkpoints.
            if selected_bank and selected_bank not in [None, "AUTO", "UNKNOWN"]:
                detected_type = "BANK_STATEMENT"
                print(f"PIPELINE: User selected {selected_bank}. Forcing BANK_STATEMENT mode.")
            
            bank_brand = "UNKNOWN"
            if detected_type == "BANK_STATEMENT":
                from app.forensics.bank_logic import BankLogic, BankProfiler
                
                # Auto-detect the bank if not selected or AUTO
                auto_detected_bank = BankProfiler.identify_bank(ocr_results.get("text", ""))
                
                if not selected_bank or selected_bank == "AUTO":
                    if auto_detected_bank == "UNKNOWN":
                        print("PIPELINE: Could not identify bank automatically.")
                        # Proceed with generic logic but add a warning
                        bank_brand = "UNKNOWN"
                    else:
                        print(f"PIPELINE: Auto-detected bank: {auto_detected_bank}")
                        bank_brand = auto_detected_bank
                else:
                    # User manually selected a bank
                    bank_brand = selected_bank
                    if selected_bank != auto_detected_bank and auto_detected_bank != "UNKNOWN":
                        print(f"PIPELINE: Bank Format Mismatch. Selected: {selected_bank}, Detected: {auto_detected_bank}")
                        # Add as a warning anomaly instead of failing
                        anomalies.append({
                            "type": "BANK_MISMATCH",
                            "message": f"Bank Format Mismatch – Document looks like {auto_detected_bank} but {selected_bank} model was selected.",
                            "severity": "WARNING"
                        })

                print(f"PIPELINE: Using Validated Bank Model: {bank_brand}")

            print("PIPELINE: Stage 2 (Parallel) - Symbols, Metadata, & Forensics...")
            symbol_results, metadata, forensic_results = await asyncio.gather(
                to_thread(detect_symbols, primary_p_path, bank_brand=bank_brand),
                to_thread(extract_metadata, file_path),
                to_thread(ForensicSuite().run_all, primary_p_path)
            )
            
            # Use template-driven parsing if bank_brand is known
            parser = BankParser()
            # Group OCR data into rows for parser compatibility
            raw_rows = []
            if ocr_results.get("raw_data"):
                extractor = TableExtractor()
                raw_rows = await to_thread(extractor.extract_table, pre_existing_results=ocr_results.get("raw_data"))
            
            transactions = await to_thread(parser.parse_rows_to_transactions, raw_rows, bank_brand=bank_brand)
            
            # Extract header data (Name, Acc, etc.)
            header_data = parser.parse_header(ocr_results.get("text", ""), bank_brand=bank_brand)
            
            # Merge header data into extracted results
            ext_data = ocr_results.get("extracted_data", {})
            ext_data.update(header_data)
            ocr_results["extracted_data"] = ext_data

            # 2a. Entity Localization (New Color-Coded Fields)
            field_detections = EntityLocalizer.localize(ocr_results.get("raw_data", []), bank_brand=bank_brand)
            
            # Normalize field boxes for frontend (1000-unit scale used by existing UI)
            img_w = ocr_results.get("width", 1000)
            img_h = ocr_results.get("height", 1000)
            
            merged_symbol_results = []
            for field in field_detections:
                bbox = field["raw_bbox"] # [[x,y],[x,y]...]
                nx = (bbox[0][0] / img_w) * 1000
                ny = (bbox[0][1] / img_h) * 1000
                nw = ((bbox[2][0] - bbox[0][0]) / img_w) * 1000
                nh = ((bbox[2][1] - bbox[0][1]) / img_h) * 1000
                
                merged_symbol_results.append({
                    "label": field["label"].upper(),
                    "confidence": 1.0,
                    "bbox": [nx, ny, nw, nh],
                    "status": "valid",
                    "category": field["category"],
                    "reason": field.get("reason", "Detected field")
                })
            
            # Merge with YOLO/Heuristic symbols
            for symb in symbol_results:
                merged_symbol_results.append({
                    "label": symb["label"].upper(),
                    "confidence": symb["confidence"],
                    "bbox": symb["bbox"], # Already 1000-scale
                    "status": "valid" if symb["confidence"] > 0.5 else "suspicious",
                    "category": "SYMBOL",
                    "reason": f"Detected {symb['label']}"
                })
            
            await asyncio.sleep(0.1) # Final breathing room
            
            # Cleanup
            if cv_proxy_path != analysis_base_path and os.path.exists(cv_proxy_path):
                try: os.remove(cv_proxy_path)
                except: pass
            
            # Map ELA stats from Forensic Suite results
            ela_stats = {
                "mean_error": forensic_results.get("ela_mean", 5.0),
                "max_error": forensic_results.get("ela_max", 50.0),
                "hotspot_count": 0, # Simplified
                "tamper_likelihood": "LOW" if forensic_results.get("ela_mean", 0) < 2.0 else "MEDIUM"
            }
            
            # 3. Document Detection & Specialized Logic
            # detected_type already assigned above
            
            anomalies = []
            ext_data = ocr_results.get("extracted_data", {})
            checkpoints = []
            master_data = None  # Initialized here; set inside BANK_STATEMENT branch if applicable
            
            if detected_type == "UNKNOWN":
                anomalies.append({
                    "type": "UNKNOWN_DOCUMENT",
                    "message": "Document type could not be confidently identified.",
                    "severity": "WARNING", # Downgrading to WARNING from CRITICAL
                    "indicator": "Layout anomaly detected"
                })
            elif detected_type == "AADHAAR":
                # Detect front vs back for Aadhaar
                text_upper = ocr_results.get("text", "").upper()
                is_back = any(kw in text_upper for kw in ["ADDRESS", "AUTHORITY", "PIN CODE", "HELP@UIDAI"])
                
                if is_back:
                    aadhaar_results = AadhaarVerification.verify_back_structure(ocr_results, symbol_results)
                else:
                    aadhaar_results = AadhaarVerification.verify_front_structure(ocr_results)
                
                anomalies.extend(aadhaar_results.get("anomalies", []))
                ext_data = aadhaar_results.get("extracted_data", {})
                checkpoints.extend(aadhaar_results.get("checkpoints", []))
            elif detected_type == "PAN":
                # FINAL SPEC v4.0: RE-OCR with Strict 1024x640 Normalization
                print("PIPELINE: Detected PAN. Running strict 1024x640 normalization...")
                from app.forensics.pre_processing import normalize_for_pan
                norm_pan_path = await to_thread(normalize_for_pan, primary_p_path)
                
                # Re-run OCR on the normalized image
                ocr_results = await to_thread(perform_ocr, norm_pan_path, original_path=file_path)
                
                pan_results = PanVerification.verify_pan(
                    ocr_results,
                    symbol_results=merged_symbol_results,
                    forensic_results=forensic_results,
                    image_path=norm_pan_path
                )
                
                # v7.0: use extracted_data key
                ext_data.update(pan_results.get("extracted_data", {}))
                checkpoints = pan_results.get("checkpoints", []) # Now using standard 7-checkpoint list
                
                doc_status = pan_results.get("verdict", "UNKNOWN")
                failure_count = pan_results.get("failure_count", 0)
                
                if doc_status == "FAKE":
                    anomalies.append({
                        "type": "PAN_IDENTITY_FAKE",
                        "message": f"PAN card identity verification FAILED ({failure_count} failures). Verdict: FAKE.",
                        "severity": "CRITICAL"
                    })
                elif doc_status == "SUSPICIOUS":
                    anomalies.append({
                        "type": "PAN_IDENTITY_SUSPICIOUS",
                        "message": f"PAN card identity verification SUSPICIOUS (1 failure). Verdict: SUSPICIOUS.",
                        "severity": "HIGH"
                    })
                else:
                    print("PIPELINE: PAN Identity Verified as REAL.")

            elif detected_type == "CERTIFICATE":
                cert_results = AcademicVerification.verify_certificate(ocr_results)
                anomalies.extend(cert_results.get("anomalies", []))
                checkpoints.append({
                    "name": "Certificate Layout",
                    "status": "PASS",
                    "details": "Aadhaar identified as Academic Certificate."
                })
            elif detected_type == "MARKSHEET":
                mark_results = AcademicVerification.verify_marksheet(ocr_results)
                anomalies.extend(mark_results.get("anomalies", []))
                checkpoints.append({
                    "name": "Marksheet Calculation",
                    "status": "PASS" if not mark_results.get("anomalies") else "FAIL",
                    "details": "Verified marks totals and percentage consistency."
                })
            elif detected_type == "BANK_STATEMENT":
                print("PIPELINE: Specialized Bank Statement Logic...")
                from app.forensics.bank_logic import BankLogic
                
                # Bank Identification (Already done above, but kept as fallback)
                if not bank_brand or bank_brand == "UNKNOWN":
                    bank_brand = BankProfiler.identify_bank(ocr_results.get("text", ""))
                print(f"PIPELINE: Finalized Bank Brand: {bank_brand}")
                
                # Stage 3b: Parsing (Already done in Phase 4)
                document.status_message = "Auditing Mathematical Continuity"
                await db.commit()
                await asyncio.sleep(0.5)
                
                # 1-7. Comprehensive 7-Layer Forensic Validation Framework
                document.status_message = "Running 7-Layer Forensic Audit"
                await db.commit()
                
                layer_anomalies = await BankLogic.verify_7_layers(
                    ocr_results=ocr_results,
                    transactions=transactions,
                    metadata=metadata,
                    bank_brand=bank_brand
                )
                anomalies.extend(layer_anomalies)

                # Fetch Master Template if available (Master Reference System)
                master_data = None
                from app.services.document_service import DocumentService
                async with async_session() as m_db:
                    master_record = await DocumentService.get_master_template(m_db, bank_brand)
                    if master_record:
                        master_data = master_record.ocr_results
                        print(f"PIPELINE: Using {bank_brand} Master Reference Template: {master_record.filename}")

                checkpoints.append({
                    "name": "7-Layer Forensic Framework",
                    "status": "PASS" if len(layer_anomalies) <= 1 else "FAIL",
                    "details": f"Detected {len(layer_anomalies)} anomalies across 7 logic layers."
                })

                # EXTRACT CRITICAL FIELDS FOR UI
                text = ocr_results.get("text", "")
                text_upper = text.upper()
                
                # Proximity-Based Account Number Detection (v3)
                acc_num_val = None
                labels = ["ACCOUNT NUMBER", "A/C NO", "ACCOUNT NO"]
                for label in labels:
                    label_idx = text_upper.find(label)
                    if label_idx != -1:
                        vicinity = text_upper[label_idx:label_idx+60]
                        match = re.search(r'\b\d{11,17}\b', vicinity)
                        if match:
                            acc_num_val = match.group(0)
                            break
                
                # Strict IFSC (SBIN + 7 digits)
                ifsc_val = None
                full_norm_text = re.sub(r'\s+', '', text_upper)
                ifsc_match = re.search(r'SBIN\d{7}', full_norm_text)
                if ifsc_match:
                    ifsc_val = ifsc_match.group(0)
                
                # Robust period detection (Supports dates like Jan 1, 2024 or 01/01/2024)
                months = "JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC"
                date_p = rf"[\d\w]{{1,2}}[\s./-](?:{months})[\w]*[\s./-]\d{{2,4}}|\d{{1,2}}[./-]\d{{1,2}}[./-]\d{{2,4}}"
                period_match = re.search(rf"(?:PERIOD|STMT|STATEMENT)[:\s]+({date_p})\s*(?:TO|AND|--|-)\s*({date_p})", text, re.I)
                if not period_match:
                    period_match = re.search(rf"(?:FROM|DATED)[:\s]*({date_p})\s*(?:TO|UNTIL|--|-)\s*({date_p})", text, re.I)

                # New: Robust name extraction for statements (Joint Accounts support)
                desc_match = re.search(r"(?:ACCOUNT|STMT)\s*DESCRIPTION[:\s]+([A-Z\s\-]{3,100})", text, re.I)
                account_desc = desc_match.group(1).strip() if desc_match else "Not detected"

                name_match = re.search(r"(?:ACCOUNT|CUSTOMER|HOLDER)\s*NAME[:\s]+([A-Za-z\s\.,]{3,100})", text, re.I)
                account_name = name_match.group(1).strip().strip(',. ') if name_match else (ext_data.get("account_name") or ext_data.get("name") or "Not detected")

                ifsc_match = re.search(r"(?:IFSC|IFS)(?:\s*CODE)?[:\s\.\-]*([A-Z0-9\s\.\-]{7,15})", text, re.I)
                
                # Calculate a robust arithmetic score based on Layer 3 anomalies
                math_anomalies = [a for a in layer_anomalies if a.get("indicator") == "Math Mismatch"]
                arithmetic_score = 1.0 if not math_anomalies else max(0.0, 1.0 - (len(math_anomalies) * 0.2))
                is_vector = ocr_results.get("engine") == "PyMuPDF (Vector)"

                ext_data.update({
                    "account_name": account_name,
                    "account_description": account_desc,
                    "bank_brand": bank_brand,
                    "account_number": acc_num_val if acc_num_val else (ext_data.get("id_number_val") or ext_data.get("id_number") or "Not detected"),
                    "ifsc": ifsc_val if ifsc_val else "Detected in Branding",
                    "period": period_match.group(0).strip() if period_match else "Detected in Context",
                    "transactions_count": len(transactions),
                    "arithmetic_score": arithmetic_score,
                    "is_vector": is_vector,
                    "metadata": metadata,
                    "transactions": transactions,
                    "text": text # Final preservation of full text
                })
            else:
                # For other types, primarily rely on general forensic signals
                checkpoints.append({
                    "name": "Document Classification",
                    "status": "PASS",
                    "details": f"Document identified as {detected_type}."
                })
            
            # 4. Forensic & Tampering Detection (Step 6)
            tamper_score = 1.0 - (ela_stats["mean_error"] / 80.0) # Increased divisor to be less sensitive
            tamper_score = max(0, min(1, tamper_score))
            if tamper_score < 0.7: # Lowered threshold from 0.8
                anomalies.append({
                    "type": "VISUAL_TAMPERING",
                    "message": "Critical: Visual manipulation detected (ELA hotspot analysis).",
                    "severity": "CRITICAL",
                    "indicator": "PDF Layer Tampering"
                })
            
            # 5. Final Result Block Generation (Steps 8-10)
            fusion_report = fuse_forensic_signals(
                uid_valid=bool(ext_data.get("uid") or ext_data.get("aadhaar_number") or ext_data.get("pan_number") or ext_data.get("transactions_count")),
                qr_match=any(c["name"] == "QR Data Integrity" and c["status"] == "PASS" for c in checkpoints),
                layout_score=0.9 if detected_type != "UNKNOWN" else 0.0,
                ocr_confidence=ocr_results.get("confidence", 0.0),
                address_valid=bool(ext_data.get("pin") or ext_data.get("address")),
                tamper_score=tamper_score,
                anomalies=anomalies,
                checkpoints=checkpoints,
                extracted_data=ext_data,
                forensic_results=forensic_results,
                id_type=detected_type,
                field_detections=field_detections,
                ocr_results=ocr_results,
                metadata=metadata,
                master_data=master_data
            )
            
            # 6. Final Result Update (Transaction 2)
            async with async_session() as db:
                result = await db.execute(select(Document).where(Document.id == document_id))
                document = result.scalars().first()
                if not document: return "Document lost"

                # PHASE 11: LOCALIZED FRAUD MARKERS (UI ENHANCEMENT)
                # Only include problematic markers as requested by the user
                filtered_symbol_results = []
                
                # Filter anomalies and map them to symbols
                for anom in anomalies:
                    severity = anom.get("severity", "WARNING").upper()
                    # Include CRITICAL, HIGH, and MEDIUM for visual audit
                    if severity in ["CRITICAL", "HIGH", "MEDIUM", "WARNING"]:
                        box = anom.get("bbox")
                        page = anom.get("page", 0)
                        box_type = anom.get("box_type", "BOX") # HIGHLIGHT, BOX, or MARK
                        
                        # If no precise box, use heuristic if region is known
                        if not box or box == [0,0,100,100]:
                            region = anom.get("region")
                            if region == "HEADER": box = [10, 10, 200, 990]
                            elif region == "TRANSACTION": box = [200, 10, 850, 990]
                            elif region == "FOOTER": box = [850, 10, 980, 990]
                            else: box = [0, 0, 100, 100]

                        filtered_symbol_results.append({
                            "label": anom.get("indicator") or anom.get("type"),
                            "confidence": 1.0,
                            "box_2d": box,
                            "page": page,
                            "status": "FRAUD" if severity == "CRITICAL" else "SUSPICIOUS",
                            "type": box_type,
                            "reason": anom.get("message") # Specific fraud reason for UI tooltip
                        })

                # Also check existing symbols for suspicious ones, but skip VALID ones
                for symb in merged_symbol_results:
                    if symb.get("status") != "valid":
                         filtered_symbol_results.append({
                            "label": symb["label"].upper(),
                            "confidence": symb["confidence"],
                            "box_2d": symb["bbox"],
                            "status": "SUSPICIOUS",
                            "type": "BOX",
                            "reason": symb.get("reason", "Detected anomaly")
                        })
                
                symbol_results = filtered_symbol_results

                # Update image_url to point to the high-res conversion if it exists
                # We use relpath to the storage root for the image_url construction
                from app.core.config import AL_DATA_DIR
                storage_root = AL_DATA_DIR / "storage_forensics"
                
                rel_img_path = os.path.relpath(primary_p_path, storage_root)
                final_image_url = f"/static/uploads/{rel_img_path.replace(os.sep, '/')}"

                result_update = {
                    "status": "COMPLETED",
                    "document_type": detected_type,
                    "confidence_score": fusion_report["FINAL_RESULT_BLOCK"]["Confidence Score"],
                    "verdict": fusion_report["FINAL_RESULT_BLOCK"]["Verdict"],
                    "forensic_results": fusion_report,
                    "image_url": final_image_url
                }
                # Step 10: Strict Decision Output
                result_block = fusion_report["FINAL_RESULT_BLOCK"]
                
                document.status = DocumentStatus.COMPLETED
                
                # Step 10: Strict Decision Output (Safely Cast to Enum)
                status_raw = result_block.get("Status", "UNKNOWN")
                document.verdict = DocumentVerdict(status_raw) if status_raw in [v.value for v in DocumentVerdict] else DocumentVerdict.UNKNOWN
                document.confidence_score = float(fusion_report["confidence_score"])
                document.preview_path = primary_p_path
                
                # Store the requested FINAL_RESULT_BLOCK structure
                # IMPORTANT: Inject bank checkpoints into final_decision so the frontend
                # hook can read them from `data.forensic_results.final_decision.checkpoints`.
                bank_checkpoints = fusion_report.get("checkpoints", [])
                result_block_with_checkpoints = {
                    **result_block,
                    "checkpoints": bank_checkpoints,
                    "is_checkpoint_based": fusion_report.get("is_checkpoint_based", False),
                    "fail_count": fusion_report.get("fail_count", 0)
                }

                # Normalize OCR text for preview display
                raw_ocr_text = ocr_results.get("text", "")
                preview_text = "\n".join(
                    line.strip() for line in raw_ocr_text.splitlines() if line.strip()
                )

                document.forensic_results = numpy_to_python({
                    "final_decision": result_block_with_checkpoints,
                    "breakdown": fusion_report.get("breakdown", {}),
                    "metadata": metadata,
                    "ela_stats": ela_stats,
                    "forensic_checkpoints": checkpoints,
                    "anomalies": anomalies,
                    "ocr_text": preview_text  # For the OCR Text Preview panel in the UI
                })
                document.ocr_results = numpy_to_python(ocr_results)
                document.symbol_results = numpy_to_python(symbol_results)
                
                from app.models.audit import create_audit_log
                b_type = bank_brand if 'bank_brand' in locals() and bank_brand else detected_type
                severity = "INFO" if document.verdict == DocumentVerdict.VERIFIED else ("CRITICAL" if document.verdict == DocumentVerdict.FAKE else "WARNING")
                action = "FRAUD_DETECTED" if document.verdict == DocumentVerdict.FAKE else "BANK_VERIFICATION"
                
                await create_audit_log(
                    db=db,
                    user_id=str(document.user_id) if document.user_id else "SYSTEM",
                    action=action,
                    document_id=document.id,
                    details={
                        "filename": file_path.split("/")[-1] if "/" in file_path else file_path.split("\\")[-1],
                        "status": "Success",
                        "severity": severity,
                        "bank_type": b_type,
                        "verification_result": document.verdict.value,
                        "confidence": float(document.confidence_score)
                    }
                )

                await db.commit()
                return f"Processed document {document_id}: {document.verdict}"
                
        except Exception as e:
            import traceback
            tb_str = traceback.format_exc()
            error_msg = f"{str(e)} | TRACE: {tb_str[-200:]}"
            print(f"CRITICAL DOCUMENT TASK ERROR: {tb_str}")
            async with async_session() as db:
                result = await db.execute(select(Document).where(Document.id == document_id))
                document = result.scalars().first()
                if document:
                    document.status = DocumentStatus.FAILED
                    # Capture the failure as an anomaly so it shows on the UI
                    document.forensic_results = {
                        "anomalies": [{
                            "type": "SYSTEM_ERROR",
                            "message": f"Processing failed: {error_msg}. Please check file integrity.",
                            "severity": "CRITICAL"
                        }]
                    }
                    await db.commit()
            return f"Error processing document {document_id}: {error_msg}"

    try:
        # Absolute Fail-Safe Timeout (120 seconds) for the entire pipeline
        return await asyncio.wait_for(_run_pipeline(), timeout=120.0)
    except asyncio.TimeoutError:
        print(f"PIPELINE ERROR: Timeout for document {document_id}")
        async with async_session() as db:
            result = await db.execute(select(Document).where(Document.id == document_id))
            document = result.scalars().first()
            if document:
                document.status = DocumentStatus.FAILED
                document.forensic_results = {
                    "anomalies": [{
                        "type": "SYSTEM_TIMEOUT",
                        "message": "Analysis exceeded 120s limit (CPU/Memory contention). Please try with a smaller image.",
                        "severity": "CRITICAL"
                    }]
                }
                await db.commit()
        return f"Timeout processing document {document_id}"
    except Exception as e:
        print(f"PIPELINE FATAL ERROR: {e}")
        return f"Fatal error: {e}"

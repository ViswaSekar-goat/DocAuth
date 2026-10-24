import re
from datetime import datetime
from .specialized import VerificationModules

class AadhaarVerification:
    @staticmethod
    def verify_uid_format(uid: str) -> bool:
        clean_uid = "".join(uid.split())
        return len(clean_uid) == 12 and clean_uid.isdigit()

    @staticmethod
    def verify_front_structure(ocr_results: dict) -> dict:
        text = ocr_results.get("text", "")
        anomalies = []
        extracted_data = {}
        
        # 1. Document Type Check (Implicitly Aadhaar if we found these markers)
        aadhaar_markers = ["GOVERNMENT OF INDIA", "BHARAT SARKAR", "UNIQUE IDENTIFICATION"]
        is_aadhaar = any(m.lower() in text.lower() for m in aadhaar_markers)
        
        # 2. Name Check (Strict 2-60 alphabets)
        name_match = re.search(r"([A-Za-z ]{2,60})", text)
        if name_match:
            name = name_match.group(1).strip()
            extracted_data["name"] = name
            if not re.fullmatch(r"[A-Za-z ]{2,60}", name):
                anomalies.append({
                    "type": "INVALID_NAME",
                    "message": "Invalid name format detected. Alphabets and spaces only (2-60 chars).",
                    "severity": "HIGH",
                    "indicator": "Layout deviation"
                })
        
        # 3. DOB Check (Step 4B)
        dob_match = re.search(r"DOB:?\s*(\d{2}/\d{2}/\d{4})", text, re.IGNORECASE)
        if dob_match:
            dob_str = dob_match.group(1)
            extracted_data["dob"] = dob_str
            try:
                dob_date = datetime.strptime(dob_str, "%d/%m/%Y")
                today = datetime.now()
                
                if dob_date > today:
                    anomalies.append({
                        "type": "FUTURE_DOB",
                        "message": "Invalid date of birth. Future date detected.",
                        "severity": "CRITICAL",
                        "indicator": "DOB logical failure"
                    })
                
                age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
                if not (0 <= age <= 120):
                    anomalies.append({
                        "type": "INVALID_AGE",
                        "message": f"Invalid date of birth. Age ({age}) must be between 0-120.",
                        "severity": "CRITICAL",
                        "indicator": "DOB logical failure"
                    })
            except ValueError:
                anomalies.append({
                    "type": "INVALID_DOB_FORMAT",
                    "message": "Invalid date of birth. Format must be DD/MM/YYYY.",
                    "severity": "CRITICAL",
                    "indicator": "DOB logical failure"
                })
        else:
            anomalies.append({
                "type": "DOB_MISSING",
                "message": "Aadhaar DOB not detected or unreadable.",
                "severity": "HIGH",  # Downgrading to HIGH from CRITICAL
                "indicator": "Missing mandatory section"
            })

        # 4. Gender Check (Step 4C)
        gender_match = re.search(r"(Male|Female|Transgender)", text, re.IGNORECASE)
        if gender_match:
            gender = gender_match.group(1).upper()
            extracted_data["gender"] = gender
            if gender not in ["MALE", "FEMALE", "TRANSGENDER"]:
                anomalies.append({
                    "type": "INVALID_GENDER",
                    "message": "Invalid gender value. Must be MALE, FEMALE, or TRANSGENDER.",
                    "severity": "CRITICAL",
                    "indicator": "Gender validation failure"
                })
        else:
             anomalies.append({
                "type": "GENDER_MISSING",
                "message": "Gender not detected or unreadable.",
                "severity": "HIGH",  # Downgrading to HIGH from CRITICAL
                "indicator": "Missing mandatory section"
            })
            
        # 5. Aadhaar Number Mathematical Validation (Step 4A)
        # Exactly 12 digits, Numeric only, Valid Verhoeff checksum
        uid_match = re.search(r"(\d{4}\s\d{4}\s\d{4})|(\d{12})", text)
        if uid_match:
            uid = uid_match.group(0).replace(" ", "")
            extracted_data["uid"] = uid
            if not uid.isdigit() or len(uid) != 12:
                anomalies.append({
                    "type": "INVALID_UID_STRUCTURE",
                    "message": "Aadhaar number must be exactly 12 numeric digits.",
                    "severity": "CRITICAL",
                    "indicator": "Format Validation"
                })
            elif uid[0] in ['0', '1']:
                anomalies.append({
                    "type": "INVALID_FIRST_DIGIT",
                    "message": "Aadhaar number cannot start with 0 or 1.",
                    "severity": "CRITICAL",
                    "indicator": "First Digit Check"
                })
            elif not VerificationModules.validate_aadhaar(uid):
                anomalies.append({
                    "type": "CHECKSUM_FAILED",
                    "message": "Invalid Aadhaar number (Verhoeff checksum failure).",
                    "severity": "CRITICAL",
                    "indicator": "Checksum failure"
                })
        else:
            anomalies.append({
                "type": "UID_MISSING",
                "message": "Aadhaar number missing or unreadable.",
                "severity": "HIGH",  # Downgrading to HIGH from CRITICAL
                "indicator": "Checksum failure"
            })
            
        return {
            "is_valid": len(anomalies) == 0,
            "anomalies": anomalies,
            "extracted_data": extracted_data,
            "side": "FRONT"
        }

    @staticmethod
    def verify_back_structure(ocr_results: dict, symbol_results: list = None, front_data: dict = None) -> dict:
        text = ocr_results.get("text", "")
        qr_raw = ocr_results.get("qr_data", "")
        anomalies = []
        extracted_data = {}
        checkpoints = []
        
        # 1. Government Anchors (Strict textual verification)
        anchors = ["GOVERNMENT OF INDIA", "BHARAT SARKAR", "UNIQUE IDENTIFICATION AUTHORITY OF INDIA"]
        found_anchors = [a for a in anchors if a.lower() in text.lower()]
        
        checkpoints.append({
            "name": "Institutional Anchors",
            "status": "PASS" if len(found_anchors) >= 1 else "FAIL",
            "details": f"Found {len(found_anchors)} of {len(anchors)} official anchors."
        })
        
        if len(found_anchors) < 1:
            anomalies.append({
                "type": "ANCHORS_MISSING",
                "message": "Document missing mandatory institutional markers (Government of India).",
                "severity": "HIGH",  # Downgrading to HIGH from CRITICAL
                "indicator": "Layout anomaly detected"
            })

        # 2. QR Code Integrity Check (Step 4D)
        has_qr_symbol = any(s.get("label") == "QR_CODE" for s in symbol_results) if symbol_results else False
        
        if not has_qr_symbol and not qr_raw:
             anomalies.append({
                "type": "QR_MISSING",
                "message": "Authentic cards have QR codes. None detected.",
                "severity": "WARNING",
                "indicator": "QR Code Present"
            })
        elif qr_raw:
            # Step 4D: Decode and match with OCR
            match_count = 0
            if front_data:
                target_uid = front_data.get("uid", "")
                target_name = front_data.get("name", "")
                
                if target_uid and target_uid in qr_raw.replace(" ", ""):
                    match_count += 1
                else:
                    anomalies.append({
                        "type": "QR_UID_MISMATCH",
                        "message": "Aadhaar number in QR code does not match printed number.",
                        "severity": "CRITICAL",
                        "indicator": "QR mismatch or tampering"
                    })
                
                if target_name and any(part.lower() in qr_raw.lower() for part in target_name.split()):
                    match_count += 1
            
            checkpoints.append({
                "name": "QR Data Integrity",
                "status": "PASS" if match_count >= 1 else "FAIL",
                "details": "QR data matches printed information." if match_count >= 1 else "QR data mismatch detected."
            })
        else:
             anomalies.append({
                "type": "QR_UNREADABLE",
                "message": "QR detected but failed to decode successfully.",
                "severity": "HIGH",
                "indicator": "QR mismatch or tampering"
            })

        # 3. Address & PIN Presence
        pin_match = re.search(r"\D(\d{6})\D", text)
        if pin_match:
            pin = pin_match.group(1)
            extracted_data["pin"] = pin
            if not (11 <= int(pin[:2]) <= 85):
                anomalies.append({
                    "type": "INVALID_PIN_GEO",
                    "message": "PIN code geographical area mismatch detected.",
                    "severity": "HIGH",
                    "indicator": "Data inconsistency"
                })
        else:
             anomalies.append({
                "type": "PIN_MISSING",
                "message": "6-digit PIN code not detected in address block.",
                "severity": "HIGH",
                "indicator": "Missing mandatory section"
            })

        # 4. Footer & Contact Consistency
        mandatory_footer = ["1947", "help@uidai.gov.in", "www.uidai.gov.in"]
        missing_contacts = [c for c in mandatory_footer if c not in text.lower()]
        
        if missing_contacts:
            anomalies.append({
                "type": "LAYOUT_ANOMALY",
                "message": f"Layout inconsistency. Missing mandatory metadata: {', '.join(missing_contacts)}",
                "severity": "MEDIUM",
                "indicator": "Layout anomaly detected"
            })
            
        return {
            "is_valid": len(anomalies) == 0,
            "anomalies": anomalies,
            "extracted_data": extracted_data,
            "checkpoints": checkpoints,
            "side": "BACK"
        }

from typing import List, Optional
from app.forensics.ml_engine import ForensicMLEngine

# Initialize the ML Engine globally for performance
ml_engine = ForensicMLEngine()

def calculate_weighted_score(
    uid_valid: bool = False,
    uid_digits: int = 0,
    dob_valid: bool = False,
    qr_readable: bool = False,
    qr_match: bool = False,
    emblem_present: bool = False,
    header_present: bool = False,
    footer_present: bool = False,
    spelling_correct: bool = True,
    placement_correct: bool = True,
    back_qr_present: bool = False,
    address_order_correct: bool = True,
    footer_has_1947: bool = False,
    footer_has_email: bool = False,
    footer_has_website: bool = False,
    ocr_consistent: bool = True,
    editing_artifacts: bool = False,
    blur_detected: bool = False,
    anomalies: list = None
) -> dict:
    """
    Calculate confidence score using error-based penalty system.
    
    Returns:
        dict with verdict, confidence_score, detected_issues, and breakdown
    """
    
    base_score = 100.0
    detected_issues = []
    
    # === CRITICAL CHECKS (40% weight) ===
    critical_penalties = 0
    
    if not uid_valid or uid_digits != 12:
        critical_penalties += 40
        detected_issues.append("Aadhaar number not exactly 12 digits")
    
    if not dob_valid:
        critical_penalties += 25
        detected_issues.append("Invalid DOB format or impossible date")
    
    if not qr_readable or not qr_match:
        critical_penalties += 35
        detected_issues.append("QR code unreadable or data mismatch")
    
    if not emblem_present:
        critical_penalties += 20
        detected_issues.append("Missing government emblem")
    
    # === STRUCTURAL LAYOUT CHECKS (25% weight) ===
    structural_penalties = 0
    
    if not header_present or not footer_present:
        structural_penalties += 15
        detected_issues.append("Missing header or footer")
    
    if not spelling_correct:
        structural_penalties += 10
        detected_issues.append("Spelling mistakes detected")
    
    if not placement_correct:
        structural_penalties += 10
        detected_issues.append("Wrong element placement")
    
    # === BACK-SIDE VALIDATION (20% weight) ===
    backside_penalties = 0
    
    if not back_qr_present:
        backside_penalties += 15
        detected_issues.append("QR code missing on back side")
    
    if not address_order_correct:
        backside_penalties += 10
        detected_issues.append("Address order incorrect (should be regional → English)")
    
    footer_issues = []
    if not footer_has_1947:
        footer_issues.append("1947")
    if not footer_has_email:
        footer_issues.append("help@uidai.gov.in")
    if not footer_has_website:
        footer_issues.append("www.uidai.gov.in")
    
    if footer_issues:
        backside_penalties += 10
        detected_issues.append(f"Footer info incorrect: missing {', '.join(footer_issues)}")
    
    # === FRAUD/TAMPERING DETECTION (15% weight) ===
    tampering_penalties = 0
    
    if not ocr_consistent:
        tampering_penalties += 15
        detected_issues.append("OCR inconsistency detected")
    
    if editing_artifacts:
        tampering_penalties += 15
        detected_issues.append("Editing artifacts found")
    
    if blur_detected:
        tampering_penalties += 10
        detected_issues.append("Blur or screenshot artifacts detected")
    
    # === CALCULATE FINAL SCORE ===
    total_penalties = (
        critical_penalties + 
        structural_penalties + 
        backside_penalties + 
        tampering_penalties
    )
    
    final_score = max(0, base_score - total_penalties)
    
    # === DETERMINE VERDICT ===
    # Strict override: If tamper score is too low or critical issues found
    if total_penalties >= 40 or tampering_penalties >= 15:
        verdict = "FAKE"
        confidence_label = "High Risk - Forensic Anomalies Detected"
    elif final_score >= 85:
        verdict = "VERIFIED"
        confidence_label = "High Confidence"
    elif final_score >= 60:
        # User wants REAL or FAKE. SUSPICIOUS is closer to FAKE in terms of automated trust.
        verdict = "FAKE" 
        confidence_label = "Manual Review Needed"
    else:
        verdict = "FAKE"
        confidence_label = "Low Confidence"
    
    # === PROCESS ANOMALIES ===
    if anomalies:
        for anomaly in anomalies:
            issue_text = anomaly.get("message") or anomaly.get("type")
            if issue_text and issue_text not in detected_issues:
                detected_issues.append(issue_text)
    
    return {
        "verdict": verdict,
        "confidence_score": round(final_score / 100, 4),  # Convert to 0-1 scale
        "confidence_percentage": round(final_score, 1),
        "confidence_label": confidence_label,
        "detected_issues": detected_issues,
        "breakdown": {
            "critical_penalties": critical_penalties,
            "structural_penalties": structural_penalties,
            "backside_penalties": backside_penalties,
            "tampering_penalties": tampering_penalties,
            "total_penalties": total_penalties,
            "base_score": base_score,
            "final_score": final_score,
            "forensic_integrity": round(final_score / 100, 4)
        }
    }


def calculate_weighted_result(score: float) -> dict:
    """
    New Authenticity Result Logic:
    85% – 100%: Likely Genuine
    70% – 84%: Needs Manual Review
    50% – 69%: Suspicious
    Below 50%: Likely Fraudulent
    """
    if score >= 85:
        return {"label": "Likely Genuine", "decision": "genuine", "status": "PASSED"}
    elif score >= 70:
        return {"label": "Needs Manual Review", "decision": "suspicious", "status": "WARNING"}
    elif score >= 50:
        return {"label": "Suspicious", "decision": "suspicious", "status": "FAILED"}
    else:
        return {"label": "Likely Fraudulent", "decision": "tampered", "status": "FAILED"}

def calculate_strict_scoring(anomalies: list, bank_brand: str = None, ocr_results: dict = None, metadata: dict = None, transactions: list = None, master_data: Optional[dict] = None, id_type: str = "UNKNOWN", checkpoints: list = None) -> dict:
    """
    Revised logic: If bank_brand is provided, use Weighted Checkpoint Model.
    If id_type is PAN, use the Checklist result.
    Otherwise, fallback to standard subtractive scoring.
    """
    from app.forensics.bank_logic import BankLogic
    
    # 1. SPECIALIZED BANK LOGIC
    if bank_brand and bank_brand != "UNKNOWN" and id_type == "BANK_STATEMENT":
        weighted_res = BankLogic.calculate_weighted_fraud_score(
            anomalies=anomalies,
            metadata=metadata or {},
            text=ocr_results.get("text", "") if ocr_results else "",
            bank_brand=bank_brand,
            ocr_results=ocr_results or {},
            transactions=transactions or [],
            master_data=master_data
        )
        score = weighted_res["score"]
        
        if weighted_res.get("is_checkpoint_based"):
            verdict = weighted_res["verdict"] # REAL, SUSPICIOUS, or FAKE
            
            label_map = {"REAL": "Real", "GENUINE": "Real", "SUSPICIOUS": "Suspicious", "FAKE": "Fake"}
            decision_map = {"REAL": "REAL", "GENUINE": "REAL", "SUSPICIOUS": "SUSPICIOUS", "FAKE": "FAKE"}
            
            return {
                "authenticity_score": score,
                "confidence_label": label_map.get(verdict, verdict),
                "final_decision": decision_map.get(verdict, "FAKE"),
                "is_valid": verdict in ["REAL", "GENUINE"],
                "checkpoints": weighted_res.get("checkpoints", []),
                "is_checkpoint_based": True,
                "fail_count": weighted_res.get("fail_count", 0)
            }

    # 2. SPECIALIZED IDENTITY LOGIC (PAN)
    if id_type == "PAN" and checkpoints:
        # Count FAILED checkpoints — pan_logic now emits both status_legacy="VALID"/"FAILED"
        # and status="pass"/"fail". Use status_legacy for compat, fall back to status.
        def _cp_failed(cp):
            # v7.0 uses 'result' (PASS/FAIL)
            res = cp.get("result", "")
            if res:
                return res == "FAIL"
            # v6.0 uses 'signal' (PASS/FAIL)
            sig = cp.get("signal", "")
            if sig == "FAIL":
                return True
            # Legacy fallbacks
            legacy = cp.get("status_legacy", "")
            if legacy:
                return legacy == "FAILED"
            return cp.get("status", "") in ("fail", "FAILED")

        fail_count  = sum(1 for cp in checkpoints if _cp_failed(cp))
        total_score = sum(cp.get("score", 0) for cp in checkpoints)

        if fail_count == 0:
            verdict = "REAL"
            label = "Real"
        elif fail_count == 1:
            verdict = "SUSPICIOUS"
            label = "Suspicious"
        else:
            verdict = "FAKE"
            label = "Fake"

        return {
            "authenticity_score": total_score,
            "confidence_label": label,
            "final_decision": verdict,
            "is_valid": verdict == "REAL",
            "checkpoints": checkpoints,
            "is_checkpoint_based": True,
            "fail_count": fail_count
        }

    # 3. Standard Fallback (Non-Specialized)
    score = 100
    severity_map = {"CRITICAL": 30, "HIGH": 20, "MEDIUM": 10, "LOW": 5}
    for anom in anomalies:
        score -= severity_map.get(anom.get("severity", "MEDIUM").upper(), 10)
    
    score = max(0, min(100, score))
    res = calculate_weighted_result(score)
    
    return {
        "authenticity_score": score,
        "confidence_label": res["label"],
        "final_decision": res["decision"],
        "is_valid": res["decision"] == "genuine"
    }

def fuse_forensic_signals(
    uid_valid: bool = False,
    qr_match: bool = False,
    layout_score: float = 0.0,
    ocr_confidence: float = 0.0,
    address_valid: bool = False,
    tamper_score: float = 0.0,
    anomalies: list = None,
    checkpoints: list = None,
    extracted_data: dict = None,
    forensic_results: dict = None,
    id_type: str = "Aadhaar",
    field_detections: list = None,
    ocr_results: dict = None,
    metadata: dict = None,
    master_data: dict = None
) -> dict:
    """
    Final Output Format (User Requirement Match).
    """
    all_anomalies = (anomalies or []).copy()
    
    # Convert forensic results to anomalies
    if forensic_results and forensic_results.get('ela_detected'):
        all_anomalies.append({
            "type": "PDF_LAYER_TAMPERING",
            "message": "Critical: PDF layer tampering / ELA detected",
            "severity": "CRITICAL",
            "indicator": "PDF Layer Tampering"
        })

    # NEW SCORING
    scoring_result = calculate_strict_scoring(
        all_anomalies, 
        bank_brand=(extracted_data.get("bank_brand") if id_type == "BANK_STATEMENT" else None),
        ocr_results=ocr_results,
        metadata=metadata,
        transactions=extracted_data.get("transactions", []),
        master_data=master_data,
        id_type=id_type,
        checkpoints=checkpoints
    )
    
    # MAP TO USER JSON FORMAT
    detected_anoms = []
    for anom in all_anomalies:
        detected_anoms.append({
            "type": anom.get("type", "Unknown Anomaly"),
            "severity": anom.get("severity", "MEDIUM"),
            "location": anom.get("region") or [0,0,0,0]
        })

    # ML INTERFACING (Preserve for consistency, but scoring logic wins)
    ml_result = ml_engine.predict({
        "math_consistency": 1.0 if not any(a.get("indicator") == "Math Mismatch" for a in all_anomalies) else 0.0,
        "metadata_trust": 1.0 if not any(a.get("indicator") == "Metadata Tampering" for a in all_anomalies) else 0.0
    })

    # UI Compatibility: Build Fraud Indicators from checkpoints
    # For PAN/identity docs, build from pipeline_results so the UI shows 7 identity rows.
    # For bank statements, use the legacy 4-layer bank categories.
    if id_type == "PAN" and checkpoints:
        ui_indicators = []
        for cp in checkpoints:
            # v7.0 uses 'result' (PASS/FAIL) and 'signal' (GREEN/RED)
            res = cp.get("result", "")
            if res:
                passed = res == "PASS"
            else:
                sig = cp.get("signal", "")
                if sig in ("PASS", "GREEN"):
                    passed = True
                elif sig in ("FAIL", "RED"):
                    passed = False
                else:
                    legacy = cp.get("status_legacy", "")
                    new_s  = cp.get("status", "")
                    passed = (legacy == "VALID") if legacy else (new_s in ("pass", "VALID"))
            ui_indicators.append({
                "label":       cp.get("checkpoint", cp.get("name", "Checkpoint")),
                "status":      "PASSED" if passed else "FAILED",
                "message":     cp.get("detail", cp.get("finding", "PASS" if passed else "FAIL")),
                "category_id": cp.get("category", "TAMPER")
            })
    else:
        ui_indicators = [
            {"label": "Structural Integrity (Layer 2)", "status": "PASSED", "message": "No structural anomalies.", "category_id": "STRUCTURAL"},
            {"label": "Logical Continuity (Layer 3)", "status": "PASSED", "message": "Math and continuity verified.", "category_id": "LOGICAL"},
            {"label": "Format Standardisation (Layer 7)", "status": "PASSED", "message": "Standard bank format confirmed.", "category_id": "FORMAT"},
            {"label": "Digital Forensics (Layers 1,4,5,6)", "status": "PASSED", "message": "Metadata and ELA confirmed.", "category_id": "FORENSIC"}
        ]

        for anom in all_anomalies:
            cat = anom.get("category", "FORENSIC").upper()
            for indicator in ui_indicators:
                if indicator["category_id"] == cat:
                    indicator["status"] = "FAILED"
                    indicator["message"] = anom.get("message")
                    indicator["region"] = anom.get("region")

    final_block = {
      "authenticity_score": scoring_result["authenticity_score"],
      "confidence_label": scoring_result["confidence_label"],
      "detected_anomalies": detected_anoms,
      "tamper_heatmap": True,
      "final_decision": scoring_result["final_decision"],
      
      # UI Support
      "Status": scoring_result["final_decision"].upper(),
      "Verdict": scoring_result["final_decision"].upper(),
      "Confidence Score": scoring_result["authenticity_score"] / 100,
      "ML Anomaly Score": ml_result.get("anomaly_score", 0.0),
      "ML Class Prob": ml_result.get("ml_score", 0.0),
      "Reason List": [a["message"] for a in all_anomalies] if all_anomalies else ["No anomalies detected"],
      "Fraud Indicators": ui_indicators,
      "Extracted Text": (
          {
              # ── BANK STATEMENT FIELDS ──────────────────────────────────────────
              "Document Name": extracted_data.get("bank_brand", "Unknown Bank"),
              "Document Type": id_type,
              "Account / ID": extracted_data.get("account_number") or "Not detected",
              "Account Holder": (
                  extracted_data.get("account_name") or
                  extracted_data.get("name") or "Not detected"
              ),
              "IFSC Code": extracted_data.get("ifsc") or "Not detected",
              "Branch": extracted_data.get("branch") or "Not detected",
              "Statement Period": extracted_data.get("period") or "Current Cycle",
              "CIF / CRN Number": (
                  extracted_data.get("cif") or
                  extracted_data.get("crn") or "Not detected"
              ),
              "Opening Balance": str(extracted_data.get("opening_balance", "")) or "Not detected",
              "Closing Balance": str(extracted_data.get("closing_balance", "")) or "Not detected",
              "Total Transactions": str(len(extracted_data.get("transactions", []))),
              "Full Text Preview": (extracted_data.get("text") or "Not detected")[:5000],
          }
          if id_type == "BANK_STATEMENT"
          else {
              # ── IDENTITY DOCUMENT FIELDS ────────────────────────────────────────
              "Document Name": (
                  "PAN Card" if id_type == "PAN"
                  else extracted_data.get("bank_brand", "Document")
              ),
              "Document Type": id_type,
              "Account / ID": (
                  extracted_data.get("id_number") or
                  extracted_data.get("pan_number") or "Not detected"
              ),
              "Customer Name": (
                  extracted_data.get("name") or
                  extracted_data.get("account_name") or "Not detected"
              ),
              "Father's Name": extracted_data.get("father_name") or "Not detected",
              "Date of Birth": extracted_data.get("dob") or "Not detected",
              "Gender": extracted_data.get("gender") or "Not detected",
              "Photo Detected": extracted_data.get("photo_detected") or "Not detected",
              "Signature Detected": extracted_data.get("signature_detected") or "Not detected",
              "QR Detected": extracted_data.get("qr_detected") or "Not detected",
              "Emblem Detected": extracted_data.get("emblem_detected") or "Not detected",
              "Issuing Authority": extracted_data.get("issuing_authority") or "Not detected",
              "Full Text Preview": (extracted_data.get("text") or "Not detected")[:5000],
          }
      ),
      "BoundingBoxes": field_detections or [],
      "checkpoints": scoring_result.get("checkpoints", []),
      "extracted_fields": extracted_data or {},
      "is_checkpoint_based": scoring_result.get("is_checkpoint_based", False)
    }

    return {
        "FINAL_RESULT_BLOCK": final_block,
        "verdict": scoring_result["final_decision"],
        "is_valid": scoring_result["is_valid"],
        "confidence_score": float(scoring_result["authenticity_score"] / 100),
        "ml_details": ml_result,
        "fraud_indicators": ui_indicators,
        "checkpoints": scoring_result.get("checkpoints", []),
        "is_checkpoint_based": scoring_result.get("is_checkpoint_based", False),
        "fail_count": scoring_result.get("fail_count", 0)
    }

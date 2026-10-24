import sys, os, json
sys.path.append(os.path.abspath("."))
from app.forensics.pan_logic import PanVerification

def test_final_spec():
    print("=" * 60)
    print("  PAN CARD PIPELINE — FINAL SPEC TEST (v3)")
    print("  Weights: Pre:5  Class:20  OCR:15  Rule:20  Forensic:15  Fraud:25")
    print("=" * 60)

    # --- Perfect card ---
    print("\n[TEST 1] Perfect PAN — Expected: REAL (100/100)")
    ocr = {
        "text": "INCOME TAX DEPARTMENT GOVT. OF INDIA ANITA VARSHNEY RAKESH VARSHNEY 25/08/1991 ANVPV1234A",
        "confidence": 0.95,
        "extracted_data": {"name": "ANITA VARSHNEY", "father_name": "RAKESH VARSHNEY",
                           "dob": "25/08/1991", "pan_number": "ANVPV1234A"},
        "qr_data": {"pan": "ANVPV1234A", "name": "ANITA VARSHNEY", "dob": "25/08/1991"}
    }
    sym = [{"label": "PHOTO"}, {"label": "SIGNATURE"}, {"label": "QR"}, {"label": "EMBLEM"}]
    fore = {"ela_mean": 3.0, "ela_max": 20.0}

    r = PanVerification.verify_pan(ocr, sym, fore)
    print(f"  document_type  : {r['document_type']}")
    print(f"  pan_number     : {r['pan_number']}")
    print(f"  holder_type    : {r['holder_type']}")
    print(f"  qr_location    : {r['qr_location']}")
    print(f"  total_score    : {r['trust_score']} / {r['max_score']}")
    print(f"  status         : {r['document_status']}")
    print()
    for cp in r["pipeline_results"]:
        print(f"    {cp['ui_icon']} {cp['stage']:<24} +{cp['score']}/{cp['max_score']}")
    assert r["document_status"] == "REAL", f"Expected REAL, got {r['document_status']}"
    assert r["trust_score"] == 100
    print("  ✓ PASSED\n")

    # --- Missing photo/signature → fraud_detection fails (-25) → score 75 → SUSPICIOUS ---
    print("[TEST 2] Missing Photo+Signature — Expected: SUSPICIOUS (75/100)")
    sym2 = [{"label": "EMBLEM"}, {"label": "QR"}]
    r2 = PanVerification.verify_pan(ocr, sym2, fore)
    print(f"  total_score    : {r2['trust_score']} / {r2['max_score']}")
    print(f"  status         : {r2['document_status']}")
    fraud_cp2 = next(cp for cp in r2["pipeline_results"] if cp["stage"] == "Fraud Detection")
    assert fraud_cp2["status"] == "FAILED"
    assert r2["document_status"] == "SUSPICIOUS", f"Expected SUSPICIOUS got {r2['document_status']}"
    assert r2["trust_score"] == 75
    print("  ✓ PASSED\n")

    # --- Fake card — no PAN card indicators, bad OCR ---
    print("[TEST 3] Junk document — Expected: FAKE (< 70)")
    ocr3 = {"text": "HELLO WORLD RANDOM TEXT", "confidence": 0.1, "extracted_data": {}, "qr_data": None}
    r3 = PanVerification.verify_pan(ocr3, [], {})
    print(f"  trust_score    : {r3['trust_score']} / {r3['max_score']}")
    print(f"  status         : {r3['document_status']}")
    assert r3["document_status"] == "FAKE"
    print("  ✓ PASSED\n")

    # --- QR mismatch → fraud_detection fails ---
    print("[TEST 4] QR PAN Mismatch — Expected: fraud_detection FAILED")
    ocr4 = dict(ocr)
    ocr4["qr_data"] = {"pan": "ZZZZZ9999Z", "name": "ANITA VARSHNEY", "dob": "25/08/1991"}
    r4 = PanVerification.verify_pan(ocr4, sym, fore)
    fraud_cp = next(cp for cp in r4["pipeline_results"] if cp["stage"] == "Fraud Detection")
    print(f"  Fraud Detection: {fraud_cp['status']}  score={fraud_cp['score']}/{fraud_cp['max_score']}")
    assert fraud_cp["status"] == "FAILED"
    assert fraud_cp["score"] == 0
    print("  ✓ PASSED\n")

    print("=" * 60)
    print("  ALL 4 TESTS PASSED")
    print("=" * 60)

if __name__ == "__main__":
    test_final_spec()

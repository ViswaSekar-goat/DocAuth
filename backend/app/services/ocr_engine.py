"""
Phase A — OCR Engine
=====================
Clean, single-responsibility wrapper around PaddleOCR.

Responsibilities:
    - Load PaddleOCR once (lazy singleton, thread-safe)
    - Run OCR on any image path
    - Return a flat, normalised list of text blocks

Output per block:
    {
        "text":       str,    # recognised text
        "confidence": float,  # 0.0 – 1.0
        "bbox":       {       # pixel coordinates in original image space
            "x": int, "y": int, "w": int, "h": int
        },
        "bbox_raw":   list    # raw PaddleOCR quad [[x,y], ...] × 4
    }

Nothing else. No classification. No layout analysis. No fusion.

Usage:
    from app.services.ocr_engine import OCREngine

    blocks = OCREngine.run("path/to/document.jpg")
    for block in blocks:
        print(block["text"], block["confidence"])

    # Get only high-confidence blocks (printed text)
    printed = OCREngine.filter_by_confidence(blocks, min_conf=0.80)

    # Get low-confidence blocks (handwriting candidates)
    candidates = OCREngine.handwriting_candidates(blocks, threshold=0.80)

Integration path:
    Phase B: handwriting_candidates() feeds the HTR model
    Phase F: merge_handwriting_results() replaces low-conf blocks with HTR output
"""

import threading
import cv2
import numpy as np
from typing import TypedDict

# ---------------------------------------------------------------------------
# Output types
# ---------------------------------------------------------------------------

class BBox(TypedDict):
    x: int
    y: int
    w: int
    h: int


class OCRBlock(TypedDict):
    text: str
    confidence: float
    bbox: BBox
    bbox_raw: list          # raw quad from PaddleOCR [[x,y]×4]


# ---------------------------------------------------------------------------
# Singleton loader — mirrors the pattern in vehicle_logic.py
# ---------------------------------------------------------------------------

_paddle_instance = None
_paddle_lock = threading.Lock()


def _get_paddle():
    """
    Lazy-initialise PaddleOCR exactly once per process.
    Thread-safe via module-level lock.

    Settings mirror vehicle_logic.py:
        use_angle_cls=True  → handles rotated text (common in scanned forms)
        lang="en"           → English; extend to ["en", "hi"] for Hindi support
        use_gpu=False       → CPU-only, consistent with existing pipeline
        show_log=False      → suppresses verbose PaddlePaddle output
    """
    global _paddle_instance
    with _paddle_lock:
        if _paddle_instance is None:
            from paddleocr import PaddleOCR
            print("OCREngine: Initialising PaddleOCR (first run — may download models)...")
            _paddle_instance = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                use_gpu=False,
                show_log=False,
            )
            print("OCREngine: PaddleOCR ready.")
    return _paddle_instance


# ---------------------------------------------------------------------------
# Bbox conversion helpers
# ---------------------------------------------------------------------------

def _quad_to_bbox(quad: list) -> BBox:
    """
    Convert PaddleOCR's 4-point quad [[x,y]×4] to an axis-aligned bbox dict.
    Takes the min/max across all four corners to handle rotated text correctly.
    """
    xs = [int(p[0]) for p in quad]
    ys = [int(p[1]) for p in quad]
    x = max(0, min(xs))
    y = max(0, min(ys))
    w = max(xs) - x
    h = max(ys) - y
    return BBox(x=x, y=y, w=max(1, w), h=max(1, h))


def _normalise_image(image_path: str) -> tuple[np.ndarray, float]:
    """
    Load image and downscale if > 1200px on longest axis.
    Returns (normalised_bgr, scale_factor).
    Scale factor converts normalised coords back to original pixel space.

    Consistent with the cv_proxy_path approach in worker/tasks.py.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"OCREngine: cannot read image at '{image_path}'")

    h, w = img.shape[:2]
    max_dim = max(h, w)
    if max_dim > 1200:
        scale = max_dim / 1000.0
        img = cv2.resize(img, (int(w / scale), int(h / scale)))
        return img, scale
    return img, 1.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class OCREngine:
    """
    Stateless OCR engine. All methods are static.

    Example:
        blocks = OCREngine.run("uploads/form.jpg")
        candidates = OCREngine.handwriting_candidates(blocks)
    """

    # Confidence below which a block is a handwriting candidate.
    # Derived from the architecture doc (Phase B rule: confidence < 0.80).
    HANDWRITING_THRESHOLD = 0.80

    @staticmethod
    def run(image_path: str) -> list[OCRBlock]:
        """
        Run PaddleOCR on an image and return normalised block list.

        Args:
            image_path: Absolute or relative path to image (JPG, PNG, etc.)
                        For PDFs, pass the preview PNG path produced by
                        DocumentConverter.get_document_pages().

        Returns:
            List of OCRBlock dicts, sorted top-to-bottom then left-to-right.
            Empty list on failure (never raises — logs errors instead).
        """
        try:
            img, scale = _normalise_image(image_path)
        except ValueError as e:
            print(f"OCREngine.run error: {e}")
            return []

        try:
            ocr = _get_paddle()
            raw_result = ocr.ocr(img, cls=True)
        except Exception as e:
            print(f"OCREngine.run: PaddleOCR failed — {e}")
            return []

        # raw_result is [[line, ...]] — one list per page (always 1 for images)
        if not raw_result or not raw_result[0]:
            return []

        blocks: list[OCRBlock] = []
        for line in raw_result[0]:
            try:
                quad, (text, conf) = line
                text = text.strip()
                if not text:
                    continue

                # Scale bbox back to original image coordinates
                if scale != 1.0:
                    quad = [[p[0] * scale, p[1] * scale] for p in quad]

                blocks.append(OCRBlock(
                    text=text,
                    confidence=round(float(conf), 4),
                    bbox=_quad_to_bbox(quad),
                    bbox_raw=[[round(p[0]), round(p[1])] for p in quad],
                ))
            except Exception as parse_err:
                print(f"OCREngine: skipping malformed line — {parse_err}")
                continue

        # Sort top-to-bottom, then left-to-right (consistent with existing
        # _reconstruct_from_raw in vehicle_logic.py)
        blocks.sort(key=lambda b: (b["bbox"]["y"], b["bbox"]["x"]))

        print(f"OCREngine: extracted {len(blocks)} blocks from '{image_path}'")
        return blocks

    @staticmethod
    def full_text(blocks: list[OCRBlock]) -> str:
        """
        Concatenate all blocks into a single string, preserving reading order.
        Useful for downstream document-type detection (existing _finalize_ocr_results logic).
        """
        return "\n".join(b["text"] for b in blocks)

    @staticmethod
    def average_confidence(blocks: list[OCRBlock]) -> float:
        """Overall OCR confidence for the document — useful for quality checks."""
        if not blocks:
            return 0.0
        return round(sum(b["confidence"] for b in blocks) / len(blocks), 4)

    @staticmethod
    def filter_by_confidence(
        blocks: list[OCRBlock],
        min_conf: float = 0.80,
    ) -> list[OCRBlock]:
        """Return only blocks at or above min_conf (high-confidence / printed text)."""
        return [b for b in blocks if b["confidence"] >= min_conf]

    @staticmethod
    def handwriting_candidates(
        blocks: list[OCRBlock],
        threshold: float | None = None,
    ) -> list[OCRBlock]:
        """
        Return blocks below the confidence threshold — these are Phase B candidates
        for handwriting re-recognition.

        Args:
            blocks:    Output of OCREngine.run()
            threshold: Override the default HANDWRITING_THRESHOLD (0.80).

        Returns:
            List of low-confidence OCRBlock dicts.
        """
        t = threshold if threshold is not None else OCREngine.HANDWRITING_THRESHOLD
        return [b for b in blocks if b["confidence"] < t]

    @staticmethod
    def merge_handwriting_results(
        original_blocks: list[OCRBlock],
        htr_corrections: list[dict],
        threshold: float | None = None,
    ) -> list[OCRBlock]:
        """
        Phase F integration point.

        Replaces low-confidence blocks with corrected text from the HTR model.
        Matches by bbox overlap (IoU > 0.5).

        Args:
            original_blocks:  Full output of OCREngine.run()
            htr_corrections:  List of {"bbox": BBox, "text": str, "confidence": float}
                              dicts produced by the Phase F HTR model.
            threshold:        Confidence cutoff used to identify which blocks to replace.

        Returns:
            Merged block list — high-confidence blocks unchanged, low-confidence
            blocks replaced where an HTR correction exists.
        """
        t = threshold if threshold is not None else OCREngine.HANDWRITING_THRESHOLD

        def _iou(a: BBox, b: BBox) -> float:
            ax1, ay1 = a["x"], a["y"]
            ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
            bx1, by1 = b["x"], b["y"]
            bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]
            inter_w = max(0, min(ax2, bx2) - max(ax1, bx1))
            inter_h = max(0, min(ay2, by2) - max(ay1, by1))
            inter   = inter_w * inter_h
            union   = (a["w"] * a["h"]) + (b["w"] * b["h"]) - inter
            return inter / (union + 1e-6)

        merged = []
        for block in original_blocks:
            if block["confidence"] >= t:
                merged.append(block)
                continue

            # Try to find a matching HTR correction
            best_match = None
            best_iou   = 0.0
            for correction in htr_corrections:
                iou = _iou(block["bbox"], correction["bbox"])
                if iou > best_iou:
                    best_iou   = iou
                    best_match = correction

            if best_match and best_iou > 0.5:
                # Replace with HTR output
                merged.append(OCRBlock(
                    text=best_match["text"],
                    confidence=round(float(best_match.get("confidence", 0.85)), 4),
                    bbox=block["bbox"],
                    bbox_raw=block["bbox_raw"],
                ))
            else:
                # No HTR match — keep original (even if low confidence)
                merged.append(block)

        return merged

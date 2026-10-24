import cv2
import numpy as np
import os

class LogoMatcher:
    """
    Visual Brand Identification using ORB (Oriented FAST and Rotated BRIEF).
    Matches reference logos against document headers.
    """
    def __init__(self, logo_dir="app/assets/logos"):
        self.logo_dir = logo_dir
        self.orb = cv2.ORB_create(nfeatures=1000)
        self.bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        self.templates = {}
        
        # Corporate Color Profiles (HSV Ranges)
        # Use simple color boundaries: [Lower, Upper]
        self.BRAND_COLORS = {
            "SBI": [np.array([100, 150, 50]), np.array([125, 255, 255])], # Deep Blue
            "ICICI": [np.array([0, 100, 50]), np.array([15, 255, 200])],   # Maroon/Orange
            "HDFC": [np.array([100, 150, 50]), np.array([130, 255, 255])], # Blue/Navy
            "AXIS": [np.array([150, 100, 50]), np.array([179, 255, 200])]  # Burgundy
        }
        
        self._load_templates()

    def _load_templates(self):
        """Pre-load and compute descriptors for reference logos."""
        if not os.path.exists(self.logo_dir):
            os.makedirs(self.logo_dir, exist_ok=True)
            return

        for filename in os.listdir(self.logo_dir):
            if filename.endswith((".png", ".jpg", ".jpeg")):
                bank_id = filename.split("_")[0].upper()
                path = os.path.join(self.logo_dir, filename)
                img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
                if img is not None:
                    kp, des = self.orb.detectAndCompute(img, None)
                    self.templates[bank_id] = {"kp": kp, "des": des, "size": img.shape}

    def verify_color_signature(self, image_roi, bank_brand):
        """Processes a ROI and returns the density of corporate-colored pixels."""
        if bank_brand not in self.BRAND_COLORS:
            return 0.5 # Unknown color, be neutral
            
        lower, upper = self.BRAND_COLORS[bank_brand]
        hsv = cv2.cvtColor(image_roi, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, lower, upper)
        
        # Calculate percentage of pixels matching the corporate profile
        pixel_count = cv2.countNonZero(mask)
        total_pixels = image_roi.shape[0] * image_roi.shape[1]
        density = pixel_count / total_pixels if total_pixels > 0 else 0
        return density

    def match_brand_logo(self, document_path, bank_brand):
        """
        Check if the specified bank's logo exists in the document.
        Combines ORB Feature Matching + HSV Color Verification.
        """
        if bank_brand not in self.templates:
            return {"match": False, "confidence": 0, "reason": "No template available"}

        doc_img = cv2.imread(document_path)
        if doc_img is None:
            return {"match": False, "confidence": 0, "reason": "Could not read document"}

        h, w = doc_img.shape[:2]
        header = doc_img[0:int(h*0.25), 0:w]
        gray_header = cv2.cvtColor(header, cv2.COLOR_BGR2GRAY)

        kp_query, des_query = self.orb.detectAndCompute(gray_header, None)
        if des_query is None:
            return {"match": False, "confidence": 0, "reason": "No features found in header"}

        template = self.templates[bank_brand]
        matches = self.bf.match(template["des"], des_query)
        matches = sorted(matches, key=lambda x: x.distance)

        good_matches = [m for m in matches if m.distance < 45]
        
        # Geometry Score
        geom_score = min(1.0, len(good_matches) / 15.0)
        
        # Color Score (Only if we have good matches to locate the logo)
        color_score = 1.0
        if len(good_matches) >= 3:
            # Simple approximation of ROI from matches
            xs = [kp_query[m.trainIdx].pt[0] for m in good_matches]
            ys = [kp_query[m.trainIdx].pt[1] for m in good_matches]
            x1, x2 = int(max(0, min(xs)-10)), int(min(w, max(xs)+10))
            y1, y2 = int(max(0, min(ys)-10)), int(min(header.shape[0], max(ys)+10))
            
            roi = header[y1:y2, x1:x2]
            if roi.size > 0:
                color_score = self.verify_color_signature(roi, bank_brand)
        
        # Final weighted confidence
        confidence = (geom_score * 0.6) + (color_score * 0.4)
        is_match = (len(good_matches) >= 5) and (color_score > 0.05)

        return {
            "match": is_match,
            "confidence": confidence,
            "match_count": len(good_matches),
            "color_integrity": float(color_score),
            "bank_brand": bank_brand
        }

    def find_any_logo(self, document_path):
        """
        Heuristic: Find any graphic element in the header that might be a logo.
        Uses contour analysis and aspect ratios.
        """
        doc_img = cv2.imread(document_path)
        if doc_img is None: return []

        h, w = doc_img.shape[:2]
        header = doc_img[0:int(h*0.25), 0:w]
        gray = cv2.cvtColor(header, cv2.COLOR_BGR2GRAY)
        
        # Adaptive thresholding to find solid shapes
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        detections = []

        for cnt in contours:
            x, y, cw, ch = cv2.boundingRect(cnt)
            area = cv2.contourArea(cnt)
            
            # Logo heuristics:
            # 1. Not too small, not too big
            # 2. Near the top
            # 3. Square-ish or rectangular (Logo aspect ratio)
            aspect_ratio = float(cw) / ch
            if 400 < area < 50000 and y < h * 0.15:
                if 0.5 < aspect_ratio < 4.0:
                    # Normalize to 1000-unit scale
                    detections.append({
                        "label": "logo",
                        "confidence": 0.85, # Heuristic confidence
                        "bbox": [(x/w)*1000, (y/h)*1000, (cw/w)*1000, (ch/h)*1000]
                    })

        return detections

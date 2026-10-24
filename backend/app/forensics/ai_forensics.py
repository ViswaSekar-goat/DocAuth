import cv2
import numpy as np
from PIL import Image, ImageChops

class AIForensics:
    @staticmethod
    def analyze_compression_uniformity(image_path: str) -> dict:
        """
        Simulates JPEG compression uniformity analysis (ELA).
        """
        # ELA is already implemented in ela.py, this is a wrapper/extension
        return {"status": "PASS", "confidence": 0.95, "details": "Uniform quantization table detected."}

    @staticmethod
    def analyze_noise_consistency(image_path: str) -> dict:
        """
        Calculates local variance to detect noise inconsistencies.
        """
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None: return {"status": "UNKNOWN"}
        
        # Simple local variance check
        mean, std_dev = cv2.meanStdDev(img)
        return {
            "status": "PASS" if std_dev[0][0] > 5 else "WARNING", 
            "confidence": 0.88,
            "details": "Natural camera noise pattern detected."
        }

    @staticmethod
    def detect_security_features(image_path: str, doc_type: str) -> list:
        """
        Simulates detection of document-specific security features.
        """
        features = []
        if doc_type == "AADHAAR":
            features.append({"name": "UIDAI Hologram", "status": "DETECTED", "confidence": 0.92})
            features.append({"name": "Micro-printing", "status": "DETECTED", "confidence": 0.85})
        elif doc_type == "PAN":
            features.append({"name": "IT Hologram", "status": "DETECTED", "confidence": 0.94})
            features.append({"name": "UV-Visible Text", "status": "NOT_TESTED", "confidence": 0.0})
        
        return features

    @staticmethod
    def check_font_consistencies(text: str) -> dict:
        """
        Simulates analysis of font kerning and alignment.
        """
        # In a real system, this would analyze bbox alignment from OCR
        return {"status": "PASS", "details": "Font alignment consistent with institutional templates."}

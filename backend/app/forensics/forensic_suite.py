import os
import cv2
import numpy as np
from PIL import Image
import traceback
import io
import asyncio
from concurrent.futures import ThreadPoolExecutor

class ForensicSuite:
    """
    Advanced forensic analysis suite optimized for speed and parallel execution.
    """

    @staticmethod
    def extract_ela_from_image(img: Image.Image, quality: int = 95) -> dict:
        """
        Extract Error Level Analysis (ELA) using in-memory ByteIO.
        """
        try:
            # Ensure RGB
            if img.mode != 'RGB':
                img = img.convert('RGB')
                
            # Use memory buffer instead of disk for JPEG compression
            buffer = io.BytesIO()
            img.save(buffer, 'JPEG', quality=quality)
            buffer.seek(0)
            
            compressed_img = Image.open(buffer)
            
            # Compute difference
            ela_img = np.array(img).astype(np.float32) - np.array(compressed_img).astype(np.float32)
            ela_img = np.abs(ela_img)
            
            ela_mean = float(np.mean(ela_img))
            return {
                'ela_mean': ela_mean,
                'ela_std': float(np.std(ela_img)),
                'ela_max': float(np.max(ela_img)),
                'ela_detected': bool(ela_mean > 2.0)
            }
        except Exception as e:
            print(f"ELA Extraction error: {e}")
            return {'ela_mean': 0.0, 'ela_std': 0.0, 'ela_detected': False}

    @staticmethod
    def analyze_noise(image: np.ndarray) -> dict:
        """Analyze noise patterns and edge density."""
        try:
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image
                
            # Laplacian variance for blur/sharpness
            lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Local noise estimation (Fast version)
            # Use smaller kernel for speed
            noise = gray.astype(np.float32)
            noise_map = cv2.GaussianBlur(noise, (3, 3), 0) - noise
            
            # Edge density
            edges = cv2.Canny(gray, 100, 200) # Higher thresholds for speed
            edge_density = np.sum(edges > 0) / (edges.size + 1e-6)
            
            return {
                'noise_variance': float(lap_var),
                'noise_avg': float(np.mean(np.abs(noise_map))),
                'edge_density': float(edge_density)
            }
        except Exception as e:
            print(f"Noise analysis error: {e}")
            return {'noise_variance': 0.0, 'edge_density': 0.0}

    @staticmethod
    def analyze_font_consistency(image: np.ndarray) -> dict:
        """Analyze character physical consistency for tampering detection."""
        try:
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image
                
            # Use simpler thresholding for speed
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            heights = []
            if len(contours) > 5:
                # Limit contour processing to first 300 to prevent hang on extremely dense pages
                for cnt in contours[:300]:
                    x, y, w, h = cv2.boundingRect(cnt)
                    # Filter for typical character-like sizes
                    if 8 < h < 80 and 4 < w < 80: 
                        heights.append(h)
            
            char_height_std = float(np.std(heights)) if len(heights) > 5 else 0.0
            
            return {
                'char_count': len(heights),
                'char_height_std': char_height_std,
                'font_inconsistent': bool(char_height_std > 8.0)
            }
        except Exception as e:
            print(f"Font analysis error: {e}")
            return {'char_count': 0, 'char_height_std': 0.0, 'font_inconsistent': False}

    def run_all(self, image_path: str) -> dict:
        """
        Run all forensic analyses on an image using multi-threading for peak performance.
        """
        results = {}
        try:
            # Load image once
            cv_img = cv2.imread(image_path)
            if cv_img is None:
                return {"error": "Could not read image", "status": "ERROR"}
            
            # Resizing for forensic speed (600px is enough for ELA/Noise/Font)
            h, w = cv_img.shape[:2]
            proc_dim = 600
            if max(h, w) > proc_dim:
                scale = proc_dim / max(h, w)
                proc_img = cv2.resize(cv_img, (int(w * scale), int(h * scale)))
            else:
                proc_img = cv_img
            
            rgb_proc = cv2.cvtColor(proc_img, cv2.COLOR_BGR2RGB)
            pil_proc = Image.fromarray(rgb_proc)

            # PARALLEL EXECUTION using ThreadPoolExecutor
            # This allows utilizing multi-core CPUs for the pixel-heavy analysis
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_ela = executor.submit(self.extract_ela_from_image, pil_proc)
                future_noise = executor.submit(self.analyze_noise, rgb_proc)
                future_font = executor.submit(self.analyze_font_consistency, rgb_proc)
                
                # Collect results
                results.update(future_ela.result())
                results.update(future_noise.result())
                results.update(future_font.result())

            # Combined Integrity Score Heuristic
            tamper_score = 0
            if results.get('ela_detected'): tamper_score += 35
            if results.get('noise_variance', 0) > 1200: tamper_score += 15
            if results.get('char_height_std', 0) > 8.0: tamper_score += 25
            
            results['forensic_tamper_score'] = tamper_score
            results['status'] = "SUCCESS"
            
        except Exception as e:
            results['status'] = "ERROR"
            results['error'] = str(e)
            print(f"ForensicSuite Turbo Run error: {traceback.format_exc()}")
            
        return results

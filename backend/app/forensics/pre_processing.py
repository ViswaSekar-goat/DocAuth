import cv2
import numpy as np
from PIL import Image
import os
import traceback

# Optional dependency: PyMuPDF (fitz)
try:
    import fitz
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False
    print("CRITICAL WARNING: PyMuPDF (fitz) not found. PDF conversion will fail.")

def preprocess_image(image_path: str) -> str:
    """
    Cleans the image before analysis:
    - Converts PDF to Image if necessary
    - Noise reduction
    - Skew correction
    - Contrast normalization
    """
    # 0. Handle PDF to Image conversion
    ext = os.path.splitext(image_path)[1].lower()
    work_path = image_path
    
    if ext == ".pdf":
        print(f"PREPROCESS: Converting PDF {image_path} to Image...")
        if not HAS_FITZ:
            raise ImportError("PyMuPDF (fitz) is required for PDF to Image conversion. Please install it.")
        
        try:
            doc = fitz.open(image_path)
            page = doc.load_page(0)  # first page
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # upscale 2x for better OCR
            
            # Save temporary image
            img_path = image_path.replace(".pdf", "_preview.png")
            pix.save(img_path)
            work_path = img_path
            doc.close()
        except Exception as e:
            print(f"PDF to Image error: {traceback.format_exc()}")
            raise e
    
    print(f"PREPROCESS: Loading image {work_path}...")
    # 1. Load Image
    img = cv2.imread(work_path)
    if img is None:
        return work_path
        
    # 2. Resize if too massive (prevent CPU thrashing)
    h, w = img.shape[:2]
    max_dim = 2500
    if max(h, w) > max_dim:
        print(f"PREPROCESS: Resizing large image ({w}x{h})...")
        scale = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))
        
    print("PREPROCESS: Enhancing contrast and denoising...")
    # 3. Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 4. Denoise (Fast)
    # Using Gaussian blur as it's faster than fastNlMeansDenoising for large images
    denoised = cv2.GaussianBlur(gray, (3, 3), 0)
    
    # 5. Contrast Enhancement (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)
    
    # Save processed image back
    processed_path = work_path.replace(ext, "_processed.png") if ext != ".pdf" else work_path
    print(f"PREPROCESS: Saving result to {processed_path}")
    cv2.imwrite(processed_path, enhanced)
    
    return processed_path
def preprocess_id_card(image_path: str) -> str:
    """
    Advanced preprocessing for Identity Cards (PAN/Aadhaar):
    1. Grayscale
    2. Contrast Enhancement (CLAHE)
    3. Sharpening Filter
    4. Adaptive Thresholding
    """
    img = cv2.imread(image_path)
    if img is None:
        return image_path
        
    # Resize if needed
    h, w = img.shape[:2]
    if max(h, w) > 2000:
        scale = 2000 / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))
    
    # 1. Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 2. Contrast Enhancement (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    contrast = clahe.apply(gray)
    
    # 3. Sharpening (Unsharp Mask)
    blurred = cv2.GaussianBlur(contrast, (0, 0), 3)
    sharpened = cv2.addWeighted(contrast, 1.5, blurred, -0.5, 0)
    
    # 4. Adaptive Thresholding for crisp text
    # We use a large block size for better character definition on IDs
    thresh = cv2.adaptiveThreshold(
        sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 21, 10
    )
    
    processed_path = image_path.replace(os.path.splitext(image_path)[1], "_id_processed.png")
    cv2.imwrite(processed_path, thresh)
    
    return processed_path

def normalize_for_pan(image_path: str) -> str:
    """
    STRICT SPEC v7.0:
    1. Convert to RGB
    2. Resize longest edge to 1200px
    3. Pad to 1200x760 canvas (Black borders)
    4. Deskew correction
    5. Grayscale + CLAHE + Sharpen + Adaptive Threshold
    """
    img = cv2.imread(image_path)
    if img is None:
        return image_path

    # Step 1 & 2: Resize longest edge to 1200px
    h, w = img.shape[:2]
    scale = 1200 / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    # Step 3: Pad to 1200x760
    canvas_w, canvas_h = 1200, 760
    canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
    
    # Center the image on canvas
    x_offset = (canvas_w - new_w) // 2
    y_offset = (canvas_h - new_h) // 2
    paste_w = min(new_w, canvas_w)
    paste_h = min(new_h, canvas_h)
    canvas[y_offset:y_offset+paste_h, x_offset:x_offset+paste_w] = resized[:paste_h, :paste_w]

    # Step 4: Deskew (Simplified version based on minAreaRect)
    gray = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
    coords = np.column_stack(np.where(gray > 0))
    if len(coords) > 5:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        
        (ch, cw) = canvas.shape[:2]
        center = (cw // 2, ch // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(canvas, M, (cw, ch), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT)
    else:
        rotated = canvas

    # Step 5, 6, 7: Grayscale + CLAHE + Sharpen + Threshold
    final_gray = cv2.cvtColor(rotated, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(final_gray)
    
    # Sharpening
    blurred = cv2.GaussianBlur(enhanced, (0, 0), 3)
    sharpened = cv2.addWeighted(enhanced, 1.5, blurred, -0.5, 0)
    
    normalized = cv2.adaptiveThreshold(
        sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 21, 10
    )

    processed_path = image_path.replace(os.path.splitext(image_path)[1], "_normalized_pan.png")
    cv2.imwrite(processed_path, normalized)
    
    return processed_path

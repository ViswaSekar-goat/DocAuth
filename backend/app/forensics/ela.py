import numpy as np
from PIL import Image, ImageChops, ImageEnhance
import os

def perform_ela(image_path: str, quality: int = 90) -> str:
    """
    Performs Error Level Analysis (ELA) on an image.
    Returns the path to the ELA heatmap.
    """
    ela_filename = f"ela_{os.path.basename(image_path)}"
    ela_path = os.path.join(os.path.dirname(image_path), ela_filename)
    
    # Open original image
    original = Image.open(image_path).convert("RGB")
    
    # Save as temporary JPG with specified quality
    temp_path = image_path + ".tmp.jpg"
    original.save(temp_path, "JPEG", quality=quality)
    
    # Re-open temporary image
    resaved = Image.open(temp_path)
    
    # Calculate absolute difference
    ela_image = ImageChops.difference(original, resaved)
    
    # Find extrema to scale the difference for visibility
    extrema = ela_image.getextrema()
    max_diff = max([ex[1] for ex in extrema])
    if max_diff == 0:
        max_diff = 1
    
    scale = 255.0 / max_diff
    ela_image = ImageEnhance.Brightness(ela_image).enhance(scale)
    
    # Save ELA result
    ela_image.save(ela_path)
    
    # Clean up
    if os.path.exists(temp_path):
        os.remove(temp_path)
        
    return ela_path

def analyze_ela_stats(ela_path: str) -> dict:
    """
    Analyzes ELA image to find high-error regions.
    """
    img = Image.open(ela_path).convert("L")
    data = np.array(img)
    
    mean_val = np.mean(data)
    max_val = np.max(data)
    std_val = np.std(data)
    
    # Simple thresholding to find "hotspots"
    threshold = mean_val + 2 * std_val
    hotspots = np.where(data > threshold)
    hotspot_count = len(hotspots[0])
    
    return {
        "mean_error": float(mean_val),
        "max_error": float(max_val),
        "hotspot_count": int(hotspot_count),
        "tamper_likelihood": "HIGH" if mean_val > 10 else "MEDIUM" if mean_val > 5 else "LOW"
    }

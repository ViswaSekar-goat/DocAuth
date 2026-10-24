from ultralytics import YOLO
import os
import cv2

# Global instances
_model = None

def get_yolo_model():
    global _model
    if _model is None:
        try:
            _model = YOLO("yolo11n.pt") 
        except Exception as e:
            print(f"Error loading YOLO model: {e}")
            return None
    return _model

def detect_symbols(image_path: str, bank_brand: str = None) -> list:
    detections = []

    # 2. YOLO AI Detection
    model = get_yolo_model()
    if model is not None:
        try:
            results = model(image_path, imgsz=416, verbose=False)
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0]
                    conf = box.conf[0]
                    cls = box.cls[0]
                    label = model.names[int(cls)]
                    
                    orig_h, orig_w = r.orig_shape
                    detections.append({
                        "label": label,
                        "confidence": float(conf),
                        "bbox": [(float(x1)/orig_w)*1000, (float(y1)/orig_h)*1000, 
                                 ((float(x2)-float(x1))/orig_w)*1000, ((float(y2)-float(y1))/orig_h)*1000]
                    })
        except Exception as e:
            print(f"YOLO detection error: {e}")
    
    return detections

import easyocr
import numpy as np
import cv2

class TableExtractor:
    """
    Table Extractor for Bank Statements.
    Uses EasyOCR to detect rows and columns.
    """
    
    def __init__(self):
        # Lazy initialization to save memory in main process if not used
        self.reader = None

    def _get_reader(self):
        if self.reader is None:
            self.reader = easyocr.Reader(['en'], gpu=False) # GPU False for stability on some Windows setups
        return self.reader

    def extract_table(self, image_path: str = None, pre_existing_results: list = None):
        """
        Extract structured transaction data.
        If pre_existing_results is provided, it uses those instead of running OCR again.
        """
        if pre_existing_results:
            results = []
            for item in pre_existing_results:
                try:
                    # Item bbox is now a raw list from ocr_pipeline
                    bbox = item["bbox"]
                    page = item.get("page", 0)
                    results.append((bbox, item["text"], item["conf"], page))
                except:
                    continue
        else:
            if not image_path:
                return []
            reader = self._get_reader()
            results = reader.readtext(image_path, detail=1)
        
        if not results:
            return []

        # Sort results: Primarily BY Page, Secondarily BY Y (row), Tertiarily BY X (column)
        # Handle both list (EasyOCR) and dict (Vector) results gracefully
        def get_sort_key(res):
            # res format: (bbox, text, conf) OR (bbox, text, conf, page) if pre_existing_results
            # or if it's a result from reader.readtext
            if isinstance(res[-1], int) and len(res) == 4: # Vector page index
                return (res[3], res[0][0][1], res[0][0][0])
            return (0, res[0][0][1], res[0][0][0]) # Default 0th page for image OCR

        sorted_results = sorted(results, key=get_sort_key)
        
        rows = []
        current_row = [sorted_results[0]]
        for i in range(1, len(sorted_results)):
            prev = sorted_results[i-1]
            curr = sorted_results[i]
            
            prev_page = prev[3] if len(prev) > 3 else 0
            curr_page = curr[3] if len(curr) > 3 else 0
            
            prev_y = prev[0][0][1]
            curr_y = curr[0][0][1]
            
            # Row grouping threshold (15px) + Page break boundary
            if curr_page == prev_page and abs(curr_y - prev_y) < 15: 
                current_row.append(curr)
            else:
                rows.append(current_row)
                current_row = [curr]
        rows.append(current_row)
            
        return rows

import re

class EntityLocalizer:
    """
    Localizes key bank statement entities (Account Name, Balances, Tables) 
    from raw OCR data and assigns categorization for visual overlays.
    """
    
    # Color mapping for the frontend
    CATEGORIES = {
        "HEADER": {"color": "blue", "label": "Header Info", "status": "valid"},
        "TRANSACTION": {"color": "green", "label": "Transaction", "status": "valid"},
        "BALANCE": {"color": "purple", "label": "Balance Marker", "status": "valid"},
        "BRANDING": {"color": "orange", "label": "Bank Branding", "status": "valid"},
        "ANOMALY": {"color": "red", "label": "Forensic Alert", "status": "fraud"}
    }

    @staticmethod
    def localize(raw_ocr_data, bank_brand="SBI"):
        """
        Maps raw OCR blocks to specific entities based on intent.
        Returns a list of BoundingBox objects for the frontend.
        """
        boxes = []
        
        # 1. Branding Localization (already handled by symbols.py/logo_matcher, but we unified it)
        # 2. Header Localization
        header_patterns = [
            r"(?:NAME|HOLDER|ACCOUNT NAME|CUSTOMER NAME)",
            r"(?:ADDRESS|PLOT NO|STREET|CITY|PIN CODE)",
            r"(?:CIF NO|CIF NUMBER|CIF)",
            r"(?:IFSC|IFS CODE|IFSC CODE)",
            r"(?:ACCOUNT NO|A/C NO|ACCOUNT NUMBER)"
        ]
        
        # 3. Balance Localization
        balance_patterns = [
            r"(?:BALANCE|OPENING|CLOSING|TOTAL|CR|DR)",
            r"(?:STATEMENT|STMT|PERIOD)"
        ]

        # 4. Table/Transaction Localization (Heuristic: Rows with dates)
        date_pattern = r"\d{1,2}[./-]\d{1,2}[./-]\d{2,4}"

        for i, item in enumerate(raw_ocr_data):
            text = item.get("text", "").upper()
            bbox = item.get("bbox", []) # [[x0, y0], [x1, y1]...]
            
            if not bbox or len(bbox) < 4: continue
            
            # Convert bbox to x, y, width, height percentages (approximation for now)
            # EasyOCR bbox: [[x,y],[x,y],[x,y],[x,y]]
            x_coords = [p[0] for p in bbox]
            y_coords = [p[1] for p in bbox]
            
            # Simple bounding box normalization (0-100 scale)
            # In a real app, we need the original image dimensions.
            # We'll rely on symbols.py-like normalization if dimensions are passed.
            
            category = "HEADER"
            label = "Unknown Field"
            
            # Match Categories
            if any(re.search(p, text) for p in header_patterns):
                category = "HEADER"
                label = f"Header: {text[:20]}"
            elif any(re.search(p, text) for p in balance_patterns):
                category = "BALANCE"
                label = f"Balance: {text[:20]}"
            elif re.search(date_pattern, text):
                category = "TRANSACTION"
                label = "Transaction Record"
            else:
                continue # Skip generic text for now to keep overlay clean
                
            cat_info = EntityLocalizer.CATEGORIES[category]
            
            boxes.append({
                "id": f"field_{i}",
                "raw_bbox": bbox,
                "label": label,
                "category": category,
                "status": cat_info["status"],
                "color": cat_info["color"]
            })
            
        return boxes

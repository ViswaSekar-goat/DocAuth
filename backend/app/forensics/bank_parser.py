import re

class BankParser:
    """
    Parses raw grouped OCR rows into structured transaction dictionaries.
    Handles common Indian bank statement formats.
    """

    @staticmethod
    def parse_currency(val: str) -> float:
        """Clean currency string and convert to float (Rounded to 2 decimals)."""
        if not val: return 0.0
        # Remove commas, currency symbols, and handle (Dr/Cr) suffixes if any
        clean = re.sub(r'[^\d.-]', '', str(val).replace(',', '').replace(' ', ''))
        try:
            return round(float(clean), 2) if clean else 0.0
        except:
            return 0.0

    @staticmethod
    def is_date(text: str) -> bool:
        """Heuristic check for date-like strings."""
        return bool(re.search(r'\d{1,2}[./-]\d{1,2}[./-]\d{2,4}', text)) or \
               bool(re.search(r'\d{1,2} [A-Za-z]{3} \d{2,4}', text))

    def parse_header(self, text: str, bank_brand: str = "UNKNOWN") -> dict:
        """Extracts account metadata from document header text."""
        data = {}
        text_upper = text.upper()
        
        if bank_brand == "ICICI":
            # Account Holder Name (Usually starts early, before branch info)
            # Find the line after "Statement of Transactions..."
            lines = text.split('\n')
            for i, line in enumerate(lines[:30]):
                up_line = line.upper()
                if "SAVING ACCOUNT NO." in up_line or "PRIVILEGE BANKING" in up_line or "ACCOUNT NAME" in up_line:
                    # Account number is usually in this line or nearby
                    if "SAVING ACCOUNT NO." in up_line:
                        acc_match = re.search(r'NO\.\s*(\d{12})', line, re.IGNORECASE)
                        if acc_match: data["account_number"] = acc_match.group(1)
                    
                    # Period is also often here
                    period_match = re.search(r'PERIOD\s+([A-Z]+ \d+, \d{4}\s*-\s*[A-Z]+ \d+, \d{4})', line, re.IGNORECASE)
                    if period_match: data["period"] = period_match.group(1)
                    
                    # Name is often 1-3 lines below or even in the same line after keywords
                    if "ACCOUNT NAME" in up_line:
                        n_match = re.search(r"ACCOUNT NAME[:\s]+([A-Z\s]+)", line, re.I)
                        if n_match: data["account_name"] = n_match.group(1).strip()
                    
                    if "account_name" not in data:
                        for offset in [1, 2]:
                            if i + offset < len(lines):
                                pot = lines[i+offset].strip()
                                if len(pot) > 5 and not any(k in pot.upper() for k in ["BRANCH", "ADDRESS", "DATE", "PAGE", "BASE"]):
                                    data["account_name"] = pot
                                    break
                            
                    # Address usually follows the name
                    if "account_name" in data:
                        address_lines = []
                        start_idx = i + 2 if data.get("account_name") == lines[i+1].strip() else i + 3
                        for j in range(start_idx, min(start_idx+6, len(lines))):
                            if any(k in lines[j].upper() for k in ["BASE BRANCH", "TRANSACTION DATE", "S NO.", "BALANCE"]):
                                break
                            address_lines.append(lines[j].strip())
                        if address_lines:
                            data["address"] = " ".join(address_lines)

        elif bank_brand == "SBI":
            # 3. Fix OCR Extraction Reliability: Normalize and Standardize
            # Search labels more aggressively in individual lines first
            lines = text.split('\n')
            for line in lines[:50]: # Increased scan range for complex headers
                up_line = line.upper()
                
                # Normalize line for label matching: remove dots, colons, dashes
                norm_line = re.sub(r'[:\.\-\s]+', ' ', up_line)
                
                # 2. Fix SBI Account Number Detection (11-17 digits)
                # Matches: ACCOUNT NUMBER, A/C NUMBER, A/C NO, ACCOUNT NO, etc.
                if any(kw in norm_line for kw in ["ACCOUNT NO", "A C NO", "ACCOUNT NUMBER", "A C NUMBER"]):
                    acc_match = re.search(r'(?:NO|NUMBER|NUM)[:\s\.\-]*(\d[0-9\s\.\-]{10,20})', up_line)
                    if acc_match:
                        clean_acc = re.sub(r'[^\d]', '', acc_match.group(1))
                        if 11 <= len(clean_acc) <= 17:
                            data["account_number"] = clean_acc

                # 1. Fix IFSC / IFS Code Detection
                # Matches: IFSC CODE, IFS CODE, IFSC, IFS
                if any(kw in norm_line for kw in ["IFSC", "IFS CODE", "IFS "]):
                    # Look for SBIN followed by 7 digits, allowing spaces between characters
                    # We search in the original line (case-insensitive) to preserve relative positions if needed, 
                    # but normalize it here for the match.
                    ifsc_match = re.search(r'SBIN\s*(?:\d\s*){7}', up_line)
                    if ifsc_match:
                        clean_ifsc = re.sub(r'\s+', '', ifsc_match.group(0))
                        if len(clean_ifsc) == 11:
                            data["ifsc"] = clean_ifsc

                # Name Detection (Normalized)
                if "NAME" in norm_line and any(kw in norm_line for kw in ["ACCOUNT", "HOLDER", "CUSTOMER"]):
                    n_match = re.search(r"(?:NAME|HOLDER)\s*([A-Z\s]{3,40})", up_line)
                    if n_match:
                        name = n_match.group(1).strip()
                        if len(name) > 3: data["account_name"] = name

            # 4. Proximity-Based Search (Refined v3)
            # Search for labels and then look for numbers within 50 characters.
            # This avoids picking up random numeric sequences from transaction tables.
            if "account_number" not in data:
                labels = ["ACCOUNT NUMBER", "A/C NO", "ACCOUNT NO"]
                for label in labels:
                    label_idx = text_upper.find(label)
                    if label_idx != -1:
                        # Extract 50 characters after the label
                        vicinity = text_upper[label_idx:label_idx + 60] # Label length + 50 chars
                        acc_match = re.search(r'\b\d{11,17}\b', vicinity)
                        if acc_match:
                            data["account_number"] = acc_match.group(0)
                            break
            
            if "ifsc" not in data:
                # Global fallback for IFSC still useful, but must be strict SBIN\d{7}
                full_norm = re.sub(r'\s+', '', text_upper)
                global_ifsc = re.search(r'SBIN\d{7}', full_norm)
                if global_ifsc: 
                    data["ifsc"] = global_ifsc.group(0)

        elif bank_brand == "AXIS":
            lines = text.split('\n')
            for i, line in enumerate(lines[:50]):
                up_line = line.upper()
                norm_line = re.sub(r'[:\.\-\s]+', ' ', up_line)
                
                # Account Number Detection
                if any(kw in norm_line for kw in ["ACCOUNT NO", "A C NO", "ACCOUNT NUMBER"]):
                    acc_match = re.search(r'\b\d{12,16}\b', up_line)
                    if acc_match:
                        data["account_number"] = acc_match.group(0)

                # IFSC Code Detection
                if "IFSC" in norm_line or "UTIB0" in norm_line:
                    ifsc_match = re.search(r'UTIB0\d{6}', norm_line)
                    if ifsc_match:
                        data["ifsc"] = ifsc_match.group(0)

                # Name Detection (Usually before address keywords)
                if any(kw in norm_line for kw in ["CUSTOMER NAME", "ACCOUNT NAME", "NAME"]):
                    # If label and name are on the same line
                    n_match = re.search(r"(?:NAME)[:\s]+([A-Z\s]{3,40})", up_line)
                    if n_match:
                        data["account_name"] = n_match.group(1).strip()
                    elif i + 1 < len(lines):
                        # Name might be on the next line
                        candidate = lines[i+1].strip().upper()
                        if len(candidate) > 3 and not any(kw in candidate for kw in ["ADDRESS", "ROAD", "STREET"]):
                            data["account_name"] = candidate

                # Statement Period Detection
                if "PERIOD" in norm_line or "STATEMENT FROM" in norm_line:
                    period_match = re.search(r'(\d{1,2}[-/]\w{3}[-/]\d{2,4}\s+TO\s+\d{1,2}[-/]\w{3}[-/]\d{2,4})', up_line)
                    if period_match:
                        data["period"] = period_match.group(1)

        # Fallback generic extractors
        if "account_number" not in data:
            acc_match = re.search(r'(?:ACCOUNT|ACC)\s*(?:NO|NUMBER|NUM)[:\s\.\-]*(\d{9,20})', text_upper)
            if acc_match: data["account_number"] = acc_match.group(1)
            
        return data

    def parse_rows_to_transactions(self, rows: list, bank_brand: str = "UNKNOWN") -> list:
        """
        Converts grouped OCR rows into structured transactions.
        If bank_brand is provided, uses strict template-driven extraction.
        """
        from app.forensics.bank_logic import BankProfiler
        template = BankProfiler.RULES.get(bank_brand, {}).get("template")
        
        transactions = []
        
        # Headers to skip
        SKIP_KEYWORDS = ["S NO.", "DATE", "CHEQUE", "REMARKS", "WITHDRAWAL", "DEPOSIT", "BALANCE", "PARTICULARS"]
        
        for row in rows:
            texts = [item[1] for item in row]
            row_str = " ".join(texts)
            row_up = row_str.upper()
            
            # Skip rows that look like table headers
            if any(kw in row_up for kw in SKIP_KEYWORDS) and len(texts) > 3:
                # If it contains multi keywords, it's likely a header row
                kw_count = sum(1 for kw in SKIP_KEYWORDS if kw in row_up)
                if kw_count >= 3:
                    continue

            # Extract numbers with precision
            cleaned_texts = [re.sub(r'[^\d.]', '', t.replace(',', '').replace(' ', '')) for t in texts]
            numbers = []
            for ct in cleaned_texts:
                if re.match(r'^-?\d+\.\d{2}$', ct):
                    numbers.append(float(ct))

            has_date = self.is_date(row_str)
            
            # Combine bboxes for the whole row
            row_bboxes = [item[0] for item in row]
            row_page = row[0][3] if len(row[0]) > 3 else (row[0][2].get('page', 0) if isinstance(row[0][2], dict) else 0)
            
            # Helper to calculate min/max bbox for a row
            min_x = min(b[0][0] for b in row_bboxes) if row_bboxes else 0
            min_y = min(b[0][1] for b in row_bboxes) if row_bboxes else 0
            max_x = max(b[2][0] for b in row_bboxes) if row_bboxes else 0
            max_y = max(b[2][1] for b in row_bboxes) if row_bboxes else 0
            combined_bbox = [min_x, min_y, max_x, max_y]

            if has_date:
                # NEW TRANSACTION START
                tx = {
                    "date": next((t for t in texts if self.is_date(t)), "Unknown"),
                    "narration": row_str,
                    "debit": 0.0,
                    "credit": 0.0,
                    "balance": 0.0,
                    "bbox": combined_bbox,
                    "page": row_page
                }
                
                if template:
                    # STRICT TEMPLATE-DRIVEN EXTRACTION
                    try:
                        if len(texts) >= template["min_cols"]:
                            # ICICI Specific: Date might be separated by dots 01.01.2026
                            # Check multiple positions for date
                            date_val = "Unknown"
                            for pos in [template["date_pos"], 0, 1]:
                                if pos < len(texts) and self.is_date(texts[pos]):
                                    date_val = texts[pos]
                                    break
                            
                            tx["date"] = date_val
                            tx["narration"] = texts[template["desc_pos"]] if template["desc_pos"] < len(texts) else row_str
                            
                            # Clean and parse numbers at specific indices
                            # We use safe access to avoid index errors on messy OCR
                            def get_num(pos):
                                if pos < len(texts):
                                    clean = re.sub(r'[^\d.]', '', texts[pos].replace(',', '').replace(' ', ''))
                                    return float(clean) if re.match(r'^-?\d+\.\d{2}$', clean) else 0.0
                                return 0.0

                            tx["debit"] = get_num(template["debit_pos"])
                            tx["credit"] = get_num(template["credit_pos"])
                            tx["balance"] = get_num(template["balance_pos"])
                    except: pass
                else:
                    # FALLBACK: POSITIONAL GUESSING (Legacy Mode)
                    if len(numbers) >= 3:
                        tx["balance"] = numbers[-1]
                        tx["credit"] = numbers[-2]
                        tx["debit"] = numbers[-3]
                    elif len(numbers) == 2:
                        tx["balance"] = numbers[-1]
                        if any(x in row_up for x in ["CR", "CREDIT"]): tx["credit"] = numbers[0]
                        else: tx["debit"] = numbers[0]
                    elif len(numbers) == 1:
                        tx["balance"] = numbers[0]
                
                transactions.append(tx)
                
            elif transactions:
                # CONTINUATION ROW (OCR SPLIT)
                last_tx = transactions[-1]
                last_tx["narration"] += " " + row_str
                # For templates, we usually only append narration on continuation rows
                # since numbers are expected to be on the primary row.

        print(f"BankParser: Parsed {len(transactions)} transactions using brand template: {bank_brand}")
        return transactions

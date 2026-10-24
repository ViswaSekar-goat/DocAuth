import sys
import os
import unittest

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), '..'))

from app.forensics.pan_logic import PanVerification

class TestPanDeterministicv5(unittest.TestCase):
    def setUp(self):
        self.width = 1000
        self.height = 600

    def test_ideal_extraction(self):
        # Ideal OCR results with coordinates matching TEXT_REG (205-819)
        ocr_results = {
            "text": "INCOME TAX DEPARTMENT GOVT. OF INDIA ASHWIN ESHWER PURUSHOTHAMAN PURUSHOTHAMAN 09/01/2006 ABCDE1234F",
            "width": self.width,
            "height": self.height,
            "raw_data": [
                {"text": "INCOME TAX DEPARTMENT", "bbox": [[20, 20], [200, 20], [200, 40], [20, 40]]},
                {"text": "GOVT. OF INDIA", "bbox": [[800, 20], [980, 20], [980, 40], [800, 40]]},
                {"text": "NAME", "bbox": [[300, 100], [350, 100], [350, 120], [300, 120]]},
                {"text": "ASHWIN ESHWER PURUSHOTHAMAN", "bbox": [[300, 130], [600, 130], [600, 150], [300, 150]]},
                {"text": "FATHER'S NAME", "bbox": [[300, 180], [450, 180], [450, 200], [300, 200]]},
                {"text": "PURUSHOTHAMAN", "bbox": [[300, 210], [500, 210], [500, 230], [300, 230]]},
                {"text": "DATE OF BIRTH", "bbox": [[300, 260], [450, 260], [450, 280], [300, 280]]},
                {"text": "09/01/2006", "bbox": [[300, 290], [400, 290], [400, 310], [300, 310]]},
                {"text": "ABCDE1234F", "bbox": [[300, 400], [450, 400], [450, 420], [300, 420]]}
            ]
        }
        
        # Symbols in correct regions
        symbol_results = [
            {"label": "PHOTO", "bbox": [10, 10, 100, 100]}, # Inside PHOTO_REG (0,0,256,256)
            {"label": "SIGNATURE", "bbox": [100, 550, 200, 50]} # Inside SIGN_REG (y>512)
        ]
        
        results = PanVerification.verify_pan(ocr_results, symbol_results=symbol_results)
        fields = results["extracted_fields"]
        
        self.assertEqual(fields["full_name"], "ASHWIN ESHWER PURUSHOTHAMAN")
        self.assertEqual(fields["father_name"], "PURUSHOTHAMAN")
        self.assertEqual(fields["date_of_birth"], "09/01/2006")
        self.assertEqual(fields["pan_number"], "ABCDE1234F")
        self.assertEqual(fields["photo_detected"], "YES")
        self.assertEqual(fields["signature_detected"], "YES")
        self.assertEqual(results["verdict"], "REAL")
        self.assertEqual(results["failure_count"], 0)

    def test_suspicious_verdict(self):
        # 1 failure (e.g., signature missing in region)
        ocr_results = {
            "text": "INCOME TAX DEPARTMENT GOVT. OF INDIA ASHWIN ESHWER PURUSHOTHAMAN PURUSHOTHAMAN 09/01/2006 ABCDE1234F",
            "width": self.width,
            "height": self.height,
            "raw_data": [
                {"text": "INCOME TAX DEPARTMENT", "bbox": [[20, 20], [200, 20], [200, 40], [20, 40]]},
                {"text": "ABCDE1234F", "bbox": [[300, 400], [450, 400], [450, 420], [300, 420]]},
                {"text": "NAME", "bbox": [[300, 100], [350, 100], [350, 120], [300, 120]]},
                {"text": "ASHWIN ESHWER PURUSHOTHAMAN", "bbox": [[300, 130], [600, 130], [600, 150], [300, 150]]},
                {"text": "FATHER'S NAME", "bbox": [[300, 180], [450, 180], [450, 200], [300, 200]]},
                {"text": "PURUSHOTHAMAN", "bbox": [[300, 210], [500, 210], [500, 230], [300, 230]]},
                {"text": "DATE OF BIRTH", "bbox": [[300, 260], [450, 260], [450, 280], [300, 280]]},
                {"text": "09/01/2006", "bbox": [[300, 290], [400, 290], [400, 310], [300, 310]]}
            ]
        }
        # Photo is in region, Signature is MISSING
        symbol_results = [
            {"label": "PHOTO", "bbox": [10, 10, 100, 100]}, # Correct Region
            # SIGNATURE MISSING
        ]
        
        results = PanVerification.verify_pan(ocr_results, symbol_results=symbol_results)
        self.assertEqual(results["verdict"], "SUSPICIOUS")
        self.assertEqual(results["failure_count"], 1)

    def test_fake_verdict(self):
        # Invalid PAN format and missing headers (2+ failures)
        ocr_results = {
            "text": "नाम / NAME ASHWIN ABCDE123", # Invalid PAN, missing headers, missing father name
            "width": self.width,
            "height": self.height,
            "raw_data": [
                {"text": "NAME", "bbox": [[100, 150], [250, 150], [250, 175], [100, 175]]},
                {"text": "ASHWIN", "bbox": [[100, 185], [300, 185], [300, 210], [100, 210]]},
                {"text": "ABCDE123", "bbox": [[400, 450], [600, 450], [600, 500], [400, 500]]}
            ]
        }
        results = PanVerification.verify_pan(ocr_results)
        self.assertEqual(results["verdict"], "FAKE")
        self.assertGreaterEqual(results["failure_count"], 2)

if __name__ == '__main__':
    unittest.main()

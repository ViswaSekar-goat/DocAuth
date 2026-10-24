import re
from datetime import datetime

class AcademicVerification:
    @staticmethod
    def verify_certificate(ocr_results: dict) -> dict:
        text = ocr_results.get("text", "").lower()
        extracted_data = ocr_results.get("extracted_data", {})
        anomalies = []
        
        # 1. Date Sequence Logic
        # DOB < Enrollment < Passing < Issue
        # Extracted data might have date_of_birth, year_of_passing, date_of_issue
        dob_str = extracted_data.get("date_of_birth", "")
        passing_year = extracted_data.get("year_of_passing", "")
        issue_date_str = extracted_data.get("date_of_issue", "")
        
        try:
            if dob_str and passing_year:
                dob_dt = datetime.strptime(dob_str, "%d/%m/%Y") if "/" in dob_str else None
                if dob_dt and dob_dt.year >= int(passing_year) - 5: # Assuming at least 5 years of study? No, just dob < passing
                    anomalies.append({
                        "type": "CERT_LOGIC_ERROR",
                        "message": "Inconsistent date sequence: DOB too close to passing year.",
                        "severity": "CRITICAL"
                    })
            
            if passing_year and issue_date_str:
                issue_dt = datetime.strptime(issue_date_str, "%d/%m/%Y") if "/" in issue_date_str else None
                if issue_dt and issue_dt.year < int(passing_year):
                    anomalies.append({
                        "type": "CERT_LOGIC_ERROR",
                        "message": "Inconsistent date sequence: Issue date before passing year.",
                        "severity": "CRITICAL"
                    })
        except:
            pass

        return {"anomalies": anomalies}

    @staticmethod
    def verify_marksheet(ocr_results: dict) -> dict:
        text = ocr_results.get("text", "").lower()
        extracted_data = ocr_results.get("extracted_data", {})
        anomalies = []
        
        # 1. Marks Within Bounds
        # Obtained <= Maximum
        # 2. Result Consistency
        # Pass requires >= 30%, Fail requires <= 50%
        
        total_str = extracted_data.get("total_marks", "0")
        max_str = extracted_data.get("max_total", "100")
        percentage_str = extracted_data.get("percentage", "0")
        result = extracted_data.get("result", "").lower()
        
        try:
            total = float(total_str)
            max_val = float(max_str)
            percentage = float(percentage_str.replace('%', '')) if percentage_str else (total/max_val)*100
            
            if total > max_val:
                anomalies.append({
                    "type": "MARKS_OUT_OF_BOUNDS",
                    "message": f"Obtained marks ({total}) exceed maximum marks ({max_val}).",
                    "severity": "CRITICAL"
                })
            
            if "pass" in result and percentage < 30:
                anomalies.append({
                    "type": "RESULT_INCONSISTENCY",
                    "message": f"Student passed with low percentage ({percentage}%). Pass usually requires >= 30%.",
                    "severity": "CRITICAL"
                })
            elif "fail" in result and percentage > 50:
                 anomalies.append({
                    "type": "RESULT_INCONSISTENCY",
                    "message": f"Student failed with high percentage ({percentage}%). Fail usually occurs below 50%.",
                    "severity": "CRITICAL"
                })
        except:
            pass

        return {"anomalies": anomalies}

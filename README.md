# AL Authenticator - Forensic Document Validation System

An intelligent, full-stack application designed to automatically validate transport invoices and warranty claim documents. The system uses advanced OCR (PaddleOCR) and machine learning models to detect fake, invalid, or forged Chassis Numbers and Vehicle Registration Numbers (VRN) across various document types.

## 🌟 Key Features

- **Automated Forensic Pipeline**: Automatically detects document types (Investigation Reports, Invoices, Estimations, Rejections) and verifies if the submitted folder meets the criteria for specific ticket categories (e.g., PAID / PURE, WARR).
- **Chassis & Registration Verification**: Extracts and cross-verifies vehicle identification numbers across all submitted documents to ensure consistency and detect fraud.
- **Intelligent Amount Validation**: Extracts claim amounts from documentation and ensures they match expected totals.
- **Native Folder Upload**: Features a custom-built Streamlit component that allows users to upload entire ticket folders securely via their web browser natively, parsing the 10-digit Ticket ID directly from the folder structure.
- **OCR Preview**: A built-in expander UI to preview the raw text extracted by PaddleOCR from PDFs and Images directly in the dashboard.
- **Batch Processing**: Validate dozens of tickets at once with the batch processing mode, and export comprehensive forensic reports to CSV or Excel.

## 🏗️ Architecture

The system is split into two decoupled layers for maximum scalability and cross-platform compatibility:

1. **Backend (`/backend`)**: A high-performance Python FastAPI server that handles the heavy lifting—running PaddleOCR, executing the forensic segregation logic, and classifying documents.
2. **Frontend (`/streamlit_frontend`)**: A modern, interactive Streamlit dashboard. The frontend is completely client-oriented, meaning it can be hosted on a cloud server while users access it and upload local folders from their own browsers.

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- PaddleOCR dependencies

### 1. Start the Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Start the Frontend
In a new terminal window:
```bash
cd streamlit_frontend
pip install -r requirements.txt
streamlit run app2.py
```

*Note: The frontend uses `app2.py` as the primary application file, which includes the updated native folder picker component.*

## 📁 Repository Structure
- `backend/` - FastAPI application, OCR pipeline, and API endpoints.
- `streamlit_frontend/` - Streamlit application and custom frontend components.
- `streamlit_frontend/folder_picker_component/` - Custom bi-directional HTML/JS component enabling native OS folder selection in the browser.

## 🔒 Privacy & Security
This repository is configured to ignore `dataset/` and `storage_forensics/` directories to ensure that no Personally Identifiable Information (PII) or sensitive customer documents are pushed to version control.
# DocAuth

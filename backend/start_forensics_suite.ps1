# Forensic Suite Startup Script
# This script launches the Backend API, Redis check, and Celery Worker.

Write-Host "--- AL Authenticator Forensic Suite Startup ---" -ForegroundColor Cyan

# Set PYTHONPATH to ensure local modules are discoverable
$env:PYTHONPATH = "."

# 1. Check for Redis
Write-Host "[1/3] Checking Redis Connectivity..." -ForegroundColor Yellow
$redisCheck = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet
if (-not $redisCheck) {
    Write-Host "WARNING: Redis not detected on localhost:6379." -ForegroundColor Red
    Write-Host "Please ensure Redis is running (e.g., 'docker-compose up -d redis' or local service)." -ForegroundColor Gray
    Write-Host "The suite might fail to process documents without Redis." -ForegroundColor Gray
}
else {
    Write-Host "SUCCESS: Redis is online." -ForegroundColor Green
}

# 2. Start Celery Worker (In a new window)
Write-Host "[2/3] Launching Celery Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='.'; cd backend; python -m celery -A celery_app worker --loglevel=info -P solo"
Write-Host "SUCCESS: Worker process initiated." -ForegroundColor Green

# 3. Start FastAPI Backend (In a new window)
Write-Host "[3/3] Launching FastAPI Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='.'; cd backend; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
Write-Host "SUCCESS: API Server process initiated." -ForegroundColor Green

Write-Host "`nSuite startup complete. Frontend will now communicate on http://localhost:8000" -ForegroundColor Cyan
Write-Host "Note: If you see 'Failed to fetch', please check the two new PowerShell windows for error messages." -ForegroundColor White

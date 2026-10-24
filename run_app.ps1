# Master Startup Script for AL Authenticator
# This script launches the Redis (via Docker), Backend, Worker, and Frontend.

Write-Host "--- Starting AL Authenticator Ecosystem ---" -ForegroundColor Cyan

# 1. Start Redis
Write-Host "[1/4] Ensuring Redis is running..." -ForegroundColor Yellow
docker-compose up -d redis
if ($?) {
    Write-Host "SUCCESS: Redis container is up." -ForegroundColor Green
}
else {
    Write-Host "WARNING: Failed to start Redis via Docker. If you have a local Redis installed, please ensure it's running on port 6379." -ForegroundColor Red
}

# 2. Start Celery Worker (In a new window)
Write-Host "[2/4] Launching Celery Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='.'; cd backend; python -m celery -A celery_app worker --loglevel=info -P solo"
Write-Host "SUCCESS: Worker process initiated." -ForegroundColor Green

# 3. Start FastAPI Backend (In a new window)
Write-Host "[3/4] Launching FastAPI Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='.'; cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
Write-Host "SUCCESS: API Server process initiated." -ForegroundColor Green

# 4. Start Next.js Frontend (In a new window)
Write-Host "[4/4] Launching Next.js Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
Write-Host "SUCCESS: Frontend development server initiated." -ForegroundColor Green

Write-Host "`nAll systems launched!" -ForegroundColor Cyan
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "API Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "`nPlease wait a few seconds for windows to initialize." -ForegroundColor Gray

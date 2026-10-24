@echo off
echo ==========================================
echo   Verentis Vehicle Forensic Setup Script
echo ==========================================

echo.
echo [1/2] Installing Frontend Dependencies (Next.js/React)...
cd frontend
call npm install
cd ..

echo.
echo [2/2] Installing Backend Dependencies (Python/FastAPI)...
cd backend
pip install -r requirements.txt
cd ..

echo.
echo ==========================================
echo   Setup Complete! You are ready to run the app.
echo ==========================================
pause

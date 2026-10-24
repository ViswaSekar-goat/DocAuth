@echo off
title Verentis - Starting Services...
color 0A
echo.
echo  ============================================
echo   VERENTIS - Forensic Intelligence Platform
echo  ============================================
echo.
echo  [1/2] Starting Backend (FastAPI)...
start "Verentis Backend" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate && python -m uvicorn app.main:app --host localhost --port 8000"

timeout /t 2 /nobreak >nul

echo  [2/2] Starting Frontend (Next.js)...
start "Verentis Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  ============================================
echo   Both services are launching in new windows
echo   Backend  -> http://localhost:8000
echo   Frontend -> http://localhost:3000
echo  ============================================
echo.
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"

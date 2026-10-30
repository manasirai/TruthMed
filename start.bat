@echo off
title TruthMed

echo Starting TruthMed...
echo  Backend  → http://localhost:8001
echo  Frontend → http://localhost:5173
echo  API Docs → http://localhost:8001/docs
echo.

:: Start backend in a new window
start "TruthMed Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --reload --port 8001"

:: Give backend a moment to start
timeout /t 2 /nobreak >nul

:: Start frontend in a new window
start "TruthMed Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Both servers launched in separate windows.
echo Close those windows to stop the servers.
pause

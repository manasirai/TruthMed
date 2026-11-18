@echo off
REM Start the API on http://localhost:8000 (docs at /docs). Extra args go to uvicorn, e.g. run.bat --port 9000
cd /d "%~dp0"
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 %*

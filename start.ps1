# TruthMed startup script (PowerShell)
# Run with: .\start.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting TruthMed..." -ForegroundColor Cyan
Write-Host "  Backend  -> http://localhost:8001" -ForegroundColor Green
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Green
Write-Host "  API Docs -> http://localhost:8001/docs" -ForegroundColor Green
Write-Host ""

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; uvicorn main:app --reload --port 8001" -WindowStyle Normal

# Brief pause so backend gets a head start
Start-Sleep -Seconds 2

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev" -WindowStyle Normal

Write-Host "Both servers started in separate windows." -ForegroundColor Cyan
Write-Host "Close those windows (or press Ctrl+C in each) to stop." -ForegroundColor Gray

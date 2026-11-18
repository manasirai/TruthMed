# Start the API on http://localhost:8000 (docs at /docs)
Set-Location $PSScriptRoot
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 @args

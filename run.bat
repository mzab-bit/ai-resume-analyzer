@echo off
echo Starting AI Resume Analyzer...
start http://127.0.0.1:8000
.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause

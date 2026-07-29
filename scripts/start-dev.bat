@echo off
start "ATADAN API" cmd /k "cd /d %~dp0..\backend && python -m uvicorn app.main:app --reload --port 8000"
start "ATADAN Frontend" cmd /k "cd /d %~dp0..\frontend && npm run dev"

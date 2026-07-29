@echo off
cd /d %~dp0..\frontend
call npm install || exit /b 1
call npm run test || exit /b 1
call npm run build || exit /b 1
cd /d %~dp0..\backend
python -m pytest

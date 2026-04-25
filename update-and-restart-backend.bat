@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo   CodeShield Backend Sync ^& Restart
echo ===========================================

set REMOTE_USER=g627harshit
set REMOTE_PATH=/home/g627harshit/terminal-backend

echo.
echo 1. Uploading server.js...
gcloud compute scp terminal-backend/server.js %REMOTE_USER%@codeshield-workspace:%REMOTE_PATH%/server.js --zone=us-central1-a --quiet
if %errorlevel% neq 0 (
    echo [FAILED] Failed to upload server.js
    pause
    exit /b %errorlevel%
) else (
    echo [DONE] server.js uploaded successfully.
)

echo.
echo 2. Uploading library files...
gcloud compute scp --recurse terminal-backend/lib %REMOTE_USER%@codeshield-workspace:%REMOTE_PATH%/ --zone=us-central1-a --quiet
if %errorlevel% neq 0 (
    echo [FAILED] Failed to upload library files
    pause
    exit /b %errorlevel%
) else (
    echo [DONE] Library files uploaded successfully.
)

echo.
echo 3. Restarting Service via PM2...
gcloud compute ssh %REMOTE_USER%@codeshield-workspace --zone=us-central1-a --command="cd %REMOTE_PATH% && pm2 restart terminal-backend" --quiet
if %errorlevel% neq 0 (
    echo [FAILED] Failed to restart PM2 service
    pause
    exit /b %errorlevel%
) else (
    echo [DONE] PM2 service restarted successfully.
)

echo.
echo ===========================================
echo ✅ Update complete and service restarted!
echo ===========================================
echo.
pause

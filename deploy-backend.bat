@echo off
echo [CodeShield] Syncing Terminal Backend to GCP...
gcloud compute scp --recurse terminal-backend codeshield-workspace:~/ --zone=us-central1-a --quiet
echo.
echo [CodeShield] Backend files uploaded. Restarting service...
gcloud compute ssh codeshield-workspace --zone=us-central1-a --command="sudo systemctl restart terminal-backend || node ~/terminal-backend/server.js" --quiet
echo.
echo [CodeShield] Deployment Complete!
pause

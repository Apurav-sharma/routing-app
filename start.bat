@echo off
echo ========================================================
echo Starting Spotter Weather-Aware Truck Router...
echo ========================================================

start "Django Backend Server" cmd /k ".\venv\Scripts\python manage.py runserver 127.0.0.1:8000"
start "React Vite Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Backend running at: http://127.0.0.1:8000
echo Frontend running at: http://127.0.0.1:5173
echo ========================================================

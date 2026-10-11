#!/usr/bin/env bash
echo "========================================================"
echo "Starting Spotter Weather-Aware Truck Router..."
echo "========================================================"

# Start backend
python3 manage.py runserver 127.0.0.1:8000 &
BACKEND_PID=$!

# Start frontend
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "Backend running at: http://127.0.0.1:8000"
echo "Frontend running at: http://127.0.0.1:5173"
echo "========================================================"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait

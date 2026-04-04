#!/bin/bash
# MADCAP Startup Script
set -e

echo "Starting MADCAP..."
echo ""
echo "Frontend: http://localhost:8081/"
echo "Admin panel: http://localhost:8081/admin/login"
echo "API: http://localhost:8081/api/*"
echo "Health check: http://localhost:8081/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Check Python is available
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "Error: Python is not installed or not in PATH"
    exit 1
fi

# Use python3 if python is not available
if command -v python &> /dev/null; then
    PYTHON=python
else
    PYTHON=python3
fi

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Check Flask is installed
if ! $PYTHON -c "import flask" 2>/dev/null; then
    echo "Flask not found. Installing dependencies..."
    $PYTHON -m pip install -r requirements.txt
fi

# Start the app
$PYTHON admin/app.py

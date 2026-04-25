#!/bin/bash
# Send all output directly to the serial console so the AI can read it
exec > /dev/console 2>&1
echo "=== EMERGENCY RESTORE SCRIPT START ==="

echo "Searching for terminal-backend directory..."
BACKEND_DIR=$(find /home -name "terminal-backend" -type d | head -n 1)

if [ -z "$BACKEND_DIR" ]; then
    echo "CRITICAL ERROR: terminal-backend directory not found anywhere in /home!"
else
    echo "SUCCESS: Found terminal backend at: $BACKEND_DIR"
    cd "$BACKEND_DIR" || exit
    
    echo "Installing dependencies..."
    npm install
    
    echo "Killing any existing node processes..."
    pkill -f "node server.js"
    
    echo "Launching terminal backend..."
    nohup node server.js > /tmp/terminal-server-boot.log 2>&1 &
    
    echo "Terminal backend successfully launched in background."
fi

echo "=== EMERGENCY RESTORE SCRIPT END ==="

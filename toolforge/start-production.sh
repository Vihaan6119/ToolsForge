#!/bin/bash
# Production startup script for ToolsForge PDF Editor

set -e

echo "Starting ToolsForge PDF Editor..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the application
echo "Starting application..."
npm start

# Alternative: For production with process manager (recommended)
# pm2 start npm --name "toolforge-pdf-editor" -- start
# pm2 save

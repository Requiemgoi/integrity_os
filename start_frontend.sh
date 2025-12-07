#!/bin/bash
echo "Starting IntegrityOS Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
npm start


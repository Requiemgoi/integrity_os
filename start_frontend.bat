@echo off
echo Starting IntegrityOS Frontend...
cd frontend
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo Starting React App...
call npm start


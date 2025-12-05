@echo off
echo Starting IntegrityOS Backend...
cd backend

REM Check if venv exists, if not create it
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate

REM Upgrade pip first
echo Upgrading pip...
python -m pip install --upgrade pip wheel setuptools

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Start server
echo Starting FastAPI (IntegrityOS)...
uvicorn app.main:fastapi_app --reload --host 0.0.0.0 --port 8000


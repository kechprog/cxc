@echo off
cd /d "%~dp0"

echo --- Setting up Speaker-ID Service ---
cd services\speaker-id

REM Determine Python command (User preference: py)
set PYTHON_CMD=py
echo Using Python command: %PYTHON_CMD%

REM Check for corrupted venv
IF EXIST ".venv" (
    IF NOT EXIST ".venv\Scripts\activate.bat" (
        echo Virtual environment appears corrupted. Removing...
        rmdir /s /q .venv
    )
)

IF NOT EXIST ".venv" (
    echo Creating Python virtual environment...
    %PYTHON_CMD% -m venv .venv
    IF ERRORLEVEL 1 (
        echo Error creating virtual environment.
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call .venv\Scripts\activate
IF ERRORLEVEL 1 (
    echo Error activating virtual environment.
    pause
    exit /b 1
)

echo Installing dependencies...
%PYTHON_CMD% -m pip install -r requirements.txt

echo Starting speaker-id service on :8100...
start "Speaker-ID Service" cmd /k "call .venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8100 --reload"

echo.
echo --- Setting up Next.js App ---
cd /d "%~dp0\reflectif"
IF NOT EXIST "node_modules" (
    echo Installing node modules...
    call npm install
)

echo Starting Next.js...
start "Next.js App" cmd /k "npm run dev"

echo.
echo Services started in separate windows.
pause

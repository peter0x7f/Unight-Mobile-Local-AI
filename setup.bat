@echo off
setlocal

echo [Rowan Node Setup] Checking environment...

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js (LTS).
    exit /b 1
) else (
    echo [OK] Node.js found.
)

:: Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed.
    exit /b 1
) else (
    echo [OK] npm found.
)

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Python is not installed or not in PATH.
    echo           Python is optional but required for HuggingFace model downloads.
) else (
    echo [OK] Python found.
)

:: Check Cloudflared
cloudflared --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Cloudflared is not installed or not in PATH.
    echo           Tunnel functionality will not work without it.
    echo           Download at https://github.com/cloudflare/cloudflared/releases
) else (
    echo [OK] Cloudflared found.
)

:: Check Ollama
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Ollama is not installed or not in PATH.
    echo           You will need Ollama running for chat functionality.
    echo           Download at https://ollama.com/
) else (
    echo [OK] Ollama found.
)

:: Setup .env
if not exist .env (
    echo [INFO] Creating .env from template...
    copy env.template .env
    echo [OK] .env created. Please edit it with your configuration.
) else (
    echo [INFO] .env already exists. Skipping creation.
)

:: Setup Python virtual environment (if Python is available)
where python >nul 2>&1
if %errorlevel% equ 0 (
    if not exist venv (
        echo [INFO] Creating Python virtual environment...
        python -m venv venv
        echo [OK] Virtual environment created.
    ) else (
        echo [INFO] Virtual environment already exists.
    )
    
    echo [INFO] Installing Python dependencies...
    call venv\Scripts\activate.bat
    pip install -q -r requirements.txt
    call deactivate
    echo [OK] Python dependencies installed.
)

:: Install Dependencies
echo [INFO] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    exit /b 1
)

echo.
echo [SUCCESS] Setup complete!
echo.
echo To start the server:
echo   npm start
echo.
echo To generate QR code:
echo   npm run qr
echo.
pause

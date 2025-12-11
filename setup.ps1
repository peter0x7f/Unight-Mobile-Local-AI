Write-Host "[Rowan Node Setup] Checking environment..." -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed. Please install Node.js (LTS)." -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm is not installed." -ForegroundColor Red
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Python is not installed or not in PATH." -ForegroundColor Yellow
    Write-Host "          Python is optional but required for HuggingFace model downloads."
    Write-Host "          Download at https://www.python.org/"
}

# Check Ollama
try {
    $ollamaVersion = ollama --version
    Write-Host "[OK] Ollama found: $ollamaVersion" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Ollama is not installed or not in PATH." -ForegroundColor Yellow
    Write-Host "          You will need Ollama running for chat functionality."
    Write-Host "          Download at https://ollama.com/"
}

# Check Cloudflared
try {
    $cloudflaredVersion = cloudflared --version
    Write-Host "[OK] Cloudflared found: $cloudflaredVersion" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Cloudflared is not installed or not in PATH." -ForegroundColor Yellow
    Write-Host "          Tunnel functionality will not work without it."
    Write-Host "          Download at https://github.com/cloudflare/cloudflared/releases"
}

# Setup .env
if (-not (Test-Path .env)) {
    Write-Host "[INFO] Creating .env from template..." -ForegroundColor Cyan
    Copy-Item env.template .env
    Write-Host "[OK] .env created. Please edit it with your configuration." -ForegroundColor Green
} else {
    Write-Host "[INFO] .env already exists. Skipping creation." -ForegroundColor Gray
}

# Setup Python virtual environment (if Python is available)
if (Get-Command python -ErrorAction SilentlyContinue) {
    if (-not (Test-Path "venv")) {
        Write-Host "[INFO] Creating Python virtual environment..." -ForegroundColor Cyan
        python -m venv venv
        Write-Host "[OK] Virtual environment created." -ForegroundColor Green
    } else {
        Write-Host "[INFO] Virtual environment already exists." -ForegroundColor Gray
    }
    
    # Install Python dependencies
    Write-Host "[INFO] Installing Python dependencies..." -ForegroundColor Cyan
    & .\venv\Scripts\Activate.ps1
    pip install -q -r requirements.txt
    deactivate
    Write-Host "[OK] Python dependencies installed." -ForegroundColor Green
}

# Install Dependencies
Write-Host "[INFO] Installing dependencies..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the server:"
    Write-Host "  npm start"
    Write-Host ""
    Write-Host "To generate QR code:"
    Write-Host "  npm run qr"
    Write-Host ""
} else {
    Write-Host "[ERROR] Failed to install dependencies." -ForegroundColor Red
    exit 1
}

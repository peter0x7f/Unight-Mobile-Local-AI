#!/bin/bash

echo "[Rowan Node Setup] Checking environment..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js (LTS)."
    exit 1
else
    echo "[OK] Node.js found: $(node --version)"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not installed."
    exit 1
else
    echo "[OK] npm found."
fi

# Check Python
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "[WARNING] Python is not installed or not in PATH."
    echo "          Python is optional but required for HuggingFace model downloads."
    echo "          Download at https://www.python.org/"
else
    if command -v python3 &> /dev/null; then
        echo "[OK] Python found: $(python3 --version)"
        echo -e "${GREEN}[OK]${NC} Python found: $(python3 --version)"
    else
        echo -e "${GREEN}[OK]${NC} Python found: $(python --version)"
    fi
fi

# Check Cloudflared
if command -v cloudflared &> /dev/null; then
    echo -e "${GREEN}[OK]${NC} Cloudflared is installed."
else
    echo -e "${YELLOW}[WARNING]${NC} Cloudflared not found. Tunnel functionality will not work."
    echo "          Install: curl -fsSL https://pkg.cloudflare.com/install.sh | sudo bash"
fi

# Check Ollama
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}[WARNING]${NC} Ollama is not installed or not in PATH."
    echo "          You will need Ollama running for chat functionality."
    echo "          Download at https://ollama.com/"
else
    echo -e "${GREEN}[OK]${NC} Ollama found."
fi

# Setup .env
if [ ! -f .env ]; then
    echo -e "${CYAN}[INFO]${NC} Creating .env from template..."
    cp env.template .env
    echo -e "${GREEN}[OK]${NC} .env created. Please edit it with your configuration."
else
    echo -e "${GRAY}[INFO]${NC} .env already exists. Skipping creation."
fi

# Setup Python virtual environment (if Python is available)
if command -v python3 &> /dev/null || command -v python &> /dev/null; then
    PYTHON_CMD=$(command -v python3 || command -v python)
    
    if [ ! -d "venv" ]; then
        echo "[INFO] Creating Python virtual environment..."
        $PYTHON_CMD -m venv venv
        echo "[OK] Virtual environment created."
    else
        echo "[INFO] Virtual environment already exists."
    fi
    
    # Install Python dependencies
    echo "[INFO] Installing Python dependencies..."
    source venv/bin/activate
    pip install -q -r requirements.txt
    deactivate
    echo "[OK] Python dependencies installed."
fi

# Install Dependencies
echo "[INFO] Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "[SUCCESS] Setup complete!"
    echo ""
    echo "To start the server:"
    echo "  npm start"
    echo ""
    echo "To generate QR code:"
    echo "  npm run qr"
    echo ""
else
    echo "[ERROR] Failed to install dependencies."
    exit 1
fi

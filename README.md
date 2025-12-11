# UNIGHT LOCAL AI SERVER FOR PHONE
![unight logo](/long-logo-white.png)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Cloudflare Tunnel (cloudflared)

**Windows:**
```powershell
# Download from https://github.com/cloudflare/cloudflared/releases
# Or use Scoop:
scoop install cloudflared
```

**Linux/Mac:**
```bash
curl -fsSL https://pkg.cloudflare.com/install.sh | sudo bash
```

Verify installation:
```bash
cloudflared --version
```

### 3. Start Rowan Node

This single command will:
- Prompt for username/password (first time only)
- Start the API server
- Start Cloudflare tunnel
- Display QR code for mobile access

```bash
npm run rowan
```

Scan the QR code with your phone to access your Rowan node!

---

## Individual Scripts

### User Setup (Local Only)
```bash
npm run setup
```
Creates local user account (no API endpoint - secure local-only registration).

### Start Server Only
```bash
npm start
```

### Start Tunnel + QR (Quick Mode)
```bash
npm run tunnel
```
Starts a temporary Cloudflare tunnel with random URL.

### Show QR for Named Tunnel
```bash
npm run qr
```
Displays QR for your configured domain (requires named tunnel setup).

### Chat CLI
```bash
npm run chat
```

---

## Tunnel Modes

### Quick Tunnel (Default - No Setup Required)

Uses a random Cloudflare URL like `https://abc123.trycloudflare.com`.

**Pros:**
- No configuration needed
- Works immediately
- Great for testing

**Cons:**
- URL changes each time
- Temporary

**Usage:**
```bash
TUNNEL_MODE=quick npm run rowan
```

### Named Tunnel (Stable Domain)

Uses your own domain like `https://rowan.yourdomain.com`.

**Pros:**
- Stable URL
- Professional
- Permanent

**Cons:**
- Requires Cloudflare account
- Requires domain setup

**Setup:**

1. **Authenticate with Cloudflare:**
   ```bash
   cloudflared tunnel login
   ```

2. **Create Named Tunnel:**
   ```bash
   cloudflared tunnel create rowan-home
   ```

3. **Route Subdomain:**
   ```bash
   cloudflared tunnel route dns rowan-home rowan.yourdomain.com
   ```

4. **Create Config File** (`/etc/cloudflared/config.yml` or `C:\Users\USERNAME\.cloudflared\config.yml`):
   ```yaml
   tunnel: rowan-home
   credentials-file: /path/to/tunnel-credentials.json

   ingress:
     - hostname: rowan.yourdomain.com
       service: http://localhost:8000
     - service: http_status:404
   ```

5. **Install as Service:**
   ```bash
   sudo cloudflared service install
   sudo systemctl start cloudflared
   ```

6. **Update .env:**
   ```
   TUNNEL_MODE=named
   PUBLIC_URL=https://rowan.yourdomain.com
   ```

7. **Run:**
   ```bash
   npm run rowan
   ```

---

## Environment Variables

Copy `.env.template` to `.env` and configure:

```env
PORT=8000                                    # API server port
OLLAMA_URL=http://127.0.0.1:11434          # Ollama API
ROWAN_MODEL=llama3.2-latest                 # Default model
JWT_SECRET=your-secret-key                  # Change this!
JWT_EXPIRES_IN=7d                           # Token expiration
DB_FILE=./rowan.db                          # Database file
LOCAL_API_URL=http://localhost:8000         # Local server URL
TUNNEL_MODE=quick                           # quick or named
PUBLIC_URL=http://localhost:8000            # For named mode
```

---

## Security Notes

### ✅ Registration is Local-Only

User registration has been **removed** from the API. You can only create users locally via:

```bash
npm run setup
```

This prevents unauthorized users from creating accounts on your node.

### ✅ JWT Authentication

All API endpoints (except `/health` and `/auth/login`) require a valid JWT token.

### ✅ Cloudflare Protection

Cloudflare Tunnel provides:
- DDoS protection
- Rate limiting
- SSL/TLS encryption
- No need to expose ports

---

## Troubleshooting

### "cloudflared: command not found"

Install cloudflared (see Installation section above).

### "Error: EADDRINUSE"

Port 8000 is already in use. Either:
1. Stop the existing process
2. Change PORT in `.env`

### Tunnel doesn't start

Check if cloudflared is installed:
```bash
cloudflared --version
```

Enable verbose logging:
```bash
VERBOSE=true npm run tunnel
```

### QR code doesn't appear

Make sure `qrcode-terminal` is installed:
```bash
npm install qrcode-terminal
```

---

## Mobile App Integration

After scanning the QR code, your mobile app should:

1. **Check connectivity:**
   ```
   GET <public-url>/health
   ```

2. **Login:**
   ```
   POST <public-url>/auth/login
   Body: {"username": "...", "password": "..."}
   ```

3. **Store JWT token**

4. **Use API:**
   ```
   Authorization: Bearer <token>
   POST <public-url>/api/chat
   GET <public-url>/api/conversations
   ```

---

## Development Workflow

### Local Development (no tunnel)
```bash
npm run dev
```

### Testing with Tunnel
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run tunnel
```

### Production
```bash
# Setup named tunnel (once)
# ... follow Named Tunnel setup above ...

# Start everything
npm run rowan
```

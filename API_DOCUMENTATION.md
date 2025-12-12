# Rowan Node API Documentation

Base URL: `http://127.0.0.1:8000`

## Authentication

### Login
**Endpoint:** `POST /auth/login`

**Description:** Authenticate user and receive JWT token

**Request Body:**
```json
{
  "username": "mal",
  "password": "Malcolm#1"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "mal"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

## Conversations

### Create Conversation
**Endpoint:** `POST /api/conversations`

**Auth Required:** Yes (Bearer token)

**Request Body:**
```json
{
  "title": "My Chat Session"  // Optional
}
```

**Response (200):**
```json
{
  "id": "07a49703-81cc-460d-8ee6-0f9b02bdbb87",
  "user_id": 1,
  "title": "My Chat Session",
  "created_at": "2025-12-12 20:51:09",
  "updated_at": "2025-12-12 20:51:09"
}
```

### List Conversations
**Endpoint:** `GET /api/conversations`

**Auth Required:** Yes

**Response (200):**
```json
[
  {
    "id": "07a49703-81cc-460d-8ee6-0f9b02bdbb87",
    "user_id": 1,
    "title": "My Chat Session",
    "created_at": "2025-12-12 20:51:09",
    "updated_at": "2025-12-12 21:05:15"
  }
]
```

### Get Conversation Messages
**Endpoint:** `GET /api/conversations/:id/messages?limit=50`

**Auth Required:** Yes

**Query Parameters:**
- `limit` (optional): Number of messages to retrieve (default: 50)

**Response (200):**
```json
{
  "conversation_id": "07a49703-81cc-460d-8ee6-0f9b02bdbb87",
  "messages": [
    {
      "id": 1,
      "conversation_id": "07a49703-81cc-460d-8ee6-0f9b02bdbb87",
      "role": "user",
      "content": "Hello!",
      "created_at": "2025-12-12 20:51:09"
    },
    {
      "id": 2,
      "conversation_id": "07a49703-81cc-460d-8ee6-0f9b02bdbb87",
      "role": "assistant",
      "content": "Hi! How can I help you?",
      "created_at": "2025-12-12 20:51:10"
    }
  ]
}
```

---

## Chat

### Send Chat Message
**Endpoint:** `POST /api/chat`

**Auth Required:** Yes

**Request Body:**
```json
{
  "conversation_id": "07a49703-81cc-460d-8ee6-0f9b02bdbb87",
  "message": "What is the weather like?",
  "model": "llama3.2-latest"  // Optional, defaults to llama3.2-latest
}
```

**Response (200):**
```json
{
  "conversation_id": "07a49703-81cc-460d-8ee6-0f9b02bdbb87",
  "reply": "I don't have access to real-time weather data...",
  "model": "llama3.2-latest",
  "messages_appended": 2
}
```

**Response (404):**
```json
{
  "error": "Conversation not found"
}
```

**Response (500):**
```json
{
  "error": "Failed to process chat message",
  "details": "Ollama API error: Not Found"
}
```

---

## Models

### List Available Models
**Endpoint:** `GET /api/models/available`

**Auth Required:** Yes

**Description:** Lists models defined in `models_config.js`

**Response (200):**
```json
[
  {
    "name": "llama3.2-latest",
    "type": "ollama",
    "details": {
      "ollama": "llama3.2:latest",
      "max_tokens": 2048
    }
  },
  {
    "name": "deepseek-r1-8b",
    "type": "ollama",
    "details": {
      "ollama": "deepseek-r1:8b",
      "max_tokens": 512,
      "force_english": true
    }
  }
]
```

### List Installed Models
**Endpoint:** `GET /api/models/installed`

**Auth Required:** Yes

**Description:** Lists models actually installed in Ollama

**Response (200):**
```json
{
  "models": [
    {
      "name": "llama3.2:1b",
      "model": "llama3.2:1b",
      "modified_at": "2025-12-10T11:19:47-05:00",
      "size": 1321098329,
      "digest": "baf6a787fdffd633537aa2eb51cfd54cb93ff08e28040095462bb63daf552878"
    }
  ],
  "ollama_available": true
}
```

**Response (Ollama Unavailable):**
```json
{
  "models": [],
  "ollama_available": false,
  "error": "connect ECONNREFUSED"
}
```

### Download Model
**Endpoint:** `POST /api/models/download`

**Auth Required:** Yes

**Description:** Triggers Ollama to download a model

**Request Body:**
```json
{
  "name": "llama3.2-latest"
}
```

**Response (200):**
```json
{
  "status": "download_started",
  "message": "Ollama download started for llama3.2:latest. Check /api/models/installed later."
}
```

---

## Health Check

### Health Status
**Endpoint:** `GET /health`

**Auth Required:** No

**Response (200):**
```json
{
  "status": "ok"
}
```

---

## Headers

All authenticated requests must include:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "conversation_id and message required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized: Missing token"
}
```

### 404 Not Found
```json
{
  "error": "Conversation not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process chat message",
  "details": "Additional error information"
}
```

---

## Example cURL Requests

### Login
```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mal","password":"Malcolm#1"}'
```

### Create Conversation
```bash
curl -X POST http://127.0.0.1:8000/api/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat"}'
```

### Send Chat Message
```bash
curl -X POST http://127.0.0.1:8000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id":"07a49703-81cc-460d-8ee6-0f9b02bdbb87",
    "message":"Hello!",
    "model":"llama3.2-latest"
  }'
```

### List Installed Models
```bash
curl -X GET http://127.0.0.1:8000/api/models/installed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

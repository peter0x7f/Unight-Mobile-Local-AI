# Rowan API Documentation

## Overview

The Rowan API is a RESTful API that provides access to a local AI chat system with multi-model support, conversation management, and RAG (Retrieval-Augmented Generation) capabilities. The API is built on Node.js with Express and integrates with Ollama for local model inference.

**Base URL:** `http://127.0.0.1:8000`

**Authentication:** Most endpoints require JWT authentication. Include the token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Table of Contents

- [Authentication](#authentication)
  - [POST /auth/login](#post-authlogin)
- [Public Endpoints](#public-endpoints)
  - [GET /health](#get-health)
- [Agents](#agents)
  - [POST /api/agents](#post-apiagents)
  - [GET /api/agents](#get-apiagents)
  - [GET /api/agents/:id](#get-apiagentsid)
- [Conversations](#conversations)
  - [POST /api/conversations](#post-apiconversations)
  - [GET /api/conversations](#get-apiconversations)
  - [GET /api/conversations/:id/messages](#get-apiconversationsidmessages)
- [Chat](#chat)
  - [POST /api/chat](#post-apichat)
- [Model Management](#model-management)
  - [GET /api/models/available](#get-apimodelsavailable)
  - [GET /api/models/installed](#get-apimodelsinstalled)
  - [POST /api/models/download](#post-apimodelsdownload)


---

## Authentication

### POST /auth/login

Authenticate a user and receive a JWT token for accessing protected endpoints.

**Endpoint:** `POST /auth/login`

**Authentication Required:** No

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | The user's username |
| password | string | Yes | The user's password |

**Success Response (200):**
```json
{
  "user": {
    "id": "string",
    "username": "string"
  },
  "token": "string"
}
```

**Error Responses:**

- **400 Bad Request:**
  ```json
  {
    "error": "Username and password required"
  }
  ```

- **401 Unauthorized:**
  ```json
  {
    "error": "Invalid credentials"
  }
  ```

- **500 Internal Server Error:**
  ```json
  {
    "error": "Server error"
  }
  ```

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**Notes:**
- User registration is handled locally via the `setup-user.js` script, not through the API
- The JWT token returned should be stored and used for all subsequent API calls
- Tokens expire based on the configuration in `auth.js`

---

## Public Endpoints

### GET /health

Check the health status of the API server.

**Endpoint:** `GET /health`

**Authentication Required:** No

**Success Response (200):**
```json
{
  "status": "ok"
}
```

**Example:**
```bash
curl http://127.0.0.1:8000/health
```

**Notes:**
- This endpoint is useful for monitoring and health checks
- Always returns a 200 status code if the server is running

---

## Agents

Agents are AI personalities that manage conversations. When users first log in to the app, they name their orchestrator agent. Users can create multiple agents, and each conversation belongs to a specific agent. This enables recurrent memory of the orchestrator name and agent-specific context.

### POST /api/agents

Create a new agent (orchestrator or custom).

**Endpoint:** `POST /api/agents`

**Authentication Required:** Yes

**Request Body:**
```json
{
  "name": "string",
  "type": "string (optional)"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | The agent's name (e.g., "My Orchestrator") |
| type | string | No | Agent type: 'orchestrator' or 'custom' (defaults to 'orchestrator') |

**Success Response (200):**
```json
{
  "id": "uuid",
  "user_id": "integer",
  "name": "string",
  "type": "orchestrator|custom",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Error Responses:**

- **400 Bad Request:**
  ```json
  {
    "error": "Agent name required"
  }
  ```

- **500 Internal Server Error:**
  ```json
  {
    "error": "Failed to create agent"
  }
  ```

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rowan",
    "type": "orchestrator"
  }'
```

**Notes:**
- A unique UUID is automatically generated for each agent
- The agent is automatically associated with the authenticated user
- The default type is 'orchestrator' if not specified
- Orchestrator agents typically manage the main conversation flow

---

### GET /api/agents

Retrieve all agents for the authenticated user.

**Endpoint:** `GET /api/agents`

**Authentication Required:** Yes

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "user_id": "integer",
    "name": "string",
    "type": "orchestrator|custom",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

**Error Responses:**

- **500 Internal Server Error:**
  ```json
  {
    "error": "Failed to fetch agents"
  }
  ```

**Example:**
```bash
curl http://127.0.0.1:8000/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Notes:**
- Returns an array of all agents owned by the authenticated user
- Agents are ordered by creation date (oldest first)
- This allows the frontend to remember the orchestrator name

---

### GET /api/agents/:id

Retrieve a specific agent by ID.

**Endpoint:** `GET /api/agents/:id`

**Authentication Required:** Yes

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | The UUID of the agent |

**Success Response (200):**
```json
{
  "id": "uuid",
  "user_id": "integer",
  "name": "string",
  "type": "orchestrator|custom",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Error Responses:**

- **404 Not Found:**
  ```json
  {
    "error": "Agent not found"
  }
  ```

- **500 Internal Server Error:**
  ```json
  {
    "error": "Failed to fetch agent"
  }
  ```

**Example:**
```bash
curl http://127.0.0.1:8000/api/agents/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Notes:**
- Only returns agents owned by the authenticated user
- Returns 404 if the agent doesn't exist or doesn't belong to the user

---

## Conversations

Conversations now support being associated with specific agents. Each conversation can optionally belong to an agent.

### POST /api/conversations

Create a new conversation, optionally associated with an agent.

**Endpoint:** `POST /api/conversations`

**Authentication Required:** Yes

**Request Body:**
```json
{
  "title": "string (optional)",
  "agent_id": "uuid (optional)"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | No | Optional title for the conversation |
| agent_id | string | No | UUID of the agent this conversation belongs to |

**Success Response (200):**
```json
{
  "id": "uuid",
  "user_id": "string",
  "title": "string or null",
  "agent_id": "uuid or null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Error Responses:**

- **404 Not Found:**
  ```json
  {
    "error": "Agent not found"
  }
  ```

- **500 Internal Server Error:**
  ```json
  {
    "error": "Failed to create conversation"
  }
  ```

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/api/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Conversation",
    "agent_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

**Notes:**
- A unique UUID is automatically generated for each conversation
- The conversation is automatically associated with the authenticated user
- If no title is provided, it will be set to `null`
- If `agent_id` is provided, the agent must exist and belong to the authenticated user
- Conversations without an agent_id are general conversations not tied to a specific agent


---

### GET /api/conversations

Retrieve all conversations for the authenticated user.

**Endpoint:** `GET /api/conversations`

**Authentication Required:** Yes

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "user_id": "string",
    "title": "string or null",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

**Error Responses:**

- **500 Internal Server Error:**
  ```json
  {
    "error": "Failed to fetch conversations"
  }
  ```

**Example:**
```bash
curl http://127.0.0.1:8000/api/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Notes:**
- Returns an array of all conversations owned by the authenticated user
- Conversations are ordered by most recent activity

---

### GET /api/conversations/:id/messages

Retrieve messages for a specific conversation.

**Endpoint:** `GET /api/conversations/:id/messages`

**Authentication Required:** Yes

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | The UUID of the conversation |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | integer | No | 50 | Maximum number of messages to return |

**Success Response (200):**
```json
{
  "conversation_id": "uuid",
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "user_id": "string",
      "role": "user|assistant|system",
      "content": "string",
      "created_at": "timestamp"
    }
  ]
}
```

**Error Responses:**

- **404 Not Found:**
  ```json
  {
    "error": "Conversation not found"
  }
  ```

- **500 Internal Server Error:**
  ```json
  {
    "error": "Failed to fetch messages"
  }
  ```

**Example:**
```bash
curl "http://127.0.0.1:8000/api/conversations/123e4567-e89b-12d3-a456-426614174000/messages?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Notes:**
- Only returns messages from conversations owned by the authenticated user
- Messages are returned in chronological order
- The default limit is 50 messages, which can be overridden with the `limit` query parameter

---

## Chat

### POST /api/chat

Send a message to the AI and receive a response. This endpoint includes RAG (Retrieval-Augmented Generation) capabilities that retrieve relevant context from past conversations.

**Endpoint:** `POST /api/chat`

**Authentication Required:** Yes

**Request Body:**
```json
{
  "conversation_id": "uuid",
  "message": "string",
  "model": "string (optional)"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| conversation_id | string | Yes | UUID of the conversation |
| message | string | Yes | The user's message to send |
| model | string | No | Model name to use (defaults to env ROWAN_MODEL or 'llama3.2-latest') |

**Success Response (200):**
```json
{
  "conversation_id": "uuid",
  "reply": "string",
  "model": "string",
  "messages_appended": 2
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| conversation_id | string | The conversation UUID |
| reply | string | The AI-generated response |
| model | string | The model used for generation |
| messages_appended | integer | Number of messages added (user + assistant) |

**Error Responses:**

- **400 Bad Request:**
  ```json
  {
    "error": "conversation_id and message required"
  }
  ```

- **404 Not Found:**
  ```json
  {
    "error": "Conversation not found"
  }
  ```

- **500 Internal Server Error:**
  ```json
  {
    "error": "Failed to process chat message",
    "details": "Error description"
  }
  ```

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "What is the weather like today?",
    "model": "llama3.2-latest"
  }'
```

**Notes:**
- **RAG Integration:** The endpoint automatically:
  1. Generates embeddings for the user's message
  2. Searches for similar messages from past conversations
  3. Includes relevant context (similarity > 0.5) in the system prompt
  4. Generates embeddings for both user and assistant messages asynchronously
  
- **Model Selection:**
  - If `model` is not specified, falls back to `ROWAN_MODEL` environment variable
  - If `ROWAN_MODEL` is not set, defaults to `llama3.2-latest`
  - Model names are resolved from `models_config.js`
  
- **Message History:**
  - Loads the last 20 messages from the conversation as context
  - Includes both user and assistant messages for continuity
  
- **Special Features:**
  - Supports DeepSeek models with automatic English enforcement
  - Customizable temperature (default: 0.7)
  - Configurable max_tokens (default: 2048)
  - Conversation timestamps are automatically updated

---

### POST /api/chat/stream

Stream generated output to the client using NDJSON over HTTP/1.1. This endpoint provides real-time token streaming with backpressure handling.

**Endpoint:** `POST /api/chat/stream`

**Authentication Required:** Yes

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "conversation_id": "uuid",
  "message": "string",
  "model": "string (optional)"
}
```

**Response Headers:**
```
Content-Type: application/x-ndjson; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

**Response Format (NDJSON):**
The server sends a sequence of JSON objects, each followed by a newline character (`\n`).

**Frame Types:**

1. **Start Frame:**
   ```json
   { "type": "start", "conversation_id": "uuid", "ts": 1234567890 }
   ```

2. **Delta Frame (Token):**
   ```json
   { "type": "delta", "conversation_id": "uuid", "seq": 0, "delta": "Hello", "ts": 1234567890 }
   ```

3. **Done Frame:**
   ```json
   { "type": "done", "conversation_id": "uuid", "ts": 1234567890 }
   ```

4. **Error Frame:**
   ```json
   { "type": "error", "code": "ERROR_CODE", "message": "Description", "ts": 1234567890 }
   ```

**Example:**
```bash
curl -N -X POST http://127.0.0.1:8000/api/chat/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Count to 3"
  }'
```

**Notes:**
- **Backpressure:** The server respects client backpressure. If the client reads slowly, the server pauses generation.
- **RAG:** Includes the same RAG capabilities as the non-streaming endpoint.
- **Persistence:** User and assistant messages are saved to the database automatically.
- **Client Handling:** Clients should parse each line as a separate JSON object.

---


## Model Management

### GET /api/models/available

Get a list of available models from the configuration.

**Endpoint:** `GET /api/models/available`

**Authentication Required:** Yes

**Success Response (200):**
```json
[
  {
    "name": "string",
    "type": "ollama",
    "details": {
      "ollama": "string",
      "max_tokens": "integer",
      "force_english": "boolean (optional)"
    }
  }
]
```

**Error Responses:**

- **500 Internal Server Error:**
  ```json
  {
    "error": "Failed to load available models"
  }
  ```

**Example:**
```bash
curl http://127.0.0.1:8000/api/models/available \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Notes:**
- Returns models defined in `models_config.js`
- Only Ollama models are currently supported
- Each model includes its configuration details (max_tokens, force_english, etc.)

---

### GET /api/models/installed

Get a list of models currently installed in Ollama.

**Endpoint:** `GET /api/models/installed`

**Authentication Required:** Yes

**Success Response (200):**
```json
{
  "models": [
    {
      "name": "string",
      "size": "integer",
      "digest": "string",
      "modified_at": "timestamp"
    }
  ],
  "ollama_available": true
}
```

**Error/No Connection Response (200):**
```json
{
  "models": [],
  "ollama_available": false,
  "error": "string"
}
```

**Example:**
```bash
curl http://127.0.0.1:8000/api/models/installed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Notes:**
- Queries the Ollama API at `OLLAMA_URL/api/tags`
- 3-second timeout to prevent hanging
- Returns an empty array if Ollama is unavailable
- The `ollama_available` field indicates whether Ollama is reachable
- Even if Ollama is unavailable, returns 200 status (not an error)

---

### POST /api/models/download

Trigger a download (pull) of a model from Ollama.

**Endpoint:** `POST /api/models/download`

**Authentication Required:** Yes

**Request Body:**
```json
{
  "name": "string"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Model name to download (can be config name or Ollama tag) |

**Success Response (200):**
```json
{
  "status": "download_started",
  "message": "Ollama download started for <model_name>. Check /api/models/installed later."
}
```

**Error Responses:**

- **400 Bad Request:**
  ```json
  {
    "error": "Model name required"
  }
  ```

- **500 Internal Server Error:**
  ```json
  {
    "error": "Failed to trigger Ollama download"
  }
  ```

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/api/models/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "llama3.2-latest"
  }'
```

**Notes:**
- This endpoint triggers the download asynchronously and returns immediately
- The download happens in the background via Ollama
- If the model name exists in `models_config.js`, it resolves to the configured Ollama tag
- Otherwise, it uses the provided name as the Ollama tag directly
- Check `/api/models/installed` to verify when the download completes
- Error logs are written to the server console but not returned to the client

---

## Environment Variables

The API uses the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8000 | Port on which the server runs |
| OLLAMA_URL | http://127.0.0.1:11434 | URL of the Ollama API |
| ROWAN_MODEL | llama3.2-latest | Default model for chat completions |
| PUBLIC_URL | - | Public-facing URL for the API |
| JWT_SECRET | - | Secret key for JWT token signing |

---

## Data Models

### User
```json
{
  "id": "string",
  "username": "string",
  "password_hash": "string (hashed)",
  "created_at": "timestamp"
}
```

### Agent
```json
{
  "id": "uuid",
  "user_id": "integer",
  "name": "string",
  "type": "orchestrator|custom",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Conversation
```json
{
  "id": "uuid",
  "user_id": "string",
  "agent_id": "uuid or null",
  "title": "string or null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Message
```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "user_id": "string",
  "role": "user|assistant|system",
  "content": "string",
  "created_at": "timestamp"
}
```

### Embedding
```json
{
  "message_id": "uuid",
  "embedding": "blob (vector data)",
  "created_at": "timestamp"
}
```


---

## RAG (Retrieval-Augmented Generation)

The chat endpoint includes RAG capabilities that enhance responses with relevant context from past conversations.

### How It Works:

1. **Embedding Generation:**
   - When a user sends a message, the API generates a vector embedding using the `nomic-embed-text` model
   - Embeddings are stored asynchronously to avoid blocking the response

2. **Similarity Search:**
   - The query embedding is compared against stored embeddings using cosine similarity
   - Messages with similarity > 0.5 from different conversations are retrieved

3. **Context Injection:**
   - Relevant past messages are formatted and injected into the system prompt
   - The format: `[Past user/assistant]: <message content>`

4. **Enhanced Responses:**
   - The AI uses this context to provide more informed responses
   - The system can reference past conversations and maintain long-term memory

### Configuration:

- **Embedding Model:** `nomic-embed-text` (via Ollama)
- **Similarity Threshold:** 0.5
- **Max Retrieved Messages:** 5
- **Conversation History:** Last 20 messages

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

### Common HTTP Status Codes:

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 400 | Bad Request | Missing or invalid parameters |
| 401 | Unauthorized | Invalid credentials or missing token |
| 404 | Not Found | Resource not found or access denied |
| 500 | Internal Server Error | Server-side error |

---

## Rate Limiting

Currently, there is no rate limiting implemented. This may be added in future versions.

---

## CORS

CORS is enabled for all origins. In production environments, consider restricting this to specific domains.

---

## Security Notes

1. **Authentication:**
   - JWT tokens are used for authentication
   - Tokens should be stored securely on the client side
   - User registration is handled via local script for security

2. **Authorization:**
   - All protected endpoints verify resource ownership
   - Users can only access their own conversations and messages

3. **HTTPS:**
   - The API currently runs on HTTP (localhost)
   - For production, implement HTTPS

4. **Password Security:**
   - Passwords are hashed using bcrypt before storage
   - Never send passwords in query parameters or URL paths

---

## Support

For issues, questions, or feature requests, please refer to the project repository or documentation.

---

**Last Updated:** December 17, 2025
**API Version:** 1.0.0

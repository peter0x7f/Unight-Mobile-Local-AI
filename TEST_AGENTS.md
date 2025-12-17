# Agent API Endpoint Tests

## Test the agent endpoints with curl

### 1. Login first to get your token
```powershell
$loginResponse = curl -X POST http://127.0.0.1:8000/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"username\": \"mal\", \"password\": \"YOUR_PASSWORD_HERE\"}' | ConvertFrom-Json

$token = $loginResponse.token
Write-Host "Token: $token"
```

### 2. Create an agent (orchestrator)
```powershell
$agentResponse = curl -X POST http://127.0.0.1:8000/api/agents `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{\"name\": \"Rowan Orchestrator\", \"type\": \"orchestrator\"}' | ConvertFrom-Json

$agentId = $agentResponse.id
Write-Host "Agent ID: $agentId"
Write-Host "Agent Name: $($agentResponse.name)"
```

### 3. Get all agents
```powershell
curl -X GET http://127.0.0.1:8000/api/agents `
  -H "Authorization: Bearer $token"
```

### 4. Get specific agent
```powershell
curl -X GET "http://127.0.0.1:8000/api/agents/$agentId" `
  -H "Authorization: Bearer $token"
```

### 5. Create a conversation with agent_id
```powershell
$convResponse = curl -X POST http://127.0.0.1:8000/api/conversations `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d "{\"title\": \"Test with Agent\", \"agent_id\": \"$agentId\"}" | ConvertFrom-Json

Write-Host "Conversation ID: $($convResponse.id)"
Write-Host "Agent ID: $($convResponse.agent_id)"
```

### 6. Get all conversations (verify agent_id is included)
```powershell
curl -X GET http://127.0.0.1:8000/api/conversations `
  -H "Authorization: Bearer $token"
```

## Complete Test Script

Run this in PowerShell after replacing YOUR_PASSWORD_HERE with your actual password:

```powershell
# Replace this with your actual password
$password = "YOUR_PASSWORD_HERE"

Write-Host "`n🔐 Testing Authentication...`n" -ForegroundColor Cyan

# 1. Login
$loginResponse = Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body "{`"username`": `"mal`", `"password`": `"$password`"}"

$token = $loginResponse.token
Write-Host "✅ Login successful" -ForegroundColor Green
Write-Host "   Token: $($token.Substring(0,20))..."
Write-Host "   User: $($loginResponse.user.username)"
Write-Host ""

# 2. Create an agent
Write-Host "🤖 Testing POST /api/agents...`n" -ForegroundColor Cyan

$agentResponse = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/agents" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"name": "Rowan Orchestrator", "type": "orchestrator"}'

$agentId = $agentResponse.id
Write-Host "✅ Agent created successfully" -ForegroundColor Green
Write-Host "   ID: $($agentResponse.id)"
Write-Host "   Name: $($agentResponse.name)"
Write-Host "   Type: $($agentResponse.type)"
Write-Host ""

# 3. Get all agents
Write-Host "📋 Testing GET /api/agents...`n" -ForegroundColor Cyan

$agents = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/agents" `
  -Headers @{ "Authorization" = "Bearer $token" }

Write-Host "✅ Agents retrieved successfully" -ForegroundColor Green
Write-Host "   Total agents: $($agents.Count)"
$agents | ForEach-Object { Write-Host "   - $($_.name) ($($_.type))" }
Write-Host ""

# 4. Get specific agent
Write-Host "🔍 Testing GET /api/agents/:id...`n" -ForegroundColor Cyan

$singleAgent = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/agents/$agentId" `
  -Headers @{ "Authorization" = "Bearer $token" }

Write-Host "✅ Agent retrieved successfully" -ForegroundColor Green
Write-Host "   Name: $($singleAgent.name)"
Write-Host "   Type: $($singleAgent.type)"
Write-Host ""

# 5. Create conversation with agent_id
Write-Host "💬 Testing POST /api/conversations with agent_id...`n" -ForegroundColor Cyan

$convResponse = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/conversations" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -ContentType "application/json" `
  -Body "{`"title`": `"Test Conversation with Agent`", `"agent_id`": `"$agentId`"}"

Write-Host "✅ Conversation created successfully" -ForegroundColor Green
Write-Host "   ID: $($convResponse.id)"
Write-Host "   Title: $($convResponse.title)"
Write-Host "   Agent ID: $($convResponse.agent_id)"
Write-Host ""

# 6. Get all conversations
Write-Host "📚 Testing GET /api/conversations...`n" -ForegroundColor Cyan

$conversations = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/conversations" `
  -Headers @{ "Authorization" = "Bearer $token" }

Write-Host "✅ Conversations retrieved successfully" -ForegroundColor Green
Write-Host "   Total conversations: $($conversations.Count)"
$conversations | Select-Object -First 3 | ForEach-Object { 
    $agentText = if($_.agent_id) { $_.agent_id } else { "none" }
    Write-Host "   - $($_.title) - Agent: $agentText" 
}
Write-Host ""

Write-Host "🎉 All tests passed successfully!`n" -ForegroundColor Green
```

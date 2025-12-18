# Frontend Streaming Implementation - CRITICAL FIX

## Problem Identified

Server logs show: `[STREAM] DATA event fired, chunk size: 131 closed: true`

**The client is disconnecting IMMEDIATELY after receiving the 200 response.**

## Root Cause

Your frontend is aborting the fetch request before reading any data. This is typically caused by:

1. **React Strict Mode** - Double-mounting components and calling cleanup
2. **AbortController firing too early** - cleanup function called immediately
3. **Component unmounting** - Re-renders destroying the connection

## Solution: Working Streaming Implementation

### 1. Disable React Strict Mode (During Development)

```tsx
// In main.tsx or index.tsx
// REMOVE:
<React.StrictMode><App /></React.StrictMode>

// USE:
<App />
```

### 2. Correct Streaming Function (NO ABORTCONTROLLER)

```typescript
async function streamNdjsonChat(
  conversationId: string,
  message: string,
  onDelta: (token: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    // Make request WITHOUT AbortController
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ 
        conversation_id: conversationId, 
        message 
      })
      // NO signal property!
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Start reading IMMEDIATELY
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const frame = JSON.parse(line);
          
          switch (frame.type) {
            case 'delta':
              onDelta(frame.delta);
              break;
            case 'done':
              onComplete();
              return;
            case 'error':
              onError(new Error(frame.message));
              return;
            case 'ping':
            case 'start':
              // Ignore
              break;
          }
        } catch (e) {
          console.error('[Stream] Parse error:', e);
        }
      }
    }
  } catch (error) {
    onError(error as Error);
  }
}
```

### 3. React Component Usage

```tsx
function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSendMessage = async (text: string) => {
    // Prevent concurrent streams
    if (isStreaming) return;
    
    setIsStreaming(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    // Add placeholder for assistant
    const assistantId = `temp_${Date.now()}`;
    setMessages(prev => [...prev, { 
      id: assistantId, 
      role: 'assistant', 
      content: '' 
    }]);

    await streamNdjsonChat(
      conversationId,
      text,
      // onDelta
      (token) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: m.content + token }
            : m
        ));
      },
      // onComplete
      () => {
        setIsStreaming(false);
      },
      // onError
      (error) => {
        console.error('Stream error:', error);
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Error: ${error.message}` }
            : m
        ));
        setIsStreaming(false);
      }
    );
  };

  return (
    <ChatView 
      messages={messages}
      onSend={handleSendMessage}
      disabled={isStreaming}
    />
  );
}
```

## Key Points

1. **DO NOT use AbortController** unless absolutely necessary
2. **Start reading immediately** after getting the response
3. **Use a flag to prevent concurrent streams** (`isStreaming`)
4. **Don't call abort() in cleanup functions**
5. **Disable React Strict Mode** during development

## Still Having Issues?

Check browser DevTools Network tab:
- Does the request show as "pending" while streaming?
- Or does it close immediately after 200 OK?

If it closes immediately → Frontend is aborting
If it stays open but no messages appear → Check state updates

The server is working correctly. All issues are frontend-side.

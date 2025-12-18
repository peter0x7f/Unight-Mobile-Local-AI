# Frontend Integration Guide: Consuming the Streaming API

To consume the `/api/chat/stream` endpoint "by bits and pieces" (incrementally), you need to process the response body as a stream. Do **not** use `await response.json()`, as that waits for the entire response to finish.

Here is a robust JavaScript function you can use in your frontend (React, Vue, plain JS, etc.).

## `streamChat` Function

```javascript
/**
 * Streams chat response from the backend.
 * 
 * @param {string} conversationId - The ID of the conversation.
 * @param {string} message - The user's message.
 * @param {string} token - The JWT auth token.
 * @param {function} onDelta - Callback for each text chunk (delta).
 * @param {function} onDone - Callback when the stream finishes.
 * @param {function} onError - Callback for errors.
 */
async function streamChat(conversationId, message, token, onDelta, onDone, onError) {
  try {
    const response = await fetch('https://YOUR_CLOUDFLARE_URL/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines (NDJSON frames)
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop(); 

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const frame = JSON.parse(line);

          switch (frame.type) {
            case 'start':
              // Stream started
              break;
            case 'delta':
              // Received a text chunk
              if (onDelta) onDelta(frame.delta);
              break;
            case 'ping':
              // Heartbeat - ignore or reset timeout
              break;
            case 'error':
              if (onError) onError(frame.message);
              break;
            case 'done':
              if (onDone) onDone();
              return; // Exit successfully
          }
        } catch (e) {
          console.error('Error parsing JSON frame:', e);
        }
      }
    }
  } catch (err) {
    console.error('Stream failed:', err);
    if (onError) onError(err.message);
  }
}
```

## Usage Example (React)

```javascript
const [reply, setReply] = useState('');

const handleSend = async () => {
  setReply(''); // Clear previous reply
  
  await streamChat(
    currentConversationId,
    userMessage,
    authToken,
    (delta) => {
      // Append new chunk to the UI immediately
      setReply(prev => prev + delta);
    },
    () => {
      console.log('Generation complete!');
    },
    (error) => {
      console.error('Error:', error);
    }
  );
};
```

## Troubleshooting "Stream Canceled by Remote"

If you see `[STREAM] Client closed connection` in the server logs immediately after the stream starts, it means your frontend is aborting the request.

### Common Causes

1.  **React Strict Mode (Double Mount):**
    In development, React runs `useEffect` twice. If your cleanup function aborts the fetch, the first request will be canceled immediately.
    *   **Fix:** Ensure your `AbortController` logic handles this gracefully, or temporarily disable Strict Mode to verify.

2.  **`await response.json()`:**
    Do **NOT** use `await response.json()`. It waits for the entire stream to finish. If the stream is slow, the browser might time out.
    *   **Fix:** Use `response.body.getReader()` as shown above.

3.  **Component Unmount:**
    If the user navigates away or the chat component re-renders (destroying the old instance) while the request is pending, the connection will be closed.

4.  **Middleware/Proxy Timeouts:**
    Ensure your frontend proxy (e.g., Vite proxy) isn't timing out the request.

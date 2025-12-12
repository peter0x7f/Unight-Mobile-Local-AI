require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');

const db = require('./db');
const auth = require('./auth');
const modelConfig = require('./models_config');

const app = express();
const PORT = process.env.PORT || 8000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

// Initialize DB
db.init();

// Check embedding model availability
checkEmbeddingModel();

// Middleware
app.use(cors());
app.use(express.json());

// --- Helper Functions (Logic from LocalModelService) ---

// Check if embedding model is available
let embeddingModelAvailable = false;
const EMBEDDING_MODEL = 'nomic-embed-text';

async function checkEmbeddingModel() {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`);
        if (response.ok) {
            const data = await response.json();
            embeddingModelAvailable = data.models.some(m => m.name.includes('nomic-embed-text'));

            if (!embeddingModelAvailable) {
                console.log('\n⚠️  Embedding model not found. RAG/long-term memory features disabled.');
                console.log(`   To enable, run: ollama pull ${EMBEDDING_MODEL}\n`);
            } else {
                console.log('✓ Embedding model available - RAG enabled');
            }
        }
    } catch (err) {
        console.warn('Unable to check embedding model availability:', err.message);
    }
}

function applySystemPrompt(messages, systemPrompt) {
    if (!systemPrompt) return messages;

    const hasSystem = messages.length > 0 && messages[0].role === 'system';

    if (hasSystem) {
        // Replace existing system message
        return [
            { role: 'system', content: systemPrompt },
            ...messages.slice(1)
        ];
    } else {
        // Add new system message
        return [
            { role: 'system', content: systemPrompt },
            ...messages
        ];
    }
}

async function generateEmbedding(text) {
    // Skip if embedding model not available
    if (!embeddingModelAvailable) {
        return null;
    }

    try {
        const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: EMBEDDING_MODEL,
                prompt: text
            })
        });
        if (!response.ok) {
            console.error(`Embedding failed: ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        return data.embedding;
    } catch (err) {
        console.error('Embedding error:', err.message);
        return null;
    }
}

// --- Auth Routes ---
// Note: Registration is local-only (use setup-user.js)

app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const user = db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await auth.comparePassword(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = auth.signToken(user);
        res.json({ user: { id: user.id, username: user.username }, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Public Routes ---

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// --- Protected Routes ---

app.use('/api', auth.requireAuth);

// Conversations
app.post('/api/conversations', (req, res) => {
    const { title } = req.body;
    const id = uuidv4();
    try {
        const conversation = db.createConversation(id, req.user.id, title || null);
        res.json(conversation);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

app.get('/api/conversations', (req, res) => {
    try {
        const conversations = db.getConversationsForUser(req.user.id);
        res.json(conversations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

app.get('/api/conversations/:id/messages', (req, res) => {
    const { id } = req.params;
    const { limit } = req.query;

    // Verify ownership
    const conversation = db.getConversationById(id);
    if (!conversation || conversation.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Conversation not found' });
    }

    try {
        const messages = db.getMessagesForConversation(id, limit || 50);
        res.json({ conversation_id: id, messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Chat Endpoint - Refactored to match LocalModelService logic
app.post('/api/chat', async (req, res) => {
    const { conversation_id, message, model } = req.body;

    if (!conversation_id || !message) {
        return res.status(400).json({ error: 'conversation_id and message required' });
    }

    // Default to env model if not specified, or fallback to first ollama model
    const requestedModel = model || process.env.ROWAN_MODEL || 'llama3.2-latest';

    // Verify ownership
    const conversation = db.getConversationById(conversation_id);
    if (!conversation || conversation.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Conversation not found' });
    }

    try {
        // 1. Save User Message
        const userMsg = db.createMessage(conversation_id, req.user.id, 'user', message);

        // Async: Generate embedding for user message
        generateEmbedding(message).then(embedding => {
            if (embedding) db.storeEmbedding(userMsg.id, embedding);
        });

        // 2. Load History
        const history = db.getMessagesForConversation(conversation_id, 20);
        let messages = history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // 3. Determine Routing (Ollama-only)
        let routeConfig = null;

        if (modelConfig.ollama[requestedModel]) {
            routeConfig = modelConfig.ollama[requestedModel];
        } else {
            // Fallback to direct Ollama model name
            routeConfig = { ollama: requestedModel, max_tokens: 2048 };
        }

        // --- RAG: Retrieve Context ---
        let contextText = '';
        try {
            const queryEmbedding = await generateEmbedding(message);
            if (queryEmbedding) {
                const similarMessages = db.searchSimilarMessages(queryEmbedding, 5);
                const relevant = similarMessages.filter(m => m.conversation_id !== conversation_id && m.similarity > 0.5);

                if (relevant.length > 0) {
                    contextText = relevant.map(m => `[Past ${m.role}]: ${m.content}`).join('\n');
                    console.log(`[RAG] Injected ${relevant.length} memories.`);
                }
            }
        } catch (e) {
            console.error('[RAG] Retrieval failed:', e.message);
        }

        let systemPromptToUse = null;
        if (contextText) {
            systemPromptToUse = `You are a helpful assistant with long-term memory.\n\nRelevant Past Memories:\n${contextText}\n\nAnswer the user's question using these memories if relevant.`;
        }

        let replyContent = '';

        // Apply system prompt logic
        let messagesWithSystem = applySystemPrompt(messages, systemPromptToUse);

        // Force English for DeepSeek
        if (routeConfig.force_english) {
            messagesWithSystem.unshift({
                role: 'system',
                content: 'You are an assistant. Always reply in English.'
            });
        }

        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: routeConfig.ollama,
                messages: messagesWithSystem,
                stream: false,
                options: {
                    num_predict: routeConfig.max_tokens || 2048,
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        replyContent = data.message.content;

        // 4. Save Assistant Message
        const assistantMsg = db.createMessage(conversation_id, req.user.id, 'assistant', replyContent);

        // Async: Generate embedding for assistant message
        generateEmbedding(replyContent).then(embedding => {
            if (embedding) db.storeEmbedding(assistantMsg.id, embedding);
        });

        db.updateConversationTimestamp(conversation_id);

        res.json({
            conversation_id,
            reply: replyContent,
            model: requestedModel,
            messages_appended: 2
        });

    } catch (err) {
        console.error('Chat Error:', err);
        console.error('Stack:', err.stack);
        res.status(500).json({
            error: 'Failed to process chat message',
            details: err.message
        });
    }
});

// --- Model Management Routes ---

// Get available models (from config - Ollama only)
app.get('/api/models/available', (req, res) => {
    try {
        const available = Object.keys(modelConfig.ollama).map(key => ({
            name: key,
            type: 'ollama',
            details: modelConfig.ollama[key]
        }));
        res.json(available);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load available models' });
    }
});

// Get installed models (from Ollama only)
app.get('/api/models/installed', async (req, res) => {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
        if (response.ok) {
            const data = await response.json();
            res.json({
                models: data.models || [],
                ollama_available: true
            });
        } else {
            res.json({
                models: [],
                ollama_available: false,
                error: `Ollama returned ${response.status}`
            });
        }
    } catch (err) {
        res.json({
            models: [],
            ollama_available: false,
            error: err.message
        });
    }
});

// Download model (Trigger Ollama pull)
app.post('/api/models/download', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Model name required' });

    try {
        // Resolve the actual Ollama tag from config if possible
        let ollamaTag = name;
        if (modelConfig.ollama[name]) {
            ollamaTag = modelConfig.ollama[name].ollama;
        }

        fetch(`${OLLAMA_URL}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: ollamaTag, stream: false })
        }).then(async (resp) => {
            if (!resp.ok) console.error('Pull failed', await resp.text());
            else console.log('Pull complete for', ollamaTag);
        }).catch(err => console.error('Pull error', err));

        res.json({
            status: 'download_started',
            message: `Ollama download started for ${ollamaTag}. Check /api/models/installed later.`
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to trigger Ollama download' });
    }
});

// Download HuggingFace model (separate endpoint with different logic)

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Rowan Node API running on http://127.0.0.1:${PORT}`);
    console.log(`Public URL configured as: ${process.env.PUBLIC_URL}`);
});


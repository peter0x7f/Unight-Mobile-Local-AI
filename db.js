const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_FILE || './rowan.db';
const db = new Database(dbPath); // verbose: console.log

// Initialize DB
function init() {
    // Run Init Migration
    const migrationPath1 = path.join(__dirname, 'migrations', '001_init.sql');
    const migration1 = fs.readFileSync(migrationPath1, 'utf8');
    db.exec(migration1);

    // Run Embeddings Migration
    const migrationPath2 = path.join(__dirname, 'migrations', '002_add_embeddings.sql');
    if (fs.existsSync(migrationPath2)) {
        const migration2 = fs.readFileSync(migrationPath2, 'utf8');
        db.exec(migration2);
    }

    // Run Agents Migration
    const migrationPath3 = path.join(__dirname, 'migrations', '003_add_agents.sql');
    if (fs.existsSync(migrationPath3)) {
        try {
            const migration3 = fs.readFileSync(migrationPath3, 'utf8');
            db.exec(migration3);
        } catch (err) {
            // Ignore duplicate column errors (migration already run)
            if (!err.message.includes('duplicate column')) {
                throw err;
            }
        }
    }

    console.log('Database initialized and migrations run.');
}


// User Helpers
function createUser(username, passwordHash) {
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const info = stmt.run(username, passwordHash);
    return { id: info.lastInsertRowid, username };
}

function getUserByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
}

function getUserById(id) {
    const stmt = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?');
    return stmt.get(id);
}

function getAllUsers() {
    const stmt = db.prepare('SELECT id, username, created_at FROM users');
    return stmt.all();
}

// Conversation Helpers
function createConversation(id, userId, title) {
    const stmt = db.prepare('INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)');
    stmt.run(id, userId, title);
    return getConversationById(id);
}

function getConversationById(id) {
    const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
    return stmt.get(id);
}

function getConversationsForUser(userId) {
    const stmt = db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId);
}

function updateConversationTimestamp(id) {
    const stmt = db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
}

// Agent Helpers
function createAgent(id, userId, name, type = 'orchestrator') {
    const stmt = db.prepare('INSERT INTO agents (id, user_id, name, type) VALUES (?, ?, ?, ?)');
    stmt.run(id, userId, name, type);
    return getAgentById(id);
}

function getAgentById(id) {
    const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
    return stmt.get(id);
}

function getAgentsForUser(userId) {
    const stmt = db.prepare('SELECT * FROM agents WHERE user_id = ? ORDER BY created_at ASC');
    return stmt.all(userId);
}

function updateAgentTimestamp(id) {
    const stmt = db.prepare('UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
}


// Message Helpers
function createMessage(conversationId, userId, role, content) {
    const stmt = db.prepare('INSERT INTO messages (conversation_id, user_id, role, content) VALUES (?, ?, ?, ?)');
    const info = stmt.run(conversationId, userId, role, content);
    return { id: info.lastInsertRowid, conversation_id: conversationId, user_id: userId, role, content, created_at: new Date().toISOString() }; // Approx timestamp
}

function getMessagesForConversation(conversationId, limit = 50) {
    const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?');
    return stmt.all(conversationId, limit);
}

// Embedding Helpers
function storeEmbedding(messageId, embedding) {
    // embedding is an array of numbers, store as JSON string
    const jsonEmbedding = JSON.stringify(embedding);
    const stmt = db.prepare('INSERT OR REPLACE INTO message_embeddings (message_id, embedding) VALUES (?, ?)');
    stmt.run(messageId, jsonEmbedding);
}

function getEmbeddingsForConversation(conversationId) {
    // Get all embeddings for a specific conversation (useful for debugging or scoped search)
    const stmt = db.prepare(`
        SELECT me.message_id, me.embedding, m.content, m.role 
        FROM message_embeddings me
        JOIN messages m ON me.message_id = m.id
        WHERE m.conversation_id = ?
    `);
    const rows = stmt.all(conversationId);
    // Parse JSON embeddings back to arrays
    return rows.map(row => ({
        ...row,
        embedding: JSON.parse(row.embedding)
    }));
}

function getAllEmbeddings() {
    // Get ALL embeddings (for global context search)
    const stmt = db.prepare(`
        SELECT me.message_id, me.embedding, m.content, m.role, m.conversation_id
        FROM message_embeddings me
        JOIN messages m ON me.message_id = m.id
    `);
    const rows = stmt.all();
    return rows.map(row => ({
        ...row,
        embedding: JSON.parse(row.embedding)
    }));
}

// Vector Search (Cosine Similarity)
function searchSimilarMessages(queryEmbedding, limit = 5) {
    const allEmbeddings = getAllEmbeddings();

    // Calculate Cosine Similarity
    const scored = allEmbeddings.map(item => {
        const similarity = cosineSimilarity(queryEmbedding, item.embedding);
        return { ...item, similarity };
    });

    // Sort by similarity desc
    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, limit);
}

function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
}

module.exports = {
    init,
    createUser,
    getUserByUsername,
    getUserById,
    getAllUsers,
    createConversation,
    getConversationById,
    getConversationsForUser,
    updateConversationTimestamp,
    createAgent,
    getAgentById,
    getAgentsForUser,
    updateAgentTimestamp,
    createMessage,
    getMessagesForConversation,
    storeEmbedding,
    getAllEmbeddings,
    getEmbeddingsForConversation,
    searchSimilarMessages
};


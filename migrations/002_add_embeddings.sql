-- Message Embeddings table
-- Stores vector embeddings for messages to enable semantic search (RAG)
CREATE TABLE IF NOT EXISTS message_embeddings (
  message_id INTEGER PRIMARY KEY,
  embedding TEXT NOT NULL, -- JSON string of the vector array (e.g. "[0.1, -0.2, ...]")
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_embeddings_message ON message_embeddings(message_id);

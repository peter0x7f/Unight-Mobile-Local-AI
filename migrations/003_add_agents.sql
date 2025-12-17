-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,              -- UUID string
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'orchestrator', -- 'orchestrator' or 'custom'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add agent_id column to conversations table
ALTER TABLE conversations ADD COLUMN agent_id TEXT REFERENCES agents(id);

CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);

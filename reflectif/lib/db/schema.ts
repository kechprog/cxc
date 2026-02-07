import type Database from "better-sqlite3";

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      voice_embedding BLOB,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS core_user_files (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      background TEXT NOT NULL DEFAULT '',
      relationships TEXT NOT NULL DEFAULT '',
      goals TEXT NOT NULL DEFAULT '',
      triggers TEXT NOT NULL DEFAULT '',
      eq_baseline TEXT NOT NULL DEFAULT '',
      patterns TEXT NOT NULL DEFAULT '',
      life_context TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS conversation_analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      analyzed_at TEXT NOT NULL,
      summary TEXT NOT NULL,
      emoji TEXT NOT NULL,
      label TEXT NOT NULL,
      scores TEXT NOT NULL DEFAULT '[]',
      patterns TEXT NOT NULL DEFAULT '[]',
      transcripts TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS conversation_phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_analysis_id TEXT NOT NULL REFERENCES conversation_analyses(id) ON DELETE CASCADE,
      phase TEXT NOT NULL,
      reason TEXT NOT NULL,
      mood TEXT NOT NULL,
      insight TEXT,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      conversation_analysis_id TEXT REFERENCES conversation_analyses(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conversation_analyses_user_id ON conversation_analyses(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_phases_analysis_id ON conversation_phases(conversation_analysis_id);
    CREATE INDEX IF NOT EXISTS idx_chats_conversation_analysis_id ON chats(conversation_analysis_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
  `);
}

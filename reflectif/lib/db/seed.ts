import type Database from "better-sqlite3";
import {
  MOCK_CONVERSATIONS,
  MOCK_TRANSCRIPTS,
  MOCK_CORE_USER_FILE,
  MOCK_CHATS,
} from "@/lib/data";
import type { User } from "@/lib/types";
import { DbHandlers } from "./handlers";

const MOCK_USER_ID = "usr_123";

export function seedDb(db: Database.Database): void {
  const count = db
    .prepare("SELECT COUNT(*) as cnt FROM users")
    .get() as { cnt: number };

  if (count.cnt > 0) return; // Already seeded

  const handlers = DbHandlers.getInstance(db);

  // 1. Create mock user
  const user: User = {
    id: MOCK_USER_ID,
    voiceEmbedding: null,
    createdAt: new Date().toISOString(),
  };
  handlers.createUser(user);

  // 2. Create core user file
  handlers.upsertCoreUserFile(MOCK_USER_ID, MOCK_CORE_USER_FILE);

  // 3. Create conversations with transcripts
  for (const conv of MOCK_CONVERSATIONS) {
    const transcripts = MOCK_TRANSCRIPTS[conv.id] ?? [];
    handlers.createConversationAnalysis(MOCK_USER_ID, conv, transcripts);
  }

  // 4. Create chats
  for (const chat of MOCK_CHATS) {
    handlers.createChat(chat);
  }

  console.log("[seed] Database populated with mock data");
}

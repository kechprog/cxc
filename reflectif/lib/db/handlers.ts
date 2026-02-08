import type Database from "better-sqlite3";
import type {
  User,
  ConversationAnalysis,
  ConversationAnalysisListItem,
  TranscriptMessage,
  Chat,
  ChatMessage,
  ChatListItem,
} from "@/lib/types";
import type { UserProgress } from "@/lib/types/progress";
import {
  type UserRow,
  type ConversationAnalysisRow,
  type ConversationPhaseRow,
  type ChatRow,
  type ChatMessageRow,
  type ConversationAnalysisWithTranscripts,
  userFromRow,
  userToRow,
  conversationAnalysisFromRow,
  conversationPhaseToRow,
  chatFromRow,
  chatMessageToRow,
  chatMessageFromRow,
} from "./dto";
import { getDb } from "./client";

export class DbHandlers {
  private static instance: DbHandlers | null = null;
  private db: Database.Database;

  private constructor(db: Database.Database) {
    this.db = db;
  }

  static getInstance(db?: Database.Database): DbHandlers {
    if (!DbHandlers.instance) {
      DbHandlers.instance = new DbHandlers(db ?? getDb());
    }
    return DbHandlers.instance;
  }

  // ── Users ──────────────────────────────────────────────

  createUser(user: User): void {
    const row = userToRow(user);
    this.db
      .prepare(
        `INSERT INTO users (id, voice_embedding, backboard_assistant_id, onboarding_thread_id, profile_complete, created_at) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(row.id, row.voice_embedding, row.backboard_assistant_id, row.onboarding_thread_id, row.profile_complete, row.created_at);
  }

  updateUserVoiceEmbedding(userId: string, embedding: number[]): void {
    this.db
      .prepare(`UPDATE users SET voice_embedding = ? WHERE id = ?`)
      .run(JSON.stringify(embedding), userId);
  }

  ensureUser(id: string): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO users (id, voice_embedding, backboard_assistant_id, onboarding_thread_id, profile_complete, created_at) VALUES (?, NULL, NULL, NULL, 0, ?)`
      )
      .run(id, new Date().toISOString());
  }

  updateUserBackboardAssistantId(userId: string, assistantId: string): void {
    this.db
      .prepare(`UPDATE users SET backboard_assistant_id = ? WHERE id = ?`)
      .run(assistantId, userId);
  }

  getUser(id: string): User | null {
    const row = this.db
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .get(id) as UserRow | undefined;
    return row ? userFromRow(row) : null;
  }

  // ── Onboarding ──────────────────────────────────────────

  setUserOnboardingThreadId(userId: string, threadId: string): void {
    this.db
      .prepare(`UPDATE users SET onboarding_thread_id = ? WHERE id = ?`)
      .run(threadId, userId);
  }

  clearUserOnboardingThreadId(userId: string): void {
    this.db
      .prepare(`UPDATE users SET onboarding_thread_id = NULL WHERE id = ?`)
      .run(userId);
  }

  setProfileComplete(userId: string): void {
    this.db
      .prepare(`UPDATE users SET profile_complete = 1 WHERE id = ?`)
      .run(userId);
  }

  // ── Conversation Analyses ─────────────────────────────

  createConversationAnalysis(
    userId: string,
    analysis: ConversationAnalysis,
    transcripts: TranscriptMessage[] = []
  ): void {
    const insertAnalysis = this.db.prepare(
      `INSERT INTO conversation_analyses (id, user_id, analyzed_at, summary, emoji, label, scores, patterns, transcripts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertPhase = this.db.prepare(
      `INSERT INTO conversation_phases (conversation_analysis_id, phase, reason, mood, insight, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const run = this.db.transaction(() => {
      insertAnalysis.run(
        analysis.id,
        userId,
        analysis.analyzedAt,
        analysis.summary,
        analysis.emoji,
        analysis.label,
        JSON.stringify(analysis.scores),
        JSON.stringify(analysis.patterns),
        JSON.stringify(transcripts)
      );

      for (const phase of analysis.dynamics) {
        const row = conversationPhaseToRow(analysis.id, phase);
        insertPhase.run(
          row.conversation_analysis_id,
          row.phase,
          row.reason,
          row.mood,
          row.insight,
          row.start_time,
          row.end_time
        );
      }
    });

    run();
  }

  getConversationAnalysis(id: string): ConversationAnalysisWithTranscripts | null {
    const row = this.db
      .prepare(`SELECT * FROM conversation_analyses WHERE id = ?`)
      .get(id) as ConversationAnalysisRow | undefined;
    if (!row) return null;

    const phaseRows = this.db
      .prepare(
        `SELECT * FROM conversation_phases WHERE conversation_analysis_id = ? ORDER BY start_time`
      )
      .all(id) as ConversationPhaseRow[];

    return conversationAnalysisFromRow(row, phaseRows);
  }

  getTranscripts(conversationId: string): TranscriptMessage[] {
    const row = this.db
      .prepare(`SELECT transcripts FROM conversation_analyses WHERE id = ?`)
      .get(conversationId) as { transcripts: string } | undefined;
    return row ? JSON.parse(row.transcripts) : [];
  }

  listConversationAnalyses(
    userId: string
  ): ConversationAnalysisListItem[] {
    const rows = this.db
      .prepare(
        `SELECT id, analyzed_at, emoji, label, summary
         FROM conversation_analyses
         WHERE user_id = ?
         ORDER BY analyzed_at DESC`
      )
      .all(userId) as Pick<
      ConversationAnalysisRow,
      "id" | "analyzed_at" | "emoji" | "label" | "summary"
    >[];

    return rows.map((r) => ({
      id: r.id,
      analyzedAt: r.analyzed_at,
      emoji: r.emoji as ConversationAnalysis["emoji"],
      label: r.label,
      summary: r.summary,
    }));
  }

  deleteConversationAnalysis(id: string): void {
    // CASCADE handles phases, chats, and chat_messages
    this.db
      .prepare(`DELETE FROM conversation_analyses WHERE id = ?`)
      .run(id);
  }

  // ── Chats ─────────────────────────────────────────────

  createChat(userId: string, threadId: string, assistantId: string, chat: Omit<Chat, "messages">): void {
    this.db
      .prepare(
        `INSERT INTO chats (id, user_id, conversation_analysis_id, thread_id, assistant_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(chat.id, userId, chat.conversationAnalysisId, threadId, assistantId, chat.createdAt);
  }

  getChat(id: string): Chat | null {
    const row = this.db
      .prepare(`SELECT * FROM chats WHERE id = ?`)
      .get(id) as ChatRow | undefined;
    if (!row) return null;

    const messageRows = this.db
      .prepare(
        `SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at`
      )
      .all(id) as ChatMessageRow[];

    return chatFromRow(row, messageRows);
  }

  getChatByConversationId(
    conversationAnalysisId: string
  ): Chat | null {
    const row = this.db
      .prepare(
        `SELECT * FROM chats WHERE conversation_analysis_id = ?`
      )
      .get(conversationAnalysisId) as ChatRow | undefined;
    if (!row) return null;

    const messageRows = this.db
      .prepare(
        `SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at`
      )
      .all(row.id) as ChatMessageRow[];

    return chatFromRow(row, messageRows);
  }

  addChatMessage(chatId: string, message: ChatMessage): void {
    const row = chatMessageToRow(chatId, message);
    this.db
      .prepare(
        `INSERT INTO chat_messages (id, chat_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`
      )
      .run(row.id, row.chat_id, row.role, row.content, row.created_at);
  }

  getChatThreadInfo(chatId: string): { userId: string; threadId: string; assistantId: string } | null {
    const row = this.db
      .prepare(`SELECT user_id, thread_id, assistant_id FROM chats WHERE id = ?`)
      .get(chatId) as { user_id: string; thread_id: string; assistant_id: string } | undefined;
    return row ? { userId: row.user_id, threadId: row.thread_id, assistantId: row.assistant_id } : null;
  }

  getConversationAnalysesInWindow(
    userId: string,
    since: string
  ): ConversationAnalysisWithTranscripts[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM conversation_analyses
         WHERE user_id = ? AND analyzed_at >= ?
         ORDER BY analyzed_at ASC`
      )
      .all(userId, since) as ConversationAnalysisRow[];

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");
    const allPhaseRows = this.db
      .prepare(
        `SELECT * FROM conversation_phases
         WHERE conversation_analysis_id IN (${placeholders})
         ORDER BY start_time`
      )
      .all(...ids) as ConversationPhaseRow[];

    const phasesByAnalysis = new Map<string, ConversationPhaseRow[]>();
    for (const phase of allPhaseRows) {
      const existing = phasesByAnalysis.get(phase.conversation_analysis_id) || [];
      existing.push(phase);
      phasesByAnalysis.set(phase.conversation_analysis_id, existing);
    }

    return rows.map((row) =>
      conversationAnalysisFromRow(row, phasesByAnalysis.get(row.id) || [])
    );
  }

  getConversationAnalysisOwnerId(id: string): string | null {
    const row = this.db
      .prepare(`SELECT user_id FROM conversation_analyses WHERE id = ?`)
      .get(id) as { user_id: string } | undefined;
    return row?.user_id ?? null;
  }

  listChats(userId: string): ChatListItem[] {
    const rows = this.db
      .prepare(
        `SELECT c.id, c.conversation_analysis_id, c.created_at,
                (SELECT cm.content FROM chat_messages cm WHERE cm.chat_id = c.id ORDER BY cm.created_at LIMIT 1) as preview
         FROM chats c
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC`
      )
      .all(userId) as (ChatRow & { preview: string | null })[];

    return rows.map((r) => ({
      id: r.id,
      conversationAnalysisId: r.conversation_analysis_id,
      preview: r.preview ?? "",
      createdAt: r.created_at,
    }));
  }

  // ── User Progress Cache ──────────────────────────────────

  getProgressCache(userId: string, inputHash: string): UserProgress | null {
    const row = this.db
      .prepare(
        `SELECT progress_data FROM user_progress_cache WHERE user_id = ? AND input_hash = ?`
      )
      .get(userId, inputHash) as { progress_data: string } | undefined;
    return row ? JSON.parse(row.progress_data) : null;
  }

  setProgressCache(userId: string, inputHash: string, progress: UserProgress): void {
    this.db
      .prepare(
        `INSERT INTO user_progress_cache (user_id, input_hash, progress_data, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           input_hash = excluded.input_hash,
           progress_data = excluded.progress_data,
           created_at = excluded.created_at`
      )
      .run(userId, inputHash, JSON.stringify(progress), new Date().toISOString());
  }
}

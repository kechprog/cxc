import type Database from "better-sqlite3";
import type {
  User,
  CoreUserFile,
  CoreUserFileUpdate,
  ConversationAnalysis,
  ConversationAnalysisListItem,
  TranscriptMessage,
  Chat,
  ChatMessage,
  ChatListItem,
} from "@/lib/types";
import {
  type UserRow,
  type CoreUserFileRow,
  type ConversationAnalysisRow,
  type ConversationPhaseRow,
  type ChatRow,
  type ChatMessageRow,
  type ConversationAnalysisWithTranscripts,
  userFromRow,
  userToRow,
  coreUserFileFromRow,
  coreUserFileToRow,
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
        `INSERT INTO users (id, voice_id, created_at) VALUES (?, ?, ?)`
      )
      .run(row.id, row.voice_id, row.created_at);
  }

  updateUserVoiceId(userId: string, voiceId: string): void {
    this.db
      .prepare(`UPDATE users SET voice_id = ? WHERE id = ?`)
      .run(voiceId, userId);
  }

  getUser(id: string): User | null {
    const row = this.db
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .get(id) as UserRow | undefined;
    return row ? userFromRow(row) : null;
  }

  // ── Core User File ────────────────────────────────────

  getCoreUserFile(userId: string): CoreUserFile | null {
    const row = this.db
      .prepare(`SELECT * FROM core_user_files WHERE user_id = ?`)
      .get(userId) as CoreUserFileRow | undefined;
    return row ? coreUserFileFromRow(row) : null;
  }

  upsertCoreUserFile(userId: string, file: CoreUserFile): void {
    const row = coreUserFileToRow(userId, file);
    this.db
      .prepare(
        `INSERT INTO core_user_files (user_id, background, relationships, goals, triggers, eq_baseline, patterns, life_context)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           background = excluded.background,
           relationships = excluded.relationships,
           goals = excluded.goals,
           triggers = excluded.triggers,
           eq_baseline = excluded.eq_baseline,
           patterns = excluded.patterns,
           life_context = excluded.life_context`
      )
      .run(
        row.user_id,
        row.background,
        row.relationships,
        row.goals,
        row.triggers,
        row.eq_baseline,
        row.patterns,
        row.life_context
      );
  }

  updateCoreUserFile(userId: string, update: CoreUserFileUpdate): void {
    const existing = this.getCoreUserFile(userId);
    if (!existing) {
      // If no file exists, create one with defaults merged with the update
      const base: CoreUserFile = {
        background: "",
        relationships: "",
        goals: "",
        triggers: "",
        eqBaseline: "",
        patterns: "",
        lifeContext: "",
      };
      this.upsertCoreUserFile(userId, { ...base, ...update });
      return;
    }
    this.upsertCoreUserFile(userId, { ...existing, ...update });
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

  createChat(chat: Omit<Chat, "messages">): void {
    this.db
      .prepare(
        `INSERT INTO chats (id, conversation_analysis_id, created_at) VALUES (?, ?, ?)`
      )
      .run(chat.id, chat.conversationAnalysisId, chat.createdAt);
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

  listChats(): ChatListItem[] {
    const rows = this.db
      .prepare(
        `SELECT c.id, c.conversation_analysis_id, c.created_at,
                (SELECT cm.content FROM chat_messages cm WHERE cm.chat_id = c.id ORDER BY cm.created_at LIMIT 1) as preview
         FROM chats c
         ORDER BY c.created_at DESC`
      )
      .all() as (ChatRow & { preview: string | null })[];

    return rows.map((r) => ({
      id: r.id,
      conversationAnalysisId: r.conversation_analysis_id,
      preview: r.preview ?? "",
      createdAt: r.created_at,
    }));
  }
}

import type {
  User,
  CoreUserFile,
  ConversationAnalysis,
  ConversationPhase,
  ConversationEmoji,
  Chat,
  ChatMessage,
} from "@/lib/types";

// --- Row types (what SQLite returns) ---

export type UserRow = {
  id: string;
  voice_embedding: Buffer | null;
  created_at: string;
};

export type CoreUserFileRow = {
  user_id: string;
  background: string;
  relationships: string;
  goals: string;
  triggers: string;
  eq_baseline: string;
  patterns: string;
  life_context: string;
};

export type ConversationAnalysisRow = {
  id: string;
  user_id: string;
  analyzed_at: string;
  summary: string;
  emoji: string;
  label: string;
  scores: string; // JSON
  patterns: string; // JSON
};

export type ConversationPhaseRow = {
  id: number;
  conversation_analysis_id: string;
  phase: string;
  reason: string;
  mood: string;
  insight: string | null;
  start_time: number;
  end_time: number;
};

export type ChatRow = {
  id: string;
  conversation_analysis_id: string;
  created_at: string;
};

export type ChatMessageRow = {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  created_at: string;
};

// --- Mapping functions ---

export function userFromRow(row: UserRow): User {
  return {
    id: row.id,
    voiceEmbedding: row.voice_embedding,
    createdAt: row.created_at,
  };
}

export function userToRow(user: User): UserRow {
  return {
    id: user.id,
    voice_embedding: user.voiceEmbedding as Buffer | null,
    created_at: user.createdAt,
  };
}

export function coreUserFileFromRow(row: CoreUserFileRow): CoreUserFile {
  return {
    background: row.background,
    relationships: row.relationships,
    goals: row.goals,
    triggers: row.triggers,
    eqBaseline: row.eq_baseline,
    patterns: row.patterns,
    lifeContext: row.life_context,
  };
}

export function coreUserFileToRow(
  userId: string,
  file: CoreUserFile
): CoreUserFileRow {
  return {
    user_id: userId,
    background: file.background,
    relationships: file.relationships,
    goals: file.goals,
    triggers: file.triggers,
    eq_baseline: file.eqBaseline,
    patterns: file.patterns,
    life_context: file.lifeContext,
  };
}

export function conversationAnalysisFromRow(
  row: ConversationAnalysisRow,
  phaseRows: ConversationPhaseRow[]
): ConversationAnalysis {
  return {
    id: row.id,
    analyzedAt: row.analyzed_at,
    summary: row.summary,
    emoji: row.emoji as ConversationEmoji,
    label: row.label,
    dynamics: phaseRows.map(conversationPhaseFromRow),
    scores: JSON.parse(row.scores),
    patterns: JSON.parse(row.patterns),
  };
}

export function conversationPhaseFromRow(
  row: ConversationPhaseRow
): ConversationPhase {
  return {
    phase: row.phase,
    reason: row.reason,
    mood: row.mood,
    insight: row.insight,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

export function conversationPhaseToRow(
  analysisId: string,
  phase: ConversationPhase
): Omit<ConversationPhaseRow, "id"> {
  return {
    conversation_analysis_id: analysisId,
    phase: phase.phase,
    reason: phase.reason,
    mood: phase.mood,
    insight: phase.insight,
    start_time: phase.startTime,
    end_time: phase.endTime,
  };
}

export function chatFromRow(row: ChatRow, messageRows: ChatMessageRow[]): Chat {
  return {
    id: row.id,
    conversationAnalysisId: row.conversation_analysis_id,
    createdAt: row.created_at,
    messages: messageRows.map(chatMessageFromRow),
  };
}

export function chatMessageFromRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.content,
    createdAt: row.created_at,
  };
}

export function chatMessageToRow(
  chatId: string,
  msg: ChatMessage
): ChatMessageRow {
  return {
    id: msg.id,
    chat_id: chatId,
    role: msg.role,
    content: msg.content,
    created_at: msg.createdAt,
  };
}

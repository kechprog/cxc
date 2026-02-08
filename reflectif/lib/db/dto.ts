import type {
  User,
  ConversationAnalysis,
  ConversationPhase,
  ConversationEmoji,
  TranscriptMessage,
  Chat,
  ChatMessage,
} from "@/lib/types";

// --- Row types (what SQLite returns) ---

export type UserRow = {
  id: string;
  voice_embedding: string | null;
  backboard_assistant_id: string | null;
  onboarding_thread_id: string | null;
  profile_complete: number;
  created_at: string;
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
  transcripts: string; // JSON — TranscriptMessage[]
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
  user_id: string;
  conversation_analysis_id: string;
  thread_id: string;
  assistant_id: string;
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
    voiceEmbedding: row.voice_embedding ? JSON.parse(row.voice_embedding) : null,
    backboardAssistantId: row.backboard_assistant_id,
    onboardingThreadId: row.onboarding_thread_id,
    profileComplete: row.profile_complete === 1,
    createdAt: row.created_at,
  };
}

export function userToRow(user: User): UserRow {
  return {
    id: user.id,
    voice_embedding: user.voiceEmbedding ? JSON.stringify(user.voiceEmbedding) : null,
    backboard_assistant_id: user.backboardAssistantId,
    onboarding_thread_id: user.onboardingThreadId,
    profile_complete: user.profileComplete ? 1 : 0,
    created_at: user.createdAt,
  };
}

export type ConversationAnalysisWithTranscripts = ConversationAnalysis & {
  transcripts: TranscriptMessage[];
};

export function conversationAnalysisFromRow(
  row: ConversationAnalysisRow,
  phaseRows: ConversationPhaseRow[]
): ConversationAnalysisWithTranscripts {
  return {
    id: row.id,
    analyzedAt: row.analyzed_at,
    summary: row.summary,
    emoji: row.emoji as ConversationEmoji,
    label: row.label,
    dynamics: phaseRows.map(conversationPhaseFromRow),
    scores: JSON.parse(row.scores),
    patterns: JSON.parse(row.patterns),
    transcripts: JSON.parse(row.transcripts),
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

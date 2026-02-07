/**
 * Transcript types for Reflectif
 *
 * Represents the output from speaker diarization (AssemblyAI/Deepgram)
 * combined with Hume.ai emotion scores.
 */

/**
 * Speaker identification result from voice fingerprinting.
 * During onboarding, user's voice embedding is stored.
 * On each upload, speakers are matched against this embedding.
 */
export type SpeakerIdentification = {
  /** Unique speaker ID within this conversation */
  speakerId: string;
  /**
   * Whether this speaker is the user (based on voice fingerprinting).
   *
   * TODO: Handle uncertain case - if fingerprinting fails, show error to user.
   */
  isUser: boolean;
};

/**
 * A single utterance/segment from the transcript.
 * Produced by diarization service, enriched with Hume.ai emotions.
 */
export type TranscriptSegment = {
  /** Unique ID for this segment */
  id: string;
  /** Speaker identifier */
  speakerId: string;
  /** Whether this segment is from the user */
  isUser: boolean;
  /** The spoken text */
  text: string;
  /** Seconds from conversation start (absolute) */
  startTime: number;
  /** Seconds from conversation start (absolute) */
  endTime: number;
  /**
   * TODO: Type will be EmotionScores once Hume.ai integration is done.
   */
  emotions: unknown;
};

/**
 * A user-facing transcript message shown in the UI.
 * Simplified view of a conversation turn with optional sentiment.
 */
export type TranscriptMessage = {
  role: string;
  text: string;
  sentiment?: string;
  timestamp?: string;
};

/**
 * Full transcript for a conversation.
 * This is the input to the LLM for analysis.
 */
export type Transcript = {
  /** Conversation ID this transcript belongs to */
  conversationId: string;
  /** Total duration in seconds */
  duration: number;
  /** All identified speakers */
  speakers: SpeakerIdentification[];
  /** Ordered list of transcript segments */
  segments: TranscriptSegment[];
};

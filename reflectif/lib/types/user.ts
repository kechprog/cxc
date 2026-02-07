/**
 * User types for Reflectif
 *
 * Based on arch_v2.md and context_dump.md
 */

/**
 * Core user profile.
 */
export type User = {
  id: string;
  /** Voice ID from speaker-id service, set during onboarding enrollment */
  voiceId: string | null;
  /** ISO timestamp when user was created (onboarding completed) */
  createdAt: string;
};

/**
 * Core User File - a living document the LLM maintains about the user.
 * Stored in RAG for semantic retrieval.
 *
 * Two things can write to it:
 * 1. Conversation ingestion - LLM outputs a memory update delta
 * 2. Chat sessions - AI therapist can update based on what user shares
 *
 * Updates MERGE into existing memory, never overwrite.
 *
 * TODO: Backup/recovery strategy for corruption (design but don't implement yet).
 */
export type CoreUserFile = {
  /** Job, lifestyle, typical day */
  background: string;
  /** Key relationships and dynamics (who they talk to, nature of relationship) */
  relationships: string;
  /** What they want to improve about themselves */
  goals: string;
  /** Known triggers and sensitivities */
  triggers: string;
  /** EQ baseline and growth areas */
  eqBaseline: string;
  /** Recurring themes and patterns observed across conversations */
  patterns: string;
  /** Important life events/context ("just started new job", "going through breakup") */
  lifeContext: string;
};

/**
 * Delta update for core user file.
 * Output by LLM during conversation analysis or chat sessions.
 * Must be merged into existing CoreUserFile, not overwrite.
 */
export type CoreUserFileUpdate = Partial<CoreUserFile>;

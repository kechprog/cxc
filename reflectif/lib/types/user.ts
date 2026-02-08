/**
 * User types for Reflectif
 */

/**
 * Core user profile.
 */
export type User = {
  id: string;
  /** 192-dim voice embedding from speaker-id service, stored as JSON array */
  voiceEmbedding: number[] | null;
  /** Backboard assistant ID for this user's analysis/chat context (per-user memory isolation) */
  backboardAssistantId: string | null;
  /** Backboard thread ID for in-progress onboarding interview (null when complete) */
  onboardingThreadId: string | null;
  /** Whether user has completed the onboarding interview */
  profileComplete: boolean;
  /** ISO timestamp when user was created */
  createdAt: string;
};

# Reflectif Architecture v2

## Terminology
- **Conversation**: A wav file (or processed representation) of a conversation the user had with people, analyzed and ingested by the system
- **Chat**: A dialog with the AI therapist — the therapy session interface

---

## Processing Pipeline

```
1. Upload wav to endpoint
2. Speaker diarization (segment speakers)
3. Identify which speaker is the user (voice fingerprinting, see below)
4. Hume.ai — emotion analysis on audio (word-level sentiment)
5. LLM call — produces ConversationAnalysis JSON + core memory update delta
6. Store:
   - DB: full ConversationAnalysis JSON (structured)
   - RAG: markdown summary of the conversation (for semantic retrieval)
   - Core user file: merge memory update delta (not overwrite)
7. Return ConversationAnalysis JSON to frontend
```

### User Identification via Voice Fingerprinting
During onboarding, the user speaks (onboarding interview). A voice embedding is stored.
On each conversation upload, speakers are matched against this embedding to identify the user.
// TODO: Evaluate accuracy and fallback strategy if fingerprinting fails.

### Core User File (RAG)
A living document the LLM maintains about the user. Two things can write to it:
1. **Conversation ingestion** (step 5) — LLM outputs a memory update delta alongside the analysis
2. **Chat sessions** — the AI therapist can update memory based on what the user shares

Contains: recurring themes, important relationships, known triggers, goals, EQ baseline and
growth areas. Gives every LLM call baseline context without pulling every past conversation.

Updates happen on triggers (conversation ingestion, chat sessions) — not batched — to avoid staleness.

The LLM prompt must ensure updates **merge** into existing memory, never overwrite.
// TODO: Plan backup strategy for core memory in case of LLM corruption.
//       Not implementing now, but should have a recovery path designed.

### RAG Content
- **Core user file**: persistent, updated on triggers (see above)
- **Per-conversation markdown summaries**: generated at ingestion time, stored for semantic retrieval.
  Not the full ConversationAnalysis JSON — a prose summary that RAG can search effectively.
  // TBD: Whether this is a templated extraction from the analysis or a separately generated summary.

---

## Conversation Analysis

Single LLM call per conversation. One JSON object out. No artificial separation into
independent types — everything is synthesized together from the same context.

Hume.ai provides the `scores` (raw emotion timeseries). The LLM generates everything else.

```typescript
type ConversationPhase = {
  phase: string          // Human-readable label for this segment, e.g. "Disagreement about deadline"
  reason: string         // Why the LLM identified this as a distinct phase (what shifted)
  mood: string           // Emotional characterization of this phase, freeform
  insight: string | null // Optional observation or actionable suggestion specific to this phase
  startTime: number      // Seconds from conversation start, for transcript sync
  endTime: number        // Seconds from conversation start
}

type ConversationAnalysis = {
  summary: string        // One paragraph overview of the entire conversation
  emoji: string          // From a predetermined set, LLM picks based on overall tone
  label: string          // 1-2 word emotional tone label, e.g. "Tense", "Warm", "Draining"
                         // Serves as the human-readable anchor next to the emoji in list/header views

  dynamics: ConversationPhase[]
                         // LLM-segmented phases of the conversation based on semantic context.
                         // Not fixed-length time buckets — actual shifts in what's happening.
                         // Granularity is up to the LLM. A 5-min chat might have 2 phases,
                         // a 30-min argument might have 8.

  scores: {
    timestamp: number    // Seconds from conversation start
    scores: EmotionScores
  }[]
                         // Timestamped emotion series from Hume.ai.
                         // NOTE: timestamps are for ordering/transcript sync only.
                         // Emotions are anchored to conversational events, not clock time.
                         // Granularity TBD — consider aligning intervals with semantic shifts
                         // (dynamics phases) rather than fixed time windows.
                         // Independent from dynamics: scores = raw numerical layer,
                         // dynamics = narrative layer on top.

  patterns: string[]     // Communication patterns observed in THIS conversation.
                         // e.g. "deflects with humor when challenged", "interrupts when anxious"
                         // These are also tracked at the progress level across conversations
                         // to monitor how patterns evolve over time.
}
```

---

## Progress / Overall Trends

Single endpoint with a lookback window parameter (null = all time).
This is the "therapy progress report" — measures EQ growth, not emotional polarity.
The app is an EQ trainer, not a mood tracker. Feeling bad due to external circumstances
is natural and not a negative signal. What matters is how the user *handles* emotions.

Uses RAG context: pulls past conversation summaries within the window + core user file.

```typescript
// TODO: Validate these dimensions against EQ literature (Goleman's model, Bar-On EQ-i, etc.)
//       Current set is roughly Goleman's five components — needs proper research before finalizing.
// IMPLEMENTATION NOTE: The LLM prompt will need clear explanations/definitions for each dimension
//       to ensure consistent and accurate scoring across calls.
type EQDimensionName =
  | 'self_awareness'
  | 'self_regulation'
  | 'empathy'
  | 'social_skills'
  | 'motivation'

type EQDimension = {
  name: EQDimensionName    // Fixed set for consistent charting over time
  score: number            // 0-1, LLM-assigned based on evidence in the lookback window
  trend: string            // Freeform, e.g. "Improving steadily", "Stagnant since January"
}

type ProgressPoint = {
  observation: string      // What improved, e.g. "Started acknowledging partner's perspective"
  evidence: string[]       // References to specific conversations/moments as evidence
}

type ImprovementArea = {
  observation: string      // What still needs work, e.g. "Shuts down during financial discussions"
  evidence: string[]       // References to specific conversations/moments as evidence
  suggestion: string       // Actionable recommendation
}

type UserProgress = {
  eq: EQDimension[]        // Structured EQ scores for visualization/charting
  progress: ProgressPoint[]
                           // Concrete improvements made, with evidence from past conversations.
                           // Framed as "here's what's gotten better and proof."
  improvements: ImprovementArea[]
                           // Specific EQ gaps still present, with evidence and actionable suggestions.
                           // Framed as "here's what still needs work and what to try."
}
```

---

## Chat (AI Therapist)

The primary interaction surface. A conversational interface with an AI therapist.

- Has access to the same RAG as everything else (core user file + conversation summaries)
- Can update core memory based on what the user shares
- Can be started unprompted (user doesn't need a conversation to trigger it)
- Stateful within a session; across sessions relies on RAG + core memory for continuity
- Therapeutic knowledge comes from a well-crafted system prompt, not a separate RAG source
  (LLM training data already contains sufficient therapeutic frameworks — CBT, DBT, attachment theory, etc.)

---

## Onboarding

A brief conversational AI-guided interview on first launch. Populates the initial core user file.
Not a static form — adapts questions based on previous answers. Target: 2-3 minutes.

Collects:
- Relationships & social context (who they talk to, dynamics)
- Emotional self-awareness baseline (how they see themselves vs. likely reality)
- Goals (what they want to improve)
- Known triggers & sensitivities
- Life context (work, lifestyle, typical day)

---

## Features

- Start a chat session directly from a suggestion/insight — tapping a suggestion in the conversation
  analysis opens a chat pre-seeded with that context, so the user can discuss it further with the AI therapist.

---

## Open Questions

- EmotionScores type: which emotions? Align with Hume.ai's output categories.
- Voice fingerprinting accuracy and fallback UX if identification fails.
- RAG summary format: templated extraction from ConversationAnalysis vs. separately generated markdown.
- Core memory backup/recovery strategy (designed but not implemented).

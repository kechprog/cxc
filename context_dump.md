# Reflectif — Context Dump

This is a raw knowledge dump from the design discussions. If you're picking this up fresh,
read this FIRST, then arch_v2.md for the clean spec, then pitch.md for the product framing.

This document exists to fill gaps that the arch doc doesn't cover and to record
decisions + reasoning so future conversations don't re-debate settled points.

---

## Key Decisions (settled, don't re-debate)

### Hume.ai replaces custom ML model
- Original plan was a custom classifier trained on RAVDESS/CREMA-D/TESS with librosa feature extraction.
- DECIDED: Use Hume.ai instead. It provides word-level emotion analysis out of the box.
- This eliminates: audio chunking, sliding windows, librosa, custom training, the entire Python ML service.
- Hume gives us timestamped emotion scores per word/segment. We pass these directly into the LLM.
- The old technical.md and temp_arch.md still reference the custom model — they are OUTDATED.

### Single "mega object" per conversation analysis
- Original arch had separate types: KeyPoint, Suggestion, BehaviorPattern, ConversationMood, ConversationAnalysis, etc.
- DECIDED: One LLM call, one JSON output. No artificial separation into independent types.
- Reasoning: it's all synthesized by the same LLM from the same context. Splitting it creates
  seams that don't exist in the generation process.
- Suggestions are folded into ConversationPhase.insight (per-phase) rather than being separate objects.
- KeyPoints are absorbed by dynamics phases.

### EQ trainer, not mood tracker
- The app does NOT track "are you feeling happier over time."
- It tracks emotional intelligence growth: how well you HANDLE emotions, not which emotions you have.
- Feeling bad due to external circumstances is natural and not a negative signal.
- A person who feels grief but processes it healthily is doing better than someone who suppresses it.
- Progress is measured by behavioral change in communication patterns and EQ dimensions.

### Conversation vs Chat terminology
- "Conversation" = a wav file recording of a real human conversation. Data input. Gets analyzed and ingested.
- "Chat" = dialog with the AI therapist. The therapy session. The primary interaction surface.
- The sidebar lists CHATS (therapy sessions), NOT past conversations.
- Past conversations are data for the system to analyze. Users don't browse them like a library.

### "We are selfish"
- Analysis focuses on the USER's wellbeing, not all speakers.
- We DO detect emotions of all speakers (bidirectional tracking is a selling point).
- But insights, suggestions, and progress tracking are framed around the user.
- KeyPointsByPerson (per-speaker breakdowns) was explicitly rejected as unnecessary.

### Conversation dynamics, not trend
- "Trend" was renamed to "dynamics" because conversations don't have a single direction.
- A conversation can start tense, warm up, then end awkwardly — that's not a "trend."
- Dynamics = array of LLM-identified semantic phases (ConversationPhase[]).
- The LLM segments based on semantic shifts, not fixed time intervals.
- Granularity is up to the LLM. No hard limits on number of phases.
- This is SEPARATE from the cross-conversation progress endpoint which tracks EQ over time.

### EQ dimensions are a fixed enum
- Must be predefined for consistent charting across lookback windows.
- Currently using roughly Goleman's five: self_awareness, self_regulation, empathy, social_skills, motivation.
- TODO: Validate against EQ literature before finalizing.
- IMPLEMENTATION: LLM prompt needs clear definitions for each dimension to score consistently.

### API consolidation
- Daily snapshot + global stats + progress → consolidated endpoints with time_frame parameter.
- time_frame=null means all time.
- No separate /api/daily, /api/stats, /api/stats/patterns, /api/stats/suggestions etc.
- PATCH /api/conversations/:id was removed (no need to edit conversations).
- No progress polling for hackathon — user can just refresh the page.

### Therapy knowledge base
- Original plan had a separate RAG source with curated therapy/psychology content.
- DECIDED: A well-crafted system prompt is enough. LLM training data already contains
  sufficient therapeutic frameworks (CBT, DBT, attachment theory, etc.).
- One less moving part. The prompt tells the LLM when and how to apply this knowledge.

---

## Pipeline Details (what arch_v2.md says briefly, expanded here)

### Step 1: Upload wav
- POST endpoint receives audio file.
- Store in blob storage.
- Return conversationId immediately, process async.

### Step 2: Speaker diarization
- External API: AssemblyAI or Deepgram (not decided).
- Output: speaker-labeled, timestamped text segments.
- This gives us the transcript WITH speaker labels and timestamps.

### Step 3: Identify the user
- Voice fingerprinting from onboarding.
- During onboarding interview, the user speaks. We store a voice embedding.
- On each upload, match speakers against this embedding.
- OPEN QUESTION: What if fingerprinting fails? Need fallback UX (e.g., "which speaker is you?").
- OPEN QUESTION: Which library/service for voice embeddings? Not decided.

### Step 4: Hume.ai
- Send audio to Hume.ai.
- Get back: word-level (or segment-level) emotion scores with timestamps.
- EmotionScores type needs to align with whatever Hume actually returns.
- OPEN QUESTION: Hume's exact output format and emotion categories. Need to check their API docs.
  The BaseEmotion enum in temp_arch.md was designed for the custom model and may not match Hume.

### Step 5: LLM call
- INPUT to the LLM:
  - The transcript (from step 2) with speaker labels
  - The emotion scores (from step 4) aligned to the transcript
  - The core user file (from RAG) for context about the user
  - Basically an "annotated transcript" — each utterance has text + who said it + emotion scores
- OUTPUT from the LLM (single JSON):
  - ConversationAnalysis object (summary, emoji, label, dynamics, patterns)
  - Core memory update delta (what to add/change in the core user file)
- The scores field in ConversationAnalysis comes from Hume (step 4), NOT from the LLM.
  The LLM generates everything EXCEPT scores. Scores are Hume's raw data bundled in.

### Step 6: Store
- DB gets: full ConversationAnalysis JSON (structured, queryable).
- RAG gets: a markdown prose summary of the conversation (for semantic search/retrieval).
  - TBD: Is this a templated extraction from the analysis or a separately generated summary?
  - It should NOT be the raw JSON — RAG needs prose for effective similarity search.
- Core user file: merge the memory update delta from step 5. MERGE, not overwrite.

### Step 7: Return
- Send ConversationAnalysis JSON back to the frontend.

---

## Core User File — What's In It

A living markdown document in RAG. Think of it as the AI therapist's notes about the patient.

Initially populated by onboarding interview. Updated on two triggers:
1. Every conversation ingestion (step 5 outputs a delta)
2. Chat sessions (the AI therapist updates it based on what the user shares)

Contents:
- Background (job, lifestyle, typical day)
- Key relationships and dynamics (who they talk to, nature of relationship)
- Goals (what they want to improve about themselves)
- Known triggers and sensitivities
- EQ baseline and growth areas
- Recurring themes and patterns observed across conversations
- Important life events/context ("just started new job", "going through breakup")

The LLM prompt MUST instruct the model to merge updates, never overwrite.
Backup/recovery strategy for corruption is a TODO — design it but don't implement yet.

---

## Chat (AI Therapist) — Implementation Details

- Standard chat UI with message history.
- The AI has access to:
  - Core user file (always loaded as context)
  - RAG retrieval over past conversation summaries (pulled as needed based on what user asks)
  - System prompt with therapeutic framework guidance
- Stateful WITHIN a session (normal chat message history).
- Across sessions: relies on core user file + RAG. No persistent chat history beyond that.
  (Or if we do store chat history, it's for the user to review, not for the AI to load every time.)
- Can be started unprompted — user doesn't need a conversation to trigger a chat.
- Can update core memory based on what user shares ("I broke up with my partner" → update relationships).
- FEATURE: Can be started from a suggestion/insight in a conversation analysis.
  Tapping a suggestion opens a chat pre-seeded with that context.

---

## What the Frontend Looks Like (from old arch, needs updating)

The old frontend structure exists in code:
```
app/
├── page.tsx                    # Main screen (RecordButton + DailySnapshot)
├── conversation/[id]/page.tsx  # Conversation detail
├── global-summary/page.tsx     # Global stats screen
└── layout.tsx                  # Root with Sidebar

components/
├── RecordButton.tsx            # Audio recording control
├── DailySnapshot.tsx           # Today's mood + 24h chart + suggestion
├── HourlyMoodChart.tsx         # 24h area chart
├── Sidebar.tsx                 # Navigation + conversation list
├── ChatTranscript.tsx          # Utterances with sentiment
├── MoodHeader.tsx              # Conversation summary header
└── MoodChart.tsx               # 30-day line chart
```

What needs to change:
- Sidebar should list CHATS (AI therapy sessions), not past conversations.
- Need a Chat screen/component (the AI therapist interface). This doesn't exist yet.
- "Conversation detail" screen needs to render ConversationAnalysis (dynamics phases, patterns, etc.)
  instead of the old utterance-by-utterance transcript view.
- "Global summary" → "Progress" screen. Shows EQ dimensions, progress points, improvement areas.
- DailySnapshot may get merged into the progress view or simplified.
- The old types (Utterance, KeyPoint, Speaker with color, etc.) in the codebase are OUTDATED.

---

## API Endpoints (what we actually need)

```
POST   /api/conversations/upload
       Body: FormData { audio: File }
       Response: { conversationId: string }
       Triggers async pipeline (steps 1-7 above).

GET    /api/conversations/:id
       Response: ConversationAnalysis
       Returns the full analysis JSON for a single conversation.

GET    /api/chats
       Query: ?limit=10&offset=0
       Response: ChatListItem[]  (id, title/preview, date)
       For the sidebar.

POST   /api/chats
       Body: { preseededContext?: string }  // optional, for "start from suggestion" feature
       Response: { chatId: string }
       Creates a new chat session.

POST   /api/chats/:id/message
       Body: { message: string }
       Response: { reply: string }
       Send a message in a chat session, get AI response.
       (Or this could be a streaming endpoint.)

GET    /api/chats/:id
       Response: Chat (full message history)

GET    /api/progress
       Query: ?time_frame=7d | 30d | 90d | null (null = all time)
       Response: UserProgress
       The EQ progress report. Single LLM call with RAG context.

POST   /api/onboarding
       The onboarding interview. Probably a chat-like interface.
       May just be a special case of /api/chats with an onboarding system prompt.
```

DELETE for conversations probably not needed for hackathon. Add later if needed.

---

## Tech Stack (partially decided)

- Frontend: Next.js (already built, app router)
- Backend: Next.js API routes (same app)
- Database: PostgreSQL (Drizzle ORM was in original plan — fine to keep)
- Audio storage: Blob storage (S3 or Vercel Blob)
- Diarization + Transcription: AssemblyAI or Deepgram (not decided)
- Emotion analysis: Hume.ai
- LLM: OpenAI (was in original deps — open to alternatives)
- RAG / Vector store: Not decided. Options: Pinecone, Weaviate, pgvector, etc.
- Voice fingerprinting: Not decided. Need to research.

---

## EmotionScores — THE OPEN QUESTION

The EmotionScores type is referenced everywhere but its exact shape depends on Hume.ai's output.

Old definition (from temp_arch.md, designed for custom model):
```typescript
type BaseEmotion =
  | 'happiness' | 'sadness' | 'anger' | 'fear'
  | 'disgust' | 'surprise' | 'neutral' | 'contempt'
  | 'anxiety' | 'confidence';

type EmotionScores = Record<BaseEmotion, number>; // normalized to sum to 1.0
```

This WILL CHANGE to match Hume.ai's emotion categories. Hume has its own emotion taxonomy
(they use a much larger set). We need to either:
a) Use Hume's categories directly, or
b) Map Hume's output to our own reduced set.

This is a blocking decision for implementation. Check Hume.ai docs before building anything
that depends on specific emotion labels.

---

## What's OUTDATED and should be ignored

- `technical.md` — References custom ML model, librosa, RAVDESS/CREMA-D training data. All replaced by Hume.ai.
- `temp_arch.md` — The original architecture. Full of inline comments marking what's wrong.
  All decisions from those comments have been incorporated into arch_v2.md and this document.
  The old types (Utterance, KeyPoint, KeyPointsByPerson, CompositeEmotion, EmotionDisplay,
  Suggestion, Diagnosis, BehaviorPattern as separate types, DailySnapshot, etc.) are all superseded.
- The old database schema in temp_arch.md — Needs complete rethink based on new types.
- The old API routes in temp_arch.md — Superseded by the consolidated endpoints above.
- The emotion normalization code in temp_arch.md — Not needed, Hume handles this.

---

## Features (small things to remember)

- Start a chat from a suggestion: tapping a suggestion/insight in conversation analysis
  opens a chat pre-seeded with that context for deeper discussion with the AI therapist.

---

## Misc Notes

- This is a hackathon project. Optimize for demo impact, not production readiness.
- No progress polling needed — user can refresh the page.
- The app is NOT a therapist and does not diagnose. It provides "psychologically informed suggestions."
  This distinction must be clear in UI and pitch.
- Privacy: recording is user-initiated, consent is user's responsibility, same model as voice memo apps.
- The name is Reflectif.

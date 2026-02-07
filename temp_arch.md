# Reflectif Architecture

Based on the existing frontend, here's the complete architecture with backend integration.

---

## Current Frontend Structure

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

---

## Types (Composition-Based)

All types use composition, no inheritance. Emotion scores are normalized to sum to 1.

```typescript
// types/emotions.ts

// Base emotions that can be detected from audio
type BaseEmotion =
  | 'happiness'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'disgust'
  | 'surprise'
  | 'neutral'
  | 'contempt'
  | 'anxiety'
  | 'confidence';

// Normalized scores (all values sum to 1.0)
type EmotionScores = Record<BaseEmotion, number>;

// Derived/composite emotion (e.g., upset = 60% sad + 40% angry)
type CompositeEmotion = {
  label: string;           // "upset", "defensive", "resigned"
  components: {
    emotion: BaseEmotion;
    weight: number;        // Contribution (0-1)
  }[];
};

// What we show in UI
type EmotionDisplay = {
  primary: BaseEmotion;
  primaryScore: number;
  composite: CompositeEmotion | null;  // If applicable
  allScores: EmotionScores;            // Full breakdown
};
```

```typescript
// types/speaker.ts

type Speaker = {
  id: string;
  label: string;           // "Speaker A", "You", custom name
  isUser: boolean;         // Is this the app user?
  color: string;           // For UI differentiation
};
```

```typescript
// types/utterance.ts

type Utterance = {
  id: string;
  speakerId: string;
  startTime: number;       // Seconds from conversation start
  endTime: number;
  text: string;
  emotions: EmotionScores; // Normalized to 1.0
  display: EmotionDisplay; // Pre-computed for UI
};
```

```typescript
// types/keypoint.ts

type KeyPoint = {
  id: string;
  speakerId: string;
  utteranceIds: string[];  // Source utterances
  content: string;         // What was said/done
  significance: string;    // Why it matters
  emotionalContext: EmotionDisplay;
};

// Grouped by speaker for detail view
type KeyPointsByPerson = {
  speaker: Speaker;
  points: KeyPoint[];
};
```

```typescript
// types/conversation.ts

type MoodTrend = 'improving' | 'stable' | 'declining';

type ConversationMood = {
  emoji: string;
  label: string;           // "Anxious", "Confident"
  description: string;     // Detailed context
  scores: EmotionScores;   // Aggregated from all utterances
  trend: MoodTrend;
};

type ConversationAnalysis = {
  summary: string;                    // Paragraph summary
  keyPointsAnalysis: string;          // Analysis of key points
  communicationPatterns: string[];    // Observed patterns
  suggestions: string[];              // Actionable suggestions
};

type Conversation = {
  id: string;
  userId: string;
  createdAt: string;                  // ISO timestamp
  duration: number;                   // Seconds
  audioUrl: string | null;

  speakers: Speaker[];
  utterances: Utterance[];
  keyPoints: KeyPoint[];

  mood: ConversationMood;
  analysis: ConversationAnalysis;
  title: string;
};
```

```typescript
// types/stats.ts

type MoodDataPoint = {
  date: string;                       // ISO date
  scores: EmotionScores;              // Full emotion breakdown
  dominantEmotion: BaseEmotion;
  emoji: string;
  label: string;
  satisfactionScore: number;          // 0-10 for chart
  conversationId: string | null;      // Source conversation
};

type BehaviorPattern = {
  id: string;
  title: string;
  description: string;
  frequency: 'often' | 'sometimes' | 'rarely';
  relatedEmotions: BaseEmotion[];
};

type Suggestion = {
  id: string;
  title: string;
  action: string;
  category: string;
  relevanceScore: number;             // 0-1
};

type Diagnosis = {
  condition: string;
  description: string;
  confidence: number;
  updatedAt: string;
};

type GlobalStats = {
  moodHistory: MoodDataPoint[];       // For chart
  patterns: BehaviorPattern[];
  suggestions: Suggestion[];
  diagnosis: Diagnosis | null;

  // Aggregates
  totalConversations: number;
  averageEmotions: EmotionScores;
  dominantPatterns: string[];
};
```

```typescript
// types/daily.ts

// For DailySnapshot component on main screen
type DailySnapshot = {
  date: string;
  mood: {
    emoji: string;
    label: string;
    trend: MoodTrend;
    trendLabel: string;
  };
  hourlyData: {
    time: string;
    scores: EmotionScores;
    dominantEmotion: BaseEmotion;
    satisfactionScore: number;
  }[];
  suggestion: {
    title: string;
    text: string;
    action: string;
  };
};
```

---

## API Routes

### Conversations

```
POST   /api/conversations/upload
       Body: FormData { audio: File }
       Response: { conversationId: string, status: 'processing' }

GET    /api/conversations/:id/status
       Response: {
         status: 'transcribing' | 'analyzing' | 'complete' | 'failed',
         progress: number,  // 0-100
         error?: string
       }

GET    /api/conversations
       Query: ?limit=10&offset=0
       Response: ConversationListItem[]

GET    /api/conversations/:id
       Response: Conversation

DELETE /api/conversations/:id
       Response: { success: boolean }

PATCH  /api/conversations/:id
       Body: { title?: string }
       Response: Conversation
```

### Daily / Home Screen

```
GET    /api/daily
       Response: DailySnapshot

GET    /api/daily/hourly
       Query: ?hours=24
       Response: HourlyDataPoint[]
```

### Global Stats

```
GET    /api/stats
       Response: GlobalStats

GET    /api/stats/mood-history
       Query: ?days=30
       Response: MoodDataPoint[]

GET    /api/stats/patterns
       Response: BehaviorPattern[]

GET    /api/stats/suggestions
       Response: Suggestion[]
```

---

## Response Shapes for Each Screen

### Main Screen (/)

**RecordButton** - No initial fetch, handles upload:
```typescript
// On stop recording
POST /api/conversations/upload -> { conversationId }

// Poll for status
GET /api/conversations/:id/status -> ProcessingStatus

// When complete, show link to detail
```

**DailySnapshot** - Fetch on mount:
```typescript
GET /api/daily -> DailySnapshot
```

### Sidebar (in layout)

```typescript
GET /api/conversations?limit=10 -> ConversationListItem[]

type ConversationListItem = {
  id: string;
  date: string;
  mood: {
    emoji: string;
    label: string;
  };
  speakerCount: number;
  duration: number;
};
```

### Conversation Detail (/conversation/[id])

```typescript
GET /api/conversations/:id -> Conversation

// Used by:
// - MoodHeader: mood, summary, date
// - ChatTranscript: transcript (utterances with emotions)
// - Key Insights sidebar: keyPoints grouped by speaker
// - Tone Analysis: aggregated emotion tags
```

### Global Summary (/global-summary)

```typescript
GET /api/stats -> GlobalStats

// Used by:
// - MoodChart: moodHistory for 30-day chart
// - Patterns grid: patterns array
// - Suggestions column: suggestions array
// - (future) Diagnosis section: diagnosis
```

---

## Backend Processing Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     1. Audio Upload                         │
│   POST /api/conversations/upload                            │
│   - Store audio in blob storage (S3/Vercel Blob)            │
│   - Create conversation record with status='processing'     │
│   - Trigger async processing job                            │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              2. Transcription + Diarization                 │
│   External API: AssemblyAI / Deepgram                       │
│   Output: Speaker-labeled, timestamped text segments        │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                 3. Audio Chunking                           │
│   - Slice audio by utterance timestamps                     │
│   - Split long utterances into ~1.5-2sec windows            │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              4. Emotion Classification                      │
│   Custom ML Model (Python service / external)               │
│   Input: Audio chunk                                        │
│   Output: EmotionScores (normalized to 1.0)                 │
│                                                             │
│   Features extracted (librosa):                             │
│   - Pitch (F0), Energy (RMS), MFCCs                         │
│   - Speaking rate, Spectral centroid                        │
│   - Zero crossing rate                                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              5. LLM Analysis Layer                          │
│   Input: Annotated transcript with emotion scores           │
│   Output:                                                   │
│   - Summary generation                                      │
│   - Key points extraction                                   │
│   - Communication pattern analysis                          │
│   - Personalized suggestions                                │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│            6. Store & Update Global Stats                   │
│   - Save conversation to DB                                 │
│   - Update user's mood history                              │
│   - Recalculate patterns/suggestions                        │
│   - Update status='complete'                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Tech Stack (Next.js API Routes)

```
app/api/
├── conversations/
│   ├── route.ts              # GET list, POST upload
│   └── [id]/
│       ├── route.ts          # GET, PATCH, DELETE
│       └── status/
│           └── route.ts      # GET processing status
├── daily/
│   ├── route.ts              # GET daily snapshot
│   └── hourly/
│       └── route.ts          # GET hourly mood data
└── stats/
    ├── route.ts              # GET global stats
    ├── mood-history/
    │   └── route.ts          # GET mood chart data
    ├── patterns/
    │   └── route.ts          # GET behavior patterns
    └── suggestions/
        └── route.ts          # GET suggestions
```

### Required Backend Dependencies

```json
{
  "dependencies": {
    "@vercel/blob": "^0.x",           // Audio storage
    "@vercel/kv": "^0.x",             // Caching/session
    "assemblyai": "^4.x",             // Transcription
    "openai": "^4.x",                 // LLM analysis
    "drizzle-orm": "^0.x",            // Database ORM
    "@vercel/postgres": "^0.x"        // PostgreSQL
  }
}
```

### Database Schema (Drizzle/PostgreSQL)

```typescript
// db/schema.ts

const users = pgTable('users', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
});

const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  status: text('status').default('processing'),
  title: text('title'),
  duration: integer('duration'),
  audioUrl: text('audio_url'),
  summary: text('summary'),
  keyPointsAnalysis: text('key_points_analysis'),
  moodData: jsonb('mood_data'),       // ConversationMood
  analysisData: jsonb('analysis_data'), // ConversationAnalysis
});

const speakers = pgTable('speakers', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').references(() => conversations.id),
  label: text('label'),
  isUser: boolean('is_user').default(false),
  color: text('color'),
});

const utterances = pgTable('utterances', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').references(() => conversations.id),
  speakerId: text('speaker_id').references(() => speakers.id),
  startTime: real('start_time'),
  endTime: real('end_time'),
  text: text('text'),
  emotionScores: jsonb('emotion_scores'), // EmotionScores
  displayData: jsonb('display_data'),     // EmotionDisplay
});

const keyPoints = pgTable('key_points', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').references(() => conversations.id),
  speakerId: text('speaker_id').references(() => speakers.id),
  utteranceIds: text('utterance_ids').array(),
  content: text('content'),
  significance: text('significance'),
  emotionalContext: jsonb('emotional_context'),
});

const moodHistory = pgTable('mood_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  date: date('date'),
  emotionScores: jsonb('emotion_scores'),
  dominantEmotion: text('dominant_emotion'),
  emoji: text('emoji'),
  label: text('label'),
  satisfactionScore: real('satisfaction_score'),
  conversationId: text('conversation_id').references(() => conversations.id),
});

const behaviorPatterns = pgTable('behavior_patterns', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  title: text('title'),
  description: text('description'),
  frequency: text('frequency'),
  relatedEmotions: text('related_emotions').array(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const suggestions = pgTable('suggestions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  title: text('title'),
  action: text('action'),
  category: text('category'),
  relevanceScore: real('relevance_score'),
  createdAt: timestamp('created_at').defaultNow(),
});

const diagnosis = pgTable('diagnosis', {
  userId: text('user_id').primaryKey().references(() => users.id),
  condition: text('condition'),
  description: text('description'),
  confidence: real('confidence'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## Emotion Normalization Example

```typescript
// lib/emotions.ts

function normalizeEmotions(rawScores: Record<string, number>): EmotionScores {
  const total = Object.values(rawScores).reduce((sum, v) => sum + v, 0);

  const normalized: EmotionScores = {
    happiness: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    disgust: 0,
    surprise: 0,
    neutral: 0,
    contempt: 0,
    anxiety: 0,
    confidence: 0,
  };

  for (const [emotion, score] of Object.entries(rawScores)) {
    if (emotion in normalized) {
      normalized[emotion as BaseEmotion] = total > 0 ? score / total : 0;
    }
  }

  return normalized;
}

function deriveCompositeEmotion(scores: EmotionScores): CompositeEmotion | null {
  // Example: upset = sadness + anger
  if (scores.sadness > 0.3 && scores.anger > 0.2) {
    return {
      label: 'upset',
      components: [
        { emotion: 'sadness', weight: scores.sadness / (scores.sadness + scores.anger) },
        { emotion: 'anger', weight: scores.anger / (scores.sadness + scores.anger) },
      ],
    };
  }

  // Example: defensive = anxiety + anger
  if (scores.anxiety > 0.3 && scores.anger > 0.2) {
    return {
      label: 'defensive',
      components: [
        { emotion: 'anxiety', weight: scores.anxiety / (scores.anxiety + scores.anger) },
        { emotion: 'anger', weight: scores.anger / (scores.anxiety + scores.anger) },
      ],
    };
  }

  return null;
}
```

---

## Frontend Data Fetching (SWR/React Query)

```typescript
// lib/api/conversations.ts

async function getConversations(limit = 10): Promise<ConversationListItem[]> {
  const res = await fetch(`/api/conversations?limit=${limit}`);
  return res.json();
}

async function getConversation(id: string): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}`);
  return res.json();
}

async function uploadConversation(audio: Blob): Promise<{ conversationId: string }> {
  const formData = new FormData();
  formData.append('audio', audio);
  const res = await fetch('/api/conversations/upload', {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// lib/hooks/useConversations.ts

function useConversations() {
  return useSWR('conversations', () => getConversations());
}

function useConversation(id: string) {
  return useSWR(['conversation', id], () => getConversation(id));
}

function useProcessingStatus(id: string | null) {
  return useSWR(
    id ? ['status', id] : null,
    () => fetch(`/api/conversations/${id}/status`).then(r => r.json()),
    { refreshInterval: 2000 } // Poll every 2s
  );
}
```

---

## Summary: What Frontend Fetches

| Screen | Component | Endpoint | Data |
|--------|-----------|----------|------|
| Main | DailySnapshot | `GET /api/daily` | DailySnapshot |
| Main | RecordButton | `POST /api/conversations/upload` | { conversationId } |
| Main | RecordButton | `GET /api/conversations/:id/status` | ProcessingStatus |
| Sidebar | Sidebar | `GET /api/conversations?limit=10` | ConversationListItem[] |
| Detail | MoodHeader | `GET /api/conversations/:id` | Conversation |
| Detail | ChatTranscript | (same) | Conversation.utterances |
| Detail | Key Insights | (same) | Conversation.keyPoints |
| Global | MoodChart | `GET /api/stats` | GlobalStats |
| Global | Patterns | (same) | GlobalStats.patterns |
| Global | Suggestions | (same) | GlobalStats.suggestions |
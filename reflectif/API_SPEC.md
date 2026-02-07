# Reflectif API Specification (Strict)

This document details the backend endpoints required to power the Reflectif frontend, strictly aligned with `lib/types`.

## 1. User & Profile

### `GET /api/user/profile`
**Purpose**: Retrieve current user profile and voice status.
**Returns**: `UserProfile`
```ts
{
  id: "usr_123",
  name: "Alex",
  voice_imprint_status: "processed" | "pending",
  profile_data: {
    goals: ["..."],
    known_triggers: ["..."],
    // ... other fields from CoreUserFile
  }
}
```

### `POST /api/profile/setup`
**Purpose**: Initial voice calibration and goal setting.
**Request**: Multipart form data (audio + JSON profile_data).
**Response**: `UserProfile`

### `GET /api/user/progress`
**Purpose**: Populates the "Global Summary" page.
**Returns**: `UserProgress`
```ts
{
  eq: [{ name: "self_awareness", score: 0.75, ... }],
  progress: [...],
  improvements: [...]
}
```

## 2. Conversations (Analysis)

### `GET /api/conversations`
**Purpose**: Populates the Sidebar list.
**Returns**: `ConversationAnalysisListItem[]`
```ts
[
  {
    id: "conv_1",
    analyzedAt: "2024-02-07T10:00:00Z",
    emoji: "😰",
    label: "Anxious",
    summary: "Reflecting on a stressful week..."
  }
]
```

### `GET /api/conversations/:id`
**Purpose**: Main Dashboard View. **Excludes Transcript.**
**Returns**: `ConversationAnalysis`
```ts
{
  id: "conv_1",
  analyzedAt: "2024-02-07T10:00:00Z",
  summary: "Detailed summary...",
  emoji: "😰",
  label: "Anxious",
  dynamics: ConversationPhase[],
  scores: any[], // Hume.ai emotion time-series
  patterns: string[]
}
```

### `GET /api/conversations/:id/transcript`
**Purpose**: Lazy-loaded transcript for Dashboard and Chat context.
**Returns**: `TranscriptMessage[]`
```ts
[
  { role: "Assistant", text: "..." },
  { role: "User", text: "...", sentiment: "Anxious" }
]
```

### `POST /api/conversations/upload`
**Purpose**: Upload new audio for analysis.
**Request**: Multipart form data (audio file).
**Response**: `{ id: string, status: "processing" | "completed" }`

## 3. Operations (Chat)

### `POST /api/chat`
**Purpose**: Unified endpoint for "Observe Yourself" (Global) and "Conversation Analysis" (Contextual).
**Request**:
```ts
{
  message: string;
  // If provided, chat is scoped to this analysis (e.g. "During this conversation...").
  // If null, chat is global "Observe Yourself" (e.g. "Over the last 7 days...").
  conversationAnalysisId?: string; 
  history?: { role: "user" | "assistant", content: string }[];
}
```
**Response**: Streamed text or JSON message.
```ts
{
  role: "assistant",
  content: "I've noticed you're feeling..."
}
```

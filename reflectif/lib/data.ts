export interface TranscriptMessage {
  id: string;
  speaker: "You" | "Other";
  text: string;
  sentiment?: "neutral" | "positive" | "negative" | "anxious" | "frustrated";
  timestamp: string;
}

export interface Conversation {
  id: string;
  date: string; // ISO date string
  summary: string;
  overallMood: {
    emoji: string;
    descriptor: string;
    description: string;
  };
  keyPoints: string[];
  transcript: TranscriptMessage[];
  emotionTrends?: any[];
}

export interface MoodDataPoint {
  date: string;
  moodLabel: string;
  moodEmoji: string;
  moodScore: number; // 0-10 scale for positioning, though UI will use emojis
}

export interface GlobalStats {
  moodHistory: MoodDataPoint[];
  patterns: {
    title: string;
    description: string;
    icon: string;
  }[];
  suggestions: {
    title: string;
    action: string;
  }[];
}

// --- EMOTION DATA CONSTANTS ---

export const EMOTIONS = [
  "Joy",
  "Sadness",
  "Anxiety",
  "Calm",
  "Anger",
] as const;

export type EmotionType = typeof EMOTIONS[number];

export const EMOTION_COLORS: Record<EmotionType, string> = {
  Joy: "#fbbf24", // amber-400
  Sadness: "#60a5fa", // blue-400
  Anxiety: "#fb923c", // orange-400
  Calm: "#94a3b8", // slate-400
  Anger: "#f87171", // red-400
};

export const EMOTION_DEFINITIONS: Record<EmotionType, string> = {
  Joy: "A feeling of great pleasure and happiness.",
  Sadness: "Emotional pain associated with feelings of disadvantage, loss, or sorrow.",
  Anxiety: "A feeling of worry, nervousness, or unease about an uncertain outcome.",
  Calm: "A state of tranquility, free from agitation or strong emotion.",
  Anger: "A strong feeling of annoyance, displeasure, or hostility.",
};

// --- MOCK DATA ---

// Helper to generate conversation-specific trends
const generateConversationTrends = (durationMinutes: number) => {
  const data = [];
  const step = Math.max(1, Math.floor(durationMinutes / 10)); // ~10 points per graph

  for (let i = 0; i <= durationMinutes; i += step) {
    // Base probabilities
    let rawValues: Record<string, number> = {};
    EMOTIONS.forEach(e => {
      let val = Math.random();
      // Add some noise/bias to make it look active
      rawValues[e] = val;
    });

    // Normalize
    const total = Object.values(rawValues).reduce((a, b) => a + b, 0);
    const normalizedValues: any = {
      time: new Date(0, 0, 0, 0, i).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
    };

    EMOTIONS.forEach(e => {
      normalizedValues[e] = rawValues[e] / total;
    });

    data.push(normalizedValues);
  }
  return data;
};

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    date: "2023-10-27T14:30:00Z",
    summary:
      "A discussion about project deadlines. You expressed concern about the timeline, while the other person seemed confident. The conversation ended with a compromise.",
    overallMood: {
      emoji: "😰",
      descriptor: "Anxious",
      description: "High levels of vocal tension detected during the middle section.",
    },
    keyPoints: [
      "Concern about Q4 timeline raised at 02:15",
      "Agreement on partial delivery by Friday",
      "Lingering hesitation detected in closing remarks",
    ],
    transcript: [
      {
        id: "t1",
        speaker: "Other",
        text: "So I think we can definitely hit the Q4 target if we push hard next week.",
        timestamp: "00:05",
        sentiment: "positive",
      },
      {
        id: "t2",
        speaker: "You",
        text: "I mean, maybe? But we're still waiting on the design assets.",
        timestamp: "00:12",
        sentiment: "anxious",
      },
      {
        id: "t3",
        speaker: "Other",
        text: "They said they'd have them by Tuesday. It shouldn't be a blocker.",
        timestamp: "00:18",
        sentiment: "neutral",
      },
      {
        id: "t4",
        speaker: "You",
        text: "Yeah, but 'shouldn't' usually means 'will'. I just don't want to overpromise.",
        timestamp: "00:25",
        sentiment: "anxious",
      },
      {
        id: "t5",
        speaker: "Other",
        text: "Fair enough. Let's aim for the MVP features first then.",
        timestamp: "00:35",
        sentiment: "positive",
      },
      {
        id: "t6",
        speaker: "You",
        text: "Okay, I can live with that. MVP first.",
        timestamp: "00:40",
        sentiment: "neutral", // Relief
      },
    ],
    emotionTrends: generateConversationTrends(45), // 45 min conversation (mock)
  },
  {
    id: "conv-2",
    date: "2023-10-26T09:15:00Z",
    summary:
      "Morning catch-up with the team. Generally positive tone, though some fatigue was detected in your voice.",
    overallMood: {
      emoji: "😴",
      descriptor: "Tired but Positive",
      description: "Low energy detected, but sentiment remained constructive.",
    },
    keyPoints: [
      "Shared updates on the marketing campaign",
      "No major blockers identified",
    ],
    transcript: [
      { id: "t1", speaker: "Other", text: "Morning! How's everyone feeling?", timestamp: "00:02", sentiment: "positive" },
      { id: "t2", speaker: "You", text: "Morning. Doing okay, just a bit slow to start today.", timestamp: "00:06", sentiment: "neutral" },
      { id: "t3", speaker: "Other", text: "Coffee hasn't kicked in yet?", timestamp: "00:10", sentiment: "positive" },
      { id: "t4", speaker: "You", text: "Exactly. But I have the report ready.", timestamp: "00:15", sentiment: "positive" },
    ],
    emotionTrends: generateConversationTrends(15),
  },
  {
    id: "conv-3",
    date: "2023-10-25T16:00:00Z",
    summary:
      "Client negotiation call. High confidence detected from you, with some resistance from the client that was successfully navigated.",
    overallMood: {
      emoji: "😎",
      descriptor: "Confident",
      description: "Consistent steady pitch and pace. Assertive tone.",
    },
    keyPoints: [
      "Client pushed back on pricing",
      "You successfully reframed value proposition",
      "Deal closed successfully",
    ],
    transcript: [
      { id: "t1", speaker: "Other", text: "The price point is a bit higher than we budgeted.", timestamp: "05:20", sentiment: "negative" },
      { id: "t2", speaker: "You", text: "I understand. However, consider the long-term support included.", timestamp: "05:25", sentiment: "positive" },
      { id: "t3", speaker: "Other", text: "That is a good point.", timestamp: "05:35", sentiment: "neutral" },
    ],
    emotionTrends: generateConversationTrends(30),
  },
];

export const MOCK_GLOBAL_STATS: GlobalStats = {
  moodHistory: [
    { date: "2023-10-20", moodLabel: "Stressed", moodEmoji: "😣", moodScore: 3 },
    { date: "2023-10-21", moodLabel: "Calm", moodEmoji: "😌", moodScore: 7 },
    { date: "2023-10-22", moodLabel: "Happy", moodEmoji: "😊", moodScore: 8 },
    { date: "2023-10-23", moodLabel: "Anxious", moodEmoji: "😰", moodScore: 4 },
    { date: "2023-10-24", moodLabel: "Neutral", moodEmoji: "😐", moodScore: 5 },
    { date: "2023-10-25", moodLabel: "Confident", moodEmoji: "😎", moodScore: 9 },
    { date: "2023-10-26", moodLabel: "Tired", moodEmoji: "😴", moodScore: 5 },
    { date: "2023-10-27", moodLabel: "Anxious", moodEmoji: "😰", moodScore: 4 },
  ],
  patterns: [
    {
      title: "Deadline Anxiety",
      description: "You tend to show increased vocal tension (higher pitch, faster pace) when discussing dates and deliverables.",
      icon: "calendar",
    },
    {
      title: "Morning Fatigue",
      description: "Conversations before 10 AM show 30% lower energy levels compared to afternoon calls.",
      icon: "coffee",
    },
    {
      title: "Conflict Avoidance",
      description: "You often use 'softening' language ('maybe', 'I guess') when disagreeing with authority figures.",
      icon: "shield",
    },
  ],
  suggestions: [
    {
      title: "Pause before agreeing",
      action: "When you feel pressured to commit to a deadline, take a 3-second pause. Your data shows you often agree too quickly when anxious.",
    },
    {
      title: "Schedule important calls later",
      action: "Try to move high-stakes negotiations to after 11 AM when your vocal energy is higher.",
    },
  ],
};

// Generate 24h of mock data where values sum to 1.0
const generateEmotionTrends = () => {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = d.getHours();

    // Base probabilities (random items to simulate shifting moods)
    let rawValues: Record<string, number> = {};

    EMOTIONS.forEach(e => {
      // Add some "noise"
      let val = Math.random();

      // Bias certain emotions based on hour to make it look realistic
      if (e === "Calm" && (hour < 7 || hour > 22)) val += 2; // Calmer at night
      if (e === "Anxiety" && (hour > 9 && hour < 17)) val += 1.5; // Work anxiety
      if (e === "Joy" && (hour > 18)) val += 1; // Evening relaxation

      rawValues[e] = val;
    });

    // Normalize to sum to 1.0
    const total = Object.values(rawValues).reduce((a, b) => a + b, 0);
    const normalizedValues: any = { time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };

    EMOTIONS.forEach(e => {
      normalizedValues[e] = rawValues[e] / total;
    });

    data.push(normalizedValues);
  }
  return data;
}

export const MOCK_EMOTION_TRENDS = generateEmotionTrends();

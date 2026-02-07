// --- Re-export Types from strict definitions ---
export * from "@/lib/types/conversation";
export * from "@/lib/types/progress";
export * from "@/lib/types/user";
export * from "@/lib/types/chat";

import { ConversationAnalysis } from "@/lib/types/conversation";
import { UserProgress } from "@/lib/types/progress";
import { ChatListItem } from "@/lib/types/chat";

// --- Legacy UI Types (to be refactored later) ---

export interface TranscriptMessage {
  role: string;
  text: string;
  sentiment?: string;
  timestamp?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  voice_imprint_status: "pending" | "processed";
  profile_data: {
    goals: string[];
    known_triggers: string[];
    relationships: string[];
    bio: string;
    communication_style: string;
  };
}

// --- Enums & Constants ---

export const EMOTIONS = ["Joy", "Sadness", "Anger", "Fear", "Neutral"];

export const EMOTION_COLORS: Record<string, string> = {
  Joy: "#fbbf24", // Amber-400
  Sadness: "#60a5fa", // Blue-400
  Anger: "#f87171", // Red-400
  Fear: "#a78bfa", // Violet-400
  Neutral: "#9ca3af", // Gray-400
};

export const EMOTION_DEFINITIONS: Record<string, string> = {
  Joy: "A feeling of great pleasure and happiness.",
  Sadness: "Emotional pain associated with logic, disadvantage, loss, despair, grief, helpnessness, sorrow and rage.",
  Anger: "A strong feeling of annoyance, displeasure, or hostility.",
  Fear: "An unpleasant emotion caused by the belief that someone or something is dangerous, likely to cause pain, or a threat.",
  Neutral: "Indifferent/unbiased feeling, or lack of strong emotion.",
};

// --- Mock Data Generators ---

const generateScores = (durationMinutes: number): { timestamp: number; scores: any }[] => {
  const data = [];
  const durationSeconds = durationMinutes * 60;
  const step = 30; // Every 30 seconds

  for (let t = 0; t <= durationSeconds; t += step) {
    const scores: any = {};
    let total = 0;

    // Randomize scores
    EMOTIONS.forEach(e => {
      const val = Math.random();
      scores[e] = val;
      total += val;
    });

    // Normalize
    EMOTIONS.forEach(e => scores[e] = scores[e] / total);

    data.push({
      timestamp: t,
      scores,
    });
  }
  return data;
};

// --- Core Mocks ---

export const MOCK_CONVERSATIONS: ConversationAnalysis[] = [
  {
    id: "conv_1",
    analyzedAt: new Date().toISOString(),
    emoji: "😰",
    label: "Anxious",
    summary: "Reflecting on a stressful week at work. The user expressed feeling overwhelmed by deadlines and struggled to disconnect after hours.",
    patterns: ["Cyclical worrying", "Rapid speech when discussing future events"],
    dynamics: [
      {
        phase: "Venting",
        reason: "User initiates conversation with high-energy complaints.",
        mood: "High Anxiety",
        insight: "Recognized immediate need to unload burden.",
        startTime: 0,
        endTime: 120
      },
      {
        phase: "Analysis",
        reason: "Shifted to discussing specific blockers.",
        mood: "Focus / Determination",
        insight: null,
        startTime: 120,
        endTime: 300
      }
    ],
    scores: generateScores(5) // 5 minutes
  },
  {
    id: "conv_2",
    analyzedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    emoji: "😊",
    label: "Relieved",
    summary: "A breakdown of a successful negotiation with a partner. The user felt heard and validated.",
    patterns: ["Active listening", "Clear boundary setting"],
    dynamics: [
      {
        phase: "Recap",
        reason: "User recounts past event.",
        mood: "Calm",
        insight: "User is proud of their achievement.",
        startTime: 0,
        endTime: 180
      }
    ],
    scores: generateScores(3)
  },
  {
    id: "conv_3",
    analyzedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    emoji: "😤",
    label: "Frustrated",
    summary: "Expressing frustration over a recurring family issue. User felt dismissed.",
    patterns: ["Defensive tone", "Repetitive phrasing"],
    dynamics: [
      {
        phase: "Outburst",
        reason: "Immediate high intensity expression.",
        mood: "Anger",
        insight: null,
        startTime: 0,
        endTime: 60
      }
    ],
    scores: generateScores(2)
  }
];

// Transcript Mock separated from ConversationAnalysis (strict type compliance)
export const MOCK_TRANSCRIPTS: Record<string, TranscriptMessage[]> = {
  "conv_1": [
    { role: "Assistant", text: "How have you been feeling since our last talk?" },
    { role: "User", text: "Honestly, pretty stressed. Work has been non-stop.", sentiment: "Anxious" },
    { role: "Assistant", text: "I hear that. Is there a specific deadline driving this?", sentiment: "Neutral" },
    { role: "User", text: "Yeah, the Q1 report is due on Friday and I'm not even close.", sentiment: "Fear" },
  ],
  "conv_2": [
    { role: "User", text: "I finally talked to him about the chores.", sentiment: "Joy" },
    { role: "Assistant", text: "That's a big step. How did it go?" },
    { role: "User", text: "Better than expected. He actually listened.", sentiment: "Relief" },
  ],
  "conv_3": [
    { role: "User", text: "They just never listen!", sentiment: "Anger" },
    { role: "Assistant", text: "It sounds like you're feeling unheard again." },
  ]
};


export const MOCK_USER_PROGRESS: UserProgress = {
  eq: [
    { name: "self_awareness", score: 0.75, trend: "Improving steadily" },
    { name: "self_regulation", score: 0.4, trend: "Struggling with stress" },
    { name: "empathy", score: 0.85, trend: "High baseline" },
    { name: "social_skills", score: 0.6, trend: "Stable" },
    { name: "motivation", score: 0.65, trend: "Recovering" },
  ],
  progress: [
    {
      observation: "Better at naming emotions",
      evidence: ["'Identified anxiety before it peaked' - Oct 15"]
    },
    {
      observation: "Started setting boundaries",
      evidence: ["'I told him I need space' - Yesterday"]
    }
  ],
  improvements: [
    {
      observation: "Difficulty disconnecting from work",
      evidence: ["'Checked email at 11pm' - Tuesday"],
      suggestion: "Try a distinct 'shutdown ritual' at 6 PM."
    },
    {
      observation: "Defensive when challenged",
      evidence: ["'I don't need your help' - Family Call"],
      suggestion: "Practice the 'pause and breathe' technique before responding."
    }
  ]
};

// Helper for UI compatibility
export const MOCK_CORE_USER_FILE = {
  background: "Product Manager in high-growth tech startup. High stress environment.",
  relationships: "Partner (Sarah) - Strained. Manager (David) - Demanding.",
  goals: "Be less defensive in conflicts. Improve active listening.",
  triggers: "Unsolicited advice. Interruptions.",
  eqBaseline: "High empathy, low self-regulation under stress.",
  patterns: "Direct but prone to shutting down under pressure.",
  lifeContext: "Approaching quarterly review cycle."
};

export const MOCK_USER_PROFILE: UserProfile = {
  id: "usr_123",
  name: "Alex",
  voice_imprint_status: "processed",
  profile_data: {
    goals: [MOCK_CORE_USER_FILE.goals],
    known_triggers: [MOCK_CORE_USER_FILE.triggers],
    relationships: [MOCK_CORE_USER_FILE.relationships],
    bio: MOCK_CORE_USER_FILE.background,
    communication_style: MOCK_CORE_USER_FILE.patterns
  }
};

export const MOCK_CHATS: ChatListItem[] = [
  {
    id: "chat_1",
    createdAt: new Date().toISOString(),
    preview: "Exploring Anxiety Triggers",
    conversationAnalysisId: "conv_1"
  },
  {
    id: "chat_2",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    preview: "Post-Negotiation Debrief",
    conversationAnalysisId: "conv_2"
  }
];

import {
  createAssistant,
  createThread,
  sendMessage,
} from "@/lib/backboard";
import { generateStructuredJson } from "./gemini";
import type { ConversationPhase, ConversationEmoji } from "@/lib/types/conversation";
import { CONVERSATION_EMOJIS } from "@/lib/types/conversation";
import type { SpeakerAnalysis } from "./pipeline";
import { DbHandlers } from "@/lib/db/handlers";

// --- Types for the structured extraction ---

type AnalysisResult = {
  summary: string;
  emoji: ConversationEmoji;
  label: string;
  dynamics: ConversationPhase[];
  patterns: string[];
};

// --- Backboard assistant (cached per process) ---

export const ANALYSIS_INSTRUCTIONS = `You are an expert conversation analyst for Reflectif, an emotional intelligence coaching app.

You will receive a transcript of a real conversation between people, along with per-utterance emotion scores from prosody analysis. Your job is to produce a detailed markdown analysis.

Structure your response with these sections:

## SUMMARY
One paragraph overview of the entire conversation — the emotional arc, key themes, interpersonal dynamics, and overall trajectory.

## OVERALL TONE
A single 1-2 word label capturing the dominant emotional tone (e.g. "Tense", "Warm", "Draining", "Playful", "Guarded").
Then pick exactly one emoji from this set that best represents the tone: ${CONVERSATION_EMOJIS.join(" ")}

## CONVERSATION PHASES
Break the conversation into distinct phases based on semantic shifts — when the topic, energy, or dynamic meaningfully changed. For each phase provide:
- A human-readable label (e.g. "Disagreement about deadline")
- Why this is a distinct phase (what shifted)
- The emotional mood of this phase
- Any actionable insight or observation specific to this phase (if applicable)
- Start and end times in seconds from the conversation start

Do NOT use fixed time buckets. A 5-minute chat might have 2 phases, a 30-minute argument might have 8. Follow the actual conversation flow.

## COMMUNICATION PATTERNS
List 2-5 specific communication patterns you observe in THIS conversation. Be concrete and evidence-based, reference actual moments.
Examples: "deflects with humor when challenged", "interrupts when anxious", "validates partner before disagreeing"

Be honest, specific, and non-judgmental. Reference actual utterances and emotional data as evidence.`;

async function getOrCreateUserAssistant(userId: string): Promise<string> {
  const db = DbHandlers.getInstance();
  const user = db.getUser(userId);
  if (!user) throw new Error(`User not found: ${userId}`);

  if (user.backboardAssistantId) return user.backboardAssistantId;

  const assistantId = await createAssistant(
    `Reflectif Analyst — ${userId}`,
    ANALYSIS_INSTRUCTIONS
  );
  db.updateUserBackboardAssistantId(userId, assistantId);
  console.log(`Created Backboard assistant for user ${userId}: ${assistantId}`);
  return assistantId;
}

// --- Prompt builder ---

export function buildAnalysisPrompt(
  speakers: SpeakerAnalysis[]
): string {
  const lines: string[] = ["# Conversation Transcript with Emotion Data\n"];

  // Build chronological transcript
  const allUtterances = speakers
    .flatMap((s) =>
      s.utterances.map((u) => ({
        speaker: s.displayName,
        text: u.text,
        start: u.start,
        end: u.end,
        topEmotions: u.emotions
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((e) => `${e.name}(${e.score.toFixed(2)})`),
      }))
    )
    .sort((a, b) => a.start - b.start);

  for (const u of allUtterances) {
    const ts = formatTimestamp(u.start);
    lines.push(
      `**[${ts}] ${u.speaker}:** ${u.text}`,
      `  _Emotions: ${u.topEmotions.join(", ")}_\n`
    );
  }

  lines.push(
    "\n---",
    `Total speakers: ${speakers.length}`,
    `Speaker names: ${speakers.map((s) => s.displayName).join(", ")}`,
    `Total utterances: ${allUtterances.length}`,
    allUtterances.length > 0
      ? `Time range: ${formatTimestamp(allUtterances[0].start)} - ${formatTimestamp(allUtterances[allUtterances.length - 1].end)}`
      : ""
  );

  return lines.join("\n");
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// --- Gemini schema for structured extraction ---

const ANALYSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description: "One paragraph overview of the entire conversation",
    },
    emoji: {
      type: "STRING",
      enum: [...CONVERSATION_EMOJIS],
      description: "Emoji from the predetermined set that best represents the overall tone",
    },
    label: {
      type: "STRING",
      description: "1-2 word emotional tone label, e.g. 'Tense', 'Warm', 'Draining'",
    },
    dynamics: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          phase: {
            type: "STRING",
            description: "Human-readable label for this segment",
          },
          reason: {
            type: "STRING",
            description: "Why this is a distinct phase (what shifted)",
          },
          mood: {
            type: "STRING",
            description: "Emotional characterization of this phase",
          },
          insight: {
            type: "STRING",
            description: "Optional observation or actionable suggestion for this phase",
            nullable: true,
          },
          startTime: {
            type: "NUMBER",
            description: "Seconds from conversation start",
          },
          endTime: {
            type: "NUMBER",
            description: "Seconds from conversation start",
          },
        },
        required: ["phase", "reason", "mood", "startTime", "endTime"],
      },
      description: "LLM-segmented phases of the conversation based on semantic shifts",
    },
    patterns: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "2-5 communication patterns observed in this conversation",
    },
  },
  required: ["summary", "emoji", "label", "dynamics", "patterns"],
};

// --- Structured extraction via Gemini ---

async function extractStructuredAnalysis(
  markdown: string
): Promise<AnalysisResult> {
  const prompt = `Extract structured conversation analysis from the following markdown analysis.
Follow the schema exactly. For the emoji field, pick from: ${CONVERSATION_EMOJIS.join(" ")}

---

${markdown}`;

  const result = await generateStructuredJson<AnalysisResult>(
    prompt,
    ANALYSIS_SCHEMA
  );

  // Post-validate emoji
  if (!CONVERSATION_EMOJIS.includes(result.emoji as ConversationEmoji)) {
    result.emoji = "🤔";
  }

  return result;
}

// --- Main orchestrator ---

export async function analyzeConversation(
  userId: string,
  speakers: SpeakerAnalysis[]
): Promise<AnalysisResult> {
  // Stage 1: Backboard (GPT-4o) → rich markdown analysis (per-user assistant)
  const assistantId = await getOrCreateUserAssistant(userId);
  const threadId = await createThread(assistantId);

  const prompt = buildAnalysisPrompt(speakers);
  const { content: markdown } = await sendMessage(threadId, prompt);

  console.log("Backboard analysis complete, extracting structured data...");

  // Stage 2: Gemini → structured JSON
  const analysis = await extractStructuredAnalysis(markdown);

  return analysis;
}

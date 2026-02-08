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
import { loadPrompt } from "@/lib/prompts";

// --- Types for the structured extraction ---

type AnalysisResult = {
  summary: string;
  emoji: ConversationEmoji;
  label: string;
  dynamics: ConversationPhase[];
  patterns: string[];
};

// --- Backboard assistant ---

export function getAnalysisInstructions(): string {
  return loadPrompt("system").replace("{{CONVERSATION_EMOJIS}}", CONVERSATION_EMOJIS.join(" "));
}

export async function getOrCreateUserAssistant(userId: string): Promise<string> {
  const db = DbHandlers.getInstance();
  const user = db.getUser(userId);
  if (!user) throw new Error(`User not found: ${userId}`);

  if (user.backboardAssistantId) return user.backboardAssistantId;

  const assistantId = await createAssistant(
    `Reflectif Analyst — ${userId}`,
    getAnalysisInstructions()
  );
  db.updateUserBackboardAssistantId(userId, assistantId);
  console.log(`Created Backboard assistant for user ${userId}: ${assistantId}`);
  return assistantId;
}

// --- Prompt builder ---

type FlatUtterance = {
  index: number;
  speaker: string;
  text: string;
  start: number;
  end: number;
  topEmotions: string[];
};

export function buildAnalysisPrompt(
  speakers: SpeakerAnalysis[]
): { prompt: string; timestampIndex: string } {
  const lines: string[] = ["# Conversation Transcript with Emotion Data\n"];

  const allUtterances: FlatUtterance[] = speakers
    .flatMap((s) =>
      s.utterances.map((u) => ({
        index: 0,
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
    .sort((a, b) => a.start - b.start)
    .map((u, i) => ({ ...u, index: i + 1 }));

  for (const u of allUtterances) {
    const ts = formatTimestamp(u.start);
    lines.push(
      `**[${ts} | t=${u.start.toFixed(1)}s] ${u.speaker}:** ${u.text}`,
      `  _Emotions: ${u.topEmotions.join(", ")}_\n`
    );
  }

  // Metadata
  lines.push(
    "\n---",
    `Total speakers: ${speakers.length}`,
    `Speaker names: ${speakers.map((s) => s.displayName).join(", ")}`,
    `Total utterances: ${allUtterances.length}`,
    allUtterances.length > 0
      ? `Time range: ${allUtterances[0].start.toFixed(1)}s - ${allUtterances[allUtterances.length - 1].end.toFixed(1)}s`
      : ""
  );

  // Timestamp index table
  const indexLines: string[] = [
    "\n## Utterance Timestamp Index",
    "| # | Speaker | Start (s) | End (s) |",
    "|---|---------|-----------|---------|",
  ];
  for (const u of allUtterances) {
    indexLines.push(
      `| ${u.index} | ${u.speaker} | ${u.start.toFixed(1)} | ${u.end.toFixed(1)} |`
    );
  }

  const timestampIndex = indexLines.join("\n");
  lines.push(timestampIndex);

  return { prompt: lines.join("\n"), timestampIndex };
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
      description: "2-3 sentence overview addressing the user as 'you.' Focus on emotional arc and interpersonal dynamics, not just the topic. Max 300 chars. Displayed as the main card text on mobile.",
    },
    emoji: {
      type: "STRING",
      enum: [...CONVERSATION_EMOJIS],
      description: "Emoji from the predetermined set that best represents the overall emotional tone.",
    },
    label: {
      type: "STRING",
      description: "1-2 word EMOTIONAL tone label (e.g. 'Tense', 'Warm', 'Draining'). Must describe emotional quality, not topic. 'Practical Advice' is a topic — prefer 'Supportive' or 'Engaged.' Displayed as the card title on mobile.",
    },
    dynamics: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          phase: {
            type: "STRING",
            description: "Human-readable label for this segment (3-7 words, e.g. 'Disagreement about deadline escalates'). Displayed as a timeline label on mobile.",
          },
          reason: {
            type: "STRING",
            description: "Why this is a distinct phase — what shifted (topic? tone? who's leading? conflict level?). Max 120 chars.",
          },
          mood: {
            type: "STRING",
            description: "Emotional characterization of this phase (1-3 words, e.g. 'Tense', 'Playful', 'Guarded'). Displayed as a mood badge.",
          },
          insight: {
            type: "STRING",
            description: "Optional 1-sentence insight FOR THE USER using 'you.' Only include if genuinely useful — prefer null over generic advice. Name specific behavior and suggest specific antidote. Max 150 chars.",
            nullable: true,
          },
          startTime: {
            type: "NUMBER",
            description: "Exact start timestamp in seconds from the Utterance Timestamp Index. Must match a real utterance start time — not rounded.",
          },
          endTime: {
            type: "NUMBER",
            description: "Exact end timestamp in seconds from the Utterance Timestamp Index. Must match a real utterance end time — not rounded.",
          },
        },
        required: ["phase", "reason", "mood", "startTime", "endTime"],
      },
      description: "Conversation phases based on semantic shifts. Boundaries must use exact utterance timestamps with no gaps or overlaps.",
    },
    patterns: {
      type: "ARRAY",
      items: {
        type: "STRING",
        description: "Format: 'you [specific behavior] when/during/after [trigger or context]' (max 15 words). Must describe what YOU DO, not a category. Good: 'you deflect with humor when challenged.' Bad: 'Experiential Sharing.'",
      },
      description: "2-5 behavioral communication patterns about the USER. Each must pair a concrete behavior with its trigger/context.",
    },
  },
  required: ["summary", "emoji", "label", "dynamics", "patterns"],
};

// --- Structured extraction via Gemini ---

async function extractStructuredAnalysis(
  markdown: string,
  timestampIndex: string
): Promise<AnalysisResult> {
  const prompt = `Extract structured conversation analysis from the following markdown analysis.
Follow the schema exactly. For the emoji field, pick from: ${CONVERSATION_EMOJIS.join(" ")}

TIMESTAMPS: Use exact decimal values from the Utterance Timestamp Index. Do NOT round. "1:23" = 83 seconds, not 80 or 100.

USER-CENTRIC ADDRESSING: The summary and insights must address the user as "you." Patterns must start with "you" (e.g. "you deflect with humor when challenged").

LENGTH CONSTRAINTS: summary ≤ 300 chars, reason ≤ 120 chars, insight ≤ 150 chars, pattern ≤ 15 words.

FAITHFUL EXTRACTION: Preserve the full behavioral description. Do NOT shorten "you deflect with humor when challenged on specifics" to "Humor-based Deflection." Prefer the most specific and concrete version.

---

${markdown}

---

${timestampIndex}`;

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
  // Stage 1: Backboard (Gemini 3 Pro) → rich markdown analysis (per-user assistant)
  const assistantId = await getOrCreateUserAssistant(userId);
  const threadId = await createThread(assistantId);

  const { prompt, timestampIndex } = buildAnalysisPrompt(speakers);
  const { content: markdown } = await sendMessage(threadId, prompt);

  // Stage 2: Gemini 3 Flash → structured JSON
  return extractStructuredAnalysis(markdown, timestampIndex);
}

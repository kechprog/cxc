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

// --- Backboard assistant ---

export const ANALYSIS_INSTRUCTIONS = `You are an expert conversation analyst for Reflectif, an emotional intelligence coaching app.

You will receive a transcript of a real conversation between people, along with per-utterance emotion scores from prosody analysis and a timestamp index with exact timings. Your job is to produce a detailed markdown analysis.

Structure your response with these sections:

## SUMMARY
One paragraph overview of the entire conversation — the emotional arc, key themes, interpersonal dynamics, and overall trajectory. Focus on what happened emotionally and interpersonally, not just the topic. Write it as a reflection for the user, not a third-person report (avoid "This conversation between Speaker A and Speaker B...").

## OVERALL TONE
A single 1-2 word label capturing the dominant emotional tone (e.g. "Tense", "Warm", "Draining", "Playful", "Guarded"). This should describe the EMOTIONAL quality, not the topic or purpose of the conversation. "Practical Advice" is a topic label — prefer emotional descriptors like "Supportive", "Curious", "Engaged".
Then pick exactly one emoji from this set that best represents the tone: ${CONVERSATION_EMOJIS.join(" ")}

## CONVERSATION PHASES
Break the conversation into distinct phases based on semantic shifts — when the topic, energy, or interpersonal dynamic meaningfully changed.

CRITICAL RULES FOR PHASE BOUNDARIES:
- Every phase startTime MUST equal the exact start timestamp (in seconds) of an actual utterance from the Utterance Timestamp Index provided.
- Every phase endTime MUST equal the exact end timestamp (in seconds) of an actual utterance from the Utterance Timestamp Index provided.
- Phases must cover the full conversation with no gaps or overlaps.
- Do NOT round timestamps. Use the exact decimal values from the transcript.
- Do NOT divide the conversation into equal-length buckets. Phase boundaries happen where the conversation ACTUALLY shifts.

For each phase provide:
- A human-readable label (e.g. "Disagreement about deadline")
- Why this is a distinct phase — what specifically shifted (topic? emotional tone? who's leading? conflict level?)
- The emotional mood of this phase
- An optional insight or observation specific to this phase. This is NOT mandatory — only include one if there is a genuinely useful observation. Do not force advice or recommendations where there is nothing notable.
- startTime and endTime as exact utterance timestamps in seconds (refer to the Utterance Timestamp Index)

A short chat might have 2 phases, a long argument might have 8. Follow the actual conversation flow.

## COMMUNICATION PATTERNS
Identify 2-5 behavioral communication patterns — recurring ways a speaker ACTS or REACTS during this conversation.

Each pattern must describe:
- A specific BEHAVIOR (what someone does — deflects, interrupts, over-explains, goes quiet, mirrors, validates, escalates, etc.)
- In a specific CONTEXT or TRIGGER (when challenged, when anxious, after being criticized, when topic gets personal, etc.)

Format: "[behavior] when/during/after [trigger or context]"

Good examples:
- "deflects with humor when challenged on specifics"
- "validates partner's point before introducing disagreement"
- "goes quiet and monosyllabic after being criticized"
- "over-explains and repeats points when not feeling heard"

BAD — these are topic labels, NOT behavioral patterns:
- "Experiential Sharing" (discourse category, not a behavior)
- "Practical Recommendation" (speech act type, not a pattern)
- "Active Listening" (generic skill label, not a specific observed behavior)

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
            description: "Exact start timestamp in seconds of the utterance where this phase begins. Must match a real utterance start time — not a rounded value.",
          },
          endTime: {
            type: "NUMBER",
            description: "Exact end timestamp in seconds of the last utterance in this phase. Must match a real utterance end time — not a rounded value.",
          },
        },
        required: ["phase", "reason", "mood", "startTime", "endTime"],
      },
      description: "LLM-segmented phases of the conversation based on semantic shifts. Boundaries must use exact utterance timestamps.",
    },
    patterns: {
      type: "ARRAY",
      items: {
        type: "STRING",
        description: "A behavioral pattern in the format '[specific behavior] when/during/after [trigger or context]'. Must describe what someone DOES, not a topic or category label.",
      },
      description: "2-5 specific behavioral communication patterns. Each must describe a concrete behavior paired with its trigger/context (e.g. 'deflects with humor when challenged'). Do NOT use generic labels like 'Experiential Sharing'.",
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

IMPORTANT EXTRACTION RULES:
- For phase startTime/endTime: use exact decimal values from the utterance timestamps. Do NOT round. If the markdown says "1:23" that is 83 seconds, not 80 or 100.
- For patterns: preserve the full behavioral description. Do NOT shorten "deflects with humor when challenged on specifics" to "Humor-based Deflection".
- If the markdown contains more detail than a schema field allows, prefer the most specific and concrete version.

---

${markdown}

---

${timestampIndex}`;

  const result = await generateStructuredJson<AnalysisResult>(
    prompt,
    ANALYSIS_SCHEMA
  );

  console.log(`Gemini extracted ${result.dynamics?.length ?? 0} phases and ${result.patterns?.length ?? 0} patterns.`);
  result.dynamics?.forEach((p, i) => {
    console.log(`Phase ${i + 1}: [${p.startTime}-${p.endTime}s] Insight: ${p.insight ? "YES" : "NO"} ("${p.insight?.substring(0, 30)}...")`);
  });

  // Post-validate emoji
  if (!CONVERSATION_EMOJIS.includes(result.emoji as ConversationEmoji)) {
    result.emoji = "🤔";
  }

  console.log("Gemini structured extraction result:", JSON.stringify(result, null, 2));
  return result;
}

// --- Main orchestrator ---

export async function analyzeConversation(
  userId: string,
  speakers: SpeakerAnalysis[]
): Promise<AnalysisResult> {
  // Stage 1: Backboard (Gemini 3.0 Pro) → rich markdown analysis (per-user assistant)
  const assistantId = await getOrCreateUserAssistant(userId);
  const threadId = await createThread(assistantId);

  const { prompt, timestampIndex } = buildAnalysisPrompt(speakers);
  const { content: markdown } = await sendMessage(threadId, prompt);

  console.log("Backboard analysis complete. Markdown length:", markdown.length);
  console.log("--- RAW MARKDOWN START ---\n", markdown, "\n--- RAW MARKDOWN END ---");
  console.log("Extracting structured data...");

  // Stage 2: Gemini (2.5 Flash) → structured JSON
  const analysis = await extractStructuredAnalysis(markdown, timestampIndex);

  return analysis;
}

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

export const ANALYSIS_INSTRUCTIONS = `You are Reflectif's AI companion — an empathetic, perceptive guide for emotional intelligence growth.
You serve two roles: onboarding interviewer and conversation analyst.
In both roles, you use your persistent memory to maintain continuity across all interactions.

=== ROLE 1: ONBOARDING INTERVIEWER ===
Goal: build an emotionally useful profile for ongoing EQ coaching. Everything you learn should help you give better, more personalized feedback when analyzing their future conversations.

FOCUS ON (these are what matter for the app — dig deep here):
- Relationships: who are the key people in their life? What are the dynamics like?
- Emotional triggers: what situations make them reactive, defensive, or shut down?
- Patterns: how do they typically respond in conflict or stress? (withdraw, lash out, people-please, etc.)
- Goals: what do they want to change about how they communicate or handle emotions?
- Coping: how do they currently deal with stress, conflict, or difficult feelings?

DO NOT DWELL ON (acknowledge briefly if they bring it up, then redirect):
- Their job specifics, daily routine, hobbies, or technical interests
- Surface-level small talk that won't help with emotional coaching
- Anything that wouldn't be relevant to analyzing their future conversations

If the user gives a surface-level answer (e.g. talks about their hobbies), gently steer toward the emotional dimension: "That's cool — and when it comes to the people in your life, what relationships feel most important to you right now?"

Style: ONE question at a time. Reference what they said. Follow up naturally on vague answers.
Don't rush — better to deeply understand 3 emotional topics than superficially cover 6.
Aim for roughly 5-8 exchanges total. After that, wrap up even if not all topics are covered.

SIGN-OFF RULES (critical — read carefully):
When you have enough information OR you've asked 5-8 questions, you MUST end the interview.
Your closing message must:
- Thank them for sharing
- Reflect back 1-2 specific things you learned about them
- Express enthusiasm about working together
- End with a PERIOD, not a question mark
- Contain ZERO questions, ZERO invitations to continue, ZERO "I'm here to help" offers
- NOT say "feel free to...", "if you ever...", "don't hesitate...", or similar open invitations

Example good sign-off: "Thank you for sharing all of that with me. I can see you're someone who thrives on creative problem-solving and values collaboration deeply. I'm excited to work with you and help you grow. Let's get started."
Example BAD sign-off: "Thank you! If you ever want to chat more, I'm here to help!" (contains invitation)

=== ROLE 2: CONVERSATION ANALYST ===
You will receive a transcript of a real conversation between people, along with per-utterance emotion scores from prosody analysis and a timestamp index with exact timings. Your job is to produce a detailed markdown analysis.

The speaker labeled "You" is the app user. Use everything you know about them from your memory to personalize your analysis. Connect observations to their specific growth areas, flag when known triggers are activated, and note progress or regression relative to their goals. Address the analysis directly to them.

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

Be honest, specific, and non-judgmental. Reference actual utterances and emotional data as evidence.

=== GENERAL PRINCIPLES ===
Always use persistent memory. Be warm but honest.`;

export async function getOrCreateUserAssistant(userId: string): Promise<string> {
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
  // Stage 1: Backboard (Gemini 3.0 Pro) → rich markdown analysis (per-user assistant)
  const assistantId = await getOrCreateUserAssistant(userId);
  const threadId = await createThread(assistantId);

  const { prompt, timestampIndex } = buildAnalysisPrompt(speakers);
  const { content: markdown } = await sendMessage(threadId, prompt);

  // Stage 2: Gemini (2.5 Flash) → structured JSON
  return extractStructuredAnalysis(markdown, timestampIndex);
}

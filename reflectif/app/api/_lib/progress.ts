import { createHash } from "crypto";
import { createThread, sendMessage } from "@/lib/backboard";
import { generateStructuredJson } from "./gemini";
import { DbHandlers } from "@/lib/db/handlers";
import type { UserProgress } from "@/lib/types/progress";
import { EQ_DIMENSION_NAMES } from "@/lib/types/progress";
import type { ConversationAnalysisWithTranscripts } from "@/lib/db/dto";
import { loadPrompt } from "@/lib/prompts";

// --- Cache helpers ---

function computeInputHash(
  analyses: ConversationAnalysisWithTranscripts[]
): string {
  const analysisFingerprints = analyses.map((a) => ({
    id: a.id,
    analyzedAt: a.analyzedAt,
    summary: a.summary,
    patterns: a.patterns,
  }));

  const payload = JSON.stringify({ analyses: analysisFingerprints });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

// --- Prompt builder ---

function buildProgressPrompt(
  analyses: ConversationAnalysisWithTranscripts[]
): string {
  const lines: string[] = [
    "# User Progress Analysis Request\n",
    loadPrompt("progress"),
    "",
  ];

  // Per-conversation data
  const first = analyses[0].analyzedAt;
  const last = analyses[analyses.length - 1].analyzedAt;
  lines.push(`## Conversation History (${analyses.length} conversations, ${first} to ${last})\n`);

  for (let i = 0; i < analyses.length; i++) {
    const a = analyses[i];
    const date = new Date(a.analyzedAt).toLocaleDateString(undefined, {
      month: "short", day: "numeric",
    });
    lines.push(`### Conversation ${i + 1} — ${a.emoji} ${a.label} (${date})`);
    lines.push(`**Summary:** ${a.summary}`);
    lines.push(`**Patterns:** ${a.patterns.join("; ")}`);
    if (a.dynamics.length > 0) {
      lines.push("**Phases:**");
      for (const d of a.dynamics) {
        const insight = d.insight ? ` — _${d.insight}_` : "";
        lines.push(`- ${d.phase} (${d.mood}): ${d.reason}${insight}`);
      }
    }
    lines.push("");
  }

  // Pre-aggregated pattern frequency
  const patternCounts = new Map<string, number>();
  for (const a of analyses) {
    for (const p of a.patterns) {
      patternCounts.set(p, (patternCounts.get(p) || 0) + 1);
    }
  }
  const sortedPatterns = [...patternCounts.entries()].sort((a, b) => b[1] - a[1]);
  lines.push("## Pattern Frequency\n");
  for (const [pattern, count] of sortedPatterns) {
    lines.push(`- **${count}x** ${pattern}`);
  }
  lines.push("");

  // Phase mood distribution
  const moodCounts = new Map<string, number>();
  for (const a of analyses) {
    for (const d of a.dynamics) {
      moodCounts.set(d.mood, (moodCounts.get(d.mood) || 0) + 1);
    }
  }
  const sortedMoods = [...moodCounts.entries()].sort((a, b) => b[1] - a[1]);
  lines.push("## Phase Mood Distribution\n");
  for (const [mood, count] of sortedMoods) {
    lines.push(`- **${count}x** ${mood}`);
  }
  lines.push("");

  // The progress.md prompt file already contains full instructions, rubric, and output structure.

  return lines.join("\n");
}

// --- Gemini schema ---

const PROGRESS_SCHEMA = {
  type: "OBJECT",
  properties: {
    eq: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: {
            type: "STRING",
            enum: [...EQ_DIMENSION_NAMES],
            description: "EQ dimension name.",
          },
          score: {
            type: "NUMBER",
            description: "0.0-1.0 based on BEHAVIORAL evidence, not emotional valence. Feeling sad is NOT a low score. Recognizing and managing it IS a high score.",
          },
          trend: {
            type: "STRING",
            description: "Trajectory description using 'you' (max 80 chars). E.g. 'Improving since you started naming emotions in conflict'. Displayed on a mobile progress card.",
          },
        },
        required: ["name", "score", "trend"],
      },
      description:
        "Exactly 5 EQ dimension scores, one for each: self_awareness, self_regulation, empathy, social_skills, stress_management",
    },
    progress: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          observation: {
            type: "STRING",
            description: "What improved, using 'you' (max 100 chars). E.g. 'You started acknowledging your partner's perspective before responding'. Must be a behavioral change, not a topic.",
          },
          evidence: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Specific references (max 60 chars each) in format: 'brief behavior — Mon DD'. E.g. 'asked how they felt before advising — Jan 28'",
          },
        },
        required: ["observation", "evidence"],
      },
      description: "2-5 concrete improvements the user has made, with evidence",
    },
    improvements: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          observation: {
            type: "STRING",
            description: "What still needs work, using 'you' (max 100 chars).",
          },
          evidence: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Specific references (max 60 chars each) in same format as progress evidence.",
          },
          suggestion: {
            type: "STRING",
            description: "Concrete, actionable micro-exercise starting with a verb (max 120 chars). E.g. 'Try pausing for 3 seconds before responding when you feel defensive.' NOT vague advice like 'Work on being more empathetic.'",
          },
        },
        required: ["observation", "evidence", "suggestion"],
      },
      description: "2-4 areas that still need work, with evidence and actionable suggestions",
    },
  },
  required: ["eq", "progress", "improvements"],
};

// --- Structured extraction ---

async function extractStructuredProgress(
  markdown: string
): Promise<UserProgress> {
  const prompt = `Extract a structured user progress report from the following markdown analysis.
Follow the schema exactly. The eq array must have exactly 5 entries, one for each dimension:
${EQ_DIMENSION_NAMES.join(", ")}.

SCORING: Scores 0.0-1.0 based on BEHAVIORAL evidence. Feeling sad ≠ low score. Managing emotions well = high score.

USER-CENTRIC ADDRESSING: All observations, trends, and suggestions must address the user as "you."

LENGTH CONSTRAINTS: trend ≤ 80 chars, observation ≤ 100 chars, evidence ≤ 60 chars each ("behavior — Mon DD" format), suggestion ≤ 120 chars (verb-first).

FAITHFUL EXTRACTION: Evidence must contain specific conversation references, not generic statements. Suggestions must be concrete micro-exercises, not vague advice.

---

${markdown}`;

  const result = await generateStructuredJson<UserProgress>(
    prompt,
    PROGRESS_SCHEMA
  );

  // Post-validate: ensure all 5 EQ dimensions are present
  const presentDimensions = new Set(result.eq.map((d) => d.name));
  for (const dim of EQ_DIMENSION_NAMES) {
    if (!presentDimensions.has(dim)) {
      result.eq.push({ name: dim, score: 0.5, trend: "Insufficient data" });
    }
  }

  // Clamp scores to [0, 1]
  for (const dim of result.eq) {
    dim.score = Math.max(0, Math.min(1, dim.score));
  }

  return result;
}

// --- Main orchestrator ---

export async function generateProgress(
  userId: string,
  since: string
): Promise<UserProgress> {
  const db = DbHandlers.getInstance();

  const analyses = db.getConversationAnalysesInWindow(userId, since);

  if (analyses.length === 0) {
    return {
      eq: EQ_DIMENSION_NAMES.map((name) => ({
        name,
        score: 0.5,
        trend: "No conversations analyzed yet",
      })),
      progress: [],
      improvements: [],
    };
  }

  // Check cache before calling LLM
  const inputHash = computeInputHash(analyses);
  const cached = db.getProgressCache(userId, inputHash);
  if (cached) {
    console.log("[progress] Cache hit, returning cached progress");
    return cached;
  }

  const user = db.getUser(userId);
  if (!user?.backboardAssistantId) {
    throw new Error("User has no assistant configured");
  }

  // Stage 1: Backboard (Gemini 3 Pro) with memory:read
  const threadId = await createThread(user.backboardAssistantId);
  const prompt = buildProgressPrompt(analyses);
  const { content: markdown } = await sendMessage(
    threadId,
    prompt,
    true,
    "read"
  );

  console.log("[progress] Backboard analysis complete, extracting structured data...");

  // Stage 2: Gemini 3 Flash → structured JSON
  const progress = await extractStructuredProgress(markdown);

  // Cache the result
  db.setProgressCache(userId, inputHash, progress);
  console.log("[progress] Cached new progress result");

  return progress;
}

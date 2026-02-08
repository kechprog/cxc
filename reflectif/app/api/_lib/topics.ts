import { createThread, sendMessage } from "@/lib/backboard";
import { generateStructuredJson } from "./gemini";
import { DbHandlers } from "@/lib/db/handlers";
import type { TopicSuggestion } from "@/lib/types/chat";
import type { ConversationAnalysisWithTranscripts } from "@/lib/db/dto";
import { loadPrompt } from "@/lib/prompts";

// --- Prompt builder ---

function buildTopicsPrompt(
  analyses: ConversationAnalysisWithTranscripts[]
): string {
  const lines: string[] = [
    "# Topic Suggestion Request\n",
    loadPrompt("topics"),
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

  // The topics.md prompt file already contains full instructions with good/bad examples.

  return lines.join("\n");
}

// --- Gemini schema ---

const TOPICS_SCHEMA = {
  type: "OBJECT",
  properties: {
    topics: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: {
            type: "STRING",
            description:
              "Personal prompt (3-6 words) using 'your' where natural. Good: 'Your pattern of withdrawing'. Bad: 'Conflict avoidance tendencies'. Displayed as a topic bubble on mobile.",
          },
          description: {
            type: "STRING",
            description:
              "One sentence using 'you', referencing a specific conversation or pattern. Good: 'You went quiet in two recent conversations right after being challenged.' Bad: 'Analysis indicates recurring emotional withdrawal.'",
          },
          contextPrompt: {
            type: "STRING",
            description:
              "Context paragraph prepended to user's first message. Must: address user as 'you', frame for USER's growth, include specific evidence (patterns, dates, behaviors), end with coaching direction, instruct AI for 2-4 sentence responses.",
          },
        },
        required: ["label", "description", "contextPrompt"],
      },
      description: "Exactly 3 conversation topic suggestions grounded in conversation data",
    },
  },
  required: ["topics"],
};

// --- Main function ---

export async function generateTopics(
  userId: string
): Promise<TopicSuggestion[]> {
  const db = DbHandlers.getInstance();

  const user = db.getUser(userId);
  if (!user?.backboardAssistantId) {
    return [];
  }

  // Fetch recent conversation data (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const analyses = db.getConversationAnalysesInWindow(userId, thirtyDaysAgo.toISOString());

  if (analyses.length === 0) {
    return [];
  }

  // Stage 1: Backboard (memory:read) → markdown suggestions
  const threadId = await createThread(user.backboardAssistantId);
  const prompt = buildTopicsPrompt(analyses);

  const { content: markdown } = await sendMessage(
    threadId,
    prompt,
    true,
    "read"
  );

  console.log("[topics] Backboard suggestions complete, extracting structured data...");

  // Stage 2: Gemini 2.5 Flash → structured JSON
  const extractionPrompt = `Extract exactly 3 conversation topic suggestions from the following markdown.
Follow the schema exactly.

USER-CENTRIC ADDRESSING: Labels use "your" where natural. Descriptions use "you." contextPrompt addresses user as "you" and frames for USER's growth.

LENGTH CONSTRAINTS: label 3-6 words, description 1 sentence, contextPrompt 1 paragraph.

FAITHFUL EXTRACTION: Each topic must reference specific conversation data — no generic suggestions. Preserve specific patterns, dates, and behavioral references.

---

${markdown}`;

  const result = await generateStructuredJson<{ topics: TopicSuggestion[] }>(
    extractionPrompt,
    TOPICS_SCHEMA
  );

  return result.topics.slice(0, 3);
}

import { createThread, sendMessage } from "@/lib/backboard";
import { generateStructuredJson } from "./gemini";
import { DbHandlers } from "@/lib/db/handlers";
import type { TopicSuggestion } from "@/lib/types/chat";
import type { CoreUserFile } from "@/lib/types/user";
import type { ConversationAnalysisWithTranscripts } from "@/lib/db/dto";

// --- Prompt builder ---

function buildTopicsPrompt(
  analyses: ConversationAnalysisWithTranscripts[],
  coreUserFile: CoreUserFile | null
): string {
  const lines: string[] = [
    "# Topic Suggestion Request\n",
    "You are generating 3 personalized conversation topic suggestions for a Reflectif EQ coaching session.",
    "Each topic must be grounded in the user's actual conversation history provided below.",
    "Do NOT suggest generic topics — every suggestion must reference specific patterns, behaviors, or situations from the data.\n",
  ];

  // Core user file context
  if (coreUserFile) {
    lines.push("## User Context (Core File)\n");
    if (coreUserFile.background) lines.push(`- **Background:** ${coreUserFile.background}`);
    if (coreUserFile.relationships) lines.push(`- **Relationships:** ${coreUserFile.relationships}`);
    if (coreUserFile.goals) lines.push(`- **Goals:** ${coreUserFile.goals}`);
    if (coreUserFile.triggers) lines.push(`- **Triggers:** ${coreUserFile.triggers}`);
    if (coreUserFile.eqBaseline) lines.push(`- **EQ Baseline:** ${coreUserFile.eqBaseline}`);
    if (coreUserFile.patterns) lines.push(`- **Known Patterns:** ${coreUserFile.patterns}`);
    if (coreUserFile.lifeContext) lines.push(`- **Life Context:** ${coreUserFile.lifeContext}`);
    lines.push("");
  }

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

  // Instructions
  lines.push(
    "## Instructions\n",
    "Based on ALL the data above plus your accumulated knowledge of this user, suggest exactly 3 conversation topics for an EQ coaching session.\n",
    "Each topic must:",
    "- Target a specific behavioral pattern or emotional skill observed in the conversations above",
    "- Reference concrete evidence (specific patterns, phase moods, or conversation summaries)",
    "- Be framed as an invitation to reflect, not a lecture\n",
    "For each topic provide:",
    "1. A short label (3-6 words) for display",
    "2. A one-sentence description of why this topic matters for them right now, referencing specific conversation data",
    "3. A detailed context paragraph that a coaching AI should use to guide the conversation — include the specific patterns, behaviors, triggers, phase moods, and conversation dates that are relevant to this topic",
  );

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
              "Short display text for the topic bubble (3-6 words), e.g. 'Evening anxiety patterns'",
          },
          description: {
            type: "STRING",
            description:
              "One sentence explaining why this topic is relevant, referencing specific conversation data",
          },
          contextPrompt: {
            type: "STRING",
            description:
              "Detailed context paragraph for the LLM when the user selects this topic. Must include specific patterns, behaviors, or triggers from the user's conversation history.",
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

  const coreUserFile = db.getCoreUserFile(userId);

  // Stage 1: Backboard (memory:read) → markdown suggestions
  const threadId = await createThread(user.backboardAssistantId);
  const prompt = buildTopicsPrompt(analyses, coreUserFile);

  const { content: markdown } = await sendMessage(
    threadId,
    prompt,
    true,
    "read"
  );

  console.log("[topics] Backboard suggestions complete, extracting structured data...");

  // Stage 2: Gemini 2.5 Flash → structured JSON
  const extractionPrompt = `Extract exactly 3 conversation topic suggestions from the following markdown.
Follow the schema exactly. Each topic must reference specific conversation data — no generic suggestions.

---

${markdown}`;

  const result = await generateStructuredJson<{ topics: TopicSuggestion[] }>(
    extractionPrompt,
    TOPICS_SCHEMA
  );

  return result.topics.slice(0, 3);
}

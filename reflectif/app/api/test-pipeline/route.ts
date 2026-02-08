import { processConversation } from "@/app/api/_lib/pipeline";
import type { SpeakerAnalysis } from "@/app/api/_lib/pipeline";
import { analyzeConversation } from "@/app/api/_lib/analysis";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";
import type { ConversationAnalysis } from "@/lib/types/conversation";
import type { TranscriptMessage } from "@/lib/types/transcript";

// Dev-only test endpoint — reads dialog.wav from disk and runs the full pipeline
export async function POST() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.sub;

  const db = DbHandlers.getInstance();
  const user = db.getUser(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "dialog.wav");
  const buffer = Buffer.from(await readFile(filePath));
  const id = crypto.randomUUID();

  console.log(`[test-pipeline] Running pipeline for user ${userId}, file: dialog.wav`);

  try {
    const pipelineResult = await processConversation(buffer, "dialog.wav", user.voiceId);

    const transcripts: TranscriptMessage[] = pipelineResult.speakers
      .flatMap((speaker: SpeakerAnalysis) =>
        speaker.utterances.map((u) => ({
          role: speaker.displayName,
          text: u.text,
          sentiment: u.emotions.length > 0
            ? u.emotions.reduce((a, b) => (a.score > b.score ? a : b)).name
            : undefined,
          timestamp: `${Math.floor(u.start / 60).toString().padStart(2, "0")}:${Math.floor(u.start % 60).toString().padStart(2, "0")}`,
          _sortKey: u.start,
        }))
      )
      .sort((a: { _sortKey: number }, b: { _sortKey: number }) => a._sortKey - b._sortKey)
      .map(({ _sortKey, ...msg }: { _sortKey: number } & TranscriptMessage) => msg);

    const scores = pipelineResult.speakers
      .flatMap((speaker: SpeakerAnalysis) =>
        speaker.utterances.map((u) => ({
          timestamp: u.start,
          speaker: speaker.displayName,
          emotions: u.emotions,
        }))
      )
      .sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);

    console.log(`[test-pipeline] Pipeline done. Running LLM analysis...`);

    let summary = "";
    let emoji: ConversationAnalysis["emoji"] = "🤔";
    let label = "New";
    let dynamics: ConversationAnalysis["dynamics"] = [];
    let patterns: ConversationAnalysis["patterns"] = [];

    try {
      const llmResult = await analyzeConversation(userId, pipelineResult.speakers);
      summary = llmResult.summary;
      emoji = llmResult.emoji;
      label = llmResult.label;
      dynamics = llmResult.dynamics;
      patterns = llmResult.patterns;
    } catch (err) {
      console.error("[test-pipeline] LLM analysis failed:", err);
    }

    const conversationAnalysis: ConversationAnalysis = {
      id,
      analyzedAt: new Date().toISOString(),
      summary,
      emoji,
      label,
      dynamics,
      scores,
      patterns,
    };

    db.createConversationAnalysis(userId, conversationAnalysis, transcripts);

    return NextResponse.json({ id, status: "completed", analysis: conversationAnalysis, transcripts });
  } catch (error) {
    console.error("[test-pipeline] Failed:", error);
    return NextResponse.json(
      { id, status: "failed", error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 },
    );
  }
}

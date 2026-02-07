// TODO: Replace userId form field with Auth0 session — authenticate requests
// and derive userId from token instead of trusting client-provided value.

import { processConversation } from "@/app/api/_lib/pipeline";
import type { SpeakerAnalysis } from "@/app/api/_lib/pipeline";
import { analyzeConversation } from "@/app/api/_lib/analysis";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { DbHandlers } from "@/lib/db/handlers";
import type { ConversationAnalysis } from "@/lib/types/conversation";
import type { TranscriptMessage } from "@/lib/types/transcript";

export async function POST(request: Request) {
  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;
  const userId = formData.get("userId") as string | null;

  if (!audioFile) {
    return NextResponse.json(
      { error: "No audio file provided" },
      { status: 400 },
    );
  }
  if (!userId) {
    return NextResponse.json(
      { error: "No userId provided" },
      { status: 400 },
    );
  }

  const db = DbHandlers.getInstance();
  const user = db.getUser(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const id = crypto.randomUUID();

  // Save to data/ for testing
  const dataDir = path.join(process.cwd(), "data");
  await mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, `${id}.wav`);
  await writeFile(filePath, buffer);
  console.log(`Saved recording to ${filePath}`);

  try {
    const pipelineResult = await processConversation(
      buffer,
      audioFile.name,
      user.voiceId,
    );

    // Build transcript messages from speaker utterances, sorted by time
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

    // Build timestamped emotion scores from all utterances
    const scores = pipelineResult.speakers
      .flatMap((speaker: SpeakerAnalysis) =>
        speaker.utterances.map((u) => ({
          timestamp: u.start,
          speaker: speaker.displayName,
          emotions: u.emotions,
        }))
      )
      .sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);

    // LLM analysis: Backboard (GPT-4o) → Gemini (structured JSON)
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
      console.error("LLM analysis failed, using placeholders:", err);
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

    return NextResponse.json({ id, status: "completed", analysis: conversationAnalysis });
  } catch (error) {
    console.error("Processing failed:", error);
    return NextResponse.json(
      {
        id,
        status: "failed",
        error: error instanceof Error ? error.message : "Processing failed",
      },
      { status: 500 },
    );
  }
}

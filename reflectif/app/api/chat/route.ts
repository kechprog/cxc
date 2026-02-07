import { NextRequest, NextResponse } from "next/server";
import { createAssistant, createThread, sendMessage } from "@/lib/backboard";
import { DbHandlers } from "@/lib/db/handlers";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      threadId,
      assistantId,
      chatId,
      conversationAnalysisId,
    } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    let aId = assistantId as string | undefined;
    let tId = threadId as string | undefined;
    let cId = chatId as string | undefined;

    if (!aId) {
      aId = await createAssistant("Reflectif Assistant");
    }

    if (!tId) {
      tId = await createThread(aId);
    }

    // Create chat record on first message
    const db = DbHandlers.getInstance();
    if (!cId) {
      cId = randomUUID();
      db.createChat({
        id: cId,
        conversationAnalysisId: conversationAnalysisId ?? null,
        createdAt: new Date().toISOString(),
      });
    }

    const now = new Date().toISOString();

    // Persist user message
    db.addChatMessage(cId, {
      id: randomUUID(),
      role: "user",
      content: message,
      createdAt: now,
    });

    const result = await sendMessage(tId, message, true);

    // Persist assistant response
    db.addChatMessage(cId, {
      id: randomUUID(),
      role: "assistant",
      content: result.content,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      content: result.content,
      threadId: tId,
      assistantId: aId,
      chatId: cId,
    });
  } catch (err) {
    console.error("[/api/chat]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

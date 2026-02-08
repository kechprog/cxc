import { NextRequest, NextResponse } from "next/server";
import { createAssistant, createThread, sendMessage } from "@/lib/backboard";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.sub;

    const { message, chatId, conversationAnalysisId } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    const db = DbHandlers.getInstance();
    let cId: string;
    let threadId: string;
    let assistantId: string;

    if (chatId) {
      // Existing chat — look up thread/assistant from DB, verify ownership
      const info = db.getChatThreadInfo(chatId);
      if (!info) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
      if (info.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      cId = chatId;
      threadId = info.threadId;
      assistantId = info.assistantId;
    } else {
      // New chat — create assistant + thread, persist in DB
      if (conversationAnalysisId) {
        const ownerId = db.getConversationAnalysisOwnerId(conversationAnalysisId);
        if (!ownerId || ownerId !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      assistantId = await createAssistant("Reflectif Assistant");
      threadId = await createThread(assistantId);
      cId = randomUUID();
      db.createChat(userId, threadId, assistantId, {
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

    const result = await sendMessage(threadId, message, true);

    // Persist assistant response
    db.addChatMessage(cId, {
      id: randomUUID(),
      role: "assistant",
      content: result.content,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      content: result.content,
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

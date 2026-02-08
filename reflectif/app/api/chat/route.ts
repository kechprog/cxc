import { NextRequest, NextResponse } from "next/server";
import { createThread, sendMessage } from "@/lib/backboard";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";
import { randomUUID } from "crypto";
import { loadPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.sub;

    const { message, chatId, conversationAnalysisId, contextPrompt } = await req.json();

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
      // New chat — use user's existing Backboard assistant, create thread, seed context
      const user = db.getUser(userId);
      if (!user?.backboardAssistantId) {
        return NextResponse.json(
          { error: "User has no assistant configured" },
          { status: 400 },
        );
      }

      if (conversationAnalysisId) {
        const ownerId = db.getConversationAnalysisOwnerId(conversationAnalysisId);
        if (!ownerId || ownerId !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      assistantId = user.backboardAssistantId;
      threadId = await createThread(assistantId);
      cId = randomUUID();
      db.createChat(userId, threadId, assistantId, {
        id: cId,
        conversationAnalysisId: conversationAnalysisId ?? null,
        createdAt: new Date().toISOString(),
      });

    }

    // Build the message to send to the LLM
    let llmMessage = message;

    // On first message of a new chat, prepend context inline
    if (!chatId && contextPrompt && typeof contextPrompt === "string") {
      llmMessage = `[CHAT MODE — EQ Coaching Conversation]\n\n${contextPrompt}\n\n---\n\nUser message: ${message}`;
    } else if (!chatId && conversationAnalysisId) {
      const analysis = db.getConversationAnalysis(conversationAnalysisId);
      if (analysis) {
        const template = loadPrompt("chat-context");
        const context = template
          .replace("{{LABEL}}", analysis.label)
          .replace("{{SUMMARY}}", analysis.summary)
          .replace("{{PATTERNS}}", analysis.patterns.join("; "))
          .replace("{{PHASES}}", analysis.dynamics.map(d => `${d.phase} (${d.mood}): ${d.reason}`).join("; "));
        llmMessage = `${context}\n\n---\n\nUser message: ${message}`;
      }
    }

    const now = new Date().toISOString();

    // Persist user message (original, without context prefix)
    db.addChatMessage(cId, {
      id: randomUUID(),
      role: "user",
      content: message,
      createdAt: now,
    });

    const result = await sendMessage(threadId, llmMessage, true);

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

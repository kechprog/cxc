import { NextRequest, NextResponse } from "next/server";
import { createAssistant, createThread, sendMessage } from "@/lib/backboard";

export async function POST(req: NextRequest) {
  try {
    const { message, threadId, assistantId } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    let aId = assistantId as string | undefined;
    let tId = threadId as string | undefined;

    if (!aId) {
      aId = await createAssistant("Reflectif Assistant");
    }

    if (!tId) {
      tId = await createThread(aId);
    }

    const result = await sendMessage(tId, message, true);

    return NextResponse.json({
      content: result.content,
      threadId: tId,
      assistantId: aId,
    });
  } catch (err) {
    console.error("[/api/chat]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

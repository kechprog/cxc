import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/backboard";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.sub;

    const { chatId, content } = await req.json();

    if (!chatId || typeof chatId !== "string") {
      return NextResponse.json(
        { error: "chatId is required" },
        { status: 400 },
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    }

    const db = DbHandlers.getInstance();
    const info = db.getChatThreadInfo(chatId);
    if (!info) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (info.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await sendMessage(info.threadId, content, false);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/chat/seed]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/backboard";

export async function POST(req: NextRequest) {
  try {
    const { threadId, content } = await req.json();

    if (!threadId || typeof threadId !== "string") {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 },
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    }

    await sendMessage(threadId, content, false);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/chat/seed]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

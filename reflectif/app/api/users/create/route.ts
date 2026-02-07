import { NextResponse } from "next/server";
import { DbHandlers } from "@/lib/db/handlers";
import { createAssistant } from "@/lib/backboard";
import { ANALYSIS_INSTRUCTIONS } from "@/app/api/_lib/analysis";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const userId = body.userId as string | undefined;

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  const db = DbHandlers.getInstance();

  const existing = db.getUser(userId);
  if (existing) {
    return NextResponse.json(
      { error: "User already exists" },
      { status: 409 }
    );
  }

  const assistantId = await createAssistant(
    `Reflectif Analyst — ${userId}`,
    ANALYSIS_INSTRUCTIONS
  );

  const user: User = {
    id: userId,
    voiceId: null,
    backboardAssistantId: assistantId,
    createdAt: new Date().toISOString(),
  };

  db.createUser(user);

  return NextResponse.json({
    userId: user.id,
    backboardAssistantId: assistantId,
  });
}

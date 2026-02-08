import { NextRequest, NextResponse } from "next/server";
import { buildCoreUserFileFromInterview } from "@/app/api/_lib/gemini";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = session.user.sub;

    const body = await request.json();
    const answers: Array<{ question: string; answer: string }> = body.answers;

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { success: false, error: "No answers provided" },
        { status: 400 }
      );
    }

    const profile = await buildCoreUserFileFromInterview(answers);

    const db = DbHandlers.getInstance();
    db.upsertCoreUserFile(userId, profile);

    return NextResponse.json({ success: true, profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

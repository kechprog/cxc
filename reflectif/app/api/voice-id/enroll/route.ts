import { NextRequest, NextResponse } from "next/server";
import { extractEmbedding } from "@/app/api/_lib/speaker-id";
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

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "No audio file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const embedding = await extractEmbedding(audioBuffer);

    const db = DbHandlers.getInstance();
    db.updateUserVoiceEmbedding(userId, embedding);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

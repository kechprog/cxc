import { NextRequest, NextResponse } from "next/server";
import { enrollSpeaker } from "@/app/api/_lib/speaker-id";
import { DbHandlers } from "@/lib/db/handlers";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "No audio file provided" },
        { status: 400 }
      );
    }
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "No userId provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const voiceId = await enrollSpeaker(audioBuffer);

    const db = DbHandlers.getInstance();
    db.updateUserVoiceId(userId, voiceId);

    return NextResponse.json({ success: true, voiceId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

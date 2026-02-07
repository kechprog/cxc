import { NextRequest, NextResponse } from "next/server";
import { matchSpeaker } from "@/app/api/_lib/speaker-id";
import { DbHandlers } from "@/lib/db/handlers";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "No userId provided" }, { status: 400 });
    }

    const db = DbHandlers.getInstance();
    const user = db.getUser(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.voiceId) {
      return NextResponse.json({ error: "User has no enrolled voice" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const { voiceId, score } = await matchSpeaker(audioBuffer);

    const match = voiceId === user.voiceId;

    return NextResponse.json({ match, score });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyAudio } from "@/app/api/_lib/azure-speaker";
import { getProfileId } from "@/app/api/_lib/voice-store";

export async function POST(request: NextRequest) {
  try {
    const profileId = getProfileId();

    if (!profileId) {
      return NextResponse.json(
        { error: "No voice profile found. Run /api/voice-id/setup first." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const { result, score } = await verifyAudio(profileId, audioBuffer);

    return NextResponse.json({ result, score });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

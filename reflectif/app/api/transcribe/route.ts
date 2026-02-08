import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { transcribeAudio } from "@/app/api/_lib/gemini";

export async function POST(req: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const transcription = await transcribeAudio(audioBuffer);

    return NextResponse.json({ transcription });
  } catch (err) {
    console.error("[transcribe] Error:", err);
    return NextResponse.json(
      { error: "Transcription failed. Please try again." },
      { status: 500 }
    );
  }
}

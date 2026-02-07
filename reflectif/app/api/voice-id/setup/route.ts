import { NextRequest, NextResponse } from "next/server";
import { createProfile, enrollAudio } from "@/app/api/_lib/azure-speaker";
import { setProfileId } from "@/app/api/_lib/voice-store";

export async function POST(request: NextRequest) {
  try {
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

    const profileId = await createProfile();

    const enrollment = await enrollAudio(profileId, audioBuffer);

    if (enrollment.enrollmentStatus !== "Enrolled") {
      return NextResponse.json(
        {
          success: false,
          error: `Enrollment incomplete: ${enrollment.enrollmentStatus}. Remaining speech needed: ${enrollment.remainingSpeechLength}s`,
        },
        { status: 422 }
      );
    }

    setProfileId(profileId);

    return NextResponse.json({ success: true, profileId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

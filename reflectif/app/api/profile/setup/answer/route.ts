import { NextRequest, NextResponse } from "next/server";
import { transcribeAndEvaluateAnswer } from "@/app/api/_lib/gemini";
import { INTERVIEW_PROMPTS } from "@/lib/constants/interview";
import { auth0 } from "@/lib/auth0";

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json(
        { transcription: "", satisfied: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const questionIndexStr = formData.get("questionIndex") as string | null;
    const previousAttemptsStr = formData.get("previousAttempts") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { transcription: "", satisfied: false, error: "No audio file provided" },
        { status: 400 }
      );
    }

    const questionIndex = parseInt(questionIndexStr ?? "0", 10);
    if (questionIndex < 0 || questionIndex >= INTERVIEW_PROMPTS.length) {
      return NextResponse.json(
        { transcription: "", satisfied: false, error: "Invalid question index" },
        { status: 400 }
      );
    }

    let previousAttempts: string[] = [];
    if (previousAttemptsStr) {
      try {
        previousAttempts = JSON.parse(previousAttemptsStr);
      } catch {
        // ignore malformed JSON, treat as no previous attempts
      }
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const questionText = INTERVIEW_PROMPTS[questionIndex];

    const result = await transcribeAndEvaluateAnswer(
      audioBuffer,
      questionText,
      previousAttempts
    );

    return NextResponse.json({
      transcription: result.transcription,
      satisfied: result.isSatisfactory,
      followUp: result.followUp ?? undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { transcription: "", satisfied: false, error: message },
      { status: 500 }
    );
  }
}

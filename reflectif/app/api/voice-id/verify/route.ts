import { NextRequest, NextResponse } from "next/server";
import { matchSpeaker } from "@/app/api/_lib/speaker-id";
import { evaluateVoiceSampleQuality } from "@/app/api/_lib/gemini";
import { auth0 } from "@/lib/auth0";

const MATCH_SCORE_THRESHOLD = 0.5;

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json(
        { verified: false, score: 0, reason: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { verified: false, score: 0, reason: "No audio file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Run speaker match and AI quality check in parallel
    const [matchResult, qualityResult] = await Promise.all([
      matchSpeaker(audioBuffer),
      evaluateVoiceSampleQuality(audioBuffer),
    ]);

    const scorePass = matchResult.score >= MATCH_SCORE_THRESHOLD;
    const verified = scorePass && qualityResult.isAcceptable;

    let reason: string | undefined;
    let newPassage: string | undefined;

    if (!scorePass) {
      reason = `Voice match score too low (${matchResult.score.toFixed(2)}). Please try again in a quiet environment.`;
      newPassage = qualityResult.newPassage ?? undefined;
    } else if (!qualityResult.isAcceptable) {
      reason = qualityResult.reason;
      newPassage = qualityResult.newPassage ?? undefined;
    }

    return NextResponse.json({
      verified,
      score: matchResult.score,
      reason,
      newPassage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { verified: false, score: 0, reason: message },
      { status: 500 }
    );
  }
}

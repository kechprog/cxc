import { NextRequest, NextResponse } from "next/server";
import { extractEmbedding, cosineSimilarity } from "@/app/api/_lib/speaker-id";
import { evaluateVoiceSampleQuality } from "@/app/api/_lib/gemini";
import { DbHandlers } from "@/lib/db/handlers";
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

    const db = DbHandlers.getInstance();
    const user = db.getUser(session.user.sub);
    if (!user?.voiceEmbedding) {
      return NextResponse.json(
        { verified: false, score: 0, reason: "No enrolled voice found" },
        { status: 400 }
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

    // Extract embedding and run AI quality check in parallel
    const [embedding, qualityResult] = await Promise.all([
      extractEmbedding(audioBuffer),
      evaluateVoiceSampleQuality(audioBuffer),
    ]);

    const score = cosineSimilarity(embedding, user.voiceEmbedding);
    const scorePass = score >= MATCH_SCORE_THRESHOLD;
    const verified = scorePass && qualityResult.isAcceptable;

    let reason: string | undefined;
    let newPassage: string | undefined;

    if (!scorePass) {
      reason = `Voice match score too low (${score.toFixed(2)}). Please try again in a quiet environment.`;
      newPassage = qualityResult.newPassage ?? undefined;
    } else if (!qualityResult.isAcceptable) {
      reason = qualityResult.reason;
      newPassage = qualityResult.newPassage ?? undefined;
    }

    return NextResponse.json({
      verified,
      score,
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

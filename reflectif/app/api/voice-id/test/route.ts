import { NextRequest, NextResponse } from "next/server";
import { extractEmbedding, cosineSimilarity } from "@/app/api/_lib/speaker-id";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";

const MATCH_SCORE_THRESHOLD = 0.5;

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.sub;

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const db = DbHandlers.getInstance();
    const user = db.getUser(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.voiceEmbedding) {
      return NextResponse.json({ error: "User has no enrolled voice" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const embedding = await extractEmbedding(audioBuffer);
    const score = cosineSimilarity(embedding, user.voiceEmbedding);

    return NextResponse.json({ match: score >= MATCH_SCORE_THRESHOLD, score });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

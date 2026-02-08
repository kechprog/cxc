import { NextResponse } from "next/server";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.sub;

  const { id } = await params;
  const db = DbHandlers.getInstance();

  const ownerId = db.getConversationAnalysisOwnerId(id);
  if (!ownerId) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }
  if (ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = db.getConversationAnalysis(id)!;
  const { transcripts, ...analysis } = result;
  return NextResponse.json({ analysis, transcripts });
}

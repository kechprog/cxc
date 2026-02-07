import { NextResponse } from "next/server";
import { DbHandlers } from "@/lib/db/handlers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const db = DbHandlers.getInstance();
  const result = db.getConversationAnalysis(id);

  if (!result) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const { transcripts, ...analysis } = result;
  return NextResponse.json({ analysis, transcripts });
}

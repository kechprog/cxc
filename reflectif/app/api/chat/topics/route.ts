import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { generateTopics } from "@/app/api/_lib/topics";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topics = await generateTopics(session.user.sub);
    return NextResponse.json({ topics });
  } catch (err) {
    console.error("[/api/chat/topics]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

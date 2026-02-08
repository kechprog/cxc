import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { generateProgress } from "@/app/api/_lib/progress";

export async function GET(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.sub;

    const sinceParam = request.nextUrl.searchParams.get("since");

    let since: string;
    if (sinceParam) {
      const parsed = new Date(sinceParam);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid 'since' parameter. Must be ISO 8601 date." },
          { status: 400 }
        );
      }
      since = parsed.toISOString();
    } else {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      since = twoWeeksAgo.toISOString();
    }

    const progress = await generateProgress(userId, since);
    return NextResponse.json(progress);
  } catch (err) {
    console.error("[/api/user/progress]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

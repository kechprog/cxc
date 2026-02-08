import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { DbHandlers } from "@/lib/db/handlers";
import { createThread, sendMessage } from "@/lib/backboard";
import { getOrCreateUserAssistant } from "@/app/api/_lib/analysis";
import { transcribeAudio, checkInterviewComplete } from "@/app/api/_lib/gemini";

const MAX_EXCHANGES = 10;

const KICKOFF_MESSAGE = `A new user has just completed voice enrollment and is ready for their onboarding interview.
Start the interview now. Introduce yourself warmly, explain briefly that you'd like to get to know them to personalize their experience, and ask your first question. Keep it light and inviting.
Remember: ask only ONE question to start.`;

const RESUME_MESSAGE = `The user has reconnected after a disconnection. Continue the onboarding interview from where you left off. Briefly acknowledge the interruption and pick up naturally.`;

const FORCE_WRAP_MESSAGE = `You have asked enough questions. End the interview NOW. Deliver your warm closing statement — thank them, reflect back what you learned, express enthusiasm. Do NOT ask any more questions. Just sign off.`;

export async function POST(req: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.sub;
  const db = DbHandlers.getInstance();
  const user = db.getUser(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const assistantId = await getOrCreateUserAssistant(userId);

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    // --- Initialization (no audio) ---
    if (!audioFile) {
      let threadId = user.onboardingThreadId;

      if (!threadId) {
        // First time — create thread and kick off
        threadId = await createThread(assistantId);
        db.setUserOnboardingThreadId(userId, threadId);
        const { content: message } = await sendMessage(threadId, KICKOFF_MESSAGE);
        return NextResponse.json({ message, done: false });
      }

      // Resuming after disconnect
      const { content: message } = await sendMessage(threadId, RESUME_MESSAGE);
      return NextResponse.json({ message, done: false });
    }

    // --- Voice answer (audio present) ---
    const threadId = user.onboardingThreadId;
    if (!threadId) {
      return NextResponse.json(
        { error: "No active onboarding thread. Initialize first." },
        { status: 400 }
      );
    }

    // 1. Transcribe audio via Gemini
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const transcription = await transcribeAudio(audioBuffer);

    // 2. Send transcription to Backboard (memory: "auto" — stores user info automatically)
    const { content: message } = await sendMessage(threadId, transcription);

    // 3. Check if interview is complete via Gemini sentinel (full conversation context)
    let done = false;
    try {
      const historyJson = formData.get("conversation") as string | null;
      const history: Array<{ role: string; text: string }> = historyJson
        ? JSON.parse(historyJson)
        : [];
      // Append current exchange so sentinel sees the full picture
      const fullConversation = [
        ...history,
        { role: "user", text: transcription },
        { role: "assistant", text: message },
      ];
      const result = await checkInterviewComplete(fullConversation);
      done = result.done;
    } catch (err) {
      // Sentinel failed (e.g., Gemini overloaded) — continue interview, don't block
      console.error("[chat] checkInterviewComplete failed, continuing:", err);
    }

    // 4. Safety cap — count user messages in thread to detect runaway interviews
    if (!done) {
      // aiMessages on frontend tracks exchanges; we count by checking exchange number
      // Each audio POST = 1 user exchange. We pass exchange count from frontend or estimate.
      // Simple approach: count how many user messages we've sent by looking at thread history
      // But we don't have thread history API — instead, use a counter in the response
      // and let the frontend track it. For now, force wrap after MAX_EXCHANGES via a
      // heuristic: send a force-wrap system message and mark done.
      const exchangeCount = parseInt(formData.get("exchangeCount") as string) || 0;
      if (exchangeCount >= MAX_EXCHANGES) {
        // Force the AI to wrap up
        const { content: wrapMessage } = await sendMessage(threadId, FORCE_WRAP_MESSAGE);
        db.setProfileComplete(userId);
        db.clearUserOnboardingThreadId(userId);
        return NextResponse.json({ message: wrapMessage, done: true, transcription });
      }
    }

    if (done) {
      db.setProfileComplete(userId);
      db.clearUserOnboardingThreadId(userId);
    }

    return NextResponse.json({ message, done, transcription });
  } catch (err) {
    console.error("[chat] Unhandled error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

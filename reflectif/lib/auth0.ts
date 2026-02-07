import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { DbHandlers } from "@/lib/db/handlers";
import { createAssistant } from "@/lib/backboard";
import { ANALYSIS_INSTRUCTIONS } from "@/app/api/_lib/analysis";

export const auth0 = new Auth0Client({
  async beforeSessionSaved(session) {
    const userId = session.user.sub;
    const db = DbHandlers.getInstance();

    const existing = db.getUser(userId);
    if (!existing) {
      const assistantId = await createAssistant(
        `Reflectif Analyst — ${userId}`,
        ANALYSIS_INSTRUCTIONS
      );
      db.createUser({
        id: userId,
        voiceId: null,
        backboardAssistantId: assistantId,
        createdAt: new Date().toISOString(),
      });
    }

    return session;
  },
});

import { HomeContent } from "@/components/HomeContent";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";
import { aggregateScores } from "@/lib/analytics";

export default async function Home() {
  const session = await auth0.getSession();
  const userId = session!.user.sub;
  const db = DbHandlers.getInstance();
  const conversations = db.listConversationAnalyses(userId);
  const latestId = conversations[0]?.id;

  // Fetch full latest conversation for DailySnapshot context (e.g. Emoji)
  const latestConversation = latestId
    ? db.getConversationAnalysis(latestId)
    : null;

  // Fetch Global Scores
  let globalScores: any[] = [];
  try {
    const rawGlobalScores = db.getGlobalUserEmotions(userId);
    globalScores = aggregateScores(rawGlobalScores);
  } catch (err) {
    console.error("Failed to fetch/aggregate global scores:", err);
  }

  return (
    <HomeContent
      latestConversationId={latestId}
      latestConversation={latestConversation ?? undefined}
      globalScores={globalScores}
    />
  );
}

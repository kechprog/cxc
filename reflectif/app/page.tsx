import { HomeContent } from "@/components/HomeContent";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";
import { generateProgress } from "@/app/api/_lib/progress";

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

  // Fetch user progress
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const progress = await generateProgress(userId, twoWeeksAgo.toISOString());

  return (
    <HomeContent
      latestConversationId={latestId}
      latestConversation={latestConversation ?? undefined}
      progress={progress}
    />
  );
}

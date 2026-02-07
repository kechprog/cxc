import { HomeContent } from "@/components/HomeContent";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();
  const userId = session!.user.sub;
  const db = DbHandlers.getInstance();
  const conversations = db.listConversationAnalyses(userId);
  const latestId = conversations[0]?.id;

  // Fetch full latest conversation for DailySnapshot scores
  const latestConversation = latestId
    ? db.getConversationAnalysis(latestId)
    : null;

  return (
    <HomeContent
      latestConversationId={latestId}
      latestConversation={latestConversation ?? undefined}
    />
  );
}

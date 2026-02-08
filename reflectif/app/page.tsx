import { HomeContent } from "@/components/HomeContent";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();
  const userId = session!.user.sub;
  const db = DbHandlers.getInstance();
  const conversations = db.listConversationAnalyses(userId);

  return (
    <HomeContent
      latestConversationId={conversations[0]?.id}
      conversations={conversations}
    />
  );
}

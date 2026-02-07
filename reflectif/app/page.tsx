import { RecordButton } from "@/components/RecordButton";
import { DailySnapshot } from "@/components/DailySnapshot";
import { DbHandlers } from "@/lib/db/handlers";

const USER_ID = "usr_123";

export default function Home() {
  const db = DbHandlers.getInstance();
  const conversations = db.listConversationAnalyses(USER_ID);
  const latestId = conversations[0]?.id;

  // Fetch full latest conversation for DailySnapshot scores
  const latestConversation = latestId
    ? db.getConversationAnalysis(latestId)
    : null;

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] lg:min-h-[80vh] py-6 lg:py-0">
      <RecordButton latestConversationId={latestId} />

      {/* Daily Snapshot Section */}
      {/* TODO: API CALL - GET /api/user/progress */}
      <div className="mt-4 lg:mt-8 w-full flex justify-center px-4 lg:px-0">
        <DailySnapshot latestConversation={latestConversation ?? undefined} />
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { DbHandlers } from "@/lib/db/handlers";
import { ConversationView } from "@/components/ConversationView";

export default async function ConversationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const db = DbHandlers.getInstance();
    const conversation = db.getConversationAnalysis(id);

    if (!conversation) {
        return notFound();
    }

    const { transcripts, ...analysis } = conversation;

    return <ConversationView conversation={analysis} transcript={transcripts} />;
}

import { notFound } from "next/navigation";
import { MOCK_CONVERSATIONS } from "@/lib/data";
import { ConversationView } from "@/components/ConversationView";

// Correctly type params as a Promise for Next.js 15
export default async function ConversationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const conversation = MOCK_CONVERSATIONS.find((c) => c.id === id);

    if (!conversation) {
        // Fallback for debugging if IDs don't match
        return (
            <div className="min-h-screen flex items-center justify-center p-10 text-zinc-400 flex-col gap-4">
                <h1 className="text-2xl text-white">Conversation Not Found</h1>
                <p>Requested ID: <span className="font-mono text-red-400">{id}</span></p>
                <div className="p-4 bg-white/5 rounded-xl text-xs font-mono">
                    Available: {MOCK_CONVERSATIONS.map(c => c.id).join(", ")}
                </div>
            </div>
        );
    }

    return <ConversationView conversation={conversation} />;
}

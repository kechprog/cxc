import { notFound } from "next/navigation";
import { DbHandlers } from "@/lib/db/handlers";
import { AssistantChat } from "@/components/AssistantChat";
import { DashboardContent } from "@/components/DashboardContent";
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";

export default async function ChatPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const db = DbHandlers.getInstance();

    const chatSession = db.getChat(id);
    if (!chatSession || !chatSession.conversationAnalysisId) {
        return notFound();
    }

    const conversationResult = db.getConversationAnalysis(chatSession.conversationAnalysisId);
    if (!conversationResult) {
        return notFound();
    }

    const { transcripts, ...conversation } = conversationResult;

    return (
        <div className="h-[calc(100vh-120px)] lg:h-[calc(100vh-80px)] max-w-[1600px] mx-auto p-4 lg:p-6 flex flex-col lg:grid lg:grid-cols-12 gap-6">

            {/* AI CHAT (Full screen on mobile, 5-col on lg) */}
            <div className="lg:col-span-5 flex flex-col flex-1 lg:flex-initial lg:h-full glass rounded-2xl lg:rounded-3xl overflow-hidden border border-violet-500/20 shadow-2xl relative">
                <div className="p-3 lg:p-4 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-medium text-white">EQ Coach</span>
                    </div>
                    <Link
                        href={`/conversation/${conversation.id}`}
                        className="text-xs text-zinc-500 hover:text-white transition-colors uppercase tracking-wider flex items-center gap-2"
                    >
                        <FiArrowLeft />
                        Back to Analysis
                    </Link>
                </div>
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    <AssistantChat context={conversation} />
                </div>
            </div>

            {/* ANALYSIS CONTEXT (Hidden on mobile, visible on lg) */}
            <div className="hidden lg:block lg:col-span-7 space-y-6 overflow-y-auto pr-2 pb-20 custom-scrollbar opacity-80 hover:opacity-100 transition-opacity">
                <DashboardContent conversation={conversation} transcript={transcripts} />
            </div>
        </div>
    );
}

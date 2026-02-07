import { notFound } from "next/navigation";
import { MOCK_CHATS, MOCK_CONVERSATIONS } from "@/lib/data";
import { AssistantChat } from "@/components/AssistantChat";
import { DashboardContent } from "@/components/DashboardContent";
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";

// Correctly type params as a Promise for Next.js 15
export default async function ChatPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // Find Chat Session
    const chatSession = MOCK_CHATS.find((c) => c.id === id);

    if (!chatSession) {
        return (
            <div className="min-h-screen flex items-center justify-center p-10 text-zinc-400 flex-col gap-4">
                <h1 className="text-2xl text-white">Chat Session Not Found</h1>
                <p>Requested ID: <span className="font-mono text-red-400">{id}</span></p>
                <div className="p-4 bg-white/5 rounded-xl text-xs font-mono">
                    Available: {MOCK_CHATS.map(c => c.id).join(", ")}
                </div>
            </div>
        );
    }

    // Find Related Conversation Analysis for Context
    const conversation = MOCK_CONVERSATIONS.find(c => c.id === chatSession.conversationAnalysisId);

    if (!conversation) {
        return (
            <div className="min-h-screen flex items-center justify-center p-10 text-zinc-400 flex-col gap-4">
                <h1 className="text-2xl text-white">Analysis Context Not Found</h1>
                <p>Linked Conversation ID: <span className="font-mono text-red-400">{chatSession.conversationAnalysisId}</span></p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)] max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: AI CHAT (Main Focus) */}
            <div className="lg:col-span-5 flex flex-col h-full glass rounded-3xl overflow-hidden border border-violet-500/20 shadow-2xl relative">
                <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-medium text-white">AI Therapist</span>
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
                    {/* Pass existing chat history if we had it, for now we let it init fresh or we could mock history in the chatSession */}
                    <AssistantChat context={conversation} />
                </div>
            </div>

            {/* RIGHT COLUMN: ANALYSIS CONTEXT (Read-Only Ref) */}
            <div className="lg:col-span-7 space-y-6 overflow-y-auto pr-2 pb-20 custom-scrollbar opacity-80 hover:opacity-100 transition-opacity">
                {/* Simplified Dashboard for Context */}
                <DashboardContent conversation={conversation} showChatButton={false} />
            </div>
        </div>
    );
}

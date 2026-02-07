import { notFound } from "next/navigation";
import { MOCK_CONVERSATIONS } from "@/lib/data";
import { MoodHeader } from "@/components/MoodHeader";
import { ChatTranscript } from "@/components/ChatTranscript";
import { FiCheckCircle } from "react-icons/fi";

// Correctly type params as a Promise for Next.js 15
export default async function ConversationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const conversation = MOCK_CONVERSATIONS.find((c) => c.id === id);

    if (!conversation) {
        notFound();
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <MoodHeader
                mood={conversation.overallMood}
                summary={conversation.summary}
                date={conversation.date}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                {/* Main Content: Transcript */}
                <div className="lg:col-span-2 space-y-8">
                    <ChatTranscript transcript={conversation.transcript} />
                </div>

                {/* Sidebar: Key Points */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-2xl sticky top-8">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                            Key Insights
                        </h3>
                        <ul className="space-y-4">
                            {conversation.keyPoints.map((point, i) => (
                                <li key={i} className="flex gap-3 items-start text-sm text-zinc-300">
                                    <FiCheckCircle className="text-violet-400 mt-0.5 flex-shrink-0" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 pt-4 border-t border-white/10">
                            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                                Tone Analysis
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/30">
                                    Anxious (High)
                                </span>
                                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
                                    Honesty (Medium)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

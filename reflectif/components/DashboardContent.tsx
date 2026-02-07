"use client";

import { ConversationAnalysis } from "@/lib/types/conversation";
import { EMOTION_COLORS, TranscriptMessage, MOCK_TRANSCRIPTS } from "@/lib/data";
import { EmotionChart } from "@/components/EmotionChart";
import { ChatTranscript } from "@/components/ChatTranscript";
import { FiActivity, FiCheckCircle } from "react-icons/fi";

export function DashboardContent({ conversation, showChatButton, onChatClick }: { conversation: ConversationAnalysis, showChatButton?: boolean, onChatClick?: () => void }) {

    // Fallback: Look up transcript if not passed (though ideally it should be passed)
    // TODO: API CALL - GET /api/conversations/:id/transcript
    // We are temporarily extracting it from the MOCK_TRANSCRIPTS based on ID
    const transcriptMessages = MOCK_TRANSCRIPTS[conversation.id] || [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center py-8">
                <div className="text-6xl mb-4 animate-bounce-slow inline-block">
                    {conversation.emoji}
                </div>
                <h1 className="text-2xl font-light text-white mb-2">
                    {conversation.label}
                </h1>
                <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    {conversation.summary}
                </p>
                <div className="mt-4 text-xs text-zinc-500 uppercase tracking-widest">
                    {new Date(conversation.analyzedAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Emotion Trend Graph */}
                    <div className="glass p-8 rounded-3xl border-violet-500/20 shadow-[0_0_50px_rgba(139,92,246,0.05)]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-medium text-white flex items-center gap-2">
                                <FiActivity className="text-violet-400" />
                                Emotional Journey
                            </h2>
                        </div>
                        <div className="h-[300px] w-full">
                            <EmotionChart data={conversation.scores} />
                        </div>
                        {/* Mini Legend - We can optionally show this or let the chart handle it dynamically */}
                    </div>

                    {/* Dynamics */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-medium text-white flex items-center gap-2 px-2">
                            <FiActivity className="text-indigo-400" />
                            Conversation Phases
                        </h2>
                        {conversation.dynamics.map((phase, i) => (
                            <div key={i} className="glass p-5 rounded-2xl flex gap-4 items-start border-l-4 border-l-indigo-500/40">
                                <div className="text-xs font-mono text-zinc-500 mt-1 min-w-[60px]">
                                    {Math.floor(phase.startTime / 60)}:{(phase.startTime % 60).toString().padStart(2, '0')}
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-1">{phase.phase}</h3>
                                    <div className="text-xs text-indigo-300 mb-2 uppercase tracking-wide">{phase.mood}</div>
                                    <p className="text-sm text-zinc-400 leading-relaxed mb-2">{phase.reason}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <ChatTranscript transcript={transcriptMessages} />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-2xl sticky top-8">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                            Detected Patterns
                        </h3>
                        <ul className="space-y-4">
                            {conversation.patterns.map((pattern, i) => (
                                <li key={i} className="flex gap-3 items-start text-sm text-zinc-300">
                                    <FiCheckCircle className="text-violet-400 mt-0.5 flex-shrink-0" />
                                    <span>{pattern}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

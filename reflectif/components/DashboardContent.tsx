"use client";

import { ConversationAnalysis } from "@/lib/types/conversation";
import { TranscriptMessage } from "@/lib/types";
import { EmotionChart } from "@/components/EmotionChart";
import { FiActivity, FiCheckCircle, FiMessageCircle } from "react-icons/fi";
import { cn } from "@/lib/utils";

export function DashboardContent({ conversation, showChatButton, onChatClick }: { conversation: ConversationAnalysis, transcript?: TranscriptMessage[], showChatButton?: boolean, onChatClick?: (insight?: string) => void }) {
    const insights = conversation.dynamics
        .filter((phase) => phase.insight)
        .map((phase) => phase.insight!);

    return (
        <div className="space-y-6 lg:space-y-8">
            {/* Header */}
            <div className="text-center py-4 lg:py-8">
                <div className="text-5xl lg:text-6xl mb-4 animate-bounce-slow inline-block">
                    {conversation.emoji}
                </div>
                <h1 className="text-xl lg:text-2xl font-light text-white mb-2">
                    {conversation.label}
                </h1>
                <p className="text-sm lg:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    {conversation.summary}
                </p>
                <div className="mt-4 text-xs text-zinc-500 uppercase tracking-widest">
                    {new Date(conversation.analyzedAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                    {/* Emotion Trend Graph */}
                    <div className="glass p-4 lg:p-8 rounded-2xl lg:rounded-3xl border-violet-500/20 shadow-[0_0_50px_rgba(139,92,246,0.05)]">
                        <div className="flex items-center justify-between mb-4 lg:mb-8">
                            <h2 className="text-base lg:text-lg font-medium text-white flex items-center gap-2">
                                <FiActivity className="text-violet-400" />
                                Emotional Journey
                            </h2>
                        </div>
                        <div className="h-[220px] lg:h-[300px] w-full">
                            <EmotionChart data={conversation.scores} />
                        </div>
                    </div>

                    {/* Insights from phases (only if any exist) */}
                    {insights.length > 0 && (
                        <div className="glass p-4 lg:p-6 rounded-2xl">
                            <h2 className="text-base lg:text-lg font-medium text-white flex items-center gap-2 mb-4">
                                <FiMessageCircle className="text-amber-400" />
                                Insights
                            </h2>
                            <ul className="space-y-3">
                                {insights.map((insight, i) => (
                                    <li
                                        key={i}
                                        onClick={() => onChatClick?.(insight)}
                                        className={cn(
                                            "flex gap-3 items-start text-sm text-zinc-300 rounded-xl p-3 transition-all",
                                            onChatClick && "cursor-pointer hover:bg-white/5 hover:text-white group"
                                        )}
                                    >
                                        <span className="text-amber-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform">•</span>
                                        <span>{insight}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="glass p-4 lg:p-6 rounded-2xl sticky top-8">
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

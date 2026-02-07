"use client";

import { useState } from "react";
import type { ConversationAnalysis, TranscriptMessage } from "@/lib/types";
import { AssistantChat } from "@/components/AssistantChat";
import { DashboardContent } from "@/components/DashboardContent";
import { FiCpu } from "react-icons/fi";
import { motion } from "framer-motion";

export function ConversationView({ conversation, transcript }: { conversation: ConversationAnalysis, transcript: TranscriptMessage[] }) {
    const [viewMode, setViewMode] = useState<"dashboard" | "chat">("dashboard");

    if (viewMode === "chat") {
        // CHAT VIEW (Split Screen)
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[calc(100vh-80px)] max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
                {/* LEFT COLUMN: AI CHAT (Main Focus) */}
                <div className="lg:col-span-5 flex flex-col h-full glass rounded-3xl overflow-hidden border border-violet-500/20 shadow-2xl relative">
                    <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm font-medium text-white">AI Therapist</span>
                        </div>
                        <button
                            onClick={() => setViewMode("dashboard")}
                            className="text-xs text-zinc-500 hover:text-white transition-colors uppercase tracking-wider"
                        >
                            Exit Session
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative flex flex-col">
                        <AssistantChat context={conversation} />
                    </div>
                </div>

                {/* RIGHT COLUMN: ANALYSIS CONTEXT (Read-Only Ref) */}
                <div className="lg:col-span-7 space-y-6 overflow-y-auto pr-2 pb-20 custom-scrollbar opacity-80 hover:opacity-100 transition-opacity">
                    {/* Simplified Dashboard for Context */}
                    <DashboardContent conversation={conversation} transcript={transcript} showChatButton={false} />
                </div>
            </motion.div>
        );
    }

    // DASHBOARD VIEW (Default)
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-5xl mx-auto pb-20 p-4 lg:p-0"
        >
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setViewMode("chat")}
                    className="group relative inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
                >
                    <FiCpu className="w-4 h-4" />
                    <span className="text-sm font-medium">Start AI Therapy Session</span>
                </button>
            </div>
            <DashboardContent conversation={conversation} transcript={transcript} showChatButton={true} onChatClick={() => setViewMode("chat")} />
        </motion.div>
    );
}

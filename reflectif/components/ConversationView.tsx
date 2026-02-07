"use client";

import { useState } from "react";
import { ConversationAnalysis, MOCK_TRANSCRIPTS } from "@/lib/data";
import { AssistantChat } from "@/components/AssistantChat";
import { DashboardContent } from "@/components/DashboardContent";
import { FiCpu } from "react-icons/fi";
import { motion } from "framer-motion";

export function ConversationView({ conversation }: { conversation: ConversationAnalysis }) {
    const [viewMode, setViewMode] = useState<"dashboard" | "chat">("dashboard");

    // Fallback transcript fetch
    const transcript = MOCK_TRANSCRIPTS[conversation.id] || [];

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
                    <DashboardContent conversation={conversation} showChatButton={false} />
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
            {/* DashboardContent handles transcript lookup internally now, but we can pass it explicitly if we want to reverse that decision. 
                In DashboardContent.tsx, I added `const transcriptMessages = MOCK_TRANSCRIPTS[conversation.id]`.
                For cleanliness, let's leave it as is, or removing the lookup in DashboardContent and passing it here.
                
                Actually, the previous tool call output for DashboardContent.tsx SHOWS that I added the lookup INSIDE DashboardContent.
                So ConversationView doesn't strict need to pass it, BUT it's better architecture to pass it.
                
                However, DashboardContent.tsx signature is:
                ({ conversation, showChatButton, onChatClick }: ...)
                It does NOT accept `transcript` yet in the definition I wrote in Step 905?
                Wait, I checked Step 905 output. I did NOT add `transcript` to the props interface in DashboardContent.
                I only added `const transcriptMessages = ...` inside the body.
                
                So ConversationView works AS IS. 
                Reference: Step 905 diff:
                export function DashboardContent({ conversation, showChatButton, onChatClick }: { conversation: ConversationAnalysis, showChatButton?: boolean, onChatClick?: () => void }) {
                
                So I don't need to change `ConversationView` to pass transcript.
                
                BUT `ConversationView` has cleanups to do: imports.
            */}
            <DashboardContent conversation={conversation} showChatButton={true} onChatClick={() => setViewMode("chat")} />
        </motion.div>
    );
}

// Extract Dashboard Content for reuse
// (Removed local definition, imported instead)

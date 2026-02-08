"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecordButton } from "@/components/RecordButton";
import { DailySnapshot } from "@/components/DailySnapshot";
import { AssistantChat } from "@/components/AssistantChat";
import { FiX } from "react-icons/fi";
import type { ConversationAnalysis } from "@/lib/types";

export function HomeContent({
    latestConversationId,
    latestConversation,
    globalScores,
}: {
    latestConversationId?: string;
    latestConversation?: ConversationAnalysis;
    globalScores?: any[];
}) {
    const [isActive, setIsActive] = useState(false);
    const [showGlobalChat, setShowGlobalChat] = useState(false);

    return (
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] lg:min-h-[80vh] py-6 lg:py-0 relative">

            {/* Main Dashboard Content */}
            <motion.div
                animate={showGlobalChat ? { opacity: 0, scale: 0.95, pointerEvents: "none" } : { opacity: 1, scale: 1, pointerEvents: "auto" }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col items-center"
            >
                <RecordButton
                    latestConversationId={latestConversationId}
                    onRecordingChange={setIsActive}
                />

                {/* Daily Snapshot Section */}
                <motion.div
                    animate={isActive
                        ? { opacity: 0, height: 0, marginTop: 0, scale: 0.95, filter: "blur(8px)" }
                        : { opacity: 1, height: "auto", marginTop: 16, scale: 1, filter: "blur(0px)" }
                    }
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    className="w-full flex justify-center px-4 lg:px-0 overflow-hidden"
                    style={{ pointerEvents: isActive ? "none" : "auto" }}
                >
                    <DailySnapshot
                        latestConversation={latestConversation}
                        globalScores={globalScores}
                        onObserveClick={() => setShowGlobalChat(true)}
                    />
                </motion.div>
            </motion.div>

            {/* Global Observation Chat Overlay */}
            <AnimatePresence>
                {showGlobalChat && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute inset-0 z-50 flex items-center justify-center p-4 lg:p-0"
                    >
                        <div className="w-full max-w-4xl h-[600px] lg:h-[700px] glass rounded-3xl overflow-hidden border border-violet-500/20 shadow-2xl flex flex-col relative">
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-sm font-medium text-white">Global Observation</span>
                                </div>
                                <button
                                    onClick={() => setShowGlobalChat(false)}
                                    className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 overflow-hidden relative flex flex-col bg-black/40">
                                <AssistantChat mode="global" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RecordButton } from "@/components/RecordButton";
import { RecentSessions } from "@/components/RecentSessions";
import type { ConversationAnalysisListItem } from "@/lib/types";

export function HomeContent({
    latestConversationId,
    conversations,
}: {
    latestConversationId?: string;
    conversations: ConversationAnalysisListItem[];
}) {
    const [isActive, setIsActive] = useState(false);
    const latest = conversations[0];

    return (
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] lg:min-h-[80vh] py-6 lg:py-0">
            <RecordButton
                latestConversationId={latestConversationId}
                onRecordingChange={setIsActive}
            />

            <motion.div
                animate={isActive
                    ? { opacity: 0, height: 0, marginTop: 0, scale: 0.95, filter: "blur(8px)" }
                    : { opacity: 1, height: "auto", marginTop: 24, scale: 1, filter: "blur(0px)" }
                }
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="w-full px-4 lg:px-0 overflow-hidden"
                style={{ pointerEvents: isActive ? "none" : "auto" }}
            >
                {/* Mood pill */}
                {latest && (
                    <div className="flex justify-center mb-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-sm">
                            <span className="text-lg">{latest.emoji}</span>
                            <span className="text-zinc-300">{latest.label}</span>
                        </div>
                    </div>
                )}

                <RecentSessions conversations={conversations} />
            </motion.div>
        </div>
    );
}

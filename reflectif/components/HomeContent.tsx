"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RecordButton } from "@/components/RecordButton";
import { DailySnapshot } from "@/components/DailySnapshot";
import type { ConversationAnalysis } from "@/lib/types";

export function HomeContent({
    latestConversationId,
    latestConversation,
}: {
    latestConversationId?: string;
    latestConversation?: ConversationAnalysis;
}) {
    const [isActive, setIsActive] = useState(false);

    return (
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] lg:min-h-[80vh] py-6 lg:py-0">
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
                <DailySnapshot latestConversation={latestConversation} />
            </motion.div>
        </div>
    );
}

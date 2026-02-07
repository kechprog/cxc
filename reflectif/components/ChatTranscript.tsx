"use client";

import { TranscriptMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ChatTranscript({ transcript }: { transcript: TranscriptMessage[] }) {
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                Transcript & Sentiment
            </h3>

            <div className="space-y-4">
                {transcript.map((msg, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: msg.role === "User" ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                            "flex flex-col gap-1 p-4 rounded-2xl max-w-[85%] relative group",
                            msg.role === "User"
                                ? "ml-auto bg-violet-500/10 border border-violet-500/20 rounded-tr-sm"
                                : "mr-auto bg-white/5 border border-white/10 rounded-tl-sm"
                        )}
                    >
                        {/* Sentiment Indicator Line */}
                        <div className={cn(
                            "absolute top-4 bottom-4 w-1 rounded-full",
                            msg.role === "User" ? "-left-3" : "-right-3",
                            getSentimentColor(msg.sentiment)
                        )} />

                        <div className="flex justify-between items-baseline mb-1">
                            <span className={cn("text-xs font-bold", msg.role === "User" ? "text-violet-300" : "text-zinc-400")}>
                                {msg.role === "User" ? "You" : "Reflectif"}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-mono">{msg.timestamp || "00:00"}</span>
                        </div>

                        <p className="text-zinc-200 leading-relaxed">
                            {msg.text}
                        </p>

                        {/* Sentiment Tag (Visible on Hover or if significant) */}
                        {msg.sentiment && msg.sentiment !== "neutral" && (
                            <div className="mt-2 text-[10px] uppercase tracking-wider font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-zinc-500">
                                Detected: <span className={getSentimentTextColor(msg.sentiment)}>{msg.sentiment}</span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function getSentimentColor(sentiment?: string) {
    if (!sentiment) return "bg-zinc-800";
    switch (sentiment.toLowerCase()) {
        case "positive": return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
        case "joy": return "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]";
        case "relief": return "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.3)]";
        case "negative": return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]";
        case "anxious": return "bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.3)]";
        case "fear": return "bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.3)]";
        case "frustrated": return "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)]";
        case "anger": return "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]";
        default: return "bg-zinc-700";
    }
}

function getSentimentTextColor(sentiment?: string) {
    if (!sentiment) return "text-zinc-500";
    switch (sentiment.toLowerCase()) {
        case "positive": return "text-emerald-400";
        case "joy": return "text-amber-300";
        case "relief": return "text-sky-300";
        case "negative": return "text-red-400";
        case "anxious": return "text-orange-300";
        case "fear": return "text-violet-300";
        case "frustrated": return "text-red-300";
        case "anger": return "text-rose-300";
        default: return "text-zinc-500";
    }
}

"use client";

import { motion } from "framer-motion";
import { FiTrendingUp, FiTrendingDown, FiSun, FiActivity, FiClock } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { EmotionChart } from "@/components/EmotionChart";
import type { ConversationAnalysis } from "@/lib/types";

export function DailySnapshot({ latestConversation }: { latestConversation?: ConversationAnalysis }) {
    const TODAY_DATA = {
        moodEmoji: latestConversation?.emoji ?? "😐",
        moodLabel: latestConversation?.label ?? "No data",
        trend: "stable",
        trendLabel: "Consistent with observation",
        suggestion: {
            title: "Suggestions for you today",
            text: "You seem a bit flat today. Try a quick 5-minute walk to reset your energy levels.",
            action: "Start Breathing Exercise",
        },
    };
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-7xl mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4"
        >


            {/* 24h Mood Graph (Bigger - spans 2 cols) */}
            <div className="glass p-4 lg:p-5 rounded-2xl relative overflow-hidden lg:col-span-2 flex flex-col justify-between h-[220px] lg:h-[280px]">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <FiClock /> Latest Session
                    </h3>
                    <div className="text-[10px] lg:text-xs text-zinc-500 bg-white/5 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full border border-white/5">
                        Emotion Distribution
                    </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <EmotionChart data={latestConversation?.scores ?? []} className="h-full" />
                </div>
            </div>

            {/* Right Column: Stacked items (Side-by-side on mobile, Stacked on Desktop) */}
            <div className="grid grid-cols-2 lg:flex lg:flex-col gap-3 lg:gap-4 lg:col-span-1 h-auto lg:h-[280px]">

                {/* Mood Card */}
                <div className="glass p-3 lg:p-4 rounded-2xl flex flex-col justify-center relative overflow-hidden group flex-1">
                    <div className="z-10 relative flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4">
                        <span className="text-3xl lg:text-4xl drop-shadow-md">{TODAY_DATA.moodEmoji}</span>
                        <div>
                            <h3 className="text-[10px] lg:text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-0.5 lg:mb-1">
                                Mood for Today
                            </h3>
                            <div className="text-lg lg:text-xl font-light text-white leading-none mb-0.5 lg:mb-1">
                                {TODAY_DATA.moodLabel}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] lg:text-xs text-zinc-400">
                                <FiActivity className="text-violet-400" />
                                <span>{TODAY_DATA.trendLabel}</span>
                            </div>
                        </div>
                    </div>

                    {/* Decorative background element */}
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-violet-500/10 to-transparent pointer-events-none" />
                </div>

                {/* Suggestions Card */}
                <div className="glass p-3 lg:p-4 rounded-2xl relative overflow-hidden group hover:bg-white/5 transition-colors cursor-pointer flex-1 flex flex-col justify-center">
                    <div className="flex items-start gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5 lg:mt-1">
                            <FiSun className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xs lg:text-sm font-medium text-white mb-0.5 lg:mb-1 leading-tight truncate">
                                {TODAY_DATA.suggestion.title}
                            </h3>
                            <p className="text-[10px] lg:text-xs text-zinc-400 leading-relaxed mb-1.5 lg:mb-2 line-clamp-2">
                                {TODAY_DATA.suggestion.text}
                            </p>
                            <div className="text-[9px] lg:text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                                {TODAY_DATA.suggestion.action} <span className="text-xs lg:text-sm">→</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}

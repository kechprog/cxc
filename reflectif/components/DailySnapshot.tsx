"use client";

import { motion } from "framer-motion";
import { FiTrendingUp, FiTrendingDown, FiSun, FiActivity, FiClock } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { HourlyMoodChart } from "@/components/HourlyMoodChart";

// Mock data for the daily snapshot
const TODAY_DATA = {
    moodEmoji: "😐",
    moodLabel: "Neutral",
    trend: "stable", // 'up', 'down', 'stable'
    trendLabel: "Same as yesterday",
    suggestion: {
        title: "Suggestions for you today",
        text: "You seem a bit flat today. Try a quick 5-minute walk to reset your energy levels.",
        action: "Start Breathing Exercise",
    },
};

export function DailySnapshot() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-7xl mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
            {/* 24h Mood Graph (Bigger - spans 2 cols) */}
            <div className="glass p-5 rounded-2xl relative overflow-hidden lg:col-span-2 flex flex-col justify-between min-h-[300px]">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <FiClock /> Last 24 Hours
                    </h3>
                    <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                        Real-time Analysis
                    </span>
                </div>
                <div className="flex-1 w-full flex items-center">
                    <HourlyMoodChart />
                </div>
            </div>

            {/* Right Column: Stacked items */}
            <div className="flex flex-col gap-4 lg:col-span-1">

                {/* Mood Card */}
                <div className="glass p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden group flex-1 min-h-[140px]">
                    <div className="z-10 relative">
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                            Mood for Today
                        </h3>
                        <div className="flex flex-col gap-1">
                            <span className="text-4xl drop-shadow-md mb-1">{TODAY_DATA.moodEmoji}</span>
                            <div>
                                <div className="text-2xl font-light text-white leading-none">
                                    {TODAY_DATA.moodLabel}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                                    <FiActivity className="text-violet-400" />
                                    <span>{TODAY_DATA.trendLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Decorative background element */}
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-violet-500/10 to-transparent pointer-events-none" />
                </div>

                {/* Suggestions Card */}
                <div className="glass p-5 rounded-2xl relative overflow-hidden group hover:bg-white/5 transition-colors cursor-pointer flex-1 min-h-[140px] flex flex-col justify-center">
                    <div className="flex flex-col gap-3">
                        <div className="p-2 w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                            <FiSun className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-medium text-white mb-1 leading-tight">
                                {TODAY_DATA.suggestion.title}
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed mb-3 line-clamp-2">
                                {TODAY_DATA.suggestion.text}
                            </p>
                            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1 group-hover:gap-2 transition-all">
                                {TODAY_DATA.suggestion.action} <span className="text-lg">→</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}

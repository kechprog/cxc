"use client";

import { Conversation } from "@/lib/data";
import { motion } from "framer-motion";

interface MoodHeaderProps {
    mood: Conversation["overallMood"];
    summary: string;
    date: string;
}

export function MoodHeader({ mood, summary, date }: MoodHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-xs font-mono text-zinc-500 mb-2 uppercase tracking-widest">
                        {new Date(date).toLocaleString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </div>
                    <h1 className="text-3xl font-light text-white mb-4">
                        Conversation Analysis
                    </h1>
                </div>
            </div>

            <div className="glass p-8 rounded-3xl flex flex-col md:flex-row gap-8 items-center md:items-start">
                {/* Big Emoji */}
                <div className="flex-shrink-0 text-center md:text-left">
                    <div className="text-8xl mb-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        {mood.emoji}
                    </div>
                    <div className="text-xl font-medium text-white">{mood.descriptor}</div>
                </div>

                {/* Summary & Details */}
                <div className="flex-1 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Summary
                        </h3>
                        <p className="text-zinc-200 leading-relaxed text-lg">
                            {summary}
                        </p>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Emotional Context
                        </h3>
                        <p className="text-zinc-300 italic">
                            "{mood.description}"
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

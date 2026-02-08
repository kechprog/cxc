"use client";

import { useState, useEffect } from "react";
import type { UserProgress } from "@/lib/types/progress";
import { FiTrendingUp, FiActivity, FiAward, FiArrowUp } from "react-icons/fi";

export default function GlobalSummaryPage() {
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/user/progress")
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load progress (${res.status})`);
                return res.json();
            })
            .then(setProgress)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-8 lg:space-y-12 pb-20">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-light text-white mb-2">My Growth (EQ Trainer)</h1>
                    <p className="text-zinc-400">Tracking your emotional intelligence and communication skills over time.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="glass p-4 lg:p-5 rounded-2xl border border-white/5 h-28 animate-pulse bg-white/5" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div className="glass p-6 rounded-2xl h-48 animate-pulse bg-white/5" />
                    <div className="glass p-6 rounded-2xl h-48 animate-pulse bg-white/5" />
                </div>
            </div>
        );
    }

    if (error || !progress) {
        return (
            <div className="max-w-6xl mx-auto py-20 text-center">
                <p className="text-zinc-400">{error || "Failed to load progress data."}</p>
            </div>
        );
    }

    const hasProgress = progress.progress.length > 0;
    const hasImprovements = progress.improvements.length > 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8 lg:space-y-12 pb-20">

            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-light text-white mb-2">My Growth (EQ Trainer)</h1>
                <p className="text-zinc-400">
                    Tracking your emotional intelligence and communication skills over time.
                </p>
            </div>

            {/* EQ Dimensions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {progress.eq.map((dim) => (
                    <div key={dim.name} className="glass p-4 lg:p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-violet-500/30 transition-colors">
                        <div className="relative z-10">
                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1 truncate">
                                {dim.name.replace('_', ' ')}
                            </h3>
                            <div className="text-3xl font-light text-white mb-2">{(dim.score * 100).toFixed(0)}</div>
                            <div className="text-xs text-violet-300 flex items-center gap-1">
                                <FiArrowUp /> {dim.trend}
                            </div>
                        </div>
                        <div className="absolute bottom-0 left-0 h-1 bg-violet-500 transition-all duration-1000" style={{ width: `${dim.score * 100}%` }} />
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10" />
                    </div>
                ))}
            </div>

            {/* Progress & Improvements Split */}
            {(hasProgress || hasImprovements) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

                    {/* Wins / Progress */}
                    {hasProgress && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-light text-white flex items-center gap-2">
                                <FiAward className="text-emerald-400" />
                                Recent Progress
                            </h2>
                            <div className="space-y-4">
                                {progress.progress.map((item, i) => (
                                    <div key={i} className="glass p-4 lg:p-6 rounded-2xl border-l-4 border-l-emerald-500/50">
                                        <h3 className="font-medium text-emerald-100 mb-2">{item.observation}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {item.evidence.map((ev, j) => (
                                                <span key={j} className="text-xs bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">
                                                    {ev}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Areas for Improvement */}
                    {hasImprovements && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-light text-white flex items-center gap-2">
                                <FiTrendingUp className="text-amber-400" />
                                Focus Areas
                            </h2>
                            <div className="space-y-4">
                                {progress.improvements.map((item, i) => (
                                    <div key={i} className="glass p-4 lg:p-6 rounded-2xl border-l-4 border-l-amber-500/50">
                                        <h3 className="font-medium text-amber-100 mb-2">{item.observation}</h3>
                                        <p className="text-sm text-zinc-400 mb-3 italic">
                                            &ldquo;{item.suggestion}&rdquo;
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {item.evidence.map((ev, j) => (
                                                <span key={j} className="text-xs bg-amber-500/10 text-amber-300 px-2 py-1 rounded border border-amber-500/20">
                                                    {ev}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}

        </div>
    );
}

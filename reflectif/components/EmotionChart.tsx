"use client";

import { useState, useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { EMOTION_COLORS } from "@/lib/data";
import { cn } from "@/lib/utils";

const toPercent = (decimal: number, fixed = 0) => `${(decimal * 100).toFixed(fixed)}%`;

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const sortedPayload = [...payload].sort((a: any, b: any) => b.value - a.value);

        return (
            <div className="bg-zinc-900/95 border border-white/10 p-4 rounded-xl backdrop-blur-md shadow-2xl min-w-[200px]">
                <p className="text-zinc-400 text-xs mb-2 border-b border-white/10 pb-1">{label}</p>
                <div className="space-y-1">
                    {sortedPayload.map((entry: any) => (
                        entry.value > 0.01 && (
                            <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-zinc-200">{entry.name}</span>
                                </div>
                                <span className="font-mono text-zinc-400">{toPercent(entry.value, 1)}</span>
                            </div>
                        )
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

function formatTimestamp(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function EmotionChart({ data = [], className }: { data?: any[], className?: string }) {
    // Extract unique speakers from pipeline data (points with speaker field)
    const speakers = useMemo(() => {
        const set = new Set<string>();
        for (const point of data) {
            if (point.speaker) set.add(point.speaker);
        }
        // Put "You" first if present
        const arr = [...set];
        const youIdx = arr.indexOf("You");
        if (youIdx > 0) {
            arr.splice(youIdx, 1);
            arr.unshift("You");
        }
        return arr;
    }, [data]);

    const hasSpeakers = speakers.length > 0;
    const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
    // Default to "You" or first speaker once speakers are known
    const activeSpeaker = selectedSpeaker ?? (hasSpeakers ? (speakers.includes("You") ? "You" : speakers[0]) : null);

    const chartData = useMemo(() => {
        const filtered = activeSpeaker
            ? data.filter((point: any) => point.speaker === activeSpeaker)
            : data;

        return filtered.map((point: any) => {
            const ts = typeof point.timestamp === "number"
                ? formatTimestamp(point.timestamp)
                : point.time ?? "";

            if (point.scores) {
                // Mock data format: { timestamp, scores: { Joy: 0.3, ... } }
                return { time: ts, ...point.scores };
            }
            if (point.emotions && Array.isArray(point.emotions)) {
                // Pipeline format: { timestamp, speaker, emotions: [{ name, score }] }
                const flat: Record<string, number | string> = { time: ts };
                for (const e of point.emotions) {
                    flat[e.name] = e.score;
                }
                return flat;
            }
            return point;
        });
    }, [data, activeSpeaker]);

    // Find top emotions by average score across filtered data
    const MAX_EMOTIONS = 6;
    const topEmotions = useMemo(() => {
        const emotionKeys = chartData.length > 0
            ? Object.keys(chartData[0]).filter(k => k !== "time")
            : [];

        if (emotionKeys.length <= MAX_EMOTIONS) return emotionKeys;

        const avgScores: Record<string, number> = {};
        for (const key of emotionKeys) {
            let sum = 0;
            let count = 0;
            for (const point of chartData) {
                const val = point[key];
                if (typeof val === "number") { sum += val; count++; }
            }
            avgScores[key] = count > 0 ? sum / count : 0;
        }
        return Object.entries(avgScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_EMOTIONS)
            .map(([k]) => k);
    }, [chartData]);

    return (
        <div className={cn("w-full h-full flex flex-col", className)}>
            {/* Speaker selector */}
            {hasSpeakers && speakers.length > 1 && (
                <div className="flex items-center gap-2 mb-3 px-1">
                    {speakers.map((speaker) => (
                        <button
                            key={speaker}
                            onClick={() => setSelectedSpeaker(speaker)}
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                                activeSpeaker === speaker
                                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                                    : "bg-white/5 text-zinc-500 border border-white/10 hover:text-zinc-300 hover:border-white/20"
                            )}
                        >
                            {speaker}
                        </button>
                    ))}
                </div>
            )}

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#52525b"
                            tick={{ fill: "#71717a", fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            interval={3}
                        />
                        <YAxis
                            tickFormatter={toPercent}
                            stroke="#52525b"
                            tick={{ fill: "#52525b", fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                            domain={[0, 1]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                        {topEmotions.map((emotion, index) => (
                            <Line
                                key={emotion}
                                type="monotone"
                                dataKey={emotion}
                                stroke={EMOTION_COLORS[emotion] || `hsl(${(index * 137) % 360}, 70%, 60%)`}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6, fill: "#fff", stroke: EMOTION_COLORS[emotion] || "#fff" }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

"use client";

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
import { EMOTIONS, EMOTION_COLORS } from "@/lib/data";
import { cn } from "@/lib/utils";

const toPercent = (decimal: number, fixed = 0) => `${(decimal * 100).toFixed(fixed)}%`;

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Sort payload by value desc to show dominant emotions first
        const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

        return (
            <div className="bg-zinc-900/95 border border-white/10 p-4 rounded-xl backdrop-blur-md shadow-2xl min-w-[200px]">
                <p className="text-zinc-400 text-xs mb-2 border-b border-white/10 pb-1">{label}</p>
                <div className="space-y-1">
                    {sortedPayload.map((entry: any) => (
                        entry.value > 0.01 && ( // Only show if > 1% relevance
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

export function EmotionChart({ data = [], className }: { data?: any[], className?: string }) {
    // Adapter: Handle arch_v2 structure if needed
    // If data comes in as { timestamp, scores: {} }, flatten it for Recharts
    const chartData = data.map((point: any) => {
        const ts = typeof point.timestamp === "number"
            ? `${Math.floor(point.timestamp / 60).toString().padStart(2, "0")}:${Math.floor(point.timestamp % 60).toString().padStart(2, "0")}`
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

    // Find top emotions by average score across all data points
    const MAX_EMOTIONS = 6;
    const emotionKeys = chartData.length > 0
        ? Object.keys(chartData[0]).filter(k => k !== "time")
        : [];

    let topEmotions = emotionKeys;
    if (emotionKeys.length > MAX_EMOTIONS) {
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
        topEmotions = Object.entries(avgScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_EMOTIONS)
            .map(([k]) => k);
    }

    return (
        <div className={cn("w-full h-full", className)}>
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
    );
}

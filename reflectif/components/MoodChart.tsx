"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
} from "recharts";
import { MOCK_GLOBAL_STATS } from "@/lib/data";

const data = MOCK_GLOBAL_STATS.moodHistory.map((d) => ({
    ...d,
    dateOnly: new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    }),
}));

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-zinc-900/90 border border-white/10 p-4 rounded-lg backdrop-blur-md shadow-xl">
                <p className="text-zinc-400 text-xs mb-1">{data.dateOnly}</p>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{data.moodEmoji}</span>
                    <span className="text-white font-medium">{data.moodLabel}</span>
                </div>
            </div>
        );
    }
    return null;
};

export function MoodChart() {
    return (
        <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="dateOnly"
                        stroke="#52525b" // zinc-600
                        tick={{ fill: "#a1a1aa", fontSize: 12 }} // zinc-400
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        domain={[0, 10]}
                        hide={true} // Hide the numeric axis, we rely on tooltips/visuals
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(139,92,246,0.3)", strokeWidth: 2 }} />

                    {/* Gradient Definition */}
                    <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                    </defs>

                    <Line
                        type="monotone"
                        dataKey="moodScore"
                        stroke="url(#lineGradient)"
                        strokeWidth={4}
                        dot={({ cx, cy, payload }) => (
                            <CustomDot cx={cx} cy={cy} emoji={payload.moodEmoji} />
                        )}
                        activeDot={{ r: 8, fill: "#fff" }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// Custom Dot Component to render Emojis on the line
const CustomDot = (props: any) => {
    const { cx, cy, emoji } = props;
    return (
        <svg x={cx - 10} y={cy - 10} width={20} height={20} fill="white" viewBox="0 0 1024 1024">
            <text x="50%" y="50%" dy=".3em" textAnchor="middle" fontSize="900">
                {emoji}
            </text>
        </svg>
    );
};

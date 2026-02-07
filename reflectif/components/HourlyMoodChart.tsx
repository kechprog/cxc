"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// Generate mock hourly data for the last 24 hours
const generateHourlyData = () => {
    const data = [];
    const now = new Date();
    for (let i = 24; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        // Mock mood score with some random variance but generally realistic flow
        // Base sine wave + random noise
        const score = 5 + Math.sin(i / 3) * 2 + (Math.random() - 0.5) * 2;

        // Determine emoji based on score
        let emoji = "😐";
        if (score > 7) emoji = "😊";
        if (score > 8.5) emoji = "🤩";
        if (score < 4) emoji = "😰";
        if (score < 2.5) emoji = "😣";

        data.push({
            time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            score: Math.max(1, Math.min(10, score)), // Clamp between 1-10
            emoji
        });
    }
    return data;
};

const data = generateHourlyData();

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-zinc-900/90 border border-white/10 p-3 rounded-lg backdrop-blur-md shadow-xl">
                <p className="text-zinc-400 text-xs mb-1">{data.time}</p>
                <div className="flex items-center gap-2">
                    <span className="text-xl">{data.emoji}</span>
                    <span className="text-white font-medium text-sm">Level: {data.score.toFixed(1)}</span>
                </div>
            </div>
        );
    }
    return null;
};

export function HourlyMoodChart() {
    return (
        <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="time"
                        stroke="#52525b"
                        tick={{ fill: "#71717a", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval={3} // Show every 4th label to avoid clutter
                    />
                    <YAxis hide domain={[0, 10]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorMood)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

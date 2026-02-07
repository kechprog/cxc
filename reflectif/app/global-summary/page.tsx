import { MoodChart } from "@/components/MoodChart";
import { MOCK_GLOBAL_STATS } from "@/lib/data";
import { FiTrendingUp, FiAlertCircle, FiSun, FiActivity } from "react-icons/fi";

export default function GlobalSummaryPage() {
    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-light text-white mb-2">Global Insights</h1>
                <p className="text-zinc-400">
                    Your emotional patterns over the last 30 days.
                </p>
            </div>

            {/* Main Chart Section */}
            <div className="glass p-8 rounded-3xl border-violet-500/20 shadow-[0_0_50px_rgba(139,92,246,0.05)]">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        <FiActivity className="text-violet-400" />
                        Mood Timeline
                    </h2>
                    <div className="flex gap-2">
                        <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded">7 Days</span>
                        <span className="text-xs text-zinc-300 bg-white/10 px-2 py-1 rounded">30 Days</span>
                    </div>
                </div>
                <MoodChart />
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Patterns Column */}
                <div className="space-y-6 lg:col-span-2">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        <FiTrendingUp className="text-indigo-400" />
                        Detected Patterns
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MOCK_GLOBAL_STATS.patterns.map((pattern, i) => (
                            <div key={i} className="glass p-6 rounded-2xl hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:bg-indigo-500/30 transition-colors">
                                        {/* Icon mapping could be improved, simplifying for mock */}
                                        <FiAlertCircle />
                                    </div>
                                    <h3 className="font-medium text-indigo-100">{pattern.title}</h3>
                                </div>
                                <p className="text-sm text-zinc-400 leading-relaxed">
                                    {pattern.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Suggestions Column */}
                <div className="space-y-6">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        <FiSun className="text-amber-400" />
                        Suggestions
                    </h2>
                    <div className="space-y-4">
                        {MOCK_GLOBAL_STATS.suggestions.map((suggestion, i) => (
                            <div key={i} className="glass p-6 rounded-2xl border-l-4 border-l-amber-500/50">
                                <h3 className="font-medium text-amber-100 mb-2">{suggestion.title}</h3>
                                <p className="text-sm text-zinc-400">
                                    {suggestion.action}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

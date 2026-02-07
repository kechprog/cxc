import { EmotionChart } from "@/components/EmotionChart";
import { MOCK_GLOBAL_STATS, EMOTION_DEFINITIONS, EMOTION_COLORS, EMOTIONS } from "@/lib/data";
import { FiTrendingUp, FiAlertCircle, FiSun, FiActivity, FiInfo } from "react-icons/fi";

export default function GlobalSummaryPage() {
    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-light text-white mb-2">Global Insights</h1>
                <p className="text-zinc-400">
                    Your emotional landscape over the last 24 hours.
                </p>
            </div>

            {/* Main Chart Section */}
            <div className="glass p-8 rounded-3xl border-violet-500/20 shadow-[0_0_50px_rgba(139,92,246,0.05)]">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        <FiActivity className="text-violet-400" />
                        Emotion Distribution
                    </h2>
                    <div className="text-xs text-zinc-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                        Probability Density (∑ = 1.0)
                    </div>
                </div>
                <div className="h-[400px] w-full">
                    <EmotionChart />
                </div>
            </div>

            {/* Definitions Legend */}
            <div>
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <FiInfo /> Emotion Definitions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {EMOTIONS.map((emotion) => (
                        <div key={emotion} className="glass p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full shadow-lg shadow-black/50" style={{ backgroundColor: EMOTION_COLORS[emotion] }} />
                                <h4 className="font-medium text-zinc-200 text-sm">{emotion}</h4>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                {EMOTION_DEFINITIONS[emotion]}
                            </p>
                        </div>
                    ))}
                </div>
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

import { EmotionChart } from "@/components/EmotionChart";
import { MOCK_USER_PROGRESS, EMOTION_DEFINITIONS, EMOTION_COLORS, EMOTIONS } from "@/lib/data";
import { FiTrendingUp, FiAlertCircle, FiSun, FiActivity, FiInfo, FiAward, FiArrowUp } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { DbHandlers } from "@/lib/db/handlers";
import { auth0 } from "@/lib/auth0";
import { aggregateScores } from "@/lib/analytics";

export default async function GlobalSummaryPage() {
    // 1. Fetch User ID
    const session = await auth0.getSession();
    const userId = session!.user.sub;

    // 2. Fetch Global Emotion Data
    const db = DbHandlers.getInstance();
    const totalConversations = db.listConversationAnalyses(userId).length;
    let globalScores: any[] = [];
    try {
        const rawGlobalScores = db.getGlobalUserEmotions(userId);
        globalScores = aggregateScores(rawGlobalScores);
        console.log(`[Global Summary Page] Loaded ${globalScores.length} aggregated time buckets.`);
    } catch (err) {
        console.error("[Global Summary Page] Failed to load scores:", err);
    }

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
                {MOCK_USER_PROGRESS.eq.map((dim) => (
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
                        {/* Progress Bar Background */}
                        <div className="absolute bottom-0 left-0 h-1 bg-violet-500 transition-all duration-1000" style={{ width: `${dim.score * 100}%` }} />
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10" />
                    </div>
                ))}
            </div>

            {/* Progress & Improvements Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

                {/* Wins / Progress */}
                <div className="space-y-6">
                    <h2 className="text-xl font-light text-white flex items-center gap-2">
                        <FiAward className="text-emerald-400" />
                        Recent Progress
                    </h2>
                    <div className="space-y-4">
                        {MOCK_USER_PROGRESS.progress.map((item, i) => (
                            <div key={i} className="glass p-4 lg:p-6 rounded-2xl border-l-4 border-l-emerald-500/50">
                                <h3 className="font-medium text-emerald-100 mb-2">{item.observation}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {item.evidence.map((ev, j) => (
                                        <span key={j} className="text-xs bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20">
                                            Evidence: {ev}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Areas for Improvement */}
                <div className="space-y-6">
                    <h2 className="text-xl font-light text-white flex items-center gap-2">
                        <FiTrendingUp className="text-amber-400" />
                        Focus Areas
                    </h2>
                    <div className="space-y-4">
                        {MOCK_USER_PROGRESS.improvements.map((item, i) => (
                            <div key={i} className="glass p-4 lg:p-6 rounded-2xl border-l-4 border-l-amber-500/50">
                                <h3 className="font-medium text-amber-100 mb-2">{item.observation}</h3>
                                <p className="text-sm text-zinc-400 mb-3 italic">
                                    "{item.suggestion}"
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {item.evidence.map((ev, j) => (
                                        <span key={j} className="text-xs bg-amber-500/10 text-amber-300 px-2 py-1 rounded border border-amber-500/20">
                                            Evidence: {ev}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Raw Emotional Data (Legacy View) */}
            <div className="glass p-4 lg:p-8 rounded-2xl lg:rounded-3xl border-violet-500/20 shadow-[0_0_50px_rgba(139,92,246,0.05)]">
                <div className="flex items-center justify-between mb-4 lg:mb-8">
                    <h2 className="text-base lg:text-lg font-medium text-white flex items-center gap-2">
                        <FiActivity className="text-violet-400" />
                        Emotion Distribution of {totalConversations} conversations
                    </h2>
                </div>
                <div className="h-[280px] lg:h-[400px] w-full relative">
                    {/* Real Data Integration via new global aggregation logic */}
                    <div className="absolute inset-0">
                        <EmotionChart data={globalScores} className="h-full" />
                    </div>
                </div>
            </div>

        </div>
    );
}

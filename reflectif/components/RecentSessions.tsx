"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ConversationAnalysisListItem } from "@/lib/types";

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RecentSessions({ conversations }: { conversations: ConversationAnalysisListItem[] }) {
    if (conversations.length === 0) {
        return (
            <div className="text-center py-12 text-zinc-500 text-sm">
                Your conversations will appear here.
            </div>
        );
    }

    return (
        <div className="w-full space-y-2">
            {conversations.map((conv) => (
                <Link
                    key={conv.id}
                    href={`/conversation/${conv.id}`}
                    className={cn(
                        "block p-4 rounded-xl transition-all duration-200",
                        "bg-white/[0.03] border border-white/5",
                        "hover:bg-white/[0.06] hover:border-white/10"
                    )}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-white">
                            {conv.emoji} {conv.label}
                        </span>
                        <span className="text-xs text-zinc-500">
                            {relativeTime(conv.analyzedAt)}
                        </span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2">
                        {conv.summary}
                    </p>
                </Link>
            ))}
        </div>
    );
}

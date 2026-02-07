"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FiMic, FiBarChart2, FiMessageSquare, FiSettings } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { MOCK_CONVERSATIONS } from "@/lib/data";

export function Sidebar() {
    const pathname = usePathname();

    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-64 h-screen fixed left-0 top-0 border-r border-white/10 glass flex flex-col z-50"
        >
            {/* Logo Area */}
            <div className="p-6 border-b border-white/10">
                <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                    Reflectif
                </h1>
                <p className="text-xs text-zinc-400 mt-1">Emotional Intelligence AI</p>
            </div>

            {/* Main Navigation */}
            <nav className="p-4 space-y-2">
                <NavLink
                    href="/"
                    icon={<FiMic />}
                    label="Record"
                    isActive={pathname === "/"}
                />
                <NavLink
                    href="/global-summary"
                    icon={<FiBarChart2 />}
                    label="Global Summary"
                    isActive={pathname === "/global-summary"}
                />
            </nav>

            {/* Recent Conversations */}
            <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Recent
                </h3>
                <div className="space-y-1">
                    {MOCK_CONVERSATIONS.map((conv) => (
                        <Link
                            key={conv.id}
                            href={`/conversation/${conv.id}`}
                            className={cn(
                                "block p-3 rounded-lg text-sm transition-all duration-200",
                                pathname === `/conversation/${conv.id}`
                                    ? "bg-white/10 text-white"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium truncate">
                                    {new Date(conv.date).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </span>
                                <span className="text-base">{conv.overallMood.emoji}</span>
                            </div>
                            <p className="truncate text-xs opacity-70 mt-1">
                                {conv.overallMood.descriptor}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
                <button className="flex items-center gap-3 text-sm text-zinc-400 hover:text-white transition-colors w-full p-2 rounded-lg hover:bg-white/5">
                    <FiSettings />
                    <span>Settings</span>
                </button>
            </div>
        </motion.aside>
    );
}

function NavLink({
    href,
    icon,
    label,
    isActive,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
            )}
        >
            <span className="text-lg">{icon}</span>
            {label}
        </Link>
    );
}

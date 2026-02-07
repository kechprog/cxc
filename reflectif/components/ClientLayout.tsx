"use client";

import { useState, useCallback } from "react";
import { FiMenu } from "react-icons/fi";
import { Sidebar } from "@/components/Sidebar";
import type { ConversationAnalysisListItem } from "@/lib/types";

export function ClientLayout({
    conversations,
    children,
}: {
    conversations: ConversationAnalysisListItem[];
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    return (
        <div className="flex min-h-screen">
            {/* Mobile top bar */}
            <header className="fixed top-0 left-0 right-0 h-14 z-40 lg:hidden flex items-center px-4 border-b border-white/10 bg-background/80 backdrop-blur-xl">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                    aria-label="Open menu"
                >
                    <FiMenu size={22} />
                </button>
                <h1 className="ml-3 text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                    Reflectif
                </h1>
            </header>

            {/* Backdrop overlay for mobile sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            <Sidebar
                conversations={conversations}
                isOpen={sidebarOpen}
                onClose={closeSidebar}
            />

            <main className="flex-1 lg:pl-64 pt-14 lg:pt-0 transition-all duration-300 relative z-0">
                {/* Background ambient light effects */}
                <div className="fixed top-0 right-0 w-full h-[500px] bg-violet-500/10 blur-[120px] pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="relative z-10 p-4 lg:p-8 min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { AssistantChat } from "@/components/AssistantChat";
import type { TopicSuggestion } from "@/lib/types/chat";

export default function AssistantPage() {
    const [topics, setTopics] = useState<TopicSuggestion[] | undefined>(undefined);

    useEffect(() => {
        fetch("/api/chat/topics")
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (data?.topics) setTopics(data.topics);
                else setTopics([]);
            })
            .catch(() => setTopics([]));
    }, []);

    return (
        <div className="max-w-4xl mx-auto pb-20 pt-4 h-[calc(100vh-2rem)] flex flex-col">

            {/* Header */}
            <div className="mb-6 flex-shrink-0">
                <h1 className="text-3xl font-light text-white mb-2">AI Assistant</h1>
                <p className="text-zinc-400">
                    Have a conversation with your personal emotional health guide.
                </p>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 min-h-0 bg-black/20 rounded-3xl border border-white/5 backdrop-blur-md overflow-hidden flex flex-col shadow-2xl relative">
                <AssistantChat topics={topics} />
            </div>

        </div>
    );
}

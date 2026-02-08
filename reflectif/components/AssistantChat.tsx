"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FiMic, FiSend, FiUser, FiCpu, FiStopCircle } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { ConversationAnalysis } from "@/lib/types/conversation";
import type { TopicSuggestion } from "@/lib/types/chat";

interface Message {
    id: string;
    role: "user" | "assistant";
    text: string;
    isAudio?: boolean;
}

export function AssistantChat({ context, topics, mode, initialInsight }: { context?: ConversationAnalysis; topics?: TopicSuggestion[]; mode?: "conversation" | "global"; initialInsight?: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatId, setChatId] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [pendingContextPrompt, setPendingContextPrompt] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Show context-specific welcome message (conversation-scoped chat only)
    useEffect(() => {
        if (messages.length === 0 && context) {
            setMessages([{
                id: "welcome",
                role: "assistant",
                text: `During this conversation, it would be great to observe your **${context.label}** pattern. \n\nI noticed distinct phases of ${context.dynamics.map(d => d.phase).join(" and ")}. \n\nWhat do you think triggered the shift?`
            }]);
        }
    }, [context]);

    // Auto-send initialInsight as the first user message
    const initialInsightSent = useRef(false);
    useEffect(() => {
        if (initialInsight && !initialInsightSent.current && messages.length > 0) {
            initialInsightSent.current = true;
            sendUserMessage(initialInsight);
        }
    }, [initialInsight, messages.length]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const sendUserMessage = async (text: string, contextPromptOverride?: string) => {
        if (!text.trim() || isThinking) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            text: text.trim(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsThinking(true);

        // Use override if provided, otherwise use pending context prompt
        const ctxPrompt = contextPromptOverride ?? pendingContextPrompt;
        if (pendingContextPrompt) setPendingContextPrompt(null);

        try {
            const body: Record<string, string | undefined> = {
                message: text.trim(),
                chatId: chatId ?? undefined,
                conversationAnalysisId: context?.id,
            };
            if (ctxPrompt && !chatId) {
                body.contextPrompt = ctxPrompt;
            }

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Chat request failed");
            }

            if (data.chatId && !chatId) {
                setChatId(data.chatId);
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                text: data.content,
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            console.error("Chat error:", err);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                text: "Sorry, I had trouble responding. Please try again.",
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleTopicClick = (topic: TopicSuggestion) => {
        sendUserMessage(topic.label, topic.contextPrompt);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendUserMessage(inputValue);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            setIsRecording(false);
        } else {
            setIsRecording(true);
        }
    };

    const showTopics = !context && topics && topics.length > 0 && messages.length === 0 && !isThinking;

    return (
        <div className="flex flex-col h-full relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6 pb-4">

                {/* Topic Bubbles (shown when no messages yet, no context) */}
                {showTopics && (
                    <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
                        <p className="text-sm text-zinc-500 uppercase tracking-widest">What would you like to explore?</p>
                        <div className="flex flex-col gap-3 w-full max-w-md">
                            {topics.map((topic, i) => (
                                <motion.button
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    onClick={() => handleTopicClick(topic)}
                                    className="text-left p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
                                >
                                    <div className="text-sm font-medium text-white group-hover:text-violet-200 transition-colors">
                                        {topic.label}
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-1">
                                        {topic.description}
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "flex gap-4 max-w-[85%]",
                            msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                        )}
                    >
                        {/* Avatar */}
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                            msg.role === "assistant"
                                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                : "bg-zinc-700 text-zinc-300"
                        )}>
                            {msg.role === "assistant" ? <FiCpu size={14} /> : <FiUser size={14} />}
                        </div>

                        {/* Bubble */}
                        <div className={cn(
                            "p-4 rounded-2xl text-sm leading-relaxed",
                            msg.role === "assistant"
                                ? "bg-white/5 border border-white/10 text-zinc-200 rounded-tl-none"
                                : "bg-violet-600 text-white rounded-tr-none shadow-lg shadow-violet-900/20"
                        )}>
                            <p>{msg.text}</p>
                            {msg.isAudio && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-white/50 bg-black/10 px-2 py-1 rounded w-fit">
                                    <FiMic size={10} />
                                    <span>Transcribed from audio</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                {isThinking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-4 max-w-[85%]"
                    >
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                            <FiCpu size={14} />
                        </div>
                        <div className="bg-white/5 border border-white/10 text-zinc-400 p-4 rounded-2xl rounded-tl-none flex gap-1 items-center h-[54px]">
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="p-3 lg:p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3 lg:gap-4 max-w-2xl mx-auto">

                    {/* Mic Button */}
                    <button
                        onClick={toggleRecording}
                        className={cn(
                            "relative group flex-shrink-0 w-11 h-11 lg:w-14 lg:h-14 rounded-full flex items-center justify-center transition-all duration-300 outline-none",
                            isRecording
                                ? "bg-red-500/20 text-red-500 border border-red-500/50"
                                : "bg-white/10 text-white hover:bg-violet-500/20 hover:text-violet-300 hover:border-violet-500/50 border border-white/10"
                        )}
                    >
                        {isRecording && (
                            <span className="absolute inset-0 rounded-full border border-red-500/30 animate-ping" />
                        )}
                        {isRecording ? <FiStopCircle size={24} /> : <FiMic size={24} />}
                    </button>

                    {/* Text Input */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isRecording || isThinking}
                            placeholder={isRecording ? "Listening..." : "Type a message..."}
                            className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 lg:px-5 lg:py-4 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-zinc-600 disabled:opacity-50"
                        />
                        <button
                            onClick={() => sendUserMessage(inputValue)}
                            disabled={!inputValue.trim() || isThinking}
                            className="absolute right-2 top-2 p-2 text-zinc-500 hover:text-violet-400 transition-colors disabled:opacity-30 disabled:hover:text-zinc-500"
                        >
                            <FiSend size={18} />
                        </button>
                    </div>

                </div>
                {isRecording && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center mt-3 text-xs text-red-400 font-mono tracking-widest uppercase animate-pulse"
                    >
                        Recording...
                    </motion.div>
                )}
                {!isRecording && (
                    <div className="text-center mt-3 text-xs text-zinc-600">
                        Tap microphone to speak or type a message
                    </div>
                )}
            </div>
        </div>
    );
}

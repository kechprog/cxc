"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FiMic, FiSend, FiUser, FiCpu, FiStopCircle } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { ConversationAnalysis } from "@/lib/data";

interface Message {
    id: string;
    role: "user" | "assistant";
    text: string;
    isAudio?: boolean;
}

export function AssistantChat({ context }: { context?: ConversationAnalysis }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatId, setChatId] = useState<string | null>(null);
    const [seeded, setSeeded] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messages.length === 0) {
            if (context) {
                setMessages([{
                    id: "welcome",
                    role: "assistant",
                    text: `During this conversation, it would be great to observe your **${context.label}** pattern. \n\nI noticed distinct phases of ${context.dynamics.map(d => d.phase).join(" and ")}. \n\nWhat do you think triggered the shift?`
                }]);
            } else {
                setMessages([{
                    id: "welcome",
                    role: "assistant",
                    text: "Over the last 7 days, you've been consistent with self-reflection. \n\nHowever, I've observed a recurring theme of **high anxiety** in the evenings. \n\nLet's observe this pattern together. How have you been feeling after work this week?"
                }]);
            }
        }
    }, [context]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const seedContext = async (cId: string) => {
        if (!context || seeded) return;
        setSeeded(true);

        const seedContent = [
            `Conversation Analysis for "${context.label}":`,
            `Summary: ${context.summary}`,
            `Patterns observed: ${context.patterns.join(", ")}`,
            `Conversation phases: ${context.dynamics.map(d => `${d.phase} (${d.mood}): ${d.reason}`).join("; ")}`,
        ].join("\n");

        try {
            await fetch("/api/chat/seed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatId: cId, content: seedContent }),
            });
        } catch (err) {
            console.error("Failed to seed context:", err);
        }
    };

    const sendUserMessage = async (text: string) => {
        if (!text.trim() || isThinking) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            text: text.trim(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsThinking(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text.trim(),
                    chatId,
                    conversationAnalysisId: context?.id,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Chat request failed");
            }

            // Persist chatId for subsequent messages
            if (data.chatId && !chatId) {
                setChatId(data.chatId);
                // Seed context on first interaction if available
                seedContext(data.chatId);
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendUserMessage(inputValue);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            setIsRecording(false);
            // TODO: integrate actual audio transcription
        } else {
            setIsRecording(true);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6 pb-4">
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

                    {/* Mic Button (Main Interaction) */}
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

                    {/* Text Input (Secondary) */}
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

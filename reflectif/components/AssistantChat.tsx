"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

    useEffect(() => {
        // Initialize chat based on context
        if (messages.length === 0) {
            if (context) {
                // Conversation Specific Observation
                setMessages([{
                    id: "welcome",
                    role: "assistant",
                    text: `During this conversation, it would be great to observe your **${context.label}** pattern. \n\nI noticed distinct phases of ${context.dynamics.map(d => d.phase).join(" and ")}. \n\nWhat do you think triggered the shift?`
                }]);
            } else {
                // Global "Observe Yourself" Observation
                setMessages([{
                    id: "welcome",
                    role: "assistant",
                    text: "Over the last 7 days, you've been consistent with self-reflection. \n\nHowever, I've observed a recurring theme of **high anxiety** in the evenings. \n\nLet's observe this pattern together. How have you been feeling after work this week?"
                }]);
            }
        }
    }, [context]);

    const [isRecording, setIsRecording] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const toggleRecording = () => {
        if (isRecording) {
            // Stop recording logic
            setIsRecording(false);
            processUserAudio();
        } else {
            // Start recording
            setIsRecording(true);
        }
    };

    const processUserAudio = async () => {
        setIsThinking(true);

        // Simulate processing delay
        setTimeout(() => {
            // Add user mock message
            const userMsg: Message = {
                id: Date.now().toString(),
                role: "user",
                text: "I've been feeling a bit overwhelmed lately with work deadlines.",
                isAudio: true
            };
            setMessages(prev => [...prev, userMsg]);

            // Simulate AI thinking delay
            setTimeout(() => {
                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    text: "I understand. Your data shows a spike in anxiety during work hours (9 AM - 5 PM) over the last 3 days. It seems like the 'Deadline Anxiety' pattern we identified is active. Would you like some strategies to manage this pressure?"
                };
                setMessages(prev => [...prev, aiMsg]);
                setIsThinking(false);
            }, 1500);

        }, 1000);
    };

    return (
        <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl absolute bottom-0 left-0 right-0">
                <div className="flex items-center gap-4 max-w-2xl mx-auto">

                    {/* Mic Button (Main Interaction) */}
                    <button
                        onClick={toggleRecording}
                        className={cn(
                            "relative group flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 outline-none",
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
                            disabled={isRecording}
                            placeholder={isRecording ? "Listening..." : "Type a message..."}
                            className="w-full bg-white/5 border border-white/10 rounded-full px-5 py-4 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-zinc-600 disabled:opacity-50"
                        />
                        <button className="absolute right-2 top-2 p-2 text-zinc-500 hover:text-violet-400 transition-colors">
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
                        Tap microphone to speak
                    </div>
                )}
            </div>
        </>
    );
}

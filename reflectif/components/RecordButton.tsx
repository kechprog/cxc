"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiSquare, FiActivity } from "react-icons/fi";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function RecordButton({ latestConversationId }: { latestConversationId?: string }) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0); // Mock timer
    const [showAnalysisLink, setShowAnalysisLink] = useState(false);

    // Mock recording logic
    const toggleRecording = () => {
        if (isRecording) {
            // Stop recording
            setIsRecording(false);
            setShowAnalysisLink(true);
            setRecordingTime(0);
        } else {
            // Start recording
            setIsRecording(true);
            setShowAnalysisLink(false);
            // Simulate timer (in a real app this would be a useEffect)
        }
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 lg:gap-8 py-4 lg:py-10 relative">

            {/* Visualizer / Status Text */}
            <AnimatePresence mode="wait">
                {isRecording ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center space-y-2"
                    >
                        <div className="flex items-center gap-2 text-red-400 font-mono text-xs lg:text-sm tracking-widest uppercase">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Recording Active
                        </div>
                        <div className="text-3xl lg:text-4xl font-light text-white font-mono">
                            00:0{Math.floor(Math.random() * 9)}:4{Math.floor(Math.random() * 9)}
                            {/* Mock timer changing would require useEffect, keeping it static-ish for simple UI mock */}
                        </div>
                    </motion.div>
                ) : showAnalysisLink ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                    >
                        <h2 className="text-xl lg:text-2xl font-light text-zinc-300 mb-2">Conversation Processed</h2>
                        <div className="flex justify-center mt-4 lg:mt-6">
                            <Link
                                href={`/conversation/${latestConversationId}`}
                                className="group relative inline-flex items-center gap-3 px-6 py-3 lg:px-8 lg:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]"
                            >
                                <span className="text-xl lg:text-2xl">😌</span>
                                <div className="text-left">
                                    <div className="text-[10px] lg:text-xs text-zinc-400 uppercase tracking-widest">Analysis Ready</div>
                                    <div className="text-base lg:text-lg font-medium text-white">View Summary</div>
                                </div>
                                <FiActivity className="ml-2 text-violet-400 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center space-y-1 lg:space-y-2"
                    >
                        <h2 className="text-2xl lg:text-4xl font-light text-white tracking-tight">
                            How are you feeling?
                        </h2>
                        <p className="text-sm lg:text-base text-zinc-400">Press to start a conversation with yourself.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Button */}
            {!showAnalysisLink && (
                <button
                    onClick={toggleRecording}
                    className="relative group outline-none focus:scale-95 transition-transform duration-200"
                >
                    {/* Background Glows */}
                    <div className={cn(
                        "absolute inset-0 rounded-full blur-[60px] transition-all duration-700",
                        isRecording ? "bg-red-500/30 scale-150" : "bg-violet-500/20 scale-100 group-hover:scale-125"
                    )} />

                    {/* Pulse Rings (Only when recording) */}
                    {isRecording && (
                        <>
                            <div className="absolute inset-0 rounded-full border border-red-500/30 animate-[ping_2s_cubic-cubic-bezier(0,0,0.2,1)_infinite]" />
                            <div className="absolute inset-0 rounded-full border border-red-500/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
                        </>
                    )}

                    {/* Button Surface */}
                    <div className={cn(
                        "relative z-10 w-36 h-36 lg:w-48 lg:h-48 rounded-full flex items-center justify-center border transition-all duration-500",
                        isRecording
                            ? "bg-gradient-to-br from-red-950/80 to-black border-red-500/30 shadow-[0_0_50px_rgba(220,38,38,0.4)]"
                            : "bg-gradient-to-br from-white/5 to-white/0 border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] group-hover:border-violet-500/50 group-hover:shadow-[0_0_50px_rgba(139,92,246,0.3)]"
                    )}>
                        <motion.div
                            animate={isRecording ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                            transition={{ repeat: isRecording ? Infinity : 0, duration: 2 }}
                        >
                            {isRecording ? (
                                <FiSquare className="w-8 h-8 lg:w-12 lg:h-12 text-red-500 fill-current" />
                            ) : (
                                <FiMic className="w-8 h-8 lg:w-12 lg:h-12 text-zinc-300 group-hover:text-violet-400 transition-colors" />
                            )}
                        </motion.div>
                    </div>
                </button>
            )}
        </div>
    );
}

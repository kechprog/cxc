"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiSquare, FiActivity, FiAlertCircle } from "react-icons/fi";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { encodeWav } from "@/lib/audio/encode-wav";

export function RecordButton({ latestConversationId, onRecordingChange }: { latestConversationId?: string; onRecordingChange?: (active: boolean) => void }) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showAnalysisLink, setShowAnalysisLink] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [conversationId, setConversationId] = useState<string | undefined>(latestConversationId);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.start();
            setIsRecording(true);
            onRecordingChange?.(true);
            setShowAnalysisLink(false);
            setError(null);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Failed to start recording:", err);
        }
    }, [onRecordingChange]);

    const stopRecording = useCallback(async () => {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder || mediaRecorder.state === "inactive") return;

        return new Promise<void>((resolve) => {
            mediaRecorder.onstop = async () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((t) => t.stop());
                    streamRef.current = null;
                }

                // Convert recorded chunks → WAV
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
                const audioCtx = new AudioContext();
                const arrayBuffer = await blob.arrayBuffer();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                const wavBuffer = encodeWav(audioBuffer);
                const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
                await audioCtx.close();

                // Upload to backend
                try {
                    const formData = new FormData();
                    formData.append("audio", wavBlob, "recording.wav");

                    const res = await fetch("/api/conversations/upload", {
                        method: "POST",
                        body: formData,
                    });
                    const data = await res.json();
                    console.log("Upload response:", data);
                    if (!res.ok || data.status === "failed") {
                        setError(data.error || "Something went wrong while processing your conversation.");
                    } else {
                        if (data.id) setConversationId(data.id);
                        setShowAnalysisLink(true);
                    }
                } catch (err) {
                    console.error("Upload failed:", err);
                    setError("Could not reach the server. Please check your connection and try again.");
                } finally {
                    setIsUploading(false);
                }

                resolve();
            };

            mediaRecorder.stop();
        });
    }, []);

    const toggleRecording = async () => {
        if (isRecording) {
            setIsRecording(false);
            setIsUploading(true);
            onRecordingChange?.(false);
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
                            {formatTime(recordingTime)}
                        </div>
                    </motion.div>
                ) : isUploading ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center space-y-3"
                    >
                        <div className="flex items-center justify-center gap-2 text-violet-400 font-mono text-xs lg:text-sm tracking-widest uppercase">
                            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                            Processing
                        </div>
                        <p className="text-lg lg:text-xl font-light text-zinc-300">Processing your conversation...</p>
                        <p className="text-sm text-zinc-500">This may take a moment</p>
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
                                href={`/conversation/${conversationId}`}
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
                ) : error ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center space-y-3"
                    >
                        <div className="flex items-center justify-center gap-2 text-red-400 font-mono text-xs lg:text-sm tracking-widest uppercase">
                            <FiAlertCircle className="w-4 h-4" />
                            Error
                        </div>
                        <p className="text-lg lg:text-xl font-light text-zinc-300">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-2 px-5 py-2 text-sm text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
                        >
                            Try Again
                        </button>
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
                        <p className="text-sm lg:text-base text-zinc-400">Press to start a conversation.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Button */}
            {!showAnalysisLink && !isUploading && !error && (
                <button
                    onClick={toggleRecording}
                    className="relative group outline-none overflow-visible focus:scale-95 transition-transform duration-200"
                >
                    {/* Background Glows */}
                    <div className={cn(
                        "absolute inset-0 rounded-full transition-all duration-700",
                        isRecording
                            ? "bg-[radial-gradient(circle,rgba(220,38,38,0.3)_0%,transparent_70%)] scale-[3]"
                            : "bg-[radial-gradient(circle,rgba(139,92,246,0.2)_0%,transparent_70%)] scale-[2.5] group-hover:scale-[3]"
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

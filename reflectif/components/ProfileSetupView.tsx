"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiCheck, FiUser } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { encodeWav } from "@/lib/audio/encode-wav";

type SetupStep = "intro" | "voice_sample_1" | "voice_sample_2" | "ai_interview" | "complete";

const DEFAULT_PASSAGE_1 =
    "I understand that emotional intelligence is a skill that can be developed through practice and self-awareness. By recording my conversations and reflecting on my communication patterns, I can better understand my emotional triggers, strengthen my relationships, and grow as a more effective communicator. I give my full permission for Reflectif to analyze my speech patterns, emotional responses, and conversational dynamics to help me on this journey of personal growth and emotional development. I believe that understanding myself better is the first step toward meaningful change.";

const DEFAULT_PASSAGE_2 =
    "Communication is at the heart of every meaningful relationship in my life. Whether I'm talking with family members, close friends, or professional colleagues, understanding my emotional state and how it affects my words can transform these interactions in powerful ways. I'm ready to explore my communication style with honesty, curiosity, and an open mind, recognizing that every conversation is an opportunity to learn more about myself and connect more authentically with the people who matter most. This is my personal commitment to growth and self-discovery through Reflectif.";

export function ProfileSetupView({ onComplete }: { onComplete?: () => void } = {}) {
    const [step, setStep] = useState<SetupStep>("intro");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Voice sample state
    const [voicePassage1, setVoicePassage1] = useState(DEFAULT_PASSAGE_1);
    const [voicePassage2, setVoicePassage2] = useState(DEFAULT_PASSAGE_2);
    const [voiceRetryCount, setVoiceRetryCount] = useState(0);

    // AI Interview state
    const [aiMessages, setAiMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([]);
    const [interviewInitialized, setInterviewInitialized] = useState(false);
    const exchangeCountRef = useRef(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    // Initialize interview when entering ai_interview step
    useEffect(() => {
        if (step !== "ai_interview" || interviewInitialized) return;

        const init = async () => {
            try {
                const formData = new FormData();
                const res = await fetch("/api/profile/setup/chat", {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok) {
                    setErrorMessage(data.error ?? "Failed to start interview.");
                    return;
                }
                setAiMessages([{ role: "assistant", text: data.message }]);
                setInterviewInitialized(true);
            } catch (err) {
                console.error("Interview init failed:", err);
                setErrorMessage("Failed to start interview. Please try again.");
            }
        };
        init();
    }, [step, interviewInitialized]);

    const startRecording = useCallback(async () => {
        try {
            setErrorMessage(null);
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
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Failed to start recording:", err);
            setErrorMessage("Could not access microphone. Please check permissions.");
        }
    }, []);

    const stopAndGetWav = useCallback((): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const mediaRecorder = mediaRecorderRef.current;
            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                reject(new Error("No active recording"));
                return;
            }

            mediaRecorder.onstop = async () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((t) => t.stop());
                    streamRef.current = null;
                }

                try {
                    const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
                    const audioCtx = new AudioContext();
                    const arrayBuffer = await blob.arrayBuffer();
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    const wavBuffer = encodeWav(audioBuffer);
                    const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
                    await audioCtx.close();
                    resolve(wavBlob);
                } catch (err) {
                    reject(err);
                }
            };

            mediaRecorder.stop();
        });
    }, []);

    const handleVoiceSampleRecord = async () => {
        if (isRecording) {
            setIsRecording(false);
            setIsProcessing(true);
            setErrorMessage(null);

            try {
                const wavBlob = await stopAndGetWav();
                const formData = new FormData();
                formData.append("audio", wavBlob, `voice_${step}_${Date.now()}.wav`);

                if (step === "voice_sample_1") {
                    // Enroll voice
                    const res = await fetch("/api/voice-id/enroll", {
                        method: "POST",
                        body: formData,
                    });
                    const data = await res.json();

                    if (!res.ok || !data.success) {
                        setErrorMessage(data.error ?? "Voice enrollment failed. Please try again.");
                        setIsProcessing(false);
                        return;
                    }

                    console.log("Voice enrolled successfully");
                    setIsProcessing(false);
                    setStep("voice_sample_2");
                } else if (step === "voice_sample_2") {
                    // Verify voice
                    const res = await fetch("/api/voice-id/verify", {
                        method: "POST",
                        body: formData,
                    });
                    const data = await res.json();

                    if (!res.ok) {
                        setErrorMessage(data.reason ?? "Voice verification failed. Please try again.");
                        setIsProcessing(false);
                        return;
                    }

                    if (data.verified) {
                        console.log("Voice verified, score:", data.score);
                        setIsProcessing(false);
                        setStep("ai_interview");
                    } else {
                        // Verification failed — update passages and loop back
                        console.log("Voice verification failed:", data.reason);
                        setVoiceRetryCount((c) => c + 1);
                        if (data.newPassage) {
                            setVoicePassage1(data.newPassage);
                            setVoicePassage2(DEFAULT_PASSAGE_2);
                        }
                        setErrorMessage(
                            data.reason ?? "Voice verification failed. Please re-record both samples."
                        );
                        setIsProcessing(false);
                        setStep("voice_sample_1");
                    }
                }
            } catch (err) {
                console.error("Voice sample processing failed:", err);
                setErrorMessage("An error occurred. Please try again.");
                setIsProcessing(false);
            }
        } else {
            await startRecording();
        }
    };

    const handleAIInterviewRecord = async () => {
        if (isRecording) {
            setIsRecording(false);
            setIsProcessing(true);
            setErrorMessage(null);

            try {
                const wavBlob = await stopAndGetWav();
                const formData = new FormData();
                formData.append("audio", wavBlob, `interview_${Date.now()}.wav`);
                exchangeCountRef.current += 1;
                formData.append("exchangeCount", String(exchangeCountRef.current));
                formData.append("conversation", JSON.stringify(aiMessages));

                const res = await fetch("/api/profile/setup/chat", {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();

                if (!res.ok) {
                    setErrorMessage(data.error ?? "Failed to process answer. Please try again.");
                    setIsProcessing(false);
                    return;
                }

                // Show transcription as user message, then AI response
                setAiMessages((prev) => [
                    ...prev,
                    { role: "user", text: data.transcription },
                    { role: "assistant", text: data.message },
                ]);

                if (data.done) {
                    // Brief delay so user can read the closing message
                    setTimeout(() => setStep("complete"), 2000);
                }

                setIsProcessing(false);
            } catch (err) {
                console.error("Interview answer processing failed:", err);
                setErrorMessage("An error occurred. Please try again.");
                setIsProcessing(false);
            }
        } else {
            await startRecording();
        }
    };

    const nextStep = () => {
        if (step === "intro") setStep("voice_sample_1");
    };

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="max-w-2xl mx-auto py-10 lg:py-20 px-4 lg:px-6 text-center">
            <AnimatePresence mode="wait">
                {step === "intro" && (
                    <motion.div
                        key="intro"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        <div className="w-24 h-24 mx-auto rounded-full bg-violet-500/10 flex items-center justify-center relative">
                            <FiUser className="w-10 h-10 text-violet-400" />
                            <div className="absolute inset-0 border border-violet-500/20 rounded-full animate-pulse" />
                        </div>

                        <div>
                            <h1 className="text-3xl font-light text-white mb-4">Let&apos;s Get to Know You</h1>
                            <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
                                To provide personalized coaching, I need to learn your voice patterns and understand your goals.
                            </p>
                        </div>

                        <button
                            onClick={nextStep}
                            className="bg-white text-black px-8 py-3 rounded-full font-medium hover:scale-105 transition-transform"
                        >
                            Start Setup
                        </button>
                    </motion.div>
                )}

                {(step === "voice_sample_1" || step === "voice_sample_2") && (
                    <motion.div
                        key={`voice_sample_${voiceRetryCount}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="glass p-6 lg:p-12 rounded-2xl lg:rounded-3xl border border-white/10 space-y-6 lg:space-y-10"
                    >
                        {/* Prompt */}
                        <div>
                            <h2 className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-4">
                                {step === "voice_sample_1" ? "Step 1: Voice Sample" : "Step 2: Voice Confirmation"}
                                {voiceRetryCount > 0 && (
                                    <span className="ml-2 text-amber-400">(Retry #{voiceRetryCount})</span>
                                )}
                            </h2>
                            <h1 className="text-xl lg:text-2xl font-light text-white leading-relaxed">
                                {step === "voice_sample_1"
                                    ? `Please read the following passage aloud at a natural, comfortable pace: "${voicePassage1}"`
                                    : `Please read this second passage aloud to confirm your voice profile: "${voicePassage2}"`}
                            </h1>
                        </div>

                        {/* Error message */}
                        {errorMessage && (
                            <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                                {errorMessage}
                            </div>
                        )}

                        {/* Recording Controls */}
                        <div className="flex flex-col items-center justify-center gap-6 min-h-[160px]">
                            {isProcessing ? (
                                <div className="space-y-4">
                                    <div className="flex gap-2 justify-center">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                                        {step === "voice_sample_1" ? "Enrolling Voice..." : "Verifying Voice..."}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={handleVoiceSampleRecord}
                                        className={cn(
                                            "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 relative",
                                            isRecording
                                                ? "bg-red-500/20 text-red-400 scale-110"
                                                : "bg-white/5 text-white hover:bg-white/10 hover:scale-105"
                                        )}
                                    >
                                        {isRecording && (
                                            <div className="absolute inset-0 rounded-full border border-red-500/50 animate-ping" />
                                        )}
                                        {isRecording ? (
                                            <div className="w-3 h-3 rounded-sm bg-current" />
                                        ) : (
                                            <FiMic className="w-8 h-8" />
                                        )}
                                    </button>
                                    {isRecording && (
                                        <div className="text-sm text-red-400 animate-pulse font-mono">
                                            {formatTime(recordingTime)}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}

                {step === "ai_interview" && (
                    <motion.div
                        key="ai_interview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="glass p-12 rounded-3xl border border-white/10 space-y-10"
                    >
                        <div>
                            <h2 className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-4">
                                Step 3: AI Interview
                            </h2>
                            <p className="text-base text-zinc-400">
                                Take a moment to reflect on each question. Your thoughtful responses will help create a personalized experience.
                            </p>
                        </div>

                        {/* Chat Messages */}
                        <div className="max-h-60 overflow-y-auto space-y-4 mb-6">
                            {aiMessages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "p-4 rounded-2xl text-left",
                                        msg.role === "assistant"
                                            ? "bg-violet-500/10 border border-violet-500/20 text-zinc-200"
                                            : "bg-white/5 border border-white/10 text-zinc-300 ml-8"
                                    )}
                                >
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                            ))}
                        </div>

                        {/* Error message */}
                        {errorMessage && (
                            <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                                {errorMessage}
                            </div>
                        )}

                        {/* Recording Controls */}
                        <div className="flex flex-col items-center justify-center gap-6">
                            {isProcessing ? (
                                <div className="space-y-4">
                                    <div className="flex gap-2 justify-center">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                                        Processing...
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={handleAIInterviewRecord}
                                        className={cn(
                                            "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 relative",
                                            isRecording
                                                ? "bg-red-500/20 text-red-400 scale-110"
                                                : "bg-white/5 text-white hover:bg-white/10 hover:scale-105"
                                        )}
                                    >
                                        {isRecording && (
                                            <div className="absolute inset-0 rounded-full border border-red-500/50 animate-ping" />
                                        )}
                                        {isRecording ? (
                                            <div className="w-3 h-3 rounded-sm bg-current" />
                                        ) : (
                                            <FiMic className="w-7 h-7" />
                                        )}
                                    </button>
                                    {isRecording ? (
                                        <div className="text-sm text-red-400 animate-pulse font-mono">
                                            {formatTime(recordingTime)}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-zinc-500">Tap to respond</p>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}

                {step === "complete" && (
                    <motion.div
                        key="complete"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass p-6 lg:p-12 rounded-2xl lg:rounded-3xl border border-emerald-500/20 text-center space-y-6"
                    >
                        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <FiCheck className="w-10 h-10 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-light text-white mb-2">Profile Created</h1>
                            <p className="text-zinc-400">Your voiceprint has been saved and your profile is ready.</p>
                        </div>

                        <div className="pt-6">
                            <button
                                onClick={() => onComplete?.()}
                                className="bg-white text-black px-8 py-3 rounded-full font-medium hover:scale-105 transition-transform"
                            >
                                Continue to Dashboard
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

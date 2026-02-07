"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiCheck, FiUser } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { encodeWav } from "@/lib/audio/encode-wav";

type SetupStep = "intro" | "voice_sample_1" | "voice_sample_2" | "ai_interview" | "complete";

export function ProfileSetupView() {
    const [step, setStep] = useState<SetupStep>("intro");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    // AI Interview state
    const [aiMessages, setAiMessages] = useState<Array<{ role: "assistant" | "user", text: string }>>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [assistantId, setAssistantId] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const INTERVIEW_PROMPTS = [
        "What brings you to Reflectif? What do you hope to learn about yourself?",
        "Think about your closest relationships. What communication patterns do you notice?",
        "What emotional triggers do you recognize in yourself? When do you feel most reactive?",
        "What are your current goals? What challenges are you facing right now?",
        "How would you describe your typical stress responses or coping mechanisms?"
    ];

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
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Failed to start recording:", err);
        }
    }, []);

    const stopRecording = useCallback(async (endpoint: string) => {
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

                // Convert to WAV
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
                const audioCtx = new AudioContext();
                const arrayBuffer = await blob.arrayBuffer();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                const wavBuffer = encodeWav(audioBuffer);
                const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
                await audioCtx.close();

                // Upload
                try {
                    setIsProcessing(true);
                    const formData = new FormData();
                    formData.append("audio", wavBlob, `profile_${step}_${Date.now()}.wav`);

                    const res = await fetch(endpoint, {
                        method: "POST",
                        body: formData,
                    });
                    const data = await res.json();
                    console.log("Upload response:", data);

                    // Move to next step after processing
                    setTimeout(() => {
                        setIsProcessing(false);
                        if (step === "voice_sample_1") setStep("voice_sample_2");
                        else if (step === "voice_sample_2") {
                            setStep("ai_interview");
                            setAiMessages([{ role: "assistant", text: INTERVIEW_PROMPTS[0] }]);
                        }
                    }, 1500);
                } catch (err) {
                    console.error("Upload failed:", err);
                    setIsProcessing(false);
                } finally {
                    resolve();
                }
            };

            mediaRecorder.stop();
        });
    }, [step]);

    const handleVoiceSampleRecord = async () => {
        if (isRecording) {
            setIsRecording(false);

            // Stop recording and cleanup
            const mediaRecorder = mediaRecorderRef.current;
            if (!mediaRecorder || mediaRecorder.state === "inactive") return;

            mediaRecorder.onstop = async () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((t) => t.stop());
                    streamRef.current = null;
                }

                // Just log completion and move to next step
                setIsProcessing(true);
                console.log(`✓ ${step} completed`);

                setTimeout(() => {
                    setIsProcessing(false);
                    if (step === "voice_sample_1") {
                        console.log("Moving to Step 2...");
                        setStep("voice_sample_2");
                    } else if (step === "voice_sample_2") {
                        console.log("Moving to AI Interview...");
                        setStep("ai_interview");
                        setAiMessages([{ role: "assistant", text: INTERVIEW_PROMPTS[0] }]);
                    }
                }, 1500);
            };

            mediaRecorder.stop();
        } else {
            await startRecording();
        }
    };

    const handleAIInterviewRecord = async () => {
        if (isRecording) {
            setIsRecording(false);
            const mediaRecorder = mediaRecorderRef.current;
            if (!mediaRecorder || mediaRecorder.state === "inactive") return;

            mediaRecorder.onstop = async () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((t) => t.stop());
                    streamRef.current = null;
                }

                // Convert to WAV (could send to chat API for transcription if needed)
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });

                // For now, just simulate AI response
                // TODO: Integrate with /api/chat using audio transcription
                setIsProcessing(true);

                // Mock user message
                const userMessage = "User's spoken answer...";
                setAiMessages(prev => [...prev, { role: "user", text: userMessage }]);

                // Simulate AI processing
                setTimeout(() => {
                    const nextQuestion = currentQuestion + 1;
                    if (nextQuestion < INTERVIEW_PROMPTS.length) {
                        setAiMessages(prev => [...prev, { role: "assistant", text: INTERVIEW_PROMPTS[nextQuestion] }]);
                        setCurrentQuestion(nextQuestion);
                    } else {
                        setStep("complete");
                    }
                    setIsProcessing(false);
                }, 2000);
            };

            mediaRecorder.stop();
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
                            <h1 className="text-3xl font-light text-white mb-4">Let's Get to Know You</h1>
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
                        key="voice_sample"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="glass p-6 lg:p-12 rounded-2xl lg:rounded-3xl border border-white/10 space-y-6 lg:space-y-10"
                    >
                        {/* Prompt */}
                        <div>
                            <h2 className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-4">
                                {step === "voice_sample_1" ? "Step 1: Voice Sample" : "Step 2: Voice Confirmation"}
                            </h2>
                            <h1 className="text-xl lg:text-2xl font-light text-white leading-relaxed">
                                {step === "voice_sample_1"
                                    ? "Please read the following passage aloud at a natural, comfortable pace: \"I understand that emotional intelligence is a skill that can be developed through practice and self-awareness. By recording my conversations and reflecting on my communication patterns, I can better understand my emotional triggers, strengthen my relationships, and grow as a more effective communicator. I give my full permission for Reflectif to analyze my speech patterns, emotional responses, and conversational dynamics to help me on this journey of personal growth and emotional development. I believe that understanding myself better is the first step toward meaningful change.\""
                                    : "Please read this second passage aloud to confirm your voice profile: \"Communication is at the heart of every meaningful relationship in my life. Whether I'm talking with family members, close friends, or professional colleagues, understanding my emotional state and how it affects my words can transform these interactions in powerful ways. I'm ready to explore my communication style with honesty, curiosity, and an open mind, recognizing that every conversation is an opportunity to learn more about myself and connect more authentically with the people who matter most. This is my personal commitment to growth and self-discovery through Reflectif.\""}
                            </h1>
                        </div>

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
                                        Saving Voice Sample...
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
                            <a href="/" className="text-sm text-zinc-300 hover:text-white underline underline-offset-4">
                                Return to Dashboard
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

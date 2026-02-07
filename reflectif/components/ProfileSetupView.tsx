"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiCheck, FiUser, FiActivity } from "react-icons/fi";
import { cn } from "@/lib/utils";

type SetupStep = "intro" | "voice_calibration" | "goals" | "relationships" | "triggers" | "complete";

export function ProfileSetupView() {
    const [step, setStep] = useState<SetupStep>("intro");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleStartRecording = () => {
        setIsRecording(true);
        // Simulate recording duration
        setTimeout(() => {
            setIsRecording(false);
            setIsProcessing(true);

            // Simulate processing
            setTimeout(() => {
                setIsProcessing(false);
                if (step === "voice_calibration") setStep("goals");
                else if (step === "goals") setStep("relationships");
                else if (step === "relationships") setStep("triggers");
                else if (step === "triggers") setStep("complete");
            }, 1500);
        }, 4000);
    };

    const nextStep = () => {
        if (step === "intro") setStep("voice_calibration");
    };

    return (
        <div className="max-w-2xl mx-auto py-20 px-6 text-center">

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

                {(step === "voice_calibration" || step === "goals" || step === "relationships" || step === "triggers") && (
                    <motion.div
                        key="interview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="glass p-12 rounded-3xl border border-white/10 space-y-10"
                    >
                        {/* Prompt */}
                        <div>
                            <h2 className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-4">
                                {step === "voice_calibration" && "Step 1: Voice Calibration"}
                                {step === "goals" && "Step 2: Goals & Challenges"}
                                {step === "relationships" && "Step 3: Key Relationships"}
                                {step === "triggers" && "Step 4: Known Triggers"}
                            </h2>
                            <h1 className="text-2xl font-light text-white leading-relaxed">
                                {step === "voice_calibration"
                                    ? "Please read the following aloud: \"I consent to Reflectif analyzing my speech patterns for emotional intelligence training.\""
                                    : "In your own words, what is the biggest communication challenge you face right now?"}
                            </h1>
                        </div>

                        {/* Interaction Area */}
                        <div className="flex flex-col items-center justify-center gap-6 min-h-[160px]">
                            {isProcessing ? (
                                <div className="space-y-4">
                                    <div className="flex gap-2 justify-center">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                                        {step === "voice_calibration" ? "Analyzing Voiceprint..." : "Saving Profile..."}
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={handleStartRecording}
                                    disabled={isRecording}
                                    className={cn(
                                        "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 relative",
                                        isRecording
                                            ? "bg-red-500/20 text-red-400 scale-110"
                                            : "bg-white/5 text-white hover:bg-white/10 hover:scale-105"
                                    )}
                                >
                                    {isRecording ? (
                                        <>
                                            <div className="absolute inset-0 rounded-full border border-red-500/50 animate-ping" />
                                            <div className="w-3 h-3 rounded-sm bg-current" />
                                        </>
                                    ) : (
                                        <FiMic className="w-8 h-8" />
                                    )}
                                </button>
                            )}

                            {isRecording && (
                                <div className="text-xs text-red-400 animate-pulse font-mono bg-red-500/10 px-3 py-1 rounded-full">
                                    Recording...
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {step === "complete" && (
                    <motion.div
                        key="complete"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass p-12 rounded-3xl border border-emerald-500/20 text-center space-y-6"
                    >
                        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <FiCheck className="w-10 h-10 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-light text-white mb-2">Profile Created</h1>
                            <p className="text-zinc-400">Your voiceprint has been saved and your goals are logged.</p>
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

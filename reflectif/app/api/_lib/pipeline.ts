import {
  transcribeWithDiarization,
  getSpeakerSegments,
} from "@/app/api/_lib/assemblyai";
import { extractAllSpeakerAudio } from "@/app/api/_lib/audio-utils";
import { extractEmbedding, cosineSimilarity } from "@/app/api/_lib/speaker-id";
import { analyzeProsody } from "@/app/api/_lib/hume";

export type { Utterance } from "@/app/api/_lib/hume";

import type { Utterance } from "@/app/api/_lib/hume";

const SPEAKER_MATCH_THRESHOLD = 0.25;

export interface SpeakerAnalysis {
  isUser: boolean;
  displayName: string;
  utterances: Utterance[];
}

export interface ConversationAnalysis {
  speakers: SpeakerAnalysis[];
}

/**
 * Full conversation processing pipeline:
 * 1. AssemblyAI — transcription + speaker diarization (who spoke when)
 * 2. ffmpeg — extract audio segments per speaker
 * 3. Speaker-ID service — extract embedding, cosine similarity against user's stored embedding
 * 4. Hume — transcription + 48 emotion scores per utterance (per speaker audio)
 */
export async function processConversation(
  audioBuffer: Buffer,
  filename: string,
  userEmbedding?: number[] | null
): Promise<ConversationAnalysis> {
  // Step 1: Get diarized transcript from AssemblyAI
  console.log("[pipeline] Starting AssemblyAI transcription with diarization...");
  const transcript = await transcribeWithDiarization(audioBuffer, filename);

  if (transcript.speakers.length === 0) {
    throw new Error("No speakers detected in audio");
  }

  // Step 2: Extract audio segments per speaker using ffmpeg
  console.log("[pipeline] Extracting audio per speaker...");
  const speakerSegments = getSpeakerSegments(transcript);
  const speakerAudio = await extractAllSpeakerAudio(audioBuffer, speakerSegments);

  if (speakerAudio.size === 0) {
    throw new Error("Failed to extract any speaker audio");
  }

  // Step 3: For each speaker — identify and analyze emotions
  console.log("[pipeline] Analyzing speakers...");
  let letterIndex = 0;
  const results = await Promise.all(
    transcript.speakers.map(async (speaker) => {
      const audio = speakerAudio.get(speaker);
      if (!audio) {
        return { speaker, similarity: 0, utterances: [] as Utterance[] };
      }

      // Extract embedding and compare against user's enrolled voice
      let similarity = 0;
      try {
        if (userEmbedding) {
          const embedding = await extractEmbedding(audio);
          similarity = cosineSimilarity(embedding, userEmbedding);
          console.log(`[pipeline] Speaker ${speaker}: similarity=${similarity.toFixed(4)}`);
        }
      } catch (err) {
        console.warn(`[pipeline] Speaker-ID failed for ${speaker}:`, err);
        // speaker-id service unavailable or audio too short
      }

      // Hume: transcription + 48 emotion scores per utterance
      let utterances: Utterance[] = [];
      try {
        utterances = await analyzeProsody(audio, `${speaker}.wav`);
      } catch (err) {
        console.warn(`[pipeline] Hume analysis failed for ${speaker}:`, err);
        // Non-fatal - we still have the transcript from AssemblyAI
        // Convert AssemblyAI utterances to our format (without emotions)
        utterances = transcript.utterances
          .filter((u) => u.speaker === speaker)
          .map((u) => ({
            text: u.text,
            start: u.start / 1000, // Convert ms to seconds
            end: u.end / 1000,
            emotions: [],
          }));
      }

      return { speaker, similarity, utterances };
    })
  );

  // Step 4: Label speakers - highest similarity above threshold gets "You", others get Speaker A/B/C
  const bestIdx = userEmbedding
    ? results.reduce(
        (best, s, i) => (s.similarity > results[best].similarity ? i : best),
        0
      )
    : -1;
  const bestIsUser =
    bestIdx >= 0 && results[bestIdx].similarity >= SPEAKER_MATCH_THRESHOLD;

  const labeled: SpeakerAnalysis[] = results.map((s, i) => {
    const isUser = bestIsUser && i === bestIdx;
    return {
      isUser,
      displayName: isUser
        ? "You"
        : `Speaker ${String.fromCharCode(65 + letterIndex++)}`,
      utterances: s.utterances,
    };
  });

  console.log(`[pipeline] Complete: ${labeled.length} speakers processed`);
  return { speakers: labeled };
}

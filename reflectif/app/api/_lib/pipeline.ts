import {
  extractSpeakers,
  pollSpeakerJob,
  downloadSpeakerAudio,
} from "@/app/api/_lib/audiopod";
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
 * 1. AudioPod — split speakers into separate audio tracks
 * 2. Speaker-ID service — extract embedding, cosine similarity against user's stored embedding
 * 3. Hume — transcription + 48 emotion scores per utterance
 */
export async function processConversation(
  audioBuffer: Buffer,
  filename: string,
  userEmbedding?: number[] | null
): Promise<ConversationAnalysis> {
  // Step 1: Split speakers via AudioPod
  const { id: jobId } = await extractSpeakers(audioBuffer, filename);
  const extraction = await pollSpeakerJob(jobId);

  const speakers = extraction.result.speakers;
  if (!speakers?.length) {
    throw new Error("No speakers detected in audio");
  }

  // Step 2: For each speaker — download, identify, analyze
  let letterIndex = 0;
  const results = await Promise.all(
    speakers.map(async (speaker) => {
      let audio: Buffer;
      try {
        audio = await downloadSpeakerAudio(speaker.download_url);
      } catch {
        return { similarity: 0, utterances: [] as Utterance[] };
      }

      // Extract embedding and compare against user's enrolled voice
      let similarity = 0;
      try {
        if (userEmbedding) {
          const embedding = await extractEmbedding(audio);
          similarity = cosineSimilarity(embedding, userEmbedding);
          console.log(`Speaker ${speaker.label}: similarity=${similarity.toFixed(4)}`);
        }
      } catch {
        // speaker-id service unavailable or audio too short
      }

      // Hume: transcription + 48 emotion scores per utterance
      let utterances: Utterance[] = [];
      try {
        utterances = await analyzeProsody(audio, `${speaker.label}.wav`);
      } catch {
        // Non-fatal
      }

      return { similarity, utterances };
    })
  );

  // Label speakers: highest similarity above threshold gets "You", others get Speaker A/B/C
  const bestIdx = userEmbedding
    ? results.reduce((best, s, i) => (s.similarity > results[best].similarity ? i : best), 0)
    : -1;
  const bestIsUser = bestIdx >= 0 && results[bestIdx].similarity >= SPEAKER_MATCH_THRESHOLD;

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

  return { speakers: labeled };
}

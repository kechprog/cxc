import {
  extractSpeakers,
  pollSpeakerJob,
  downloadSpeakerAudio,
} from "@/app/api/_lib/audiopod";
import { verifyAudio } from "@/app/api/_lib/azure-speaker";
import { getProfileId } from "@/app/api/_lib/voice-store";
import { analyzeProsody } from "@/app/api/_lib/hume";

export type { Utterance } from "@/app/api/_lib/hume";

import type { Utterance } from "@/app/api/_lib/hume";

export interface SpeakerAnalysis {
  displayName: string;
  isUser: boolean;
  utterances: Utterance[];
}

export interface ConversationAnalysis {
  speakers: SpeakerAnalysis[];
}

/**
 * Full conversation processing pipeline:
 * 1. AudioPod — split speakers into separate audio tracks
 * 2. Azure Speaker Recognition — identify which speaker is the user
 * 3. Hume — transcription + 48 emotion scores per utterance
 */
export async function processConversation(
  audioBuffer: Buffer,
  filename: string
): Promise<ConversationAnalysis> {
  const profileId = getProfileId();
  if (!profileId) {
    throw new Error("No voice profile found. Run /api/voice-id/setup first.");
  }

  // Step 1: Split speakers via AudioPod
  const { id: jobId } = await extractSpeakers(audioBuffer, filename);
  const extraction = await pollSpeakerJob(jobId);

  const speakers = extraction.result.speakers;
  if (!speakers?.length) {
    throw new Error("No speakers detected in audio");
  }

  // Step 2: For each speaker — download, identify, analyze
  const results = await Promise.all(
    speakers.map(async (speaker) => {
      const audio = await downloadSpeakerAudio(speaker.download_url);

      // Identify user via Azure voice profile
      let verifyScore = -1;
      try {
        const v = await verifyAudio(profileId, audio);
        verifyScore = v.result === "Accept" ? v.score : -1;
      } catch {
        // Too short or bad audio — not the user
      }

      // Hume: transcription + 48 emotion scores per utterance
      let utterances: Utterance[] = [];
      try {
        utterances = await analyzeProsody(audio, `${speaker.label}.wav`);
      } catch {
        // Non-fatal
      }

      return { verifyScore, utterances };
    })
  );

  // Pick the single best user match (highest score among accepted)
  let bestUserIdx = -1;
  let bestScore = -1;
  for (let i = 0; i < results.length; i++) {
    if (results[i].verifyScore > bestScore) {
      bestScore = results[i].verifyScore;
      bestUserIdx = i;
    }
  }

  // Label: "You" for the best match, "Speaker A/B/C" for others
  let letterIndex = 0;
  const labeled: SpeakerAnalysis[] = results.map((s, i) => ({
    displayName:
      i === bestUserIdx && bestScore > 0
        ? "You"
        : `Speaker ${String.fromCharCode(65 + letterIndex++)}`,
    isUser: i === bestUserIdx && bestScore > 0,
    utterances: s.utterances,
  }));

  return { speakers: labeled };
}

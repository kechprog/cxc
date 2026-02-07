import {
  extractSpeakers,
  pollSpeakerJob,
  downloadSpeakerAudio,
} from "@/app/api/_lib/audiopod";
import { matchSpeaker, enrollSpeaker } from "@/app/api/_lib/speaker-id";
import { analyzeProsody } from "@/app/api/_lib/hume";

export type { Utterance } from "@/app/api/_lib/hume";

import type { Utterance } from "@/app/api/_lib/hume";

export interface SpeakerAnalysis {
  voiceId: string | null;
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
 * 2. Speaker-ID service — match each speaker against known voices
 * 3. Hume — transcription + 48 emotion scores per utterance
 */
export async function processConversation(
  audioBuffer: Buffer,
  filename: string,
  userVoiceId?: string | null
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
        return { voiceId: null, utterances: [] as Utterance[] };
      }

      // Match against known voices, auto-enroll if new
      let voiceId: string | null = null;
      try {
        const m = await matchSpeaker(audio);
        voiceId = m.voiceId;
        if (!voiceId) {
          voiceId = await enrollSpeaker(audio);
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

      return { voiceId, utterances };
    })
  );

  // Label speakers: user gets "You", others get Speaker A/B/C
  const labeled: SpeakerAnalysis[] = results.map((s) => {
    const isUser = !!(userVoiceId && s.voiceId === userVoiceId);
    return {
      voiceId: s.voiceId,
      isUser,
      displayName: isUser
        ? "You"
        : `Speaker ${String.fromCharCode(65 + letterIndex++)}`,
      utterances: s.utterances,
    };
  });

  return { speakers: labeled };
}

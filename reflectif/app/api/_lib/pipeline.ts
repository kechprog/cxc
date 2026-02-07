import {
  extractSpeakers,
  pollSpeakerJob,
  downloadSpeakerAudio,
} from "@/app/api/_lib/audiopod";
import { verifyAudio } from "@/app/api/_lib/azure-speaker";
import { getProfileId } from "@/app/api/_lib/voice-store";
import { analyzeProsody, type Utterance } from "@/app/api/_lib/hume";

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

  if (extraction.status === "FAILED") {
    throw new Error("Speaker extraction failed");
  }

  // Step 2: For each speaker — download, identify, analyze
  const speakers = await Promise.all(
    extraction.result.speakers.map(async (speaker) => {
      const audio = await downloadSpeakerAudio(speaker.download_url);

      // Identify user via Azure voice profile
      let isUser = false;
      try {
        const v = await verifyAudio(profileId, audio);
        isUser = v.result === "Accept";
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

      return { isUser, utterances };
    })
  );

  // Label: "You" for the user, "Speaker A/B/C" for others
  let letterIndex = 0;
  const labeled = speakers.map((s) => ({
    displayName: s.isUser
      ? "You"
      : `Speaker ${String.fromCharCode(65 + letterIndex++)}`,
    isUser: s.isUser,
    utterances: s.utterances,
  }));

  return { speakers: labeled };
}

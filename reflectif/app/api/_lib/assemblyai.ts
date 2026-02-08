import { AssemblyAI } from "assemblyai";

function getClient(): AssemblyAI {
  const apiKey = process.env.ASSEMBLY_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ASSEMBLY_AI_API_KEY environment variable");
  }
  return new AssemblyAI({ apiKey });
}

export interface DiarizedUtterance {
  speaker: string;
  text: string;
  start: number; // milliseconds
  end: number;   // milliseconds
}

export interface DiarizedTranscript {
  speakers: string[];
  utterances: DiarizedUtterance[];
}

/**
 * Transcribe audio with speaker diarization using AssemblyAI.
 * Returns transcript grouped by speaker turns with timestamps.
 */
export async function transcribeWithDiarization(
  audioBuffer: Buffer,
  filename: string
): Promise<DiarizedTranscript> {
  const client = getClient();

  console.log(`[assemblyai] Starting transcription with diarization for ${filename}`);

  // Upload and transcribe with speaker labels
  const transcript = await client.transcripts.transcribe({
    audio: audioBuffer,
    speaker_labels: true,
    speech_models: ["universal"],
  });

  if (transcript.status === "error") {
    throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
  }

  // Extract unique speakers
  const speakerSet = new Set<string>();
  const utterances: DiarizedUtterance[] = [];

  if (transcript.utterances) {
    for (const utterance of transcript.utterances) {
      const speaker = utterance.speaker ?? "Unknown";
      speakerSet.add(speaker);
      utterances.push({
        speaker,
        text: utterance.text,
        start: utterance.start,
        end: utterance.end,
      });
    }
  }

  const speakers = Array.from(speakerSet).sort();
  console.log(`[assemblyai] Completed: ${speakers.length} speakers, ${utterances.length} utterances`);

  return { speakers, utterances };
}

/**
 * Get time segments for each speaker from the diarized transcript.
 * Used for extracting audio per speaker.
 */
export function getSpeakerSegments(
  transcript: DiarizedTranscript
): Map<string, { start: number; end: number }[]> {
  const segments = new Map<string, { start: number; end: number }[]>();

  for (const speaker of transcript.speakers) {
    segments.set(speaker, []);
  }

  for (const utterance of transcript.utterances) {
    const speakerSegments = segments.get(utterance.speaker);
    if (speakerSegments) {
      speakerSegments.push({
        start: utterance.start / 1000, // Convert to seconds for ffmpeg
        end: utterance.end / 1000,
      });
    }
  }

  return segments;
}

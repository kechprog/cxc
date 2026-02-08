import { spawn } from "child_process";
import { writeFile, unlink, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";

interface TimeSegment {
  start: number; // seconds
  end: number;   // seconds
}

/**
 * Extract audio segments for a speaker and concatenate into a single buffer.
 * Uses ffmpeg to extract and merge segments.
 */
export async function extractSpeakerAudio(
  audioBuffer: Buffer,
  segments: TimeSegment[]
): Promise<Buffer> {
  if (segments.length === 0) {
    throw new Error("No segments provided");
  }

  const workDir = join(tmpdir(), `reflectif-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  const inputPath = join(workDir, "input.wav");
  const outputPath = join(workDir, "output.wav");

  try {
    // Write input audio to temp file
    await writeFile(inputPath, audioBuffer);

    if (segments.length === 1) {
      // Single segment - simple extraction
      await extractSegment(inputPath, outputPath, segments[0].start, segments[0].end);
    } else {
      // Multiple segments - extract each and concatenate
      const segmentPaths: string[] = [];

      for (let i = 0; i < segments.length; i++) {
        const segPath = join(workDir, `seg_${i}.wav`);
        await extractSegment(inputPath, segPath, segments[i].start, segments[i].end);
        segmentPaths.push(segPath);
      }

      // Concatenate all segments
      await concatenateAudio(segmentPaths, outputPath);

      // Clean up segment files
      for (const segPath of segmentPaths) {
        await unlink(segPath).catch(() => {});
      }
    }

    // Read the output file
    const result = await readFile(outputPath);
    return result;
  } finally {
    // Clean up temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    // Remove work directory (ignore errors if not empty)
    await unlink(workDir).catch(() => {});
  }
}

/**
 * Extract a single segment from audio file using ffmpeg.
 */
function extractSegment(
  inputPath: string,
  outputPath: string,
  start: number,
  end: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const duration = end - start;
    const args = [
      "-y",
      "-ss", start.toFixed(3),
      "-i", inputPath,
      "-t", duration.toFixed(3),
      "-c", "copy",
      outputPath,
    ];

    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg extract failed (${code}): ${stderr.slice(-500)}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`ffmpeg spawn error: ${err.message}`));
    });
  });
}

/**
 * Concatenate multiple audio files using ffmpeg.
 */
function concatenateAudio(inputPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Build filter complex for concatenation
    const inputs: string[] = [];
    const filterParts: string[] = [];

    for (let i = 0; i < inputPaths.length; i++) {
      inputs.push("-i", inputPaths[i]);
      filterParts.push(`[${i}:a]`);
    }

    const filterComplex = `${filterParts.join("")}concat=n=${inputPaths.length}:v=0:a=1[out]`;

    const args = [
      "-y",
      ...inputs,
      "-filter_complex", filterComplex,
      "-map", "[out]",
      outputPath,
    ];

    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg concat failed (${code}): ${stderr.slice(-500)}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`ffmpeg spawn error: ${err.message}`));
    });
  });
}

/**
 * Extract audio for all speakers from a diarized transcript.
 * Returns a map of speaker label to audio buffer.
 */
export async function extractAllSpeakerAudio(
  audioBuffer: Buffer,
  speakerSegments: Map<string, TimeSegment[]>
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>();

  const entries = Array.from(speakerSegments.entries());

  // Process speakers in parallel
  await Promise.all(
    entries.map(async ([speaker, segments]) => {
      if (segments.length === 0) return;

      try {
        const audio = await extractSpeakerAudio(audioBuffer, segments);
        results.set(speaker, audio);
        console.log(`[audio-utils] Extracted ${segments.length} segments for speaker ${speaker}`);
      } catch (err) {
        console.error(`[audio-utils] Failed to extract audio for speaker ${speaker}:`, err);
      }
    })
  );

  return results;
}

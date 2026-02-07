const API_BASE = "https://api.audiopod.ai";

function getApiKey(): string {
  const key = process.env.AUDIOPOD_API_KEY;
  if (!key) throw new Error("Missing AUDIOPOD_API_KEY environment variable");
  return key;
}

function headers(): Record<string, string> {
  return { "X-API-Key": getApiKey() };
}

export interface Speaker {
  label: string;
  download_url: string;
}

export async function extractSpeakers(
  audioBuffer: Buffer,
  filename: string,
  numSpeakers?: number
): Promise<{ id: number }> {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(audioBuffer)]), filename);
  if (numSpeakers != null) formData.append("num_speakers", String(numSpeakers));

  const res = await fetch(`${API_BASE}/api/v1/speaker/extract`, {
    method: "POST",
    headers: headers(),
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AudioPod extractSpeakers failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function pollSpeakerJob(
  jobId: number,
  intervalMs = 3000,
  maxAttempts = 120
): Promise<{ status: string; result: { speakers: Speaker[] } }> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${API_BASE}/api/v1/speaker/jobs/${jobId}`, {
      headers: headers(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `AudioPod pollSpeakerJob failed (${res.status}): ${body}`
      );
    }
    const job = await res.json();
    if (job.status === "FAILED") {
      throw new Error(`AudioPod speaker extraction failed: ${job.error ?? ""}`);
    }
    if (job.status === "COMPLETED") return job;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("AudioPod speaker extraction timed out");
}

export async function downloadSpeakerAudio(
  downloadUrl: string
): Promise<Buffer> {
  // Only send API key to AudioPod's own domain
  const isAudioPodUrl = downloadUrl.startsWith(API_BASE);
  const res = await fetch(downloadUrl, isAudioPodUrl ? { headers: headers() } : {});
  if (!res.ok) {
    throw new Error(`AudioPod download failed (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

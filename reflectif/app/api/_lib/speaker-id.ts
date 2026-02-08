const SPEAKER_ID_URL = (process.env.SPEAKER_ID_URL ?? "http://localhost:8100").replace(/\/+$/, "");

export async function extractEmbedding(
  audioBuffer: Buffer
): Promise<number[]> {
  const formData = new FormData();
  formData.append(
    "audio",
    new Blob([new Uint8Array(audioBuffer)]),
    "audio.wav"
  );

  const res = await fetch(`${SPEAKER_ID_URL}/embed`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`speaker-id embed failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.embedding as number[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

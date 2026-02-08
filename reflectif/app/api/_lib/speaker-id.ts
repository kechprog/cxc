// NOTE: Trimming silence from speaker audio before match/enroll improves scores
// (0.57 → 0.66 in testing). Worth adding if score accuracy becomes an issue.
const SPEAKER_ID_URL = (process.env.SPEAKER_ID_URL ?? "http://localhost:8100").replace(/\/+$/, "");

export async function matchSpeaker(
  audioBuffer: Buffer
): Promise<{ voiceId: string | null; score: number }> {
  const formData = new FormData();
  formData.append(
    "audio",
    new Blob([new Uint8Array(audioBuffer)]),
    "speaker.wav"
  );

  const res = await fetch(`${SPEAKER_ID_URL}/match`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`speaker-id match failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return {
    voiceId: (data.voice_id as string) ?? null,
    score: data.score as number,
  };
}

export async function enrollSpeaker(audioBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append(
    "audio",
    new Blob([new Uint8Array(audioBuffer)]),
    "enroll.wav"
  );

  const res = await fetch(`${SPEAKER_ID_URL}/enroll`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`speaker-id enroll failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.voice_id as string;
}

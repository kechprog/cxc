const API_BASE = "https://api.hume.ai/v0/batch/jobs";

function getApiKey(): string {
  const key = process.env.HUME_API_KEY;
  if (!key) throw new Error("Missing HUME_API_KEY environment variable");
  return key;
}

export interface Utterance {
  text: string;
  start: number;
  end: number;
  emotions: { name: string; score: number }[];
}

export async function analyzeProsody(
  audioBuffer: Buffer,
  filename: string
): Promise<Utterance[]> {
  // Submit job
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(audioBuffer)]), filename);
  formData.append(
    "json",
    JSON.stringify({
      models: {
        prosody: { granularity: "utterance" },
      },
      transcription: { language: null },
    })
  );

  const submitRes = await fetch(API_BASE, {
    method: "POST",
    headers: { "X-Hume-Api-Key": getApiKey() },
    body: formData,
  });
  if (!submitRes.ok) {
    const body = await submitRes.text();
    throw new Error(`Hume submit failed (${submitRes.status}): ${body}`);
  }
  const { job_id } = await submitRes.json();
  if (!job_id) throw new Error("No job_id in Hume submit response");

  // Poll until done
  const h = { "X-Hume-Api-Key": getApiKey() };
  let completed = false;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${API_BASE}/${job_id}`, { headers: h });
    if (!statusRes.ok) {
      const body = await statusRes.text();
      throw new Error(`Hume poll failed (${statusRes.status}): ${body}`);
    }
    const job = await statusRes.json();
    const state = job.state?.status;
    if (state === "COMPLETED") { completed = true; break; }
    if (state === "FAILED")
      throw new Error(`Hume job failed: ${job.state?.message ?? ""}`);
  }
  if (!completed) throw new Error("Hume job timed out");

  // Fetch predictions and flatten to utterances
  const predRes = await fetch(`${API_BASE}/${job_id}/predictions`, {
    headers: h,
  });
  if (!predRes.ok) {
    const body = await predRes.text();
    throw new Error(`Hume predictions failed (${predRes.status}): ${body}`);
  }
  const data = await predRes.json();
  const prosody = data[0]?.results?.predictions?.[0]?.models?.prosody;
  if (!prosody) throw new Error("No prosody predictions in Hume response");

  // Flatten grouped_predictions → Utterance[]
  const utterances: Utterance[] = [];
  for (const group of prosody.grouped_predictions ?? []) {
    for (const pred of group.predictions ?? []) {
      utterances.push({
        text: pred.text,
        start: pred.time?.begin ?? 0,
        end: pred.time?.end ?? 0,
        emotions: pred.emotions ?? [],
      });
    }
  }
  return utterances;
}

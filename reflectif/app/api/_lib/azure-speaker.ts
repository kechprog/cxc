const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;

function getBaseUrl(): string {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    throw new Error(
      "Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION environment variables"
    );
  }
  return `https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/speaker-recognition/verification/text-independent`;
}

function headers(contentType = "application/json"): Record<string, string> {
  return {
    "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY!,
    "Content-Type": contentType,
  };
}

export async function createProfile(): Promise<string> {
  const res = await fetch(`${getBaseUrl()}/profiles?api-version=2021-09-05`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ locale: "en-us" }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Azure createProfile failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.profileId as string;
}

export async function enrollAudio(
  profileId: string,
  audioBuffer: Buffer
): Promise<{ enrollmentStatus: string; remainingSpeechLength: number }> {
  const res = await fetch(
    `${getBaseUrl()}/profiles/${profileId}/enrollments?api-version=2021-09-05`,
    {
      method: "POST",
      headers: headers("audio/wav"),
      body: new Uint8Array(audioBuffer),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Azure enrollAudio failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return {
    enrollmentStatus: data.enrollmentStatus as string,
    remainingSpeechLength: (data.remainingEnrollmentsSpeechLengthInSec ?? 0) as number,
  };
}

export async function verifyAudio(
  profileId: string,
  audioBuffer: Buffer
): Promise<{ result: string; score: number }> {
  const res = await fetch(
    `${getBaseUrl()}/profiles/${profileId}:verify?api-version=2021-09-05`,
    {
      method: "POST",
      headers: headers("audio/wav"),
      body: new Uint8Array(audioBuffer),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Azure verifyAudio failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return {
    result: data.recognitionResult as string,
    score: data.score as number,
  };
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY environment variable");
  return key;
}

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

export async function generateStructuredJson<T>(
  prompt: string,
  schema: Record<string, unknown>,
  model = DEFAULT_MODEL
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(
      `${API_BASE}/${model}:generateContent?key=${getApiKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      }
    );

    if (res.status === 503 && attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_MS * 2 ** attempt;
      console.warn(`[Gemini] 503 model overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini request failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No text in Gemini response");

    return JSON.parse(text) as T;
  }

  throw new Error("Gemini request failed: max retries exceeded (503)");
}

// ── Multimodal helpers (audio + text → structured JSON) ──────────

async function generateMultimodalJson<T>(
  textParts: string[],
  audioBuffer: Buffer,
  schema: Record<string, unknown>,
  model = DEFAULT_MODEL
): Promise<T> {
  const audioBase64 = audioBuffer.toString("base64");

  const parts: Record<string, unknown>[] = textParts.map((t) => ({ text: t }));
  parts.push({
    inline_data: { mime_type: "audio/wav", data: audioBase64 },
  });

  const res = await fetch(
    `${API_BASE}/${model}:generateContent?key=${getApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini multimodal request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text in Gemini multimodal response");

  return JSON.parse(text) as T;
}

// ── Voice sample quality evaluation ──────────────────────────────

type VoiceQualityResult = {
  isAcceptable: boolean;
  reason: string;
  newPassage: string | null;
};

const voiceQualitySchema = {
  type: "OBJECT",
  properties: {
    isAcceptable: {
      type: "BOOLEAN",
      description:
        "True if the audio contains intelligible speech of at least a few seconds. Hesitations, stumbles, and imperfect delivery are perfectly fine.",
    },
    reason: {
      type: "STRING",
      description:
        "Brief explanation of why the sample was accepted or rejected.",
    },
    newPassage: {
      type: "STRING",
      nullable: true,
      description:
        "If rejected, a new ~60-word reading passage for the user to read aloud. Null if accepted.",
    },
  },
  required: ["isAcceptable", "reason", "newPassage"],
};

export async function evaluateVoiceSampleQuality(
  audioBuffer: Buffer
): Promise<VoiceQualityResult> {
  return generateMultimodalJson<VoiceQualityResult>(
    [
      `You are evaluating a voice recording for a voice-authentication enrollment system.
Be LENIENT. The only things that matter are:
1. The audio contains actual human speech (not silence or pure noise).
2. At least a few seconds of speech are present.

Hesitations, stumbles, unnatural pace, accents, and background noise are ALL FINE. The speaker does not need to read perfectly. As long as you can tell a person is speaking, accept it.

Only reject if the audio is essentially silence, unintelligible noise, or under ~2 seconds of speech.

If rejected, generate a fresh ~60-word reading passage about personal growth for the next attempt.

Evaluate the attached audio.`,
    ],
    audioBuffer,
    voiceQualitySchema
  );
}

// ── Audio transcription ──────────────────────────────────────────

const transcriptionSchema = {
  type: "OBJECT",
  properties: {
    transcription: {
      type: "STRING",
      description: "Verbatim transcription of the user's spoken audio.",
    },
  },
  required: ["transcription"],
};

export async function transcribeAudio(
  audioBuffer: Buffer
): Promise<string> {
  const result = await generateMultimodalJson<{ transcription: string }>(
    ["Transcribe the following audio verbatim. Return only the transcription."],
    audioBuffer,
    transcriptionSchema
  );
  return result.transcription;
}

// ── Interview completion sentinel ────────────────────────────────

const interviewCompleteSchema = {
  type: "OBJECT",
  properties: {
    done: {
      type: "BOOLEAN",
      description:
        "True if the onboarding interview has naturally concluded. False if it should continue.",
    },
  },
  required: ["done"],
};

export async function checkInterviewComplete(
  conversation: Array<{ role: string; text: string }>
): Promise<{ done: boolean }> {
  const transcript = conversation
    .map((m) => `[${m.role === "assistant" ? "AI" : "User"}]: ${m.text}`)
    .join("\n\n");

  return generateStructuredJson<{ done: boolean }>(
    `You are judging whether an onboarding interview is complete.

Read the full conversation below. The AI interviewer is getting to know a new user — asking about their background, relationships, emotional triggers, goals, and coping mechanisms.

Decide if the interview has reached a natural conclusion. Consider:
- Has the AI covered enough ground to understand the user? (4+ topics explored = sufficient)
- Is the AI's latest message a closing/sign-off rather than a new question?
- Has there been enough back-and-forth? (5+ exchanges is usually sufficient)
- Even if the AI asks a trailing question like "anything else?", if the conversation has clearly covered substantial ground, it's done.

Be decisive. If the conversation has clearly covered enough territory and the AI's last message feels like a wrap-up (even an imperfect one), mark it done. Don't require a pixel-perfect sign-off.

Conversation:
"""
${transcript}
"""`,
    interviewCompleteSchema
  );
}

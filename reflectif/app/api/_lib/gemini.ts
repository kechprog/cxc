import type { CoreUserFile } from "@/lib/types/user";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY environment variable");
  return key;
}

export async function generateStructuredJson<T>(
  prompt: string,
  schema: Record<string, unknown>,
  model = DEFAULT_MODEL
): Promise<T> {
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text in Gemini response");

  return JSON.parse(text) as T;
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

// ── Interview answer transcription + evaluation ──────────────────

type AnswerEvaluationResult = {
  transcription: string;
  isSatisfactory: boolean;
  followUp: string | null;
};

const answerEvaluationSchema = {
  type: "OBJECT",
  properties: {
    transcription: {
      type: "STRING",
      description: "Verbatim transcription of the user's spoken audio.",
    },
    isSatisfactory: {
      type: "BOOLEAN",
      description:
        "True if the answer is substantive — at least a few sentences with real, personal detail relevant to the question. One-word or evasive answers are not satisfactory.",
    },
    followUp: {
      type: "STRING",
      nullable: true,
      description:
        "If not satisfactory, a gentle follow-up probe to elicit a deeper response. Null if satisfactory.",
    },
  },
  required: ["transcription", "isSatisfactory", "followUp"],
};

export async function transcribeAndEvaluateAnswer(
  audioBuffer: Buffer,
  questionText: string,
  previousAttempts: string[]
): Promise<AnswerEvaluationResult> {
  const attemptsCtx =
    previousAttempts.length > 0
      ? `\n\nPrevious attempts for this question:\n${previousAttempts.map((a, i) => `Attempt ${i + 1}: "${a}"`).join("\n")}`
      : "";

  return generateMultimodalJson<AnswerEvaluationResult>(
    [
      `You are an empathetic onboarding interviewer for Reflectif, an emotional-intelligence coaching app.

The user was asked: "${questionText}"${attemptsCtx}

Your job:
1. Transcribe the attached audio verbatim.
2. Decide if the answer is substantive — it should contain at least a couple of sentences of genuine, personal reflection. Answers like "nothing", "I don't know", or very short/evasive responses are NOT satisfactory.
3. If not satisfactory, write a warm, encouraging follow-up probe that gently asks the user to share more. Reference what they said (if anything) and guide them toward a deeper answer.

Evaluate the attached audio.`,
    ],
    audioBuffer,
    answerEvaluationSchema
  );
}

// ── Build CoreUserFile from interview answers ────────────────────

const coreUserFileSchema = {
  type: "OBJECT",
  properties: {
    background: {
      type: "STRING",
      description: "Job, lifestyle, typical day — extracted from interview answers.",
    },
    relationships: {
      type: "STRING",
      description: "Key relationships and dynamics mentioned by the user.",
    },
    goals: {
      type: "STRING",
      description: "What the user wants to improve about themselves.",
    },
    triggers: {
      type: "STRING",
      description: "Known emotional triggers and sensitivities.",
    },
    eqBaseline: {
      type: "STRING",
      description: "EQ baseline assessment and growth areas.",
    },
    patterns: {
      type: "STRING",
      description: "Recurring communication/behavioral patterns the user described.",
    },
    lifeContext: {
      type: "STRING",
      description: "Important life events or current context.",
    },
  },
  required: [
    "background",
    "relationships",
    "goals",
    "triggers",
    "eqBaseline",
    "patterns",
    "lifeContext",
  ],
};

export async function buildCoreUserFileFromInterview(
  answers: Array<{ question: string; answer: string }>
): Promise<CoreUserFile> {
  const qa = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`)
    .join("\n\n");

  return generateStructuredJson<CoreUserFile>(
    `You are building an initial user profile for Reflectif, an emotional-intelligence coaching app.

Below are the user's onboarding interview answers. Extract and synthesize the information into each profile field. Write in third person, as if documenting what you learned about this person. Be thorough but concise — each field should be 2-4 sentences. If a field has no relevant information from the interview, write "Not yet determined — will be updated as more information becomes available."

Interview:
${qa}`,
    coreUserFileSchema
  );
}

# Speech Sentiment Analysis

## How It Works

1. Raw conversation audio goes into a diarization + transcription API (e.g., AssemblyAI, Deepgram). This gives us back speaker-labeled, timestamped text segments.

2. Using those timestamps, we slice the original audio into small chunks per speaker utterance. If an utterance is longer than ~3 seconds, we split it into overlapping ~1.5–2 sec windows for finer granularity.

3. For each audio chunk, we extract prosodic features using librosa: pitch (F0), energy/volume (RMS), MFCCs, speaking rate (derived from word count / duration), spectral centroid, and zero crossing rate.

4. A custom classifier (trained pre-hackathon) takes those features and outputs emotion label + confidence scores per emotion class for each chunk.

5. The result: every segment of the transcript gets annotated with emotion data, producing a time series of emotion per speaker across the full conversation.

## Training Data

RAVDESS + CREMA-D + TESS — all freely available, totaling ~15,000+ labeled utterances. These are acted single-emotion clips. The model trains on individual clips but at inference runs on the sliding window segments described above.

## Emotion Categories

TBD — standard datasets provide anger, sadness, happiness, fear, disgust, surprise, neutral. May remap to categories more useful for our use case (e.g., anxious, defensive, confident, resigned).

## Output Format

```
Speaker A [0:00–0:03] "I think that's a good idea"
  → happy: 0.62, neutral: 0.30, anxious: 0.08

Speaker B [0:03–0:05] "No yeah I'm fine with that"
  → anxious: 0.72, neutral: 0.18, happy: 0.10
```

This annotated transcript is what gets passed to the LLM layer.
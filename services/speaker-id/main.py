import io

import torch
import torchaudio

# speechbrain 1.0.x calls torchaudio.list_audio_backends(), removed in 2.10
if not hasattr(torchaudio, "list_audio_backends"):
    torchaudio.list_audio_backends = lambda: ["ffmpeg"]

from fastapi import FastAPI, UploadFile, File, HTTPException
from speechbrain.inference.speaker import EncoderClassifier

app = FastAPI()

device = "cuda" if torch.cuda.is_available() else "cpu"
model = EncoderClassifier.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    run_opts={"device": device},
)


def extract_embedding(raw_bytes: bytes) -> list[float]:
    """Audio bytes → 192-dim embedding as list of floats."""
    waveform, sr = torchaudio.load(io.BytesIO(raw_bytes))
    if sr != 16000:
        waveform = torchaudio.functional.resample(waveform, sr, 16000)
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
    waveform = waveform.squeeze(0)
    if waveform.shape[0] < 16000:
        raise HTTPException(status_code=422, detail="Audio too short (need at least 1 second)")
    with torch.no_grad():
        embedding = model.encode_batch(waveform.unsqueeze(0).to(device))
    return embedding.squeeze().cpu().tolist()


@app.post("/embed")
def embed(audio: UploadFile = File(...)):
    """Extract 192-dim voice embedding from audio."""
    raw = audio.file.read()
    embedding = extract_embedding(raw)
    return {"embedding": embedding}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "device": device,
        "gpu": torch.cuda.get_device_name(0) if device == "cuda" else None,
    }

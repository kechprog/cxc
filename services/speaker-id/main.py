import io
import json
import sqlite3
import uuid
from pathlib import Path

import torch
import torchaudio
from fastapi import FastAPI, UploadFile, File, HTTPException
from speechbrain.inference.speaker import EncoderClassifier

THRESHOLD = 0.25
DB_PATH = Path(__file__).parent / "voices.db"

app = FastAPI()

device = "cuda" if torch.cuda.is_available() else "cpu"
model = EncoderClassifier.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    run_opts={"device": device},
)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS voices ("
        "  id TEXT PRIMARY KEY,"
        "  embedding TEXT NOT NULL"
        ")"
    )
    conn.commit()
    conn.close()


init_db()


def get_db() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH)


def extract_embedding(raw_bytes: bytes) -> torch.Tensor:
    """Audio bytes → 192-dim embedding tensor."""
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
    return embedding.squeeze().cpu()


@app.post("/enroll", status_code=201)
def enroll(audio: UploadFile = File(...)):
    """Extract voice embedding, store in DB, return voice_id."""
    raw = audio.file.read()
    embedding = extract_embedding(raw)
    voice_id = str(uuid.uuid4())

    db = get_db()
    try:
        db.execute(
            "INSERT INTO voices (id, embedding) VALUES (?, ?)",
            (voice_id, json.dumps(embedding.tolist())),
        )
        db.commit()
    finally:
        db.close()

    return {"voice_id": voice_id}


@app.post("/match")
def match(audio: UploadFile = File(...)):
    """Find best matching voice above threshold. Returns voice_id or null."""
    raw = audio.file.read()
    embedding = extract_embedding(raw)

    db = get_db()
    try:
        rows = db.execute("SELECT id, embedding FROM voices").fetchall()
    finally:
        db.close()

    if not rows:
        return {"voice_id": None, "score": 0.0}

    best_id = None
    best_score = -1.0

    for voice_id, emb_json in rows:
        stored = torch.tensor(json.loads(emb_json), dtype=torch.float32)
        score = torch.nn.functional.cosine_similarity(
            stored.unsqueeze(0), embedding.unsqueeze(0)
        ).item()
        if score > best_score:
            best_score = score
            best_id = voice_id

    if best_score >= THRESHOLD:
        return {"voice_id": best_id, "score": best_score}

    return {"voice_id": None, "score": best_score}


@app.get("/health")
def health():
    db = get_db()
    try:
        count = db.execute("SELECT COUNT(*) FROM voices").fetchone()[0]
    finally:
        db.close()
    return {
        "status": "ok",
        "device": device,
        "gpu": torch.cuda.get_device_name(0) if device == "cuda" else None,
        "voices": count,
    }

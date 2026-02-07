# ── Stage 1: Build Next.js ──────────────────────────────
FROM node:20-slim AS node-deps
WORKDIR /app
COPY reflectif/package.json reflectif/package-lock.json* ./
RUN npm ci

FROM node:20-slim AS node-builder
WORKDIR /app
COPY --from=node-deps /app/node_modules ./node_modules
COPY reflectif/ .
RUN npm run build

# ── Stage 2: Final image (Python base + Node runtime) ──
FROM python:3.11-slim

# Install Node.js + system deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ffmpeg libsndfile1 && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Speaker-ID service ──
COPY services/speaker-id/requirements.txt /app/speaker-id/
RUN pip install --no-cache-dir -r /app/speaker-id/requirements.txt

COPY services/speaker-id/main.py /app/speaker-id/

# Pre-download the SpeechBrain model so it's baked into the image
RUN python -c "from speechbrain.inference.speaker import EncoderClassifier; EncoderClassifier.from_hparams(source='speechbrain/spkrec-ecapa-voxceleb')"

# ── Next.js app ──
COPY --from=node-builder /app/public /app/nextjs/public
COPY --from=node-builder /app/.next/standalone /app/nextjs
COPY --from=node-builder /app/.next/static /app/nextjs/.next/static

# ── Entrypoint ──
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000
ENV SPEAKER_ID_URL=http://localhost:8100
CMD ["/app/entrypoint.sh"]

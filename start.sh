#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill 0 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

# Speaker-ID (FastAPI)
echo "Starting speaker-id service on :8100..."
cd "$ROOT/services/speaker-id" && uvicorn main:app --host 0.0.0.0 --port 8100 &

# Next.js
echo "Starting Next.js..."
cd "$ROOT/reflectif" && npm run dev &

wait

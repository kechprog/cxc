#!/usr/bin/env bash
set -e

cleanup() {
  kill 0 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

# Start speaker-id service (internal only)
cd /app/speaker-id && uvicorn main:app --host 127.0.0.1 --port 8100 &

# Start Next.js
cd /app/nextjs && node server.js &

wait

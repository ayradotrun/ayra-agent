#!/usr/bin/env bash
# All-in-one AYRA container: Python runtime + worker + Next.js web
set -euo pipefail

cd /app

echo "[AYRA] Starting Python runtime..."
python3 -m ayra.runtime_server --host 127.0.0.1 --port "${AYRA_PYTHON_PORT:-8765}" &
PY_PID=$!

echo "[AYRA] Starting background worker..."
npm run worker &
WORKER_PID=$!

cleanup() {
  echo "[AYRA] Shutting down..."
  kill "$WORKER_PID" "$PY_PID" 2>/dev/null || true
}
trap cleanup SIGINT SIGTERM

echo "[AYRA] Starting web on :${PORT:-3000}..."
npm run start

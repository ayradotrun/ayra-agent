#!/usr/bin/env bash
set -euo pipefail
cd /app
python3 -m ayra.runtime_server --host 127.0.0.1 --port "${AYRA_PYTHON_PORT:-8765}" &
exec npm run start

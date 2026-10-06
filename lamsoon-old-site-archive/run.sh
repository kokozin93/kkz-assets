#!/usr/bin/env bash
# Lam Soon old-site archive — one-click run (macOS / Linux)
#   ./run.sh                 -> crawl MY + TH-EN + TH-TH (full)
#   ./run.sh my              -> Malaysia only (priority — comes down first)
#   ./run.sh th-en,th-th     -> Thailand both languages
#   ./run.sh my --max-pages 15 --no-mobile   -> quick trial run
#   ./run.sh my --resume     -> continue after an interruption
set -euo pipefail
cd "$(dirname "$0")/tools"
PY=${PYTHON:-python3}
$PY -m pip install -q -r requirements.txt
$PY -m playwright install chromium
$PY crawl.py --site "${1:-all}" "${@:2}"
echo "Open: $(cd .. && pwd)/archive/index.html"

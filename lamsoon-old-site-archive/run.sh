#!/usr/bin/env bash
# Lam Soon old-site archive — one-click run (macOS / Linux)
#   ./run.sh                 -> crawl MY + TH-EN + TH-TH (full)
#   ./run.sh my              -> Malaysia only (priority — comes down first)
#   ./run.sh th-en,th-th     -> Thailand both languages
#   ./run.sh my --max-pages 15 --no-mobile   -> quick trial run
#   ./run.sh my --resume     -> continue after an interruption
# Uses a private virtual environment in .venv/ (works with Homebrew Python / PEP 668).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SYS_PY=${PYTHON:-python3}
if [ ! -x "$HERE/.venv/bin/python" ]; then
  echo "Setting up private Python environment (.venv) — first run only…"
  "$SYS_PY" -m venv "$HERE/.venv"
fi
PY="$HERE/.venv/bin/python"
"$PY" -m pip install -q --upgrade pip
"$PY" -m pip install -q -r "$HERE/tools/requirements.txt"
"$PY" -m playwright install chromium
cd "$HERE/tools"
"$PY" crawl.py --site "${1:-all}" "${@:2}"
echo "Open: $HERE/archive/index.html"

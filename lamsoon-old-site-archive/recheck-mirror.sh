#!/usr/bin/env bash
# Kickoff action #1: verify Juno's flat-HTML copy against the live-site capture, page by page.
#   ./recheck-mirror.sh <site-folder> <mirror-origin> [label] [extra crawl args]
#   ./recheck-mirror.sh 01_MY_lamsoon-com-my https://lamsoon-my.<brandcore-domain> juno-mirror
# If the mirror renamed pages (about.aspx -> about.html), add:  --url-map ../url-map.csv   (CSV: original_url,mirror_url)
set -euo pipefail
cd "$(dirname "$0")/tools"
SITE=$1; ORIGIN=$2; LABEL=${3:-juno-mirror}
python3 crawl.py --recheck "../archive/$SITE" --origin "$ORIGIN" --label "$LABEL" "${@:4}"
python3 compare.py "../archive/$SITE" "../archive/04_RECHECKS/${SITE}__${LABEL}"
echo "Open: $(cd .. && pwd)/archive/index.html  ->  Comparison reports"

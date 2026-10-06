# Lam Soon old-site archive — MY · TH-EN · TH-TH

Front-end capture + page-by-page verification kit for the three old Lam Soon sites before the previous agency's hosting is taken down on **31 Oct 2026**.

| Key | Site | Start URL |
|---|---|---|
| `my` | Lam Soon Malaysia | https://www.lamsoon.com.my/ |
| `th-en` | Lam Soon Thailand — English | https://lamsoon.co.th/en/ |
| `th-th` | Lam Soon Thailand — Thai | https://lamsoon.co.th/th/ (+ the 2569 shareholder-meeting post as an extra seed) |

Why it exists and what it covers → [`00_BRIEF/MEETING-REQUIREMENTS.md`](00_BRIEF/MEETING-REQUIREMENTS.md)
How the team verifies → [`00_BRIEF/VERIFICATION-SOP.md`](00_BRIEF/VERIFICATION-SOP.md)
What the output looks like → open [`SAMPLE-OUTPUT_selftest/index.html`](SAMPLE-OUTPUT_selftest/index.html) (a mock site, not Lam Soon data)

## Quick start

Needs Python 3.10+ and internet access to the old sites. Nothing else; no server, no cloud account.

```bash
./run.sh my                      # Malaysia first (comes down first)
./run.sh th-en,th-th             # then Thailand, both languages
./run.sh my --max-pages 15       # 2-minute trial run
./run.sh my --resume             # continue after an interruption
./run.sh th-en,th-th --reshoot   # redo ONLY screenshots, MHTML + offline snapshot (popups + cookie bar hidden); copy, assets, IDs kept
```
Windows: `run.bat my`. Then open `archive/index.html` in Chrome/Edge.

Verify Juno's flat-HTML copy against the live capture (kickoff action #1):
```bash
./recheck-mirror.sh 01_MY_lamsoon-com-my https://<juno-mirror-origin> juno-mirror
```

## Folder layout

```
lamsoon-old-site-archive/
├── README.md
├── run.sh / run.bat                 one-click crawl
├── recheck-mirror.sh                re-capture a mirror with the same page list + compare
├── 00_BRIEF/
│   ├── MEETING-REQUIREMENTS.md      minutes → feature traceability, known limits
│   └── VERIFICATION-SOP.md          per-page checklist for TDD/CSD
├── tools/                           crawler + report builder (see "Tools")
├── SAMPLE-OUTPUT_selftest/          demo output from the built-in mock site
└── archive/                         ← generated; share this folder (Drive/zip)
    ├── index.html                   master: all sites, progress, comparison reports
    ├── 01_MY_lamsoon-com-my/
    │   ├── index.html               site dashboard (filter, sort, verify, export CSV)
    │   ├── site.json                run metadata + page list
    │   ├── registers/               CSVs (UTF-8 BOM — Excel/Sheets safe for Thai)
    │   │   ├── PAGE-INVENTORY.csv         → paste into LamSoon Webpage Checklist (MY tab)
    │   │   ├── FORMS-AND-ROUTING.csv      action URL, fields, hidden fields, emails
    │   │   ├── CONTACTS-EMAILS-PHONES.csv
    │   │   ├── IMAGES-PER-PAGE.csv        every image, category, alt, size, page
    │   │   ├── ICON-FONTS.csv             glyph icons that need real icon files
    │   │   ├── DOCUMENTS.csv              PDFs/docs/videos linked from the site
    │   │   ├── ISSUES.csv                 4xx/5xx, redirects, orphans, unsaved images
    │   │   ├── EXTERNAL-LINKS.csv · TRACKING-IDS.csv
    │   │   └── ASSETS-ALL.csv · ASSETS-FAILED.csv
    │   ├── pages/<slug>__<hash>/    one folder per page
    │   │   ├── index.html             DISSECTION VIEW (compare / copy / images / links / forms / meta)
    │   │   ├── screenshot_desktop.jpg full page @1440
    │   │   ├── screenshot_mobile.jpg  full page @390 ×2
    │   │   ├── screenshot_popup*.jpg  popup(s) that covered the page on load, one shot each (first page it appeared on)
    │   │   ├── snapshot.html          offline browsable copy (local assets, scripts removed)
    │   │   ├── page.mhtml             single-file archive, opens in Chrome/Edge
    │   │   ├── raw.html               HTML exactly as served
    │   │   ├── rendered.html          DOM after JavaScript
    │   │   ├── content.md             copy document for CSD/TDD
    │   │   ├── text.txt · data.json
    │   │   └── assets/                images/ icons/ logos/ backgrounds/ svg-inline/ video-posters/ meta-og-favicon/
    │   ├── _assets/                 de-duplicated originals, mirrored by URL path
    │   ├── _documents/              downloaded PDFs / docs / videos
    │   ├── _discovery/              robots.txt, sitemaps as fetched
    │   └── _wp-api/                 (TH only) WordPress REST export + media-library.csv
    ├── 02_TH-EN_lamsoon-co-th/      same structure
    ├── 03_TH-TH_lamsoon-co-th/      same structure
    ├── 04_RECHECKS/                 re-captures (e.g. Juno's mirror) with the same page list
    └── 05_COMPARISONS/              A-vs-B reports: summary + per-page diff (text, images, links, pixels)
```

Page IDs (`P001…`) are ordered by click-depth from home, then URL — stable across reruns, use them in the checklist sheet and Slides comments.

## How pages are found

1. Start URL(s) → every link on every page (breadth-first), including `onclick` navigations.
2. `robots.txt` + sitemaps (`sitemap.xml`, `wp-sitemap.xml`, Yoast index).
3. TH only: WordPress REST API — all pages, posts and custom post types, plus the full media library.
4. Pages found only via 2/3 are flagged **orphan**; same-host pages outside the language scope (e.g. TH root pages not under `/en/` or `/th/`) are listed in ISSUES so nothing is silently skipped.

Each page is loaded in headless Chromium, popups/cookie bars dismissed (text buttons, × / close icons, then any remaining full-screen modal layer is photographed once and hidden; cookie/PDPA consent bars are hidden without a photo; listed per page in `data.json → summary.overlays_hidden`), scrolled to the bottom to trigger lazy loading, then captured. Every image/font/stylesheet the browser downloads is saved from the network response itself; images referenced but not yet loaded (lazy, srcset, hover backgrounds in CSS) are fetched afterwards.

## Tools

| File | Role |
|---|---|
| `tools/crawl.py` | crawler / capture (`python crawl.py -h` for all options) |
| `tools/extract.js` | in-page extractor: copy blocks w/ region + visibility, images incl. CSS/pseudo/data-attr, inline SVG, icon fonts, links, forms, meta, JSON-LD |
| `tools/finalize.py` | IDs, per-page asset folders, offline snapshots, `content.md`, CSV registers |
| `tools/report.py` | builds the HTML dashboards (`python report.py ../archive` to rebuild) |
| `tools/compare.py` | A-vs-B page comparison |
| `tools/sites.json` | site definitions (start URLs, scope, sitemaps) |
| `tools/selftest/` | mock old site + server used to test the pipeline end-to-end |

Useful flags: `--no-mobile` (≈2× faster), `--concurrency 3`, `--delay 0.3`, `--shot-format png` (lossless), `--max-pages 2000`, `--no-documents`.

Self-test (no internet needed):
```bash
cd tools && python3 selftest/server.py selftest/site 8765 &
python3 crawl.py --site mock --config-override selftest/sites.selftest.json --out /tmp/lsa-test
```

## Scope and limits

Front end only: no database, no admin content, no server-side form recipients. Full list in `00_BRIEF/MEETING-REQUIREMENTS.md → Known limits`.

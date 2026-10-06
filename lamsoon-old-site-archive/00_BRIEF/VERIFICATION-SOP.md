# Verification SOP — old Lam Soon sites (TDD + CSD)

Goal: every page in the archive is confirmed against the **live** site before **31 Oct 2026**. Malaysia first.

## 0. Before you start (once)
1. Use **Chrome or Edge** (verification ticks are saved in the browser; Chrome shares them across all archive pages opened from disk).
2. Open `archive/index.html` → open the site dashboard → type your name in **Your name (reviewer)** (top right).
3. Split pages between reviewers by **ID range** (e.g. Reviewer A: P001–P120, Reviewer B: P121–end).

## 1. Per page (≈2–4 min)
Open the page by its ID. Default view = **Compare**: A = archived screenshot, B = LIVE site. One scrollbar drives both.

| Tick | Check | How |
|---|---|---|
| **Copy** | All headings/paragraphs present, no truncation, Thai renders correctly | Compare side-by-side; for long pages use the **Copy / content** tab (hidden carousel/tab text is listed and flagged) |
| **Images** | Every image/banner/icon on live is in the archive | **Images & icons** tab — anything marked `NOT SAVED` is a fail. Tick-icons and icon-font glyphs are listed separately |
| **Links** | Nav, buttons, footer links match | **Links** tab — internal links jump to the archived page; check no live-only menu items |
| **Forms** | Form fields + where it posts to are recorded | **Forms** tab — note the action URL / hidden fields; recipient inbox must be confirmed with client |
| **Layout** | Same sections in the same order | Switch to **Overlay** → tick **Difference blend**: identical areas go black, differences glow |

Then set **Result**: `OK` · `Partial` (minor gaps, note them) · `ISSUE` (missing/wrong — note exactly what) · `N/A`.
Ticking all five auto-sets `OK`.

## 2. End of each day
1. Dashboard → **Export verification CSV** → save as `MY_verification_<date>_<name>.csv` in the shared Drive folder.
2. Paste the rows into the **LamSoon Webpage Checklist → Webpage List (MY)** tab.
3. Anything `ISSUE` → re-run that page: `./run.sh my --resume` won't redo finished pages, so delete that page's folder under `archive/01_MY_…/pages/` first, then run again.

To merge several reviewers' work into one browser: **Import CSV** on the dashboard.

## 3. Juno's mirror (kickoff action #1)
```
./recheck-mirror.sh 01_MY_lamsoon-com-my https://<juno-mirror-origin> juno-mirror
```
Open **archive/index.html → Comparison reports**. Work the `DIFFERENT` and `MISSING IN B` rows first; `MATCH` rows need only a glance.
Verdict rules: MATCH = text ≥99.5 %, no missing/changed images, ≤1 % pixels different, same HTTP status. CHECK = text ≥95 %, ≤1 missing image, ≤8 % pixels.

## 4. Also confirm with client before 31 Oct
- Recipient inbox for every form in `registers/FORMS-AND-ROUTING.csv`.
- Any page listed under **Issues → same-host page outside scope** (e.g. pages not under `/en/` or `/th/` on the TH site).
- Admin-only / login content (not reachable by any crawler).

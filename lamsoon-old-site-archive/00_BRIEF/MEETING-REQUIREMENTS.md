# What the 6 Oct 2026 meetings asked for → where this toolkit delivers it

Sources: `20261006_BC_LAMSOON_Kickoff_1533` (TDD + CSD + video) and `20261006_BC_LAMSOON_Review_1628` (CSD follow-up).

## Hard constraints

| Constraint (from minutes) | Consequence for this archive |
|---|---|
| Old MY + TH hosting is taken down **31 Oct 2026** and will **not** be restored (Julia). | Everything must be captured *and verified against live* before that date. Dashboards show a countdown. |
| MY back end / DB was handed over but **cannot be run** (non-PHP stack, likely ASP.NET — unconfirmed). | Front-end capture is the only reference. The crawler fingerprints the platform from headers/markup (`site.json → platform_hints`) to settle the "tonnet / ASP" question. |
| Juno's flat-HTML crawl of MY is a **front-end copy, not a DB export**; nobody can certify it is 100% complete (Zan Zan, twice). | Two-capture workflow: capture live → re-capture Juno's mirror with the identical page list → automatic page-by-page diff (`compare.py`). |
| Thailand crawl had **not** succeeded yet; TH is WordPress. | TH-EN and TH-TH are separate site configs. The WordPress REST API is pulled (pages, posts, custom types, full media library) — the closest thing to a DB export obtainable from outside. |
| Malaysia first, Thailand after. | `./run.sh my` first; TH is a separate run. |

## Requirements → feature

| # | Asked for (who) | Delivered by |
|---|---|---|
| 1 | Compare crawled HTML vs live MY site **page by page** (TDD — action #1, kickoff) | Per-page **Compare** tab: archived screenshot vs LIVE iframe, side-by-side on one shared scrollbar, plus Overlay with opacity slider and **Difference blend** (identical = black). `compare.py` scores every page automatically (text %, missing/changed images, links, pixel diff heatmap). |
| 2 | **Screenshots of every page** for future reference (TDD; Ko Ko Zin asked to recommend a bulk tool) | Full-page desktop (1440) + mobile (390 @2x) screenshots captured automatically for every page — replaces manual Chrome capture. |
| 3 | Content **as a document or screenshots** (TDD) | `content.md` per page: SEO/meta, all copy in DOM order with heading levels, hidden carousel/tab text flagged, image table with alt text, forms, links. Plus `text.txt` and a **Copy main copy** button. |
| 4 | **Per-page assets folder** (cropped images + icons, e.g. homepage) so a page uploads in one pass (TDD) | `pages/<page>/assets/` split into `images / icons / logos / backgrounds / svg-inline / video-posters / meta-og-favicon`, numbered in page order to match `content.md`. Site-wide de-duplicated originals in `_assets/`. |
| 5 | **Icons** — old MY site only renders a tick; new build needs distinct icons (kickoff) | Tick icons via CSS `::before`, icon-font glyphs (`fa fa-check` etc.) and inline SVGs are detected separately. `registers/ICON-FONTS.csv` lists every glyph use per page so CSD knows exactly which icons need supplying. |
| 6 | What is lost without the DB — e.g. **where Contact Us sends to** (kickoff) | `registers/FORMS-AND-ROUTING.csv`: every form's action URL, method, fields, required flags, **hidden fields** (can expose recipient IDs/emails), and every email/phone found in page source. Server-side recipient still needs client confirmation — flagged in the UI. |
| 7 | CSD must secure **creative assets** before 31 Oct (Shermane/Janna) | All images incl. lazy-loaded, srcset variants, CSS backgrounds, hover/breakpoint backgrounds referenced in stylesheets, hidden carousel slides, OG images, favicons. Linked PDFs/docs/videos → `_documents/`. TH: WordPress media library list in `_wp-api/media-library.csv`. |
| 8 | Content comparison by **Home, Our Brand, Our Endorsement** first (Chonni, review) | Dashboard search/section filter; page IDs give a stable reference (P001…) for comments on the Google Slides. |
| 9 | Confirm local MY content vs Singapore — recipes, campaigns, community, financial highlights, brand groupings (Janna, review) | Inventory lists every section; `section` filter + `content.md` give Janna the full local-content list to put to Lam Soon MY. |
| 10 | **Knife brand / per-market SKUs** need separate brand entries scoped to MY (kickoff) | Every brand/product URL incl. `?query` variants (SKU pages) is captured with its images and copy, so the MY-only SKU list can be built from the archive. |
| 11 | Reference links per page in the **LamSoon Webpage Checklist** sheet, MY/TH tabs (kickoff action #7) | `registers/PAGE-INVENTORY.csv` (UTF-8, Thai-safe) — paste into the MY / TH tabs. Has blank `VERIFIED_BY / RESULT / NOTES` columns. Dashboard **Export verification CSV** gives the team's tick-offs in the same shape. |
| 12 | Page levels 1 / 2 / 3 for the timeline (CSD) | `depth` = clicks from home (hint for L1/L2/L3); orphan pages (sitemap/API only) shown separately. |
| 13 | Video — Ko Ko Zin needs nothing (no video assets provided) | Video/embeds are still logged (`media` per page, YouTube/Vimeo iframes) for completeness; MP4s ≤300 MB downloaded if present. |
| 14 | Myanmar team can't use some cloud tools (review) | Runs fully local: Python + Chromium only. Output is static HTML that opens from disk (`file://`) — no server, no login, no cloud. |

## Known limits (state them when reporting completeness)

- Front end only: no database, no admin-only content, no server-side form recipients.
- Pages only reachable via search, POST-backs (ASP.NET `__doPostBack`), or login are not discoverable by crawling — check the sitemap/orphan list and the live nav manually.
- Content behind interactions (clicks that load via AJAX) is captured only if it's in the DOM at load. Hidden-but-present content (carousels, tabs) **is** captured and flagged.
- Live pane in the Compare tab depends on the old site still being up and not blocking iframes (`X-Frame-Options`); after 31 Oct compare screenshot vs offline snapshot.

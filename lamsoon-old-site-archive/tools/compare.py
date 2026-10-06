#!/usr/bin/env python3
"""
Page-by-page comparison of two captures of the same site.

Typical use (kickoff action #1 — verify Juno's flat-HTML copy against the live MY site):
  1. python crawl.py --site my                                   # A = live site capture
  2. python crawl.py --recheck ../archive/01_MY_lamsoon-com-my --origin https://<juno-mirror-domain> --label juno-mirror
  3. python compare.py ../archive/01_MY_lamsoon-com-my ../archive/04_RECHECKS/01_MY_lamsoon-com-my__juno-mirror

Output: archive/05_COMPARISONS/<A>__VS__<B>/index.html (+ one diff page per URL, + COMPARE-SUMMARY.csv)
Per page: text similarity + side-by-side text diff, images missing/extra/changed (by file name + SHA-1),
links missing/extra (origin-independent), full-page visual pixel diff with heatmap.
"""
import argparse
import csv
import difflib
import html
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from report import archive_root, build_master, copy_ui, js, rel  # noqa: E402


def load(site_dir: Path):
    info = json.loads((site_dir / "site.json").read_text("utf-8"))
    man_p = site_dir / "_assets" / "_manifest.json"
    man = json.loads(man_p.read_text("utf-8")) if man_p.exists() else {}
    pages = {}
    for p in info["pages"]:
        f = site_dir / "pages" / (p.get("folder") or "") / "data.json"
        d = json.loads(f.read_text("utf-8")) if p.get("folder") and f.exists() else {"summary": p}
        pages[p.get("pair_key") or p["key"]] = (p, d, site_dir / "pages" / (p.get("folder") or "_none"))
    return info, pages, man


def text_lines(folder: Path):
    t = (folder / "text.txt").read_text("utf-8") if (folder / "text.txt").exists() else ""
    return [re.sub(r"\s+", " ", l).strip() for l in t.splitlines() if l.strip()]


def img_index(d, man):
    out = {}
    for im in d.get("images", []):
        u = im.get("url") or ""
        if not u or u.startswith("data:") or im.get("kind") == "favicon" or im.get("kind", "").startswith("meta:"):
            continue
        name = unquote(urlsplit(u).path.rsplit("/", 1)[-1]).lower()
        rec = out.setdefault(name, {"url": u, "sha1": (man.get(u) or {}).get("sha1"), "local": im.get("local"), "alt": im.get("alt")})
        if im.get("local") and not rec.get("local"):
            rec.update(url=u, local=im["local"], sha1=(man.get(u) or {}).get("sha1"))
    return out


def saved(index):
    """only images that actually downloaded count as present (a broken <img> still has a file name)"""
    return {k: v for k, v in index.items() if v.get("local")}


def link_set(d):
    s = set()
    for l in d.get("links", []):
        h = l.get("href") or ""
        if h.startswith("http"):
            sp = urlsplit(h)
            s.add(((l.get("text") or "")[:60], sp.path + ("?" + sp.query if sp.query else "")))
        elif h:
            s.add(((l.get("text") or "")[:60], h))
    return s


def shot(folder: Path):
    for e in ("jpg", "png"):
        if (folder / f"screenshot_desktop.{e}").exists():
            return folder / f"screenshot_desktop.{e}"
    return None


def visual_diff(a: Path, b: Path, out: Path):
    from PIL import Image, ImageChops
    with Image.open(a) as ia, Image.open(b) as ib:
        ia, ib = ia.convert("RGB"), ib.convert("RGB")
        if ib.width != ia.width:
            ib = ib.resize((ia.width, int(ib.height * ia.width / ib.width)))
        h = max(ia.height, ib.height)
        ca, cb = Image.new("RGB", (ia.width, h), (255, 0, 255)), Image.new("RGB", (ia.width, h), (255, 0, 255))
        ca.paste(ia, (0, 0)); cb.paste(ib, (0, 0))
        diff = ImageChops.difference(ca, cb).convert("L")
        mask = diff.point(lambda v: 255 if v > 40 else 0)
        small = mask.resize((max(1, ia.width // 4), max(1, h // 4)))
        hist = small.histogram()
        pct = round(100 * (small.width * small.height - hist[0]) / (small.width * small.height), 2)
        red = Image.new("RGB", ca.size, (230, 0, 40))
        heat = Image.composite(red, Image.blend(ca, Image.new("RGB", ca.size, (255, 255, 255)), 0.55), mask)
        heat.save(out, "JPEG", quality=80)
        return pct, ia.height, ib.height


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("a", help="reference capture folder (e.g. live site archive)")
    ap.add_argument("b", help="capture to verify (e.g. 04_RECHECKS/...__juno-mirror)")
    ap.add_argument("--out", default=None)
    ap.add_argument("--no-visual", action="store_true")
    args = ap.parse_args(argv)
    A, B = Path(args.a).resolve(), Path(args.b).resolve()
    ia, pa, ma = load(A)
    ib, pb, mb = load(B)
    root = archive_root(A)
    out = Path(args.out).resolve() if args.out else root / "05_COMPARISONS" / f"{A.name}__VS__{B.name}"
    (out / "pages").mkdir(parents=True, exist_ok=True)
    copy_ui(out)
    a_label, b_label = ia["config"]["label"], ib["config"]["label"]
    rows = []
    for key, (sa, da, fa) in pa.items():
        sid = sa.get("id")
        r = {"id": sid, "title": sa.get("title") or "", "url": sa["url"], "href": f"pages/{sid}.html"}
        if key not in pb or "content" not in pb[key][1]:
            r.update(missing_b=True, text_ratio=0, img_a=len(img_index(da, ma)), img_b=0, img_missing=len(img_index(da, ma)),
                     link_a=len(link_set(da)), link_b=0, visual=None, verdict="MISSING IN B")
            rows.append(r)
            (out / "pages" / f"{sid}.html").write_text(page_html(r, sa, None, [], [], {}, {}, set(), set(), None, a_label, b_label, out), "utf-8")
            continue
        sb, db, fb = pb[key]
        ta, tb = text_lines(fa), text_lines(fb)
        ratio = round(100 * difflib.SequenceMatcher(None, ta, tb, autojunk=False).ratio(), 1) if (ta or tb) else 100.0
        ima, imb = saved(img_index(da, ma)), saved(img_index(db, mb))
        missing = {k: v for k, v in ima.items() if k not in imb}
        extra = {k: v for k, v in imb.items() if k not in ima}
        changed = {k: (ima[k], imb[k]) for k in ima if k in imb and ima[k]["sha1"] and imb[k]["sha1"] and ima[k]["sha1"] != imb[k]["sha1"]}
        la, lb = link_set(da), link_set(db)
        vis = None
        if not args.no_visual and shot(fa) and shot(fb):
            try:
                vis, _, _ = visual_diff(shot(fa), shot(fb), out / "pages" / f"{sid}_diff.jpg")
            except Exception as e:  # noqa
                print("visual diff failed", sid, e)
        status_same = (sa.get("status") or 0) == (sb.get("status") or 0)
        if ratio >= 99.5 and not missing and not changed and (vis is None or vis <= 1.0) and status_same:
            verdict = "MATCH"
        elif ratio >= 95 and len(missing) <= 1 and (vis is None or vis <= 8):
            verdict = "CHECK"
        else:
            verdict = "DIFFERENT"
        r.update(missing_b=False, text_ratio=ratio, img_a=len(ima), img_b=len(imb), img_missing=len(missing), img_changed=len(changed),
                 link_a=len(la), link_b=len(lb), link_missing=len(la - lb), visual=vis, verdict=verdict, status_a=sa.get("status"), status_b=sb.get("status"))
        rows.append(r)
        (out / "pages" / f"{sid}.html").write_text(page_html(r, sa, sb, ta, tb, missing, extra, la - lb, lb - la, changed, a_label, b_label, out, fa, fb), "utf-8")

    rows.sort(key=lambda r: r["id"] or "")
    with open(out / "COMPARE-SUMMARY.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["id", "verdict", "title", "url", "text_ratio", "img_a", "img_b", "img_missing", "img_changed", "link_a", "link_b", "link_missing", "visual", "status_a", "status_b", "missing_b"], extrasaction="ignore")
        w.writeheader(); w.writerows(rows)
    extra_pages = [k for k in pb if k not in pa]
    n = len(rows)
    cnt = lambda v: sum(1 for r in rows if r["verdict"] == v)  # noqa: E731
    tiles = [[n, "Pages in A"], [cnt("MATCH"), "Match", "ok"], [cnt("CHECK"), "Check (minor)", "warn"], [cnt("DIFFERENT"), "Different", "bad"],
             [cnt("MISSING IN B"), "Missing in B", "bad"], [len(extra_pages), "Only in B"], [sum(r.get("img_missing", 0) for r in rows), "Images missing in B", "bad" if any(r.get("img_missing") for r in rows) else "ok"]]
    C = {"title": f"{ia['config'].get('short', '')}: {A.name}  vs  {B.name}", "a_label": a_label, "b_label": b_label, "built": datetime.now().strftime("%Y-%m-%d %H:%M"),
         "rows": rows, "tiles": tiles, "rootHref": rel(root / "index.html", out)}
    (out / "index.html").write_text(f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compare</title>
<link rel="stylesheet" href="_ui/archive.css"></head><body><div id="app"></div><script src="_ui/archive.js"></script><script>LSA.renderCompare({js(C)});</script></body></html>""", "utf-8")
    (out / "compare.json").write_text(json.dumps({"title": C["title"], "summary": f"{cnt('MATCH')} match · {cnt('CHECK')} check · {cnt('DIFFERENT')} different · {cnt('MISSING IN B')} missing"}, ensure_ascii=False), "utf-8")
    build_master(root)
    print(f"compare done: {out / 'index.html'}  ({C['tiles']})")


def page_html(r, sa, sb, ta, tb, missing, extra, lmiss, lextra, changed, a_label, b_label, out, fa=None, fb=None):
    e = html.escape
    def img_rows(d, folder):
        return "".join(f"<tr><td>{('<img src=' + chr(34) + e(rel(folder / v['local'], out / 'pages')) + chr(34) + ' style=max-height:60px>') if v.get('local') and folder else ''}</td><td><b>{e(k)}</b></td><td>{e(v.get('alt') or '')}</td><td class=url>{e(unquote(v['url']))}</td></tr>" for k, v in d.items())
    parts = [f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(r['id'] or '')} compare</title>
<link rel="stylesheet" href="../_ui/archive.css"><style>table.diff{{font:12px/1.4 var(--mono);border-collapse:collapse;width:100%;background:var(--panel)}}table.diff td{{padding:2px 6px;vertical-align:top;white-space:pre-wrap;word-break:break-word}}
.diff_add{{background:#d9f7e0;color:#111}}.diff_chg{{background:#fff3c4;color:#111}}.diff_sub{{background:#ffd9d9;color:#111}}table.diff th{{background:var(--panel2)}}.diff_header{{color:var(--ink3)}}td.diff_next{{display:none}}
.vis{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:80vh;overflow:auto;background:var(--panel2);padding:8px;border-radius:10px}}.vis img{{width:100%;display:block}}.vis b{{position:sticky;top:0;background:var(--ink);color:var(--bg);display:block;padding:2px 6px;font-size:11px}}</style></head>
<body><header class="top"><div class="wrap"><div class="brand"><span class="dot"></span>{e(r['id'] or '')} compare</div><div class="crumbs"><a href="../index.html">← comparison summary</a></div><div class="spacer"></div>
<span class="chip {'ok' if r['verdict'] == 'MATCH' else 'warn' if r['verdict'] == 'CHECK' else 'bad'}">{e(r['verdict'])}</span></div></header><div class="wrap">
<h1>{e(r['title'])}</h1><div class="sub">{e(unquote(r['url']))}</div>
<div class="tiles"><div class="tile"><div class="n">{r['text_ratio']}%</div><div class="l">Text similarity</div></div><div class="tile {'bad' if r.get('img_missing') else 'ok'}"><div class="n">{r.get('img_missing', 0)}</div><div class="l">Images missing in B</div></div>
<div class="tile {'warn' if r.get('img_changed') else ''}"><div class="n">{r.get('img_changed', 0)}</div><div class="l">Images changed</div></div><div class="tile"><div class="n">{r.get('link_a', 0)}/{r.get('link_b', 0)}</div><div class="l">Links A/B</div></div>
<div class="tile"><div class="n">{'—' if r.get('visual') is None else str(r['visual']) + '%'}</div><div class="l">Pixels different</div></div></div>
<p class="muted">A = {e(a_label)}<br>B = {e(b_label)}</p>"""]
    if sb is None:
        parts.append('<div class="note">This page was not captured in B (missing, failed or renamed). If the mirror renamed files, pass a --url-map CSV to the recheck.</div>')
    else:
        if fa and fb and shot(fa) and shot(fb) and r.get("visual") is not None:
            parts.append(f"""<h2>Visual</h2><div class="vis"><div><b>A</b><img src="{e(rel(shot(fa), out / 'pages'))}"></div><div><b>B</b><img src="{e(rel(shot(fb), out / 'pages'))}"></div><div><b>Diff (red = different)</b><img src="{e(r['id'])}_diff.jpg"></div></div>""")
        parts.append("<h2>Text diff</h2>")
        parts.append(difflib.HtmlDiff(wrapcolumn=90).make_table(ta, tb, "A", "B", context=True, numlines=2) if ta != tb else '<p class="chip ok">Visible text identical</p>')
        parts.append(f"<h2>Images missing in B ({len(missing)})</h2><table class='grid'><tbody>{img_rows(missing, fa) or '<tr><td class=muted>none</td></tr>'}</tbody></table>")
        if changed:
            crow = "".join("<tr><td><b>%s</b></td><td class=url>%s</td><td class=url>%s</td></tr>" % (e(k), e(unquote(a["url"])), e(unquote(b["url"]))) for k, (a, b) in changed.items())
            parts.append(f"<h2>Same file name, different file content ({len(changed)})</h2><table class='grid'><tbody>{crow}</tbody></table>")
        parts.append(f"<h2>Images only in B ({len(extra)})</h2><table class='grid'><tbody>{img_rows(extra, fb) or '<tr><td class=muted>none</td></tr>'}</tbody></table>")
        parts.append(f"<h2>Links missing in B ({len(lmiss)})</h2><table class='grid'><tbody>{''.join(f'<tr><td>{e(t)}</td><td class=url>{e(unquote(h))}</td></tr>' for t, h in sorted(lmiss)) or '<tr><td class=muted>none</td></tr>'}</tbody></table>")
        parts.append(f"<h2>Links only in B ({len(lextra)})</h2><table class='grid'><tbody>{''.join(f'<tr><td>{e(t)}</td><td class=url>{e(unquote(h))}</td></tr>' for t, h in sorted(lextra)) or '<tr><td class=muted>none</td></tr>'}</tbody></table>")
    parts.append("</div></body></html>")
    return "\n".join(parts)


if __name__ == "__main__":
    main()

"""Builds the HTML dashboards from captured data. Re-runnable: python report.py <archive_root>"""
import csv
import json
import shutil
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit

HERE = Path(__file__).resolve().parent
UI = HERE / "ui"


def archive_root(site_dir: Path) -> Path:
    p = site_dir.parent
    return p.parent if p.name in ("04_RECHECKS", "05_COMPARISONS") else p


def copy_ui(dst: Path):
    (dst / "_ui").mkdir(parents=True, exist_ok=True)
    for f in UI.iterdir():
        shutil.copy2(f, dst / "_ui" / f.name)


def js(o):
    return json.dumps(o, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def shell(title, ui_href, call, payload):
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><link rel="stylesheet" href="{ui_href}/archive.css"></head>
<body><div id="app"></div><script src="{ui_href}/archive.js"></script>
<script>LSA.{call}({js(payload)});</script></body></html>
"""


def read_csv(p: Path):
    if not p.exists():
        return []
    with open(p, newline="", encoding="utf-8-sig") as f:
        return [r for r in csv.DictReader(f) if any(r.values()) and "(empty)" not in r]


def thumb(src: Path, dst: Path):
    try:
        from PIL import Image
        with Image.open(src) as im:
            im = im.convert("RGB")
            w = 360
            h = int(im.height * w / im.width)
            im = im.resize((w, h))
            im.crop((0, 0, w, min(h, 225))).save(dst, "JPEG", quality=78)
        return True
    except Exception:
        return False


def shot(folder: Path, kind):
    for ext in ("jpg", "png"):
        if (folder / f"screenshot_{kind}.{ext}").exists():
            return f"screenshot_{kind}.{ext}"
    return None


def site_meta(info):
    cfg = info["config"]
    return {"folder": cfg["folder"], "label": cfg["label"], "short": cfg.get("short", ""),
            "origin": cfg.get("recheck_origin") or f"{urlsplit(cfg['start'][0]).scheme}://{cfg['canonical_host']}",
            "recheck_of": cfg.get("recheck_of"), "recheck_origin": cfg.get("recheck_origin")}


LIST_SEGS = {"author": "author archive", "tag": "tag archive", "category": "category archive",
             "product-category": "product category list", "product-tag": "product tag list", "feed": "RSS feed", "search": "search results"}


def _url_key(url):
    s = urlsplit(url or "")
    return (s.netloc.lower() + unquote(s.path).rstrip("/") + ("?" + s.query if s.query else "")).lower()


def _list_reason(url):
    """Why a URL is an auto-generated list (CMS archive / pagination) rather than a content page, else None."""
    s = urlsplit(url or "")
    segs = [x for x in unquote(s.path).split("/") if x]
    if segs and len(segs[0]) == 2 and segs[0].isalpha():  # language prefix (/en/, /th/)
        segs = segs[1:]
    if any(q.startswith("s=") for q in s.query.split("&")):
        return "search results"
    if segs and segs[0].lower() in LIST_SEGS:
        return LIST_SEGS[segs[0].lower()]
    if segs and all(x.isdigit() for x in segs) and len(segs[0]) == 4 and len(segs) <= 3:
        return "date archive"
    for i, x in enumerate(segs[:-1]):
        if x.lower() == "page" and segs[i + 1].isdigit():
            return "pagination (page %s)" % segs[i + 1]
    return None


def classify_pages(pages):
    """Tag each page row with kind = content | duplicate | list (+ kind_reason, dup_of).
    duplicate: same address as another captured page (redirect, or with/without trailing slash) — the other row is kept.
    list: WordPress-style auto-generated listing (author/tag/category/date archives, page 2, 3, …)."""
    groups = {}
    for p in pages:
        eff = p.get("final_url") if p.get("redirected") and p.get("final_url") else p.get("url")
        groups.setdefault(_url_key(eff), []).append(p)
    for rows in groups.values():
        rows.sort(key=lambda r: (bool(r.get("redirected")), not (r.get("status") and r["status"] < 400),
                                 not urlsplit(r.get("url") or "").path.endswith("/"), r.get("id") or ""))
        primary = rows[0]
        for r in rows[1:]:
            r.update(kind="duplicate", dup_of=primary.get("id"),
                     kind_reason=("redirects to " if r.get("redirected") else "same page as ") + str(primary.get("id")))
    for p in pages:
        if p.get("kind"):
            continue
        why = _list_reason(p.get("final_url") if p.get("redirected") and p.get("final_url") else p.get("url"))
        if why:
            p.update(kind="list", kind_reason=why)
        else:
            p["kind"] = "content"
    return pages


def build_site(out: Path):
    out = Path(out)
    info = json.loads((out / "site.json").read_text("utf-8"))
    copy_ui(out)
    root = archive_root(out)
    sm = site_meta(info)
    pages = []
    by_url = {}
    for p in info["pages"]:
        folder = out / "pages" / p["folder"] if p.get("folder") else None
        th = None
        if folder and shot(folder, "desktop"):
            if not (folder / "thumb.jpg").exists():
                thumb(folder / shot(folder, "desktop"), folder / "thumb.jpg")
            th = f"pages/{p['folder']}/thumb.jpg" if (folder / "thumb.jpg").exists() else None
        path = urlsplit(p["url"]).path.strip("/")
        row = {k: p.get(k) for k in ("id", "url", "title", "depth", "status", "words", "images", "forms", "orphan", "error", "redirected", "final_url", "folder")}
        row.update({"section": unquote(path.split("/")[0]) if path else "(home)", "thumb": th,
                    "href": f"pages/{p['folder']}/index.html" if folder and (folder / "data.json").exists() else (p.get("url"))})
        pages.append(row)
        by_url[p["url"]] = row
        if p.get("final_url"):
            by_url.setdefault(p["final_url"], row)
    classify_pages(pages)
    reg = out / "registers"
    payload = {
        "site": {**sm, "started": info["started"], "finished": info["finished"], "counts": info["counts"], "platform_hints": info.get("platform_hints", [])},
        "pages": pages,
        "rootHref": rel(root / "index.html", out),
        "registers": {"forms": read_csv(reg / "FORMS-AND-ROUTING.csv"), "contacts": read_csv(reg / "CONTACTS-EMAILS-PHONES.csv"),
                      "documents": read_csv(reg / "DOCUMENTS.csv"), "issues": read_csv(reg / "ISSUES.csv"),
                      "icons": read_csv(reg / "ICON-FONTS.csv"), "tracking": read_csv(reg / "TRACKING-IDS.csv")},
        "csvs": sorted(f.name for f in reg.glob("*.csv")) if reg.exists() else [],
    }
    (out / "index.html").write_text(shell(f"{sm['short']} archive", "_ui", "renderSite", payload), "utf-8")

    # one dissection page per captured page
    ids = [r for r in pages if r["folder"] and (out / "pages" / r["folder"] / "data.json").exists()]
    from crawl import Scope
    scope = Scope(info["config"], info["config"].get("recheck_origin"))
    for i, r in enumerate(ids):
        folder = out / "pages" / r["folder"]
        d = json.loads((folder / "data.json").read_text("utf-8"))
        if "content" not in d:
            continue
        s = d["summary"]
        links = []
        for l in d["links"]:
            href = l.get("href") or ""
            kind = "internal" if scope.same_host(href) else "external" if href.startswith("http") else (href.split(":")[0] if ":" in href[:12] else "anchor")
            n = scope.norm(href) if href.startswith("http") else None
            tgt = by_url.get(n) if n else None
            if tgt and tgt.get("folder"):
                l["local"] = f"../{tgt['folder']}/index.html"
                l["local_id"] = tgt["id"]
            l["kind"] = kind
            links.append(l)
        files = [(n, dsc) for n, dsc in [
            (shot(folder, "desktop"), "Full-page screenshot, desktop 1440px"), (shot(folder, "mobile"), "Full-page screenshot, mobile 390px @2x"),
            *[(f.name, "Popup/overlay that covered this page on load (hidden for the screenshots above)")
              for f in sorted(folder.glob("screenshot_popup*.jpg"))],
            ("snapshot.html", "Offline browsable copy (local assets, scripts removed)"), ("page.mhtml", "Single-file MHTML archive (open in Chrome/Edge)"),
            ("rendered.html", "DOM after JavaScript ran (original asset URLs)"), ("raw.html", "HTML exactly as served by the server"),
            ("content.md", "Copy document: SEO, page copy in order, image list, forms, links"), ("text.txt", "Visible text"), ("data.json", "Everything extracted (machine-readable)")]
            if n and (folder / n).exists()]
        P = {
            "site": sm, "page": s,
            "rootHref": rel(root / "index.html", folder), "siteHref": rel(out / "index.html", folder),
            "prev": {"id": ids[i - 1]["id"], "title": ids[i - 1]["title"], "href": f"../{ids[i - 1]['folder']}/index.html"} if i else None,
            "next": {"id": ids[i + 1]["id"], "title": ids[i + 1]["title"], "href": f"../{ids[i + 1]['folder']}/index.html"} if i + 1 < len(ids) else None,
            "meta": d["meta"], "content": d["content"], "images": d["images"], "svgs": d["svgs"], "iconFonts": d["iconFonts"],
            "media": d["media"], "links": links, "onclickNav": d.get("onclickNav", []), "forms": d["forms"],
            "emails": d.get("emails", []), "tracking_ids": d.get("tracking_ids", []), "platform_hints": d.get("platform_hints", []),
            "scripts": d.get("scripts", []), "styles": d.get("styles", []),
            "net_counts": dict(Counter(n["type"] for n in d.get("network", []))),
            "text": (folder / "text.txt").read_text("utf-8") if (folder / "text.txt").exists() else "",
            "shots": {"d": shot(folder, "desktop"), "m": shot(folder, "mobile")},
            "has_snapshot": (folder / "snapshot.html").exists(), "files": files,
        }
        (folder / "index.html").write_text(shell(f"{s['id']} {s.get('title') or ''}".replace("<", ""), rel(out / "_ui", folder), "renderPage", P), "utf-8")


def rel(target: Path, start: Path):
    import os
    return Path(os.path.relpath(target, start)).as_posix()


def build_master(root: Path):
    root = Path(root)
    copy_ui(root)
    sites = []
    for sj in sorted(list(root.glob("*/site.json")) + list(root.glob("04_RECHECKS/*/site.json"))):
        info = json.loads(sj.read_text("utf-8"))
        sm = site_meta(info)
        kinds = Counter(r["kind"] for r in classify_pages([dict(p) for p in info["pages"]]))
        sites.append({**sm, "href": rel(sj.parent / "index.html", root), "counts": {**info["counts"], "content": kinds["content"]}, "finished": info["finished"],
                      "platform_hints": info.get("platform_hints", [])})
    comps = []
    for cj in sorted(root.glob("05_COMPARISONS/*/compare.json")):
        c = json.loads(cj.read_text("utf-8"))
        comps.append({"href": rel(cj.parent / "index.html", root), "title": c["title"], "summary": c.get("summary", "")})
    (root / "index.html").write_text(shell("Lam Soon old-site archive", "_ui", "renderMaster",
                                           {"sites": sites, "comparisons": comps, "built": datetime.now().strftime("%Y-%m-%d %H:%M")}), "utf-8")


if __name__ == "__main__":
    sys.path.insert(0, str(HERE))
    r = Path(sys.argv[1] if len(sys.argv) > 1 else HERE.parent / "archive").resolve()
    for sj in list(r.glob("*/site.json")) + list(r.glob("04_RECHECKS/*/site.json")):
        print("rebuilding", sj.parent.name)
        build_site(sj.parent)
    build_master(r)
    print("ok", r / "index.html")

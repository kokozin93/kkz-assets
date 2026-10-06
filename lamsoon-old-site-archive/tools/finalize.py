"""Post-crawl processing: IDs, per-page asset folders, offline snapshots, content docs, CSV registers."""
import csv
import json
import os
import re
import shutil
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlsplit

from bs4 import BeautifulSoup

from crawl import CSS_URL_RE, log, now_iso, rel_href, sanitize

CSV_KW = {"newline": "", "encoding": "utf-8-sig"}  # utf-8-sig so Excel / Google Sheets read Thai correctly


def write_csv(path: Path, rows, fields=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = list(rows)
    fields = fields or (list(rows[0].keys()) if rows else ["(empty)"])
    with open(path, "w", **CSV_KW) as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: ("; ".join(map(str, v)) if isinstance(v, (list, tuple, set)) else v) for k, v in r.items()})


def classify(im, name):
    k = im.get("kind", "")
    if k == "favicon" or k.startswith("meta:"):
        return "meta-og-favicon"
    if k == "video-poster":
        return "video-posters"
    n = (name + " " + (im.get("alt") or "")).lower()
    if "logo" in n:
        return "logos"
    big = max(im.get("rendered_w") or 0, im.get("rendered_h") or 0)
    if (k.startswith("pseudo") or name.lower().endswith(".ico")
            or re.search(r"icon|ico[-_.]|tick|check|arrow|bullet|sprite|chevron|social|fb|facebook|instagram|youtube|line", n)
            or 0 < big <= 72):
        return "icons"
    if k == "css-bg" or k.startswith("data-attr"):
        return "backgrounds"
    return "images"


def link_or_copy(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        return
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def finalize_site(c):
    out = c.out
    store = c.assets
    log("  finalizing…")

    def lookup(u):
        if not u:
            return None
        for cand in (u, quote(unquote(u), safe=":/?&=%#@+,;~!$'()*"), unquote(u)):
            if store.has(cand):
                return store.path(cand)
        return None

    # ---------- page order + IDs ----------
    loaded = []
    for url, s in c.results.items():
        f = out / "pages" / s.get("folder", "") / "data.json" if s.get("folder") else None
        d = json.loads(f.read_text("utf-8")) if f and f.exists() else {"summary": s}
        d["summary"].update({k: v for k, v in s.items() if k in ("orphan", "depth", "parent", "found_via")})
        loaded.append(d)
    loaded.sort(key=lambda d: (d["summary"].get("depth", 99), unquote(urlsplit(d["summary"]["url"]).path), urlsplit(d["summary"]["url"]).query))
    page_by_url = {}
    for i, d in enumerate(loaded, 1):
        d["summary"]["id"] = f"P{i:03d}"
        page_by_url[d["summary"]["url"]] = d
        if d["summary"].get("final_url"):
            page_by_url.setdefault(c.scope.norm(d["summary"]["final_url"]), d)

    # ---------- offline CSS copies ----------
    css_offline = {}
    for url, m in list(store.map.items()):
        if not (m["ctype"] == "text/css" or m["file"].endswith(".css")) or m["file"].endswith(".offline.css"):
            continue
        p = store.root / m["file"]
        css = p.read_text("utf-8", errors="replace")

        def rw(mm, base=url, here=p.parent):
            ref = (mm.group(2) or mm.group(4) or "").strip()
            if not ref or ref.startswith(("data:", "#", "about:")):
                return mm.group(0)
            full = urljoin(base, ref)
            lp = lookup(full)
            if lp is None:
                return mm.group(0).replace(ref, full)
            r = rel_href(lp.with_name(lp.name + ".offline.css") if lp.suffix == ".css" else lp, here)
            return f'url("{r}")' if mm.group(2) is not None or mm.group(0).lower().startswith("url") else f'@import "{r}"'

        op = p.with_name(p.name + ".offline.css")
        op.write_text(CSS_URL_RE.sub(rw, css), "utf-8")
        css_offline[url] = op

    # ---------- per page ----------
    used_on = defaultdict(set)
    rows_inv, rows_forms, rows_contacts, rows_track, rows_icons, rows_issues, rows_imgs = [], [], [], [], [], [], []
    for d in loaded:
        s = d["summary"]
        pid = s["id"]
        if not s.get("folder") or "content" not in d:
            rows_issues.append({"page_id": pid, "url": s["url"], "issue": "capture failed", "detail": s.get("error")})
            rows_inv.append(inv_row(s, d))
            continue
        folder = out / "pages" / s["folder"]
        page_url = s.get("final_url") or s["url"]

        # per-page asset folder (what TDD asked for: everything a page needs in one place)
        seen, n = {}, 0
        for im in d["images"]:
            u = im.get("url")
            if not u:
                continue
            used_on[u].add(pid)
            src = lookup(u)
            if u in seen:
                im["local"] = seen[u]
                continue
            if src is None:
                im["local"] = None
                im["missing_reason"] = store.failed.get(u, "not downloaded")
                rows_issues.append({"page_id": pid, "url": s["url"], "issue": "image not saved", "detail": f"{u}  ({im['missing_reason']})"})
                continue
            n += 1
            cat = classify(im, src.name)
            dst = folder / "assets" / cat / f"{n:03d}_{sanitize(src.name, 80)}"
            link_or_copy(src, dst)
            im["local"] = dst.relative_to(folder).as_posix()
            im["category"] = cat
            im["bytes"] = src.stat().st_size
            if not im.get("natural_w"):
                try:
                    from PIL import Image
                    with Image.open(src) as pi:
                        im["natural_w"], im["natural_h"] = pi.size
                except Exception:
                    pass
            seen[u] = im["local"]
            rows_imgs.append({"page_id": pid, "n": n, "category": cat, "file": f"pages/{s['folder']}/{im['local']}",
                              "alt": im.get("alt"), "kind": im.get("kind"), "natural": f"{im.get('natural_w') or ''}x{im.get('natural_h') or ''}",
                              "rendered": f"{im.get('rendered_w') or ''}x{im.get('rendered_h') or ''}", "visible": im.get("visible"),
                              "region": im.get("region"), "link": im.get("link"), "original_url": u if not u.startswith("data:") else "data-uri"})
        for m in d["media"]:
            if m.get("url"):
                used_on[m["url"]].add(pid)
                src = lookup(m["url"])
                if src is not None:
                    dst = folder / "assets" / "video" / sanitize(src.name, 80)
                    link_or_copy(src, dst)
                    m["local"] = dst.relative_to(folder).as_posix()
        for svg in d["svgs"]:
            if (svg.get("rendered_w") or 0) <= 72:
                svg["category"] = "icons"

        # offline snapshot
        rendered = (folder / "rendered.html").read_text("utf-8") if (folder / "rendered.html").exists() else ""
        if rendered:
            (folder / "snapshot.html").write_text(make_snapshot(rendered, page_url, folder, lookup, css_offline, page_by_url, c, s), "utf-8")

        # content document
        (folder / "content.md").write_text(make_content_md(d, c), "utf-8")
        (folder / "data.json").write_text(json.dumps(d, ensure_ascii=False, indent=1), "utf-8")

        rows_inv.append(inv_row(s, d))
        for f in d["forms"]:
            if not f["field_count"] and not any(x["type"] == "hidden" for x in f["fields"]):
                continue
            rows_forms.append({"page_id": pid, "page_url": s["url"], "form": f["index"], "form_id": f.get("id") or f.get("name"),
                               "class": f.get("cls"), "method": f["method"], "action": f["action"], "visible": f["visible"],
                               "fields": [f"{x.get('label') or x.get('placeholder') or x.get('name')} ({x['type']}{', required' if x.get('required') else ''})"
                                          for x in f["fields"] if x["type"] not in ("hidden", "submit", "button")],
                               "hidden_fields": [f"{x.get('name')}={x.get('value')}" for x in f["fields"] if x["type"] == "hidden"],
                               "submit": [x.get("value") for x in f["fields"] if x["type"] in ("submit", "button")],
                               "emails_on_page": s.get("emails")})
        for l in d["links"]:
            hr = l.get("href") or ""
            if hr.startswith(("mailto:", "tel:")):
                rows_contacts.append({"page_id": pid, "page_url": s["url"], "type": hr.split(":")[0], "value": unquote(hr.split(":", 1)[1]), "link_text": l.get("text"), "region": l.get("region")})
        for e in s.get("emails") or []:
            rows_contacts.append({"page_id": pid, "page_url": s["url"], "type": "email-in-source", "value": e, "link_text": "", "region": ""})
        for t in d.get("tracking_ids") or []:
            rows_track.append({"page_id": pid, "page_url": s["url"], "tracking_id": t})
        for ic in d.get("iconFonts") or []:
            rows_icons.append({"page_id": pid, "page_url": s["url"], **ic})
        if s.get("status") and s["status"] >= 400:
            rows_issues.append({"page_id": pid, "url": s["url"], "issue": f"HTTP {s['status']}", "detail": s.get("parent")})
        if s.get("redirected"):
            rows_issues.append({"page_id": pid, "url": s["url"], "issue": "redirect", "detail": s.get("final_url")})
        for k in ("screenshot_error", "mobile_error", "mhtml_error"):
            if s.get(k):
                rows_issues.append({"page_id": pid, "url": s["url"], "issue": k, "detail": s[k]})
        if s.get("orphan"):
            rows_issues.append({"page_id": pid, "url": s["url"], "issue": "orphan (in sitemap/API, not linked from crawled pages)", "detail": "; ".join(s.get("found_via", []))})

    for u, v in c.out_of_scope.items():
        rows_issues.append({"page_id": "", "url": u, "issue": "same-host page outside this site's language/section scope (not captured here)", "detail": v.get("found_on")})

    # ---------- registers ----------
    reg = out / "registers"
    write_csv(reg / "PAGE-INVENTORY.csv", rows_inv)
    write_csv(reg / "FORMS-AND-ROUTING.csv", rows_forms, ["page_id", "page_url", "form", "form_id", "class", "method", "action", "visible", "fields", "hidden_fields", "submit", "emails_on_page"])
    write_csv(reg / "CONTACTS-EMAILS-PHONES.csv", rows_contacts, ["page_id", "page_url", "type", "value", "link_text", "region"])
    write_csv(reg / "IMAGES-PER-PAGE.csv", rows_imgs, ["page_id", "n", "category", "file", "alt", "kind", "natural", "rendered", "visible", "region", "link", "original_url"])
    write_csv(reg / "ICON-FONTS.csv", rows_icons, ["page_id", "page_url", "classes", "count", "region", "sample_text"])
    write_csv(reg / "TRACKING-IDS.csv", rows_track, ["page_id", "page_url", "tracking_id"])
    write_csv(reg / "ISSUES.csv", rows_issues, ["page_id", "url", "issue", "detail"])
    write_csv(reg / "DOCUMENTS.csv", [{"url": u, "local": v.get("local"), "found_on": v.get("found_on"), "error": v.get("error")} for u, v in c.documents.items()], ["url", "local", "found_on", "error"])
    write_csv(reg / "EXTERNAL-LINKS.csv", [{"url": u, **v} for u, v in sorted(c.external.items())], ["url", "text", "found_on"])
    write_csv(reg / "ASSETS-ALL.csv", [{"original_url": u if not u.startswith("data:") else "data-uri", "file": "_assets/" + m["file"], "bytes": m["bytes"], "ctype": m["ctype"], "sha1": m["sha1"], "used_on_pages": sorted(used_on.get(u, []))} for u, m in sorted(store.map.items())],
              ["original_url", "file", "bytes", "ctype", "sha1", "used_on_pages"])
    write_csv(reg / "ASSETS-FAILED.csv", [{"url": u, "reason": r} for u, r in store.failed.items()], ["url", "reason"])

    platform = sorted({p for d in loaded for p in d.get("platform_hints", [])})
    info = {
        "config": {k: v for k, v in c.cfg.items()},
        "started": c.started, "finished": now_iso(),
        "platform_hints": platform,
        "counts": {"pages": len(loaded), "ok": sum(1 for d in loaded if (d["summary"].get("status") or 0) and d["summary"]["status"] < 400),
                   "errors": sum(1 for d in loaded if not d["summary"].get("status") or d["summary"]["status"] >= 400),
                   "assets": len(store.map), "assets_failed": len(store.failed), "documents": len(c.documents),
                   "forms": len(rows_forms), "issues": len(rows_issues), "out_of_scope": len(c.out_of_scope),
                   "orphans": sum(1 for d in loaded if d["summary"].get("orphan"))},
        "pages": [d["summary"] for d in loaded],
    }
    (out / "site.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), "utf-8")
    from report import build_site
    build_site(out)
    log(f"  site done: {info['counts']}")


def inv_row(s, d):
    m = (d.get("meta") or {}).get("metas", {}) if d else {}
    p = urlsplit(s["url"]).path
    return {"page_id": s.get("id"), "depth": s.get("depth"), "section": unquote(p.strip("/").split("/")[0]) if p.strip("/") else "(home)",
            "title": s.get("title"), "h1": " | ".join(s.get("h1") or []), "live_url": s["url"], "url_decoded": unquote(s["url"]),
            "final_url": s.get("final_url"), "http": s.get("status"), "words_main": s.get("words"), "images": s.get("images"),
            "inline_svgs": s.get("svgs"), "icon_font_uses": s.get("icon_fonts"), "forms": s.get("forms"), "links": s.get("links"),
            "media_embeds": s.get("media"), "hidden_text_blocks": s.get("hidden_blocks"), "meta_description": m.get("description"),
            "found_via": s.get("found_via"), "orphan": s.get("orphan", False), "archive_folder": f"pages/{s.get('folder')}",
            "dissection_page": f"pages/{s.get('folder')}/index.html", "error": s.get("error"),
            "VERIFIED_BY": "", "VERIFIED_DATE": "", "RESULT (OK/ISSUE)": "", "NOTES": ""}


def make_snapshot(html, page_url, folder, lookup, css_offline, page_by_url, c, s):
    soup = BeautifulSoup(html, "lxml")
    for t in soup.find_all(["script", "base"]):
        t.decompose()
    for t in soup.find_all("meta", attrs={"http-equiv": re.compile("refresh|content-security-policy", re.I)}):
        t.decompose()

    def loc(u):
        if not u or u.startswith(("data:", "#", "javascript:", "mailto:", "tel:")):
            return None
        full = urljoin(page_url, u.strip())
        if full in css_offline:
            return rel_href(css_offline[full], folder)
        p = lookup(full)
        return rel_href(p, folder) if p else None

    def css_rw(text):
        def f(mm):
            ref = (mm.group(2) or mm.group(4) or "").strip()
            r = loc(ref)
            return f'url("{r}")' if r else mm.group(0).replace(ref, urljoin(page_url, ref)) if ref and not ref.startswith("data:") else mm.group(0)
        return CSS_URL_RE.sub(f, text)

    for t in soup.find_all(True):
        for a in ("src", "data-src", "data-lazy-src", "data-original", "poster", "data-bg", "data-background", "data-image"):
            if t.get(a):
                r = loc(t[a])
                if r:
                    t[a] = r
                elif not t[a].startswith(("data:", "#")):
                    t[a] = urljoin(page_url, t[a])
        if t.name == "img":
            lz = t.get("data-src") or t.get("data-lazy-src") or t.get("data-original")
            if lz and (not t.get("src") or t["src"].startswith("data:")):
                t["src"] = lz
            t.attrs.pop("loading", None)
        for a in ("srcset", "data-srcset"):
            if t.get(a):
                parts = []
                for cand in t[a].split(","):
                    bits = cand.strip().split()
                    if bits:
                        bits[0] = loc(bits[0]) or urljoin(page_url, bits[0])
                        parts.append(" ".join(bits))
                t[a] = ", ".join(parts)
        if t.get("style") and "url(" in t["style"]:
            t["style"] = css_rw(t["style"])
        if t.name == "link" and t.get("href"):
            r = loc(t["href"])
            t["href"] = r or urljoin(page_url, t["href"])
            t.attrs.pop("integrity", None)
        elif t.name in ("a", "area") and t.get("href"):
            raw = t["href"].strip()
            if raw.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue
            full = urljoin(page_url, raw)
            frag = "#" + full.split("#", 1)[1] if "#" in full else ""
            n = c.scope.norm(full)
            tgt = page_by_url.get(n)
            if tgt and tgt["summary"].get("folder"):
                t["href"] = rel_href(c.out / "pages" / tgt["summary"]["folder"] / "snapshot.html", folder) + frag
                t["data-live-href"] = full
            else:
                doc = c.documents.get(n) if n else None
                p = c.out / doc["local"] if doc and doc.get("local") else None
                t["href"] = rel_href(p, folder) if p else full
        elif t.name == "form" and t.get("action") is not None:
            t["action"] = urljoin(page_url, t["action"])
    for st in soup.find_all("style"):
        if st.string and "url(" in st.string:
            st.string = css_rw(st.string)
    badge = soup.new_tag("div", attrs={"style": "position:fixed;left:8px;bottom:8px;z-index:2147483647;background:#111;color:#fff;font:600 11px/1.3 system-ui,sans-serif;padding:6px 9px;border-radius:6px;opacity:.82;pointer-events:none"})
    badge.string = f"OFFLINE SNAPSHOT · {s['id']} · captured {s.get('captured_at', '')[:16]} · scripts removed"
    if soup.body:
        soup.body.append(badge)
    return "<!-- Offline snapshot of " + page_url + " captured " + s.get("captured_at", "") + ". Scripts removed; assets point to local copies. -->\n" + str(soup)


def make_content_md(d, c):
    s, m = d["summary"], d["meta"]
    mt = m.get("metas", {})
    L = [f"# {s['id']} — {s.get('title') or '(no title)'}", "",
         f"- **Live URL:** {unquote(s['url'])}",
         f"- **Site:** {c.cfg['label']}  ·  **Depth from home:** {s.get('depth')}  ·  **HTTP:** {s.get('status')}",
         f"- **Captured:** {s.get('captured_at')}",
         f"- **Words (main):** {s.get('words')}  ·  **Images:** {s.get('images')}  ·  **Forms:** {s.get('forms')}", "",
         "## SEO / meta", "",
         f"| Field | Value |", "|---|---|",
         f"| Title | {esc(m.get('title'))} |", f"| Meta description | {esc(mt.get('description'))} |",
         f"| Meta keywords | {esc(mt.get('keywords'))} |", f"| OG title | {esc(mt.get('og:title'))} |",
         f"| OG description | {esc(mt.get('og:description'))} |", f"| OG image | {esc(mt.get('og:image'))} |",
         f"| Canonical | {esc(m.get('canonical'))} |", f"| H1 | {esc(' / '.join(m.get('h1') or []))} |",
         f"| hreflang | {esc(', '.join(a['hreflang'] + '→' + unquote(a['href'] or '') for a in m.get('alternates') or []))} |", "",
         "## Page copy — main content (DOM order)", "",
         "> Blocks marked _[hidden]_ exist in the page but were not visible at capture (carousel slides, tabs, accordions, mobile-only).", ""]
    for b in d["content"]:
        if b["region"] != "main":
            continue
        txt = b["text"]
        hid = "" if b["visible"] else "_[hidden]_ "
        if b.get("heading"):
            L.append(f"{'#' * min(6, int(b['heading'][1]) + 2)} {hid}{txt}")
        elif b["tag"] == "li":
            L.append(f"- {hid}{txt}")
        else:
            L.append(f"{hid}{txt}")
        if b.get("link"):
            L[-1] += f"  ↗ <{unquote(b['link'])}>"
        L.append("")
    L += ["## Images on this page", "", "| # | Local file | Category | Alt text | Rendered | Natural | Visible | Original URL |", "|---|---|---|---|---|---|---|---|"]
    seen, i = set(), 0
    for im in d["images"]:
        if im.get("url") in seen:
            continue
        seen.add(im.get("url"))
        i += 1
        ou = "data-uri" if (im.get("url") or "").startswith("data:") else unquote(im.get("url") or "")
        L.append(f"| {i} | {im.get('local') or '**NOT SAVED**'} | {im.get('category', '')} | {esc(im.get('alt'))} | {im.get('rendered_w') or ''}×{im.get('rendered_h') or ''} | {im.get('natural_w') or ''}×{im.get('natural_h') or ''} | {'yes' if im.get('visible') else 'no'} | {esc(ou)} |")
    if d["svgs"]:
        L += ["", f"Inline SVG icons: {len(d['svgs'])} saved in `assets/svg-inline/`."]
    if d["iconFonts"]:
        L += ["", "Icon-font glyphs used (not image files — need replacement icons): " + ", ".join(f"`{x['classes']}`×{x['count']}" for x in d["iconFonts"])]
    if d["media"]:
        L += ["", "## Video / embeds", ""] + [f"- {x['kind']}: {unquote(x.get('url') or '')}" + (f" → `{x['local']}`" if x.get("local") else "") for x in d["media"]]
    if any(f["field_count"] for f in d["forms"]):
        L += ["", "## Forms (routing check)", ""]
        for f in d["forms"]:
            if not f["field_count"]:
                continue
            L += [f"**Form {f['index']}** `{f.get('id') or f.get('name') or ''}` — {f['method']} → {f['action']}", ""]
            for x in f["fields"]:
                if x["type"] == "hidden":
                    L.append(f"- hidden `{x.get('name')}` = `{x.get('value')}`")
                else:
                    L.append(f"- {x.get('label') or x.get('placeholder') or x.get('name')} — {x['type']}{' (required)' if x.get('required') else ''}" + (f" options: {', '.join(x['options'][:20])}" if x.get("options") else ""))
            L.append("")
        L.append("> Where the form actually delivers (recipient inbox) is server-side and NOT visible from the front end. Confirm with client / IT before 31 Oct.")
    L += ["", "## Links on this page", "", "| Region | Text | Target |", "|---|---|---|"]
    for l in d["links"]:
        L.append(f"| {l.get('region')} | {esc(l.get('text'))[:80]} | {esc(unquote(l.get('href') or ''))} |")
    L += ["", "## Global copy (header / nav / footer)", ""]
    for b in d["content"]:
        if b["region"] != "main":
            L.append(f"- [{b['region']}] {b['text']}")
    return "\n".join(L) + "\n"


def esc(v):
    return (str(v) if v is not None else "").replace("|", "\\|").replace("\n", " ")

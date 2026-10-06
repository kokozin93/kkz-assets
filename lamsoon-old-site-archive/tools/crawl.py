#!/usr/bin/env python3
"""
Lam Soon old-site archiver.

Crawls the old Lam Soon front ends (MY / TH-EN / TH-TH) and writes, per page:
  raw.html (as served), rendered.html (after JS), page.mhtml (single-file archive),
  snapshot.html (offline, assets rewritten to local copies), desktop + mobile full-page
  screenshots, content.md (copy document), data.json (everything extracted), assets/ (per-page
  images, icons, backgrounds, inline SVGs, video posters).
Plus site-level inventory CSVs and the HTML dissection dashboards (see report.py).

Usage:
  python crawl.py --site my                 # one site
  python crawl.py --site all                # MY, TH-EN, TH-TH
  python crawl.py --site my --max-pages 20  # quick trial
  python crawl.py --site my --resume        # continue an interrupted crawl
  python crawl.py --recheck archive/01_MY_lamsoon-com-my --origin https://mirror.example.com --label juno-mirror
        # re-capture the exact same page list on another origin (e.g. Juno's flat-HTML copy), then run compare.py
"""
import argparse
import asyncio
import base64
import csv
import hashlib
import json
import mimetypes
import os
import re
import shutil
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qsl, quote, unquote, urlencode, urljoin, urlsplit, urlunsplit

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
EXTRACT_JS = (HERE / "extract.js").read_text(encoding="utf-8")

DOC_EXT = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".rar", ".7z", ".csv", ".txt", ".rtf"}
MEDIA_EXT = {".mp4", ".webm", ".mov", ".m4v", ".mp3", ".wav", ".ogg"}
IMG_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".tif", ".tiff"}
STATIC_EXT = {".css", ".js", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".map", ".xml", ".json"}
NON_PAGE_EXT = DOC_EXT | MEDIA_EXT | IMG_EXT | STATIC_EXT
TRACKING_Q = re.compile(r"^(utm_|fbclid$|gclid$|_ga$|mc_|_hs|ref$)", re.I)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
TRACK_RE = re.compile(r"\b(UA-\d{4,10}-\d{1,4}|G-[A-Z0-9]{8,12}|GTM-[A-Z0-9]{5,8}|AW-\d{6,12}|DC-\d{6,10})\b")
FBPIXEL_RE = re.compile(r"fbq\(\s*['\"]init['\"]\s*,\s*['\"](\d{8,20})['\"]")
CSS_URL_RE = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)|@import\s+(['\"])(.*?)\3", re.I)
WIN_RESERVED = {"con", "prn", "aux", "nul"} | {f"com{i}" for i in range(1, 10)} | {f"lpt{i}" for i in range(1, 10)}

DESKTOP = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}
MOBILE_UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
             "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")
DESKTOP_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
POPUP_TEXT = re.compile(r"^(accept( all)?( cookies)?|i accept|agree|i agree|allow( all)?|got it|ok|okay|close|"
                        r"ยอมรับ(ทั้งหมด)?|ตกลง|ยินยอม|ปิด|อนุญาต(ทั้งหมด)?)$", re.I)


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def h(s, n=8):
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:n]


def now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def sanitize(seg, maxlen=90):
    seg = unquote(seg)
    seg = re.sub(r'[<>:"/\\|?*\x00-\x1f%#&{}^~`\[\]]', "_", seg).strip(" .")
    if not seg:
        seg = "_"
    if seg.split(".")[0].lower() in WIN_RESERVED:
        seg = "_" + seg
    if len(seg) > maxlen:
        stem, ext = os.path.splitext(seg)
        ext = ext[:10]
        seg = stem[: maxlen - len(ext) - 9] + "_" + h(seg, 8) + ext
    return seg


def ascii_slug(path, query=""):
    p = unquote(path).strip("/")
    s = re.sub(r"[^A-Za-z0-9]+", "-", p.replace("/", "__")).strip("-_").lower()
    s = re.sub(r"-{2,}", "-", s)
    if not p:
        s = "home"
    if not s or len(s) < len(p) * 0.5:  # mostly non-ASCII (e.g. Thai slug)
        s = (s + "-" if s else "") + "u"
    if query:
        s += "__q-" + re.sub(r"[^A-Za-z0-9]+", "-", unquote(query))[:30].strip("-").lower()
    return s[:70].strip("-_")


def ext_of(url):
    return os.path.splitext(urlsplit(url).path)[1].lower()


def rel_href(target: Path, start_dir: Path) -> str:
    r = os.path.relpath(target, start_dir)
    return "/".join(p if p == ".." else quote(p, safe="") for p in r.split(os.sep))


class Scope:
    def __init__(self, cfg, origin_override=None):
        self.cfg = cfg
        self.hosts = set(cfg["allow_hosts"])
        self.canonical_host = cfg["canonical_host"]
        self.scheme = urlsplit(cfg["start"][0]).scheme
        if origin_override:
            o = urlsplit(origin_override)
            self.hosts = {o.netloc.lower()}
            self.canonical_host = o.netloc.lower()
            self.scheme = o.scheme
        self.include = cfg.get("include_prefixes", ["/"])
        self.exclude = [e.lower() for e in cfg.get("exclude_prefixes", [])]

    def norm(self, url):
        if not url:
            return None
        try:
            s = urlsplit(url.strip())
        except ValueError:
            return None
        if s.scheme not in ("http", "https"):
            return None
        host = (s.netloc or "").lower()
        if host in self.hosts:
            host = self.canonical_host
            scheme = self.scheme
        else:
            scheme = s.scheme
        path = quote(unquote(s.path or "/"), safe="/:@!$&'()*+,;=-._~")
        q = [(k, v) for k, v in parse_qsl(s.query, keep_blank_values=True) if not TRACKING_Q.match(k)]
        return urlunsplit((scheme, host, path, urlencode(q, doseq=True), ""))

    def same_host(self, url):
        return urlsplit(url).netloc.lower() in self.hosts

    def in_scope(self, url):
        s = urlsplit(url)
        if s.netloc.lower() not in self.hosts:
            return False
        p = s.path or "/"
        pl = unquote(p).lower()
        if any(pl.startswith(e) for e in self.exclude):
            return False
        if ext_of(url) in NON_PAGE_EXT:
            return False
        if re.search(r"/(wp-admin|wp-login\.php|xmlrpc\.php|wp-json|feed)(/|$)", pl):
            return False
        if re.search(r"(^|&)(replytocom|share|print|s)=", s.query):
            return False
        return any(p == inc.rstrip("/") or p.startswith(inc) for inc in self.include)

    def key(self, url):
        """origin-independent key used to pair pages between two captures"""
        s = urlsplit(url)
        return urlunsplit(("", "", s.path or "/", s.query, ""))


class AssetStore:
    """Site-wide de-duplicated mirror of every asset: _assets/<host>/<path>."""

    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self.mpath = root / "_manifest.json"
        self.map = json.loads(self.mpath.read_text("utf-8")) if self.mpath.exists() else {}
        self.failed = {}
        self.lock = asyncio.Lock()

    def save_manifest(self):
        self.mpath.write_text(json.dumps(self.map, ensure_ascii=False, indent=1), "utf-8")

    def _target(self, url, ctype=""):
        if url.startswith("data:"):
            m = re.match(r"data:([\w/+.-]+)", url)
            ext = mimetypes.guess_extension((m.group(1) if m else "") or "") or ".bin"
            if m and m.group(1) == "image/svg+xml":
                ext = ".svg"
            return self.root / "_inline-data" / f"data_{h(url, 12)}{ext}"
        s = urlsplit(url)
        parts = [sanitize(p) for p in s.path.split("/") if p] or ["index"]
        name = parts[-1]
        stem, ext = os.path.splitext(name)
        if s.query:
            name = f"{stem}__q{h(s.query)}{ext}"
        if not ext:
            g = mimetypes.guess_extension((ctype or "").split(";")[0].strip()) or ""
            name += {".jpe": ".jpg"}.get(g, g)
        return self.root / sanitize(s.netloc) / Path(*parts[:-1]) / name if len(parts) > 1 else self.root / sanitize(s.netloc) / name

    def has(self, url):
        return url in self.map and (self.root / self.map[url]["file"]).exists()

    def path(self, url):
        return self.root / self.map[url]["file"] if url in self.map else None

    def put(self, url, body: bytes, ctype="", source="network"):
        if url in self.map:
            return self.root / self.map[url]["file"]
        t = self._target(url, ctype)
        try:
            if t.exists() and t.is_dir():
                t = t.with_name(t.name + "__file")
            t.parent.mkdir(parents=True, exist_ok=True)
        except (FileExistsError, NotADirectoryError):
            t = self.root / "_flat" / f"{h(url)}_{sanitize(t.name)}"
            t.parent.mkdir(parents=True, exist_ok=True)
        t.write_bytes(body)
        self.map[url] = {"file": t.relative_to(self.root).as_posix(), "bytes": len(body),
                         "ctype": (ctype or "").split(";")[0], "sha1": hashlib.sha1(body).hexdigest(), "via": source}
        return t

    async def fetch(self, request, url, max_bytes, referer=None):
        if self.has(url) or url in self.failed:
            return self.path(url)
        if url.startswith("data:"):
            try:
                head, data = url.split(",", 1)
                body = base64.b64decode(data) if ";base64" in head else unquote(data).encode("utf-8")
                return self.put(url, body, head[5:].split(";")[0], "data-uri")
            except Exception as e:  # noqa
                self.failed[url] = f"data-uri decode: {e}"
                return None
        try:
            r = await request.get(url, timeout=90000, headers={"Referer": referer} if referer else None, max_redirects=10)
            if r.status >= 400:
                self.failed[url] = f"HTTP {r.status}"
                return None
            cl = int(r.headers.get("content-length") or 0)
            if cl and cl > max_bytes:
                self.failed[url] = f"skipped: {cl} bytes > limit"
                return None
            body = await r.body()
            return self.put(url, body, r.headers.get("content-type", ""), "fetch")
        except Exception as e:  # noqa
            self.failed[url] = f"{type(e).__name__}: {str(e)[:160]}"
            return None


# --------------------------------------------------------------------------------------------
class Crawler:
    def __init__(self, cfg, out_dir: Path, args, origin_override=None, fixed_urls=None):
        self.cfg = cfg
        self.args = args
        self.out = out_dir
        self.scope = Scope(cfg, origin_override)
        self.pages_dir = out_dir / "pages"
        self.assets = AssetStore(out_dir / "_assets")
        self.docs_dir = out_dir / "_documents"
        self.queue = asyncio.Queue()
        self.seen = {}  # url -> {depth, found_via, parent}
        self.results = {}  # url -> summary
        self.out_of_scope = {}
        self.external = {}
        self.documents = {}
        self.fixed_urls = fixed_urls
        self.query_variants = {}
        self.shot_lock = asyncio.Lock()  # Chromium can return stale tiles if two pages screenshot at once
        self.pair_keys = {}  # recheck mode: captured url -> key of the original page it re-checks
        self.started = now_iso()

    # ---------------- discovery ----------------
    def enqueue(self, url, depth, via, parent=None):
        u = self.scope.norm(url)
        if not u:
            return
        if self.fixed_urls is None and not self.scope.in_scope(u):
            if self.scope.same_host(u):
                if ext_of(u) in DOC_EXT | MEDIA_EXT:
                    self.documents.setdefault(u, {"found_on": parent, "via": via})
                elif ext_of(u) not in NON_PAGE_EXT:
                    self.out_of_scope.setdefault(u, {"found_on": parent, "via": via})
            return
        if u in self.seen:
            if via not in self.seen[u]["found_via"]:
                self.seen[u]["found_via"].append(via)
            if depth < self.seen[u]["depth"]:  # e.g. listed in sitemap first, then found by link
                self.seen[u]["depth"] = depth
                self.seen[u]["parent"] = parent
            return
        base = u.split("?")[0]
        if "?" in u:
            self.query_variants[base] = self.query_variants.get(base, 0) + 1
            if self.query_variants[base] > self.args.max_query_variants:
                return
        if len(self.seen) >= self.args.max_pages:
            return
        self.seen[u] = {"depth": depth, "found_via": [via], "parent": parent}
        self.queue.put_nowait(u)

    async def discover_sitemaps(self, request):
        found = []
        origin = f"{self.scope.scheme}://{self.scope.canonical_host}"
        cands = [origin + p for p in self.cfg.get("sitemaps", [])]
        try:
            r = await request.get(origin + "/robots.txt", timeout=30000)
            if r.ok:
                txt = await r.text()
                (self.out / "_discovery").mkdir(parents=True, exist_ok=True)
                (self.out / "_discovery" / "robots.txt").write_text(txt, "utf-8")
                cands += [l.split(":", 1)[1].strip() for l in txt.splitlines() if l.lower().startswith("sitemap:")]
        except Exception as e:  # noqa
            log("  robots.txt:", e)
        done = set()
        while cands:
            sm = cands.pop(0)
            if sm in done or len(done) > 200:
                continue
            done.add(sm)
            try:
                r = await request.get(sm, timeout=60000)
                if not r.ok:
                    continue
                body = await r.body()
                d = self.out / "_discovery" / "sitemaps"
                d.mkdir(parents=True, exist_ok=True)
                (d / sanitize(urlsplit(sm).path.strip("/") or "sitemap.xml")).write_bytes(body)
                root = ET.fromstring(body)
            except Exception:
                continue
            ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            for loc in root.findall(".//s:sitemap/s:loc", ns):
                cands.append(loc.text.strip())
            for loc in root.findall(".//s:url/s:loc", ns):
                found.append(loc.text.strip())
        log(f"  sitemaps: {len(done)} checked, {len(found)} URLs listed")
        return found

    async def discover_wp_api(self, request):
        """WordPress REST API = closest thing to a DB export available from the front end."""
        origin = f"{self.scope.scheme}://{self.scope.canonical_host}"
        d = self.out / "_wp-api"
        d.mkdir(parents=True, exist_ok=True)
        links = []
        try:
            r = await request.get(origin + "/wp-json/wp/v2/types", timeout=60000)
            types = await r.json() if r.ok else {}
        except Exception as e:  # noqa
            log("  wp-api types:", e)
            types = {}
        bases = {v.get("rest_base"): k for k, v in (types or {}).items() if isinstance(v, dict) and v.get("rest_base")}
        bases.setdefault("pages", "page")
        bases.setdefault("posts", "post")
        media_rows = []
        for base, tname in bases.items():
            items, page = [], 1
            while page < 200:
                try:
                    r = await request.get(f"{origin}/wp-json/wp/v2/{base}?per_page=100&page={page}", timeout=90000)
                    if not r.ok:
                        break
                    batch = await r.json()
                except Exception:
                    break
                if not isinstance(batch, list) or not batch:
                    break
                items += batch
                if len(batch) < 100:
                    break
                page += 1
            if not items:
                continue
            (d / f"{sanitize(base)}.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), "utf-8")
            for it in items:
                if base == "media":
                    media_rows.append({"id": it.get("id"), "title": (it.get("title") or {}).get("rendered"),
                                       "alt": it.get("alt_text"), "mime": it.get("mime_type"),
                                       "url": it.get("source_url"), "date": it.get("date"),
                                       "attached_to": it.get("post")})
                elif it.get("link"):
                    links.append((it["link"], tname))
            log(f"  wp-api: {base}: {len(items)} items")
        if media_rows:
            with open(d / "media-library.csv", "w", newline="", encoding="utf-8-sig") as f:
                w = csv.DictWriter(f, fieldnames=list(media_rows[0].keys()))
                w.writeheader()
                w.writerows(media_rows)
        return links

    # ---------------- capture ----------------
    async def dismiss_popups(self, page):
        try:
            for b in await page.query_selector_all("button, a.button, a.btn, [role=button], input[type=button], input[type=submit]"):
                try:
                    t = ((await b.inner_text()) or (await b.get_attribute("value")) or "").strip()
                except Exception:
                    continue
                if t and len(t) < 30 and POPUP_TEXT.match(t) and await b.is_visible():
                    form = await b.evaluate("e => !!e.closest('form') && !/cookie|consent|pdpa|gdpr/i.test(e.closest('form').outerHTML.slice(0,2000))")
                    if form:
                        continue
                    await b.click(timeout=1500)
                    await page.wait_for_timeout(400)
        except Exception:
            pass

    async def autoscroll(self, page):
        await page.evaluate("""async () => {
            document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager');
            const step = Math.max(300, window.innerHeight * 0.8);
            let y = 0, guard = 0;
            while (y < document.documentElement.scrollHeight && guard++ < 200) {
                window.scrollTo(0, y); y += step; await new Promise(r => setTimeout(r, 120));
            }
            window.scrollTo(0, 0);
        }""")
        try:
            await page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass
        await page.wait_for_timeout(600)

    async def capture(self, url, ctx, mctx):
        meta = self.seen[url]
        key = self.scope.key(url)
        folder = self.pages_dir / f"{ascii_slug(urlsplit(url).path, urlsplit(url).query)}__{h(key, 6)}"
        if self.args.resume and (folder / "data.json").exists():
            d = json.loads((folder / "data.json").read_text("utf-8"))
            st = d.get("summary", {}).get("status") or 0
            # only skip good captures; failed pages, timeouts and 5xx (e.g. 508 host throttling) are retried
            if "content" in d and 0 < st < 500:
                self.results[url] = d["summary"]
                for l in d.get("links", []):
                    self.enqueue(l.get("href"), meta["depth"] + 1, "link", url)
                return
            log(f"  ↻ retrying previously failed page (status {st or 'error'}): {url}")
        folder.mkdir(parents=True, exist_ok=True)
        page = await ctx.new_page()
        net_tasks, net_log = [], []

        async def on_resp(resp):
            try:
                rt = resp.request.resource_type
                net_log.append({"url": resp.url, "type": rt, "status": resp.status,
                                "ctype": resp.headers.get("content-type", "")})
                if rt in ("image", "font", "stylesheet", "media") and resp.status == 200 and not self.assets.has(resp.url):
                    body = await resp.body()
                    async with self.assets.lock:
                        self.assets.put(resp.url, body, resp.headers.get("content-type", ""), "network")
            except Exception:
                pass

        page.on("response", lambda r: net_tasks.append(asyncio.ensure_future(on_resp(r))))
        summary = {"url": url, "key": key, "pair_key": self.pair_keys.get(url, key), "folder": folder.name, "depth": meta["depth"],
                   "found_via": meta["found_via"], "parent": meta["parent"], "captured_at": now_iso()}
        try:
            resp = None
            try:
                resp = await page.goto(url, wait_until="networkidle", timeout=self.args.timeout * 1000)
            except Exception:
                resp = await page.goto(url, wait_until="load", timeout=self.args.timeout * 1000)
            summary["status"] = resp.status if resp else None
            summary["final_url"] = page.url
            summary["redirected"] = self.scope.norm(page.url) != url
            summary["content_type"] = resp.headers.get("content-type", "") if resp else ""
            summary["server"] = resp.headers.get("server", "") if resp else ""
            summary["x_powered_by"] = resp.headers.get("x-powered-by", "") if resp else ""
            summary["x_frame_options"] = resp.headers.get("x-frame-options", "") if resp else ""
            raw = ""
            if resp:
                try:
                    raw = await resp.text()
                except Exception:
                    raw = ""
            (folder / "raw.html").write_text(raw, "utf-8")
            if self.args.dismiss_popups:
                await self.dismiss_popups(page)
            await self.autoscroll(page)
            data = await page.evaluate(EXTRACT_JS)
            rendered = await page.content()
            (folder / "rendered.html").write_text(rendered, "utf-8")
            (folder / "text.txt").write_text(data.pop("text_visible") or "", "utf-8")
            try:
                cdp = await ctx.new_cdp_session(page)
                snap = await cdp.send("Page.captureSnapshot", {"format": "mhtml"})
                (folder / "page.mhtml").write_text(snap["data"], "utf-8")
                await cdp.detach()
            except Exception as e:  # noqa
                summary["mhtml_error"] = str(e)[:200]
            await page.evaluate("window.scrollTo(0,0)")
            shot = folder / f"screenshot_desktop.{self.args.shot_format}"
            try:
                async with self.shot_lock:
                    await page.bring_to_front()
                    await page.wait_for_timeout(250)
                    await page.screenshot(path=str(shot), full_page=True, animations="disabled",
                                          type="jpeg" if self.args.shot_format == "jpg" else "png",
                                          **({"quality": 88} if self.args.shot_format == "jpg" else {}), timeout=120000)
            except Exception as e:  # noqa
                summary["screenshot_error"] = str(e)[:200]
            if mctx is not None:
                mp = await mctx.new_page()
                try:
                    try:
                        await mp.goto(page.url, wait_until="networkidle", timeout=self.args.timeout * 1000)
                    except Exception:
                        await mp.goto(page.url, wait_until="load", timeout=self.args.timeout * 1000)
                    if self.args.dismiss_popups:
                        await self.dismiss_popups(mp)
                    await self.autoscroll(mp)
                    async with self.shot_lock:
                        await mp.bring_to_front()
                        await mp.wait_for_timeout(250)
                        await mp.screenshot(path=str(folder / f"screenshot_mobile.{self.args.shot_format}"), full_page=True,
                                            animations="disabled", type="jpeg" if self.args.shot_format == "jpg" else "png",
                                            **({"quality": 85} if self.args.shot_format == "jpg" else {}), timeout=120000)
                except Exception as e:  # noqa
                    summary["mobile_error"] = str(e)[:200]
                finally:
                    await mp.close()
        except Exception as e:  # noqa
            summary["error"] = f"{type(e).__name__}: {str(e)[:300]}"
            data = None
        finally:
            if net_tasks:
                await asyncio.gather(*net_tasks, return_exceptions=True)
            await page.close()

        if data is None:
            summary.setdefault("status", None)
            (folder / "data.json").write_text(json.dumps({"summary": summary}, ensure_ascii=False, indent=1), "utf-8")
            self.results[url] = summary
            log(f"  ✗ {url}  {summary.get('error')}")
            return

        # follow links
        if self.fixed_urls is None:
            for l in data["links"] + data["onclickNav"]:
                if l.get("href"):
                    self.enqueue(l["href"], meta["depth"] + 1, "link", url)
            for f in data["forms"]:
                if f.get("method") == "GET" and f.get("action"):
                    pass  # search forms etc: not followed
            for l in data["links"]:
                hr = l.get("href") or ""
                n = self.scope.norm(hr)
                if n and not self.scope.same_host(n) and urlsplit(n).scheme in ("http", "https"):
                    self.external.setdefault(n, {"text": l.get("text"), "found_on": url})

        # make sure every referenced image exists locally (lazy, srcset variants, hover backgrounds...)
        for im in data["images"]:
            if im.get("url") and not self.assets.has(im["url"]):
                await self.assets.fetch(ctx.request, im["url"], self.args.max_asset_mb * 1024 * 1024, url)
        for m in data["media"]:
            if m.get("url") and m["kind"] in ("video", "audio") and self.args.videos:
                await self.assets.fetch(ctx.request, m["url"], self.args.max_video_mb * 1024 * 1024, url)
        for s in data["styles"]:
            if s and not self.assets.has(s):
                await self.assets.fetch(ctx.request, s, 20 * 1024 * 1024, url)

        # tracking / emails / platform fingerprints
        blob = raw + "\n" + rendered + "\n" + data.get("inlineJs", "")
        data["emails"] = sorted({e for e in EMAIL_RE.findall(blob) if not re.search(r"\.(png|jpe?g|gif|svg|webp)$", e, re.I)})
        data["tracking_ids"] = sorted(set(TRACK_RE.findall(blob)) | {"FB-Pixel:" + x for x in FBPIXEL_RE.findall(blob)})
        data["platform_hints"] = sorted({k for k, rx in {
            "WordPress": r"wp-content|wp-includes", "ASP.NET": r"__VIEWSTATE|\.aspx|ASP\.NET|WebResource\.axd",
            "Elementor": r"elementor", "WPML": r"wpml", "Polylang": r"polylang|pll_", "Contact Form 7": r"wpcf7",
            "jQuery": r"jquery", "Bootstrap": r"bootstrap", "Google Tag Manager": r"googletagmanager",
            "Umbraco": r"umbraco", "Sitefinity": r"sitefinity", "Kentico": r"kentico", "DotNetNuke": r"dnn|dotnetnuke"}.items()
            if re.search(rx, blob, re.I)} | ({"Server: " + summary["server"]} if summary.get("server") else set())
            | ({"X-Powered-By: " + summary["x_powered_by"]} if summary.get("x_powered_by") else set()))
        data.pop("inlineJs", None)
        data["network"] = net_log

        # inline SVGs -> files
        for i, s in enumerate(data["svgs"], 1):
            p = folder / "assets" / "svg-inline" / f"{i:03d}_svg_{s.get('rendered_w', 0)}x{s.get('rendered_h', 0)}.svg"
            p.parent.mkdir(parents=True, exist_ok=True)
            svg = s.pop("svg")
            if "xmlns=" not in svg[:300]:
                svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"', 1)
            p.write_text(svg, "utf-8")
            s["local"] = p.relative_to(folder).as_posix()

        summary.update({
            "title": data["meta"]["title"], "h1": data["meta"]["h1"][:3], "lang": data["meta"]["lang"],
            "words": sum(len(c["text"].split()) if re.search(r"[A-Za-z]", c["text"]) else len(c["text"]) // 6
                         for c in data["content"] if c["region"] == "main"),
            "blocks": len(data["content"]), "hidden_blocks": sum(1 for c in data["content"] if not c["visible"]),
            "images": len({i["url"] for i in data["images"] if i["kind"] not in ("favicon",) and not i["kind"].startswith("meta:")}),
            "svgs": len(data["svgs"]), "icon_fonts": sum(x["count"] for x in data["iconFonts"]),
            "links": len(data["links"]), "forms": len([f for f in data["forms"] if f["field_count"]]),
            "media": len(data["media"]), "emails": data["emails"], "page_h": data["page_size"]["h"],
        })
        data["summary"] = summary
        (folder / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), "utf-8")
        self.results[url] = summary
        log(f"  ✓ [{len(self.results)}/{len(self.seen)}] d{meta['depth']} {summary.get('status')} {url}  "
            f"({summary['words']}w, {summary['images']} img)")

    async def worker(self, ctx, mctx):
        while True:
            url = await self.queue.get()
            try:
                await self.capture(url, ctx, mctx)
                if self.args.delay:
                    await asyncio.sleep(self.args.delay)
            except Exception as e:  # noqa
                log("  worker error", url, e)
                self.results.setdefault(url, {"url": url, "error": str(e)[:300], "depth": self.seen[url]["depth"]})
            finally:
                self.queue.task_done()

    async def run(self):
        self.out.mkdir(parents=True, exist_ok=True)
        async with async_playwright() as pw:
            launch = {"headless": True}
            exe = os.environ.get("LSA_CHROMIUM") or self.args.chromium
            if exe:
                launch["executable_path"] = exe
            browser = await pw.chromium.launch(**launch)
            common = {"ignore_https_errors": True, "locale": "th-TH" if self.cfg.get("lang") == "th" else "en-US"}
            ctx = await browser.new_context(viewport=DESKTOP, user_agent=DESKTOP_UA, **common)
            mctx = None if self.args.no_mobile else await browser.new_context(
                viewport=MOBILE, user_agent=MOBILE_UA, is_mobile=True, has_touch=True, device_scale_factor=2, **common)

            if self.fixed_urls is not None:
                for u, depth, orig_key in self.fixed_urls:
                    n = self.scope.norm(u)
                    if n:
                        self.pair_keys[n] = orig_key
                    if n and n not in self.seen:
                        self.seen[n] = {"depth": depth, "found_via": ["recheck-list"], "parent": None}
                        self.queue.put_nowait(n)
            else:
                for s in self.cfg["start"]:
                    self.enqueue(s, 0, "start")
                if not self.args.no_sitemap:
                    for u in await self.discover_sitemaps(ctx.request):
                        self.enqueue(u, 99, "sitemap")
                if self.cfg.get("wp_api") and not self.args.no_wp_api:
                    for u, t in await self.discover_wp_api(ctx.request):
                        self.enqueue(u, 99, f"wp-api:{t}")
            log(f"  queue seeded with {self.queue.qsize()} URLs")
            workers = [asyncio.create_task(self.worker(ctx, mctx)) for _ in range(self.args.concurrency)]
            await self.queue.join()
            for w in workers:
                w.cancel()

            # pages only reachable through sitemap/API keep depth 99 -> mark as orphans
            for u, s in self.seen.items():
                if u in self.results:
                    self.results[u].update(depth=s["depth"], parent=s["parent"], found_via=s["found_via"], orphan=s["depth"] == 99)

            if not self.args.no_documents:
                log(f"  downloading {len(self.documents)} linked documents/media")
                dstore = AssetStore(self.docs_dir)
                for u in list(self.documents):
                    p = await dstore.fetch(ctx.request, u, self.args.max_video_mb * 1024 * 1024)
                    self.documents[u]["local"] = p.relative_to(self.out).as_posix() if p else None
                    self.documents[u]["error"] = dstore.failed.get(u)
                dstore.save_manifest()

            await self.complete_css(ctx.request)
            self.assets.save_manifest()
            await browser.close()
        self.finalize()

    async def complete_css(self, request):
        """Download everything stylesheets reference (fonts, hover/breakpoint backgrounds) for offline snapshots."""
        for _ in range(2):
            for url, m in list(self.assets.map.items()):
                if not (m["ctype"] == "text/css" or m["file"].endswith(".css")):
                    continue
                css = (self.assets.root / m["file"]).read_text("utf-8", errors="replace")
                for mm in CSS_URL_RE.finditer(css):
                    ref = (mm.group(2) or mm.group(4) or "").strip()
                    if not ref or ref.startswith(("data:", "#", "about:")):
                        continue
                    full = urljoin(url, ref)
                    if not self.assets.has(full):
                        await self.assets.fetch(request, full, self.args.max_asset_mb * 1024 * 1024, url)

    # ---------------- post-processing ----------------
    def finalize(self):
        from finalize import finalize_site  # local module
        finalize_site(self)


def load_sites():
    return json.loads((HERE / "sites.json").read_text("utf-8"))


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", default="all", help="my | th-en | th-th | all (comma-separated ok)")
    ap.add_argument("--out", default=str(ROOT / "archive"), help="output root (default: ../archive)")
    ap.add_argument("--max-pages", type=int, default=2000)
    ap.add_argument("--max-query-variants", type=int, default=60, help="cap pages per path that differ only by ?query")
    ap.add_argument("--concurrency", type=int, default=3)
    ap.add_argument("--delay", type=float, default=0.3, help="seconds between pages per worker (be polite)")
    ap.add_argument("--timeout", type=int, default=60, help="page load timeout, seconds")
    ap.add_argument("--shot-format", choices=["png", "jpg"], default="jpg")
    ap.add_argument("--no-mobile", action="store_true", help="skip mobile screenshots (2x faster)")
    ap.add_argument("--no-sitemap", action="store_true")
    ap.add_argument("--no-wp-api", action="store_true")
    ap.add_argument("--no-documents", action="store_true", help="don't download linked PDFs/docs/videos")
    ap.add_argument("--videos", action="store_true", default=True)
    ap.add_argument("--max-asset-mb", type=int, default=50)
    ap.add_argument("--max-video-mb", type=int, default=300)
    ap.add_argument("--dismiss-popups", action=argparse.BooleanOptionalAction, default=True)
    ap.add_argument("--resume", action="store_true", help="skip pages already captured in the output folder")
    ap.add_argument("--chromium", default=None, help="path to a Chromium binary (else Playwright's own)")
    ap.add_argument("--recheck", default=None, help="existing site archive folder whose page list to re-capture")
    ap.add_argument("--origin", default=None, help="with --recheck: origin to capture against, e.g. https://mirror.example.com")
    ap.add_argument("--label", default=None, help="with --recheck: name for this capture, e.g. juno-mirror or live-2026-10-20")
    ap.add_argument("--url-map", default=None, help="with --recheck: CSV original_url,new_url for renamed mirror pages")
    ap.add_argument("--config-override", default=None, help=argparse.SUPPRESS)  # JSON file; used by the self-test
    return ap.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    sys.path.insert(0, str(HERE))
    sites = load_sites()
    if args.config_override:
        sites = json.loads(Path(args.config_override).read_text("utf-8"))
    out_root = Path(args.out).resolve()
    out_root.mkdir(parents=True, exist_ok=True)

    if args.recheck:
        src = Path(args.recheck).resolve()
        info = json.loads((src / "site.json").read_text("utf-8"))
        cfg = dict(info["config"])
        label = args.label or ("recheck-" + datetime.now().strftime("%Y%m%d-%H%M"))
        origin = args.origin or f"{urlsplit(cfg['start'][0]).scheme}://{cfg['canonical_host']}"
        o = urlsplit(origin)
        fixed = []
        url_map = {}
        if args.url_map:  # CSV: original_url,new_url  (when the mirror renamed files, e.g. about.aspx -> about.html)
            with open(args.url_map, newline="", encoding="utf-8-sig") as f:
                for row in csv.reader(f):
                    if len(row) >= 2 and row[0].startswith("http"):
                        url_map[row[0].strip()] = row[1].strip()
        for p in info["pages"]:
            s = urlsplit(p["url"])
            new = url_map.get(p["url"]) or urlunsplit((o.scheme, o.netloc, (o.path.rstrip("/") + s.path) if o.path not in ("", "/") else s.path, s.query, ""))
            fixed.append((new, p.get("depth", 0), p["key"]))
        cfg["folder"] = f"{cfg['folder']}__{sanitize(label)}"
        cfg["label"] = f"{cfg['label']} - {label}"
        cfg["recheck_of"] = src.name
        cfg["recheck_origin"] = origin
        out = out_root / "04_RECHECKS" / cfg["folder"]
        log(f"RE-CHECK {len(fixed)} pages of {src.name} against {origin} -> {out}")
        c = Crawler(cfg, out, args, origin_override=origin if o.path in ("", "/") else f"{o.scheme}://{o.netloc}", fixed_urls=fixed)
        asyncio.run(c.run())
        return

    keys = list(sites) if args.site == "all" else [k.strip() for k in args.site.split(",")]
    for k in keys:
        if k not in sites:
            sys.exit(f"unknown site '{k}'. choose from: {', '.join(sites)}")
        cfg = dict(sites[k], key=k)
        out = out_root / cfg["folder"]
        log(f"=== {cfg['label']}  ->  {out}")
        c = Crawler(cfg, out, args)
        asyncio.run(c.run())
    from report import build_master
    build_master(out_root)
    log(f"DONE. Open {out_root / 'index.html'}")


if __name__ == "__main__":
    main()

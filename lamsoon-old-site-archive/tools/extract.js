// Runs inside the page (page.evaluate). Returns everything the dissection report needs.
// Captures hidden content too (carousels, tabs, accordions) and flags it with visible:false.
() => {
  const abs = (u) => { if (!u) return null; try { return new URL(u, document.baseURI).href; } catch (e) { return null; } };
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const isVisible = (el) => {
    if (!el || !el.getClientRects) return false;
    if (!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity || '1') > 0.01;
  };
  const REGION_TOKEN = /^(site-|main-|global-|top-)?(header|footer|navbar|nav|menu|topbar|top-bar)$/i;
  const regionOf = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const t = n.tagName.toLowerCase();
      const role = (n.getAttribute('role') || '').toLowerCase();
      if (t === 'header' && !n.closest('main,article')) return 'header';
      if (t === 'footer' && !n.closest('main,article')) return 'footer';
      if (t === 'nav' || role === 'navigation') return 'nav';
      if (role === 'banner') return 'header';
      if (role === 'contentinfo') return 'footer';
      const toks = [n.id || ''].concat(typeof n.className === 'string' ? n.className.split(/\s+/) : []);
      for (const k of toks) {
        if (!k || !REGION_TOKEN.test(k)) continue;
        const l = k.toLowerCase();
        if (l.includes('footer')) return 'footer';
        if (l.includes('header') || l.includes('topbar') || l.includes('top-bar')) return 'header';
        return 'nav';
      }
    }
    return 'main';
  };
  const cssPath = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && parts.length < 5; n = n.parentElement) {
      let p = n.tagName.toLowerCase();
      if (n.id) { p += '#' + n.id; parts.unshift(p); break; }
      const c = typeof n.className === 'string' ? n.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      if (c) p += '.' + c;
      parts.unshift(p);
    }
    return parts.join(' > ');
  };

  // ---------- META ----------
  const meta = { title: document.title, lang: document.documentElement.lang || '', url: location.href, base: document.baseURI, metas: {}, canonical: null, alternates: [], h1: [] };
  document.querySelectorAll('meta[name],meta[property],meta[http-equiv]').forEach((m) => {
    const k = m.getAttribute('name') || m.getAttribute('property') || ('http-equiv:' + m.getAttribute('http-equiv'));
    meta.metas[k] = m.getAttribute('content');
  });
  const can = document.querySelector('link[rel=canonical]'); if (can) meta.canonical = abs(can.getAttribute('href'));
  document.querySelectorAll('link[rel=alternate][hreflang]').forEach((l) => meta.alternates.push({ hreflang: l.getAttribute('hreflang'), href: abs(l.getAttribute('href')) }));
  document.querySelectorAll('h1').forEach((h) => meta.h1.push(clean(h.textContent)));
  const jsonld = []; document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => jsonld.push(s.textContent.slice(0, 20000)));
  meta.jsonld = jsonld;

  // ---------- CONTENT BLOCKS (text grouped by nearest block-level ancestor, DOM order) ----------
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'IFRAME', 'OBJECT', 'CANVAS', 'HEAD']);
  const INLINE = new Set(['inline', 'inline-block', 'inline-flex', 'inline-grid', 'contents', 'inline-table', 'ruby']);
  const blockOf = (node) => {
    for (let n = node.parentElement; n; n = n.parentElement) {
      if (n === document.body) return n;
      const d = getComputedStyle(n).display;
      if (!INLINE.has(d)) return n;
    }
    return document.body;
  };
  const blocks = []; const idx = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (t) => {
      if (!t.nodeValue || !t.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      for (let p = t.parentElement; p; p = p.parentElement) if (SKIP.has(p.tagName.toUpperCase())) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const b = blockOf(t);
    let rec = idx.get(b);
    if (!rec) {
      const tag = b.tagName.toLowerCase();
      const heading = /^h[1-6]$/.test(tag) ? tag : (b.closest('h1,h2,h3,h4,h5,h6') ? b.closest('h1,h2,h3,h4,h5,h6').tagName.toLowerCase() : null);
      rec = { tag, heading, region: regionOf(b), visible: isVisible(b), path: cssPath(b), parts: [], link: null };
      const own = b.closest('a[href]'); const inner = b.querySelectorAll('a[href]');
      const a = own || (inner.length === 1 ? inner[0] : null); if (a) rec.link = abs(a.getAttribute('href'));
      if (!a && inner.length > 1) rec.links = inner.length;
      idx.set(b, rec); blocks.push(rec);
    }
    rec.parts.push(t.nodeValue);
  }
  const content = blocks.map((r) => ({ tag: r.tag, heading: r.heading, region: r.region, visible: r.visible, path: r.path, link: r.link, text: clean(r.parts.join('')) })).filter((r) => r.text);

  // ---------- IMAGES / BACKGROUNDS / SVG / ICON FONTS / MEDIA ----------
  const images = [];
  const pushImg = (o) => { if (o.url && o.url.length < 3000000) images.push(o); };
  document.querySelectorAll('img').forEach((img, i) => {
    const r = img.getBoundingClientRect();
    const lazy = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy');
    const base = { kind: 'img', alt: img.getAttribute('alt'), title: img.getAttribute('title'), natural_w: img.naturalWidth, natural_h: img.naturalHeight, rendered_w: Math.round(r.width), rendered_h: Math.round(r.height), visible: isVisible(img), region: regionOf(img), path: cssPath(img), link: img.closest('a[href]') ? abs(img.closest('a[href]').getAttribute('href')) : null };
    pushImg(Object.assign({ url: abs(img.currentSrc || img.getAttribute('src')) }, base));
    if (lazy && abs(lazy) !== abs(img.currentSrc || img.getAttribute('src'))) pushImg(Object.assign({ url: abs(lazy), lazy: true }, base));
    const ss = img.getAttribute('srcset') || img.getAttribute('data-srcset');
    if (ss) ss.split(',').forEach((c) => { const u = abs(c.trim().split(/\s+/)[0]); if (u) pushImg(Object.assign({ url: u, srcset_variant: true }, base)); });
  });
  document.querySelectorAll('picture source[srcset], source[data-srcset]').forEach((s) => {
    (s.getAttribute('srcset') || s.getAttribute('data-srcset')).split(',').forEach((c) => { const u = abs(c.trim().split(/\s+/)[0]); if (u) pushImg({ kind: 'picture-source', url: u, media: s.getAttribute('media'), region: regionOf(s), visible: false, path: cssPath(s) }); });
  });
  const urlRe = /url\((['"]?)(.*?)\1\)/g;
  document.querySelectorAll('body *').forEach((el) => {
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      const bg = cs.backgroundImage;
      if (bg && bg !== 'none') {
        let m; urlRe.lastIndex = 0;
        while ((m = urlRe.exec(bg))) {
          const r = el.getBoundingClientRect();
          const w = pseudo ? Math.round(parseFloat(cs.width) || 0) : Math.round(r.width);
          const hh = pseudo ? Math.round(parseFloat(cs.height) || 0) : Math.round(r.height);
          pushImg({ kind: pseudo ? 'pseudo-bg' + pseudo : 'css-bg', url: abs(m[2]), rendered_w: w, rendered_h: hh, visible: isVisible(el), region: regionOf(el), path: cssPath(el) + (pseudo || '') });
        }
      }
      if (pseudo) {
        const ct = cs.content;
        if (ct && ct.includes('url(')) { let m; urlRe.lastIndex = 0; while ((m = urlRe.exec(ct))) pushImg({ kind: 'pseudo-content' + pseudo, url: abs(m[2]), visible: isVisible(el), region: regionOf(el), path: cssPath(el) }); }
      }
    }
    for (const a of ['data-bg', 'data-background', 'data-image', 'data-bg-src', 'data-background-image', 'data-thumb']) {
      const v = el.getAttribute(a); if (v) { const mm = /url\((['"]?)(.*?)\1\)/.exec(v); pushImg({ kind: 'data-attr:' + a, url: abs(mm ? mm[2] : v), visible: isVisible(el), region: regionOf(el), path: cssPath(el) }); }
    }
  });
  const svgs = [];
  document.querySelectorAll('svg').forEach((s) => {
    if (s.parentElement && s.parentElement.closest('svg')) return;
    const r = s.getBoundingClientRect();
    let html = s.outerHTML;
    // inline <use href="#id"> sprite references so the saved icon is self-contained
    s.querySelectorAll('use').forEach((u) => {
      const ref = u.getAttribute('href') || u.getAttribute('xlink:href');
      if (ref && ref.startsWith('#')) { const sym = document.querySelector(ref); if (sym) html = html.replace('</svg>', '<!-- sprite ' + ref + ' -->' + sym.outerHTML.replace(/<symbol/g, '<g').replace(/<\/symbol>/g, '</g>') + '</svg>'); }
    });
    if (html.length < 200000) svgs.push({ kind: 'inline-svg', svg: html, rendered_w: Math.round(r.width), rendered_h: Math.round(r.height), visible: isVisible(s), region: regionOf(s), path: cssPath(s), label: s.getAttribute('aria-label') || (s.querySelector('title') ? s.querySelector('title').textContent : null) });
  });
  const iconFonts = {};
  document.querySelectorAll('i[class], span[class]').forEach((el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    if (/(^|\s)(fa[srlbd]?|fa-[\w-]+|glyphicon[\w-]*|icon-[\w-]+|ti-[\w-]+|bi-[\w-]+|material-icons|dashicons[\w-]*|eicon-[\w-]+|et-[\w-]+)(\s|$)/.test(cls)) {
      const k = cls.trim().replace(/\s+/g, ' ');
      iconFonts[k] = iconFonts[k] || { classes: k, count: 0, region: regionOf(el), sample_text: clean((el.parentElement || el).textContent).slice(0, 80) };
      iconFonts[k].count++;
    }
  });
  const media = [];
  document.querySelectorAll('video, audio').forEach((v) => {
    const srcs = [v.currentSrc || v.getAttribute('src')].concat(Array.from(v.querySelectorAll('source')).map((s) => s.getAttribute('src')));
    srcs.filter(Boolean).forEach((s) => media.push({ kind: v.tagName.toLowerCase(), url: abs(s), poster: abs(v.getAttribute('poster')), region: regionOf(v) }));
    if (v.getAttribute('poster')) pushImg({ kind: 'video-poster', url: abs(v.getAttribute('poster')), region: regionOf(v), visible: isVisible(v), path: cssPath(v) });
  });
  document.querySelectorAll('iframe[src], iframe[data-src], embed[src], object[data]').forEach((f) => media.push({ kind: f.tagName.toLowerCase(), url: abs(f.getAttribute('src') || f.getAttribute('data-src') || f.getAttribute('data')), title: f.getAttribute('title'), region: regionOf(f) }));
  document.querySelectorAll('link[rel~=icon], link[rel~=apple-touch-icon], link[rel~=mask-icon]').forEach((l) => pushImg({ kind: 'favicon', url: abs(l.getAttribute('href')), region: 'head', visible: false }));
  for (const k of ['og:image', 'twitter:image', 'og:image:url']) if (meta.metas[k]) pushImg({ kind: 'meta:' + k, url: abs(meta.metas[k]), region: 'head', visible: false });

  // ---------- LINKS ----------
  const links = [];
  document.querySelectorAll('a[href], area[href]').forEach((a) => {
    const raw = a.getAttribute('href');
    const img = a.querySelector('img');
    links.push({ href: abs(raw), raw, text: clean(a.innerText || a.textContent) || clean(a.getAttribute('aria-label')) || (img ? '[img] ' + (img.getAttribute('alt') || '') : ''), title: a.getAttribute('title'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), region: regionOf(a), visible: isVisible(a), onclick: a.getAttribute('onclick') });
  });
  const onclickNav = [];
  document.querySelectorAll('[onclick]').forEach((el) => { const v = el.getAttribute('onclick'); const m = /location(?:\.href)?\s*=\s*['"]([^'"]+)['"]|window\.open\(\s*['"]([^'"]+)['"]/.exec(v || ''); if (m) onclickNav.push({ href: abs(m[1] || m[2]), text: clean(el.textContent).slice(0, 120), region: regionOf(el) }); });

  // ---------- FORMS (where things route to) ----------
  const labelFor = (f) => {
    if (f.id) { const l = document.querySelector('label[for="' + CSS.escape(f.id) + '"]'); if (l) return clean(l.textContent); }
    const l = f.closest('label'); if (l) return clean(l.textContent);
    return null;
  };
  const forms = [];
  document.querySelectorAll('form').forEach((f, i) => {
    const fields = [];
    f.querySelectorAll('input, select, textarea, button').forEach((el) => {
      const type = (el.getAttribute('type') || el.tagName).toLowerCase();
      let value = el.getAttribute('value');
      if (value && value.length > 300) value = value.slice(0, 300) + '…[' + value.length + ' chars]';
      const o = { tag: el.tagName.toLowerCase(), type, name: el.getAttribute('name'), id: el.id || null, required: el.required || el.getAttribute('aria-required') === 'true', placeholder: el.getAttribute('placeholder'), label: labelFor(el), value: (type === 'hidden' || type === 'submit' || type === 'button' || el.tagName === 'BUTTON') ? (value || clean(el.textContent)) : null };
      if (el.tagName === 'SELECT') o.options = Array.from(el.options).map((op) => clean(op.textContent)).slice(0, 100);
      fields.push(o);
    });
    forms.push({ index: i, id: f.id || null, name: f.getAttribute('name'), cls: typeof f.className === 'string' ? f.className : '', action: abs(f.getAttribute('action') || location.href), action_raw: f.getAttribute('action'), method: (f.getAttribute('method') || 'GET').toUpperCase(), enctype: f.getAttribute('enctype'), region: regionOf(f), visible: isVisible(f), field_count: fields.filter((x) => x.type !== 'hidden').length, fields });
  });

  // ---------- SCRIPTS / STYLES / TRACKING ----------
  const scripts = Array.from(document.querySelectorAll('script[src]')).map((s) => abs(s.getAttribute('src')));
  const styles = Array.from(document.querySelectorAll('link[rel~=stylesheet]')).map((s) => abs(s.getAttribute('href')));
  const inlineJs = Array.from(document.querySelectorAll('script:not([src])')).map((s) => s.textContent).join('\n').slice(0, 2000000);

  return {
    meta, content, images, svgs, iconFonts: Object.values(iconFonts), media, links, onclickNav, forms, scripts, styles, inlineJs,
    text_visible: document.body ? document.body.innerText : '',
    page_size: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
  };
}

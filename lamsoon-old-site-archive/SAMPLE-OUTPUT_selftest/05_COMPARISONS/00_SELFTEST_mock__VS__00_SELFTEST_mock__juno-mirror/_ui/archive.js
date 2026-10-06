/* Lam Soon old-site archive — dashboard + page dissection UI. No external dependencies; works from file://. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => (v == null ? '' : String(v)).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dec = (u) => { try { return decodeURI(u || ''); } catch (e) { return u || ''; } };
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };
  const CHECKS = [['c', 'Copy'], ['i', 'Images'], ['l', 'Links'], ['f', 'Forms'], ['v', 'Layout']];
  const RESULTS = [['', '— not checked —'], ['ok', 'OK — matches live'], ['partial', 'Partial — minor gaps'], ['issue', 'ISSUE — missing/wrong'], ['na', 'N/A']];
  const vkey = (folder) => 'lsa:v1:' + folder;
  const reviewer = () => LS.get('lsa:reviewer', '');
  const DEADLINE = new Date('2026-10-31T23:59:59+08:00');

  function deadlineChip() {
    const d = Math.ceil((DEADLINE - new Date()) / 86400000);
    return d >= 0 ? `<span class="deadline" title="Old Lam Soon MY/TH hosting is taken down end of October 2026">Old sites offline 31 Oct · ${d} day${d === 1 ? '' : 's'} left</span>`
      : `<span class="deadline">Old-site deadline passed — archive is now the only reference</span>`;
  }
  function themeBtn() {
    const b = document.createElement('button');
    b.textContent = '◐'; b.title = 'Toggle light/dark';
    b.onclick = () => { const r = document.documentElement; const n = r.dataset.theme === 'dark' ? 'light' : r.dataset.theme === 'light' ? '' : 'dark'; if (n) r.dataset.theme = n; else delete r.dataset.theme; LS.set('lsa:theme', n); };
    const t = LS.get('lsa:theme', ''); if (t) document.documentElement.dataset.theme = t;
    return b;
  }
  function copyText(t) {
    const done = () => toast('Copied');
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(done);
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { alert('Copy failed — select manually.'); } ta.remove();
  }
  function toast(m) { const d = document.createElement('div'); d.textContent = m; d.style.cssText = 'position:fixed;right:16px;bottom:16px;background:var(--ink);color:var(--bg);padding:8px 14px;border-radius:8px;z-index:9999;font-weight:600'; document.body.appendChild(d); setTimeout(() => d.remove(), 1400); }
  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  function parseCSV(t) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (ch !== '\r') cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function statusChip(s) {
    if (!s) return '<span class="chip bad">FAILED</span>';
    return `<span class="chip ${s < 300 ? 'ok' : s < 400 ? 'warn' : 'bad'}">${s}</span>`;
  }
  function checksHTML(pid, st, compact) {
    return '<div class="checks">' + CHECKS.map(([k, l]) => `<label title="${l} verified against live site"><input type="checkbox" data-pid="${pid}" data-k="${k}" ${st[k] ? 'checked' : ''}>${compact ? l[0] : l}</label>`).join('') + '</div>';
  }
  function resultSelect(pid, v) { return `<select data-pid="${pid}" data-k="result">${RESULTS.map(([k, l]) => `<option value="${k}" ${k === (v || '') ? 'selected' : ''}>${l}</option>`).join('')}</select>`; }
  function bindVerify(root, folder, onChange) {
    root.addEventListener('change', (e) => {
      const el = e.target; const pid = el.dataset.pid; const k = el.dataset.k; if (!pid || !k) return;
      const all = LS.get(vkey(folder), {}); const st = all[pid] || {};
      st[k] = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value;
      if (el.type === 'checkbox' && CHECKS.every(([c]) => st[c]) && !st.result) { st.result = 'ok'; const s = root.querySelector(`select[data-pid="${pid}"][data-k=result]`); if (s) s.value = 'ok'; }
      st.by = reviewer(); st.at = new Date().toISOString().slice(0, 16).replace('T', ' ');
      all[pid] = st; LS.set(vkey(folder), all); onChange && onChange(pid, st);
    });
  }
  function reviewerInput() {
    const i = document.createElement('input'); i.type = 'text'; i.placeholder = 'Your name (reviewer)'; i.value = reviewer(); i.style.width = '170px';
    i.onchange = () => LS.set('lsa:reviewer', i.value.trim()); return i;
  }

  // =====================================================================================
  // SITE DASHBOARD
  // =====================================================================================
  function renderSite(S) {
    const site = S.site; const pages = S.pages; const folder = site.folder;
    document.title = `${site.short} archive — ${site.label}`;
    const c = site.counts;
    const app = $('#app');
    app.innerHTML = `
    <header class="top"><div class="wrap">
      <div class="brand"><span class="dot"></span>Lam Soon old-site archive</div>
      <div class="crumbs">${S.rootHref ? `<a href="${S.rootHref}">All sites</a> › ` : ''}<b>${esc(site.label)}</b></div>
      <div class="spacer"></div>${deadlineChip()}<span id="rev"></span><span id="theme"></span>
    </div></header>
    <div class="wrap">
      <h1>${esc(site.label)}</h1>
      <div class="sub">Live origin: <a href="${esc(site.origin)}" target="_blank" rel="noopener">${esc(site.origin)}</a> · captured ${esc(site.started)} → ${esc(site.finished)}
       ${site.recheck_of ? ` · <b>re-check of ${esc(site.recheck_of)}</b> against ${esc(site.recheck_origin)}` : ''}</div>
      <div class="sub">Platform fingerprint: ${(site.platform_hints || []).map((p) => `<span class="chip">${esc(p)}</span>`).join(' ') || '<span class="muted">—</span>'}</div>
      <div class="tiles">
        <div class="tile"><div class="n">${c.pages}</div><div class="l">Pages captured</div></div>
        <div class="tile ${c.errors ? 'bad' : 'ok'}"><div class="n">${c.errors}</div><div class="l">Failed / 4xx-5xx</div></div>
        <div class="tile"><div class="n">${c.assets}</div><div class="l">Assets saved</div></div>
        <div class="tile ${c.assets_failed ? 'warn' : ''}"><div class="n">${c.assets_failed}</div><div class="l">Assets failed</div></div>
        <div class="tile"><div class="n">${c.documents}</div><div class="l">Docs / PDFs / video</div></div>
        <div class="tile"><div class="n">${c.forms}</div><div class="l">Forms found</div></div>
        <div class="tile ${c.orphans ? 'warn' : ''}"><div class="n">${c.orphans}</div><div class="l">Orphan pages</div></div>
        <div class="tile" id="vt"><div class="n">0%</div><div class="l">Verified vs live</div><div class="progress"><i style="width:0"></i></div></div>
      </div>
      <div class="note info"><b>How to verify:</b> open each page (ID link) → compare <i>Archived screenshot</i> vs <i>Live site</i> side-by-side or in Difference overlay →
        tick Copy / Images / Links / Forms / Layout → set result. Progress is saved in this browser; use <b>Export verification CSV</b> to hand it over or paste into the LamSoon Webpage Checklist sheet.</div>
      <div class="tabs" id="tabs"></div>
      <section id="tab-pages">
        <div class="toolbar">
          <input type="search" id="q" placeholder="Search title / URL / ID…">
          <select id="fRes"><option value="">All results</option><option value="none">Not checked</option>${RESULTS.slice(1).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
          <select id="fDepth"><option value="">All depths</option></select>
          <select id="fSec"><option value="">All sections</option></select>
          <label class="muted"><input type="checkbox" id="fErr"> problems only</label>
          <div class="spacer"></div>
          <button id="exp" class="primary">⬇ Export verification CSV</button>
          <button id="imp">⬆ Import CSV</button><input type="file" id="impf" accept=".csv" class="hide">
        </div>
        <table class="grid" id="tbl"><thead><tr>
          <th data-s="id">ID</th><th class="hide-sm">Screenshot</th><th data-s="title">Page</th><th data-s="section" class="hide-sm">Section</th><th data-s="depth">Depth</th><th data-s="status">HTTP</th>
          <th data-s="words" class="hide-sm">Words</th><th data-s="images" class="hide-sm">Imgs</th><th data-s="forms" class="hide-sm">Forms</th><th>Verified</th><th>Result</th><th class="hide-sm">Notes</th><th></th>
        </tr></thead><tbody></tbody></table>
      </section>
      <section id="tab-forms" class="hide"></section>
      <section id="tab-contacts" class="hide"></section>
      <section id="tab-docs" class="hide"></section>
      <section id="tab-issues" class="hide"></section>
      <section id="tab-icons" class="hide"></section>
      <section id="tab-files" class="hide"></section>
    </div>`;
    $('#theme').appendChild(themeBtn()); $('#rev').appendChild(reviewerInput());
    const R = S.registers;
    const tabs = [['pages', 'Pages', pages.length], ['forms', 'Forms & routing', R.forms.length], ['contacts', 'Emails & phones', R.contacts.length], ['docs', 'Documents', R.documents.length], ['issues', 'Issues', R.issues.length], ['icons', 'Icons & tracking', R.icons.length + R.tracking.length], ['files', 'Registers (CSV)', S.csvs.length]];
    $('#tabs').innerHTML = tabs.map(([k, l, n], i) => `<button data-t="${k}" class="${i ? '' : 'on'}">${l}<span class="count">${n}</span></button>`).join('');
    $('#tabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; $$('#tabs button').forEach((x) => x.classList.toggle('on', x === b)); tabs.forEach(([k]) => $('#tab-' + k).classList.toggle('hide', k !== b.dataset.t)); };

    const depths = [...new Set(pages.map((p) => p.depth))].sort((a, b) => a - b);
    $('#fDepth').innerHTML += depths.map((d) => `<option value="${d}">${d === 99 ? 'orphans (sitemap/API only)' : 'depth ' + d}</option>`).join('');
    const secs = [...new Set(pages.map((p) => p.section))].sort();
    $('#fSec').innerHTML += secs.map((s) => `<option>${esc(s)}</option>`).join('');

    let sortK = 'id', sortDir = 1;
    function draw() {
      const st = LS.get(vkey(folder), {});
      const q = $('#q').value.toLowerCase(), fr = $('#fRes').value, fd = $('#fDepth').value, fs = $('#fSec').value, fe = $('#fErr').checked;
      let rows = pages.filter((p) => {
        const v = st[p.id] || {};
        if (q && !(p.id + ' ' + p.title + ' ' + dec(p.url)).toLowerCase().includes(q)) return false;
        if (fr === 'none' && v.result) return false; if (fr && fr !== 'none' && v.result !== fr) return false;
        if (fd !== '' && String(p.depth) !== fd) return false; if (fs && p.section !== fs) return false;
        if (fe && !(p.error || !p.status || p.status >= 400 || p.redirected || p.orphan || v.result === 'issue')) return false;
        return true;
      });
      rows.sort((a, b) => { const x = a[sortK], y = b[sortK]; return (x > y ? 1 : x < y ? -1 : 0) * sortDir; });
      $('#tbl tbody').innerHTML = rows.map((p) => {
        const v = st[p.id] || {};
        return `<tr class="${v.result ? 'res-' + v.result : ''}">
          <td><a href="${p.href}"><b>${p.id}</b></a></td>
          <td class="hide-sm">${p.thumb ? `<a href="${p.href}"><img class="thumb" loading="lazy" src="${p.thumb}" alt=""></a>` : '<span class="chip bad">no shot</span>'}</td>
          <td><div class="ttl"><a href="${p.href}">${esc(p.title || '(no title)')}</a></div><div class="url">${esc(dec(p.url))}</div>
            ${p.redirected ? `<span class="chip warn">redirect → ${esc(dec(p.final_url))}</span>` : ''} ${p.orphan ? '<span class="chip warn">orphan</span>' : ''} ${p.error ? `<span class="chip bad">${esc(p.error.slice(0, 80))}</span>` : ''}</td>
          <td class="hide-sm">${esc(p.section)}</td><td class="num">${p.depth === 99 ? '—' : p.depth}</td><td>${statusChip(p.status)}</td>
          <td class="num hide-sm">${p.words ?? ''}</td><td class="num hide-sm">${p.images ?? ''}</td><td class="num hide-sm">${p.forms || ''}</td>
          <td>${checksHTML(p.id, v, true)}</td><td>${resultSelect(p.id, v.result)}</td>
          <td class="hide-sm"><input type="text" data-pid="${p.id}" data-k="notes" value="${esc(v.notes || '')}" placeholder="notes" style="width:160px"></td>
          <td><a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener" title="Open live page">Live ↗</a></td></tr>`;
      }).join('') || '<tr><td colspan="13" class="muted">No pages match.</td></tr>';
      progress();
    }
    function progress() {
      const st = LS.get(vkey(folder), {}); const done = pages.filter((p) => (st[p.id] || {}).result).length;
      const pct = pages.length ? Math.round((done / pages.length) * 100) : 0;
      $('#vt .n').textContent = pct + '%'; $('#vt .l').textContent = `Verified vs live (${done}/${pages.length})`; $('#vt i').style.width = pct + '%';
    }
    ['q', 'fRes', 'fDepth', 'fSec', 'fErr'].forEach((id) => $('#' + id).addEventListener('input', draw));
    $$('#tbl th[data-s]').forEach((th) => th.onclick = () => { const k = th.dataset.s; sortDir = sortK === k ? -sortDir : 1; sortK = k; draw(); });
    bindVerify($('#tbl'), folder, (pid, st) => { const tr = $(`#tbl [data-pid="${pid}"]`).closest('tr'); tr.className = st.result ? 'res-' + st.result : ''; progress(); });
    $('#exp').onclick = () => {
      const st = LS.get(vkey(folder), {});
      const head = ['site', 'page_id', 'title', 'live_url', 'http', ...CHECKS.map(([, l]) => l + '_ok'), 'result', 'notes', 'checked_by', 'checked_at'];
      const lines = [head.join(',')].concat(pages.map((p) => { const v = st[p.id] || {}; return [site.short, p.id, p.title, dec(p.url), p.status, ...CHECKS.map(([k]) => (v[k] ? 'Y' : '')), v.result || '', v.notes || '', v.by || '', v.at || ''].map(csvCell).join(','); }));
      download(`${site.short}_verification_${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'));
    };
    $('#imp').onclick = () => $('#impf').click();
    $('#impf').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; const rows = parseCSV((await f.text()).replace(/^﻿/, ''));
      const h = rows.shift(); const ix = (n) => h.indexOf(n); const all = LS.get(vkey(folder), {}); let n = 0;
      rows.forEach((r) => { const pid = r[ix('page_id')]; if (!pid) return; const v = all[pid] || {}; CHECKS.forEach(([k, l]) => { if (ix(l + '_ok') >= 0) v[k] = r[ix(l + '_ok')] === 'Y' ? 1 : 0; }); ['result', 'notes'].forEach((k) => { if (ix(k) >= 0) v[k] = r[ix(k)]; }); if (ix('checked_by') >= 0) v.by = r[ix('checked_by')]; if (ix('checked_at') >= 0) v.at = r[ix('checked_at')]; all[pid] = v; n++; });
      LS.set(vkey(folder), all); draw(); toast(`Imported ${n} rows`);
    };
    draw();

    const tbl = (rows, cols, empty) => rows.length ? `<table class="grid"><thead><tr>${cols.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map(([k, , f]) => `<td>${f ? f(r[k], r) : esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>` : `<p class="muted">${empty}</p>`;
    const pl = (v) => { const p = pages.find((x) => x.id === v); return p ? `<a href="${p.href}">${v}</a>` : esc(v); };
    $('#tab-forms').innerHTML = `<div class="note">Front-end crawl shows <b>where a form posts</b> (action URL, hidden fields) — not the recipient inbox, which lives server-side. Confirm routing with Lam Soon / IT for every form below before 31 Oct.</div>` +
      tbl(R.forms, [['page_id', 'Page', pl], ['form_id', 'Form'], ['method', 'Method'], ['action', 'Action (posts to)', (v) => `<span class="mono">${esc(dec(v))}</span>`], ['fields', 'Fields'], ['hidden_fields', 'Hidden fields', (v) => `<span class="mono">${esc(v)}</span>`], ['emails_on_page', 'Emails in page source']], 'No forms found.');
    $('#tab-contacts').innerHTML = tbl(R.contacts, [['page_id', 'Page', pl], ['type', 'Type'], ['value', 'Value', (v) => `<b>${esc(v)}</b>`], ['link_text', 'Link text'], ['region', 'Region']], 'No emails or phone links found.');
    $('#tab-docs').innerHTML = tbl(R.documents, [['url', 'Original', (v) => `<a href="${esc(v)}" target="_blank">${esc(dec(v))}</a>`], ['local', 'Saved copy', (v) => (v ? `<a href="${esc(v)}">${esc(dec(v))}</a>` : '<span class="chip bad">not saved</span>')], ['found_on', 'Linked from', (v) => esc(dec(v))], ['error', 'Error']], 'No linked documents.');
    $('#tab-issues').innerHTML = tbl(R.issues, [['page_id', 'Page', pl], ['issue', 'Issue', (v) => `<span class="chip ${/fail|HTTP [45]|not saved/.test(v) ? 'bad' : 'warn'}">${esc(v)}</span>`], ['url', 'URL', (v) => esc(dec(v))], ['detail', 'Detail', (v) => `<span class="mono">${esc(dec(v))}</span>`]], 'No issues logged. 🎉');
    $('#tab-icons').innerHTML = `<div class="note info">The old MY site renders a single tick icon where the new build uses distinct icons (kickoff 6 Oct) — icon-font glyphs listed here are <b>not image files</b> and need replacement icons from CSD. Inline SVG icons are saved per page under <code>assets/svg-inline/</code>.</div><h3>Icon-font glyphs</h3>` +
      tbl(R.icons, [['page_id', 'Page', pl], ['classes', 'Classes', (v) => `<code>${esc(v)}</code>`], ['count', 'Uses'], ['region', 'Region'], ['sample_text', 'Next to text']], 'No icon fonts detected.') +
      '<h3>Tracking / analytics IDs</h3>' + tbl(R.tracking, [['page_id', 'Page', pl], ['tracking_id', 'ID', (v) => `<code>${esc(v)}</code>`]], 'No tracking IDs detected.');
    $('#tab-files').innerHTML = '<div class="files">' + S.csvs.map((f) => `<a class="btn" href="registers/${f}">⬇ ${f}</a>`).join('') + '</div><p class="muted">CSV files are UTF-8 with BOM — open directly in Excel or import into Google Sheets (Thai text safe). PAGE-INVENTORY.csv has blank VERIFIED_BY / RESULT / NOTES columns ready for the LamSoon Webpage Checklist.</p>';
  }

  // =====================================================================================
  // PAGE DISSECTION
  // =====================================================================================
  function renderPage(P) {
    const s = P.page; const folder = P.site.folder; const pid = s.id;
    document.title = `${pid} · ${s.title || ''} — ${P.site.short} archive`;
    const st = (LS.get(vkey(folder), {})[pid]) || {};
    const app = $('#app');
    const imgsU = uniq(P.images, 'url');
    app.innerHTML = `
    <header class="top"><div class="wrap">
      <div class="brand"><span class="dot"></span>${esc(P.site.short)} · ${pid}</div>
      <div class="crumbs"><a href="${P.rootHref}">All sites</a> › <a href="${P.siteHref}">${esc(P.site.label)}</a> › ${pid}</div>
      <div class="spacer"></div>
      <div class="pager">${P.prev ? `<a class="btn" href="${P.prev.href}" title="${esc(P.prev.title)}">← ${P.prev.id}</a>` : ''}${P.next ? `<a class="btn" href="${P.next.href}" title="${esc(P.next.title)}">${P.next.id} →</a>` : ''}</div>
      ${deadlineChip()}<span id="theme"></span>
    </div></header>
    <div class="wrap">
      <h1>${esc(s.title || '(no title)')}</h1>
      <div class="sub"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(dec(s.url))} ↗</a>
        ${s.redirected ? ` <span class="chip warn">redirected → ${esc(dec(s.final_url))}</span>` : ''}</div>
      <div class="sub" style="margin-top:4px">${statusChip(s.status)} <span class="chip">depth ${s.depth === 99 ? 'orphan' : s.depth}</span>
        <span class="chip">${s.words} words</span> <span class="chip">${imgsU.length} images</span> <span class="chip">${P.svgs.length} inline SVG</span>
        <span class="chip">${P.links.length} links</span> <span class="chip ${s.forms ? 'info' : ''}">${s.forms} forms</span>
        ${s.hidden_blocks ? `<span class="chip warn">${s.hidden_blocks} hidden text blocks</span>` : ''} <span class="chip">captured ${esc(s.captured_at)}</span>
        ${(s.found_via || []).map((v) => `<span class="chip">via ${esc(v)}</span>`).join(' ')}</div>
      <div class="verify" id="verify" style="margin-top:10px">
        <b>Verify against live:</b> ${checksHTML(pid, st, false)} ${resultSelect(pid, st.result)}
        <textarea data-pid="${pid}" data-k="notes" placeholder="Notes — what differs / what is missing">${esc(st.notes || '')}</textarea>
        <span class="muted" id="vmeta">${st.by ? 'last: ' + esc(st.by) + ' ' + esc(st.at) : ''}</span>
      </div>
      <div class="tabs" id="tabs"></div>
      <section id="t-compare"></section>
      <section id="t-content" class="hide"></section>
      <section id="t-images" class="hide"></section>
      <section id="t-links" class="hide"></section>
      <section id="t-forms" class="hide"></section>
      <section id="t-meta" class="hide"></section>
      <section id="t-text" class="hide"></section>
      <section id="t-files" class="hide"></section>
    </div>`;
    $('#theme').appendChild(themeBtn());
    bindVerify($('#verify'), folder, (p, v) => { $('#vmeta').textContent = 'saved ' + (v.by || '') + ' ' + v.at; });
    $('#verify textarea').addEventListener('input', (e) => { const all = LS.get(vkey(folder), {}); const v = all[pid] || {}; v.notes = e.target.value; v.by = reviewer(); v.at = new Date().toISOString().slice(0, 16).replace('T', ' '); all[pid] = v; LS.set(vkey(folder), all); });
    const tabs = [['compare', 'Compare'], ['content', 'Copy / content', P.content.length], ['images', 'Images & icons', imgsU.length + P.svgs.length], ['links', 'Links', P.links.length], ['forms', 'Forms', P.forms.filter((f) => f.field_count).length], ['meta', 'SEO / meta / tech'], ['text', 'Visible text'], ['files', 'Files']];
    $('#tabs').innerHTML = tabs.map(([k, l, n], i) => `<button data-t="${k}" class="${i ? '' : 'on'}">${l}${n != null ? `<span class="count">${n}</span>` : ''}</button>`).join('');
    const shown = new Set();
    const show = (k) => { $$('#tabs button').forEach((x) => x.classList.toggle('on', x.dataset.t === k)); tabs.forEach(([t]) => $('#t-' + t).classList.toggle('hide', t !== k)); if (!shown.has(k)) { shown.add(k); R[k](); } location.hash = k; };
    $('#tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) show(b.dataset.t); };

    const R = {
      compare() { compareView(P); },
      content() {
        const el = $('#t-content');
        el.innerHTML = `<div class="toolbar"><input type="search" id="cq" placeholder="Search copy…">
          <select id="creg"><option value="main">Main content only</option><option value="">All regions</option><option value="header">Header</option><option value="nav">Nav</option><option value="footer">Footer</option></select>
          <label class="muted"><input type="checkbox" id="chid" checked> include hidden (carousel/tab) text</label><div class="spacer"></div>
          <button id="ccopy">Copy main copy as text</button><a class="btn" href="content.md" target="_blank">content.md</a></div><div class="card content-list" id="clist" style="padding:0"></div>`;
        const draw = () => {
          const q = $('#cq').value.toLowerCase(), rg = $('#creg').value, hid = $('#chid').checked;
          $('#clist').innerHTML = P.content.filter((b) => (!rg || b.region === rg) && (hid || b.visible) && (!q || b.text.toLowerCase().includes(q))).map((b) =>
            `<div class="blk ${b.heading || ''} ${b.visible ? '' : 'hidden-blk'}"><div class="t"><span class="chip ${b.heading ? 'info' : ''}">${b.heading || b.tag}</span><span class="chip">${b.region}</span>${b.visible ? '' : '<span class="chip warn">hidden</span>'}</div>
             <div><div class="x">${esc(b.text)}</div>${b.link ? `<div class="url">↗ ${esc(dec(b.link))}</div>` : ''}<div class="url mono" title="DOM path">${esc(b.path)}</div></div></div>`).join('') || '<p class="muted" style="padding:12px">Nothing matches.</p>';
        };
        ['cq', 'creg', 'chid'].forEach((i) => $('#' + i).addEventListener('input', draw)); draw();
        $('#ccopy').onclick = () => copyText(P.content.filter((b) => b.region === 'main').map((b) => (b.heading ? '#'.repeat(+b.heading[1]) + ' ' : '') + b.text).join('\n\n'));
      },
      images() {
        const el = $('#t-images'); const cats = [...new Set(imgsU.map((i) => i.category || 'not saved'))];
        el.innerHTML = `<div class="toolbar"><select id="icat"><option value="">All categories</option>${cats.map((c) => `<option>${esc(c)}</option>`).join('')}<option value="svg">inline SVG</option></select>
          <label class="muted"><input type="checkbox" id="ivis"> visible only</label><label class="muted"><input type="checkbox" id="ialt"> missing alt only</label>
          <div class="spacer"></div><a class="btn" href="assets/">Open assets folder</a></div>
          ${P.iconFonts.length ? `<div class="note">Icon-font glyphs on this page (not image files): ${P.iconFonts.map((x) => `<code>${esc(x.classes)}</code>×${x.count}`).join(', ')}</div>` : ''}
          <div class="imgs" id="igrid"></div>`;
        const draw = () => {
          const c = $('#icat').value, vis = $('#ivis').checked, na = $('#ialt').checked;
          const cards = (c === 'svg' ? [] : imgsU.filter((i) => (!c || (i.category || 'not saved') === c) && (!vis || i.visible) && (!na || (i.kind === 'img' && !i.alt))).map((i) => `
            <div class="imgcard"><div class="pic">${i.local ? `<a href="${esc(i.local)}" target="_blank"><img loading="lazy" src="${esc(i.local)}" alt=""></a>` : '<span class="chip bad">NOT SAVED</span>'}</div>
            <div class="meta"><div><span class="chip info">${esc(i.category || '—')}</span> <span class="chip">${esc(i.kind)}</span> ${i.visible ? '' : '<span class="chip warn">hidden</span>'} <span class="chip">${esc(i.region || '')}</span></div>
              <div><b>${esc(i.local ? i.local.split('/').pop() : '')}</b></div>
              <div>alt: ${i.kind === 'img' ? (i.alt ? esc(i.alt) : '<span class="chip warn">missing</span>') : '<span class="muted">n/a</span>'}</div>
              <div class="muted">rendered ${i.rendered_w || '?'}×${i.rendered_h || '?'} · file ${i.natural_w || '?'}×${i.natural_h || '?'}${i.bytes ? ' · ' + Math.round(i.bytes / 1024) + ' KB' : ''}</div>
              ${i.link ? `<div class="url">links to ${esc(dec(i.link))}</div>` : ''}
              <div class="url">${(i.url || '').startsWith('data:') ? 'inline data-URI' : `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(dec(i.url))}</a>`}</div>${i.missing_reason ? `<div class="chip bad">${esc(i.missing_reason)}</div>` : ''}</div></div>`)).concat(
            (!c || c === 'svg') && !na ? P.svgs.filter((g) => !vis || g.visible).map((g) => `<div class="imgcard"><div class="pic"><img src="${esc(g.local)}" alt="" style="min-width:32px;min-height:32px"></div><div class="meta"><div><span class="chip info">inline SVG</span> <span class="chip">${esc(g.region)}</span></div><div><b>${esc(g.local.split('/').pop())}</b></div><div class="muted">rendered ${g.rendered_w}×${g.rendered_h}${g.label ? ' · ' + esc(g.label) : ''}</div></div></div>`) : []);
          $('#igrid').innerHTML = cards.join('') || '<p class="muted">Nothing matches.</p>';
        };
        ['icat', 'ivis', 'ialt'].forEach((i) => $('#' + i).addEventListener('input', draw)); draw();
      },
      links() {
        const rows = P.links.map((l) => `<tr><td><span class="chip">${esc(l.region)}</span></td><td>${esc(l.text)}</td><td class="url">${l.local ? `<a href="${l.local}">${esc(l.local_id)}</a> · ` : ''}<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(dec(l.href || l.raw))}</a></td><td>${l.kind === 'internal' ? '<span class="chip ok">internal</span>' : l.kind === 'external' ? '<span class="chip info">external</span>' : `<span class="chip">${esc(l.kind)}</span>`}${l.target === '_blank' ? ' <span class="chip">new tab</span>' : ''}${l.visible ? '' : ' <span class="chip warn">hidden</span>'}</td></tr>`).join('');
        $('#t-links').innerHTML = `<table class="grid"><thead><tr><th>Region</th><th>Text</th><th>Target</th><th>Type</th></tr></thead><tbody>${rows}</tbody></table>` + (P.onclickNav.length ? '<h3>Script-driven navigation (onclick)</h3><ul>' + P.onclickNav.map((o) => `<li>${esc(o.text)} → <span class="mono">${esc(dec(o.href))}</span></li>`).join('') + '</ul>' : '');
      },
      forms() {
        const fs = P.forms.filter((f) => f.field_count || f.fields.length);
        $('#t-forms').innerHTML = (fs.length ? '<div class="note">Action URL and hidden fields are what the front end exposes. Recipient inbox / CRM routing is server-side — confirm with client before 31 Oct.</div>' : '<p class="muted">No forms on this page.</p>') + fs.map((f) => `
          <div class="card" style="margin-bottom:10px"><h3 style="margin-top:0">Form ${f.index} ${f.id ? '#' + esc(f.id) : ''} <span class="chip">${f.method}</span> ${f.visible ? '' : '<span class="chip warn">hidden</span>'}</h3>
          <div class="kv"><div>Posts to</div><div class="mono">${esc(dec(f.action))}</div><div>Raw action attr</div><div class="mono">${esc(f.action_raw)}</div><div>enctype</div><div>${esc(f.enctype || '')}</div><div>Class</div><div class="mono">${esc(f.cls)}</div></div>
          <table class="grid" style="margin-top:8px"><thead><tr><th>Label / placeholder</th><th>Name</th><th>Type</th><th>Required</th><th>Value / options</th></tr></thead><tbody>
          ${f.fields.map((x) => `<tr><td>${esc(x.label || x.placeholder || '')}</td><td class="mono">${esc(x.name)}</td><td>${esc(x.type)}</td><td>${x.required ? '✔' : ''}</td><td class="mono">${esc(x.value || (x.options || []).join(' | '))}</td></tr>`).join('')}</tbody></table></div>`).join('') +
          (P.emails.length ? `<h3>Email addresses found in page source</h3><p>${P.emails.map((e) => `<code>${esc(e)}</code>`).join(' ')}</p>` : '');
      },
      meta() {
        const m = P.meta.metas || {};
        $('#t-meta').innerHTML = `<div class="card"><div class="kv">
          <div>&lt;title&gt;</div><div>${esc(P.meta.title)}</div><div>html lang</div><div>${esc(P.meta.lang)}</div><div>Canonical</div><div class="mono">${esc(dec(P.meta.canonical))}</div>
          <div>H1</div><div>${(P.meta.h1 || []).map(esc).join('<br>')}</div>
          <div>hreflang</div><div>${(P.meta.alternates || []).map((a) => `${esc(a.hreflang)} → <a href="${esc(a.href)}" target="_blank">${esc(dec(a.href))}</a>`).join('<br>')}</div>
          ${Object.entries(m).map(([k, v]) => `<div>${esc(k)}</div><div>${esc(v)}</div>`).join('')}
          <div>Tracking IDs</div><div>${(P.tracking_ids || []).map((t) => `<code>${esc(t)}</code>`).join(' ') || '—'}</div>
          <div>Platform hints</div><div>${(P.platform_hints || []).map((t) => `<span class="chip">${esc(t)}</span>`).join(' ')}</div>
          <div>Response headers</div><div class="mono">server: ${esc(s.server)} · x-powered-by: ${esc(s.x_powered_by)} · x-frame-options: ${esc(s.x_frame_options)}</div>
          <div>Network requests</div><div>${Object.entries(P.net_counts || {}).map(([k, v]) => `<span class="chip">${esc(k)} ${v}</span>`).join(' ')}</div>
          <div>Media / embeds</div><div>${P.media.map((x) => `${esc(x.kind)}: <a href="${esc(x.url)}" target="_blank">${esc(dec(x.url))}</a>${x.local ? ` → <a href="${esc(x.local)}">local</a>` : ''}`).join('<br>') || '—'}</div>
          <div>Stylesheets</div><div class="mono">${(P.styles || []).map((x) => esc(dec(x))).join('<br>')}</div>
          <div>Scripts</div><div class="mono">${(P.scripts || []).map((x) => esc(dec(x))).join('<br>')}</div>
        </div></div>${(P.meta.jsonld || []).length ? '<h3>JSON-LD structured data</h3>' + P.meta.jsonld.map((j) => `<pre class="raw">${esc(j)}</pre>`).join('') : ''}`;
      },
      text() { $('#t-text').innerHTML = `<div class="toolbar"><button id="tcopy">Copy all</button><span class="muted">document.body.innerText at capture — what a visitor could see.</span></div><pre class="raw">${esc(P.text)}</pre>`; $('#tcopy').onclick = () => copyText(P.text); },
      files() {
        const f = P.files;
        $('#t-files').innerHTML = `<div class="card files">
          ${f.map(([n, d]) => `<a class="btn" href="${esc(n)}" target="_blank">${esc(n)}</a><span class="muted">${esc(d)}</span><br>`).join('')}
          <a class="btn" href="assets/">assets/</a><span class="muted">Per-page asset folder (images / icons / logos / backgrounds / svg-inline / video-posters / meta-og-favicon)</span></div>
          <p class="muted">page.mhtml opens in Chrome/Edge as a single-file, pixel-faithful archive of the rendered page. snapshot.html is the browsable offline copy (scripts stripped, assets local).</p>`;
      },
    };
    const start = (location.hash || '#compare').slice(1); show(tabs.some((t) => t[0] === start) ? start : 'compare');
  }

  function uniq(arr, k) { const s = new Set(); return arr.filter((x) => { if (!x[k] || s.has(x[k])) return false; s.add(x[k]); return true; }); }

  // ---------- compare view: side-by-side (one scroll = synced), overlay with opacity / difference ----------
  function compareView(P) {
    const s = P.page; const H = Math.max(900, s.page_h || 900);
    const opts = [];
    if (P.shots.d) opts.push(['d', 'Archived screenshot — desktop 1440']);
    if (P.shots.m) opts.push(['m', 'Archived screenshot — mobile 390']);
    if (P.has_snapshot) opts.push(['s', 'Offline snapshot (archived HTML)']);
    opts.push(['live', 'LIVE site (iframe)']);
    if (P.compare_with) opts.push(['other', P.compare_with.label]);
    const el = $('#t-compare');
    const saved = LS.get('lsa:cmp', { mode: 'side', a: 'd', b: 'live', op: 50, diff: false });
    el.innerHTML = `<div class="cmp-bar">
      <button data-mode="side">Side-by-side</button><button data-mode="overlay">Overlay</button><button data-mode="single">Single</button>
      <span class="muted">Left/bottom:</span><select id="pa">${opts.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <span class="muted">Right/top:</span><select id="pb">${opts.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <span id="ovc" class="hide"><input type="range" id="op" min="0" max="100"> <label><input type="checkbox" id="dif"> Difference blend (identical = black)</label></span>
      <div class="spacer"></div><a class="btn" href="${esc(s.url)}" target="_blank" rel="noopener">Open live ↗</a>${P.has_snapshot ? '<a class="btn" href="snapshot.html" target="_blank">Open snapshot ↗</a>' : ''}
    </div>
    ${/deny|sameorigin/i.test(s.x_frame_options || '') ? '<div class="note">This site sends X-Frame-Options — the LIVE pane may stay blank. Use “Open live ↗” in a second window instead.</div>' : ''}
    <div class="note info" style="margin-top:0">Side-by-side panes share one scrollbar, so both stay aligned while you scroll. Live pane is scaled to the same 1440px layout width as the screenshot. If the live site is down, compare screenshot vs offline snapshot.</div>
    <div class="cmp" id="cmp"></div>`;
    $('#pa').value = opts.some((o) => o[0] === saved.a) ? saved.a : opts[0][0];
    $('#pb').value = opts.some((o) => o[0] === saved.b) ? saved.b : 'live';
    $('#op').value = saved.op; $('#dif').checked = saved.diff;
    let mode = saved.mode;
    const stage = (k) => {
      if (k === 'd') return `<div class="stage" data-w="1440"><img src="${P.shots.d}" alt="desktop screenshot"></div>`;
      if (k === 'm') return `<div class="stage" data-w="390" style="max-width:420px;margin:0 auto"><img src="${P.shots.m}" alt="mobile screenshot"></div>`;
      const src = k === 's' ? 'snapshot.html' : k === 'live' ? s.url : P.compare_with.url;
      return `<div class="stage" data-w="1440" data-h="${H}"><iframe src="${esc(src)}" width="1440" height="${H}" scrolling="no" loading="lazy" referrerpolicy="no-referrer" title="${k}"></iframe></div>`;
    };
    const label = (k) => (opts.find((o) => o[0] === k) || [k, k])[1];
    function fit() {
      $$('#cmp .stage').forEach((st) => {
        const ifr = st.querySelector('iframe'); if (!ifr) return;
        const sc = st.clientWidth / 1440; ifr.style.transform = `scale(${sc})`; st.style.height = (+st.dataset.h * sc) + 'px';
      });
      const ov = $('#cmp .overlay'); if (ov) { const w = ov.clientWidth; ov.style.height = Math.max(...$$('.layer', ov).map((l) => l.scrollHeight || (H * w) / 1440)) + 'px'; }
    }
    function draw() {
      const a = $('#pa').value, b = $('#pb').value;
      LS.set('lsa:cmp', { mode, a, b, op: +$('#op').value, diff: $('#dif').checked });
      $$('.cmp-bar [data-mode]').forEach((x) => x.classList.toggle('on', x.dataset.mode === mode));
      $('#ovc').classList.toggle('hide', mode !== 'overlay'); $('#pb').disabled = mode === 'single';
      const c = $('#cmp');
      if (mode === 'side') c.innerHTML = `<div class="cols"><div class="col"><div class="lbl"><span>A · ${esc(label(a))}</span></div>${stage(a)}</div><div class="col"><div class="lbl"><span>B · ${esc(label(b))}</span></div>${stage(b)}</div></div>`;
      else if (mode === 'single') c.innerHTML = `<div class="cols"><div class="col"><div class="lbl"><span>${esc(label(a))}</span></div>${stage(a)}</div></div>`;
      else c.innerHTML = `<div class="cols"><div class="col"><div class="lbl"><span>Bottom: ${esc(label(a))} · Top: ${esc(label(b))} @ <span id="opv"></span>%</span></div><div class="overlay"><div class="layer">${stage(a)}</div><div class="layer top">${stage(b)}</div></div></div></div>`;
      applyOv(); requestAnimationFrame(fit); $$('#cmp img').forEach((i) => i.addEventListener('load', fit));
    }
    function applyOv() { const t = $('#cmp .layer.top'); if (!t) return; t.style.opacity = $('#op').value / 100; t.style.mixBlendMode = $('#dif').checked ? 'difference' : 'normal'; if ($('#opv')) $('#opv').textContent = $('#op').value; LS.set('lsa:cmp', Object.assign(LS.get('lsa:cmp', {}), { op: +$('#op').value, diff: $('#dif').checked })); }
    $$('.cmp-bar [data-mode]').forEach((b) => b.onclick = () => { mode = b.dataset.mode; draw(); });
    $('#pa').onchange = draw; $('#pb').onchange = draw; $('#op').oninput = applyOv; $('#dif').onchange = () => { if ($('#dif').checked) $('#op').value = 100; applyOv(); };
    window.addEventListener('resize', fit);
    draw();
  }

  // =====================================================================================
  // MASTER INDEX
  // =====================================================================================
  function renderMaster(M) {
    document.title = 'Lam Soon old-site archive — MY / TH-EN / TH-TH';
    $('#app').innerHTML = `
    <header class="top"><div class="wrap"><div class="brand"><span class="dot"></span>Lam Soon old-site archive</div><div class="spacer"></div>${deadlineChip()}<span id="theme"></span></div></header>
    <div class="wrap">
      <h1>Old Lam Soon websites — front-end archive & verification</h1>
      <div class="sub">Built ${esc(M.built)} · source: kickoff + CSD review, 6 Oct 2026 (BC_LAMSOON). Front-end crawl only — no database / back end.</div>
      <div class="tiles" id="sites"></div>
      ${M.sites.map((x) => {
        const v = LS.get(vkey(x.folder), {}); const done = Object.values(v).filter((r) => r.result).length; const pct = x.counts.pages ? Math.round((done / x.counts.pages) * 100) : 0;
        return `<div class="card" style="margin-bottom:12px"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <h2 style="margin:0"><a href="${x.href}">${esc(x.label)}</a></h2><span class="chip">${esc(x.short)}</span>${x.recheck_of ? `<span class="chip warn">re-check of ${esc(x.recheck_of)}</span>` : ''}<div class="spacer"></div><a class="btn primary" href="${x.href}">Open dashboard →</a></div>
          <div class="sub">${esc(x.origin)} · captured ${esc(x.finished)} · ${(x.platform_hints || []).map((p) => `<span class="chip">${esc(p)}</span>`).join(' ')}</div>
          <div class="tiles"><div class="tile"><div class="n">${x.counts.pages}</div><div class="l">Pages</div></div><div class="tile ${x.counts.errors ? 'bad' : 'ok'}"><div class="n">${x.counts.errors}</div><div class="l">Failed</div></div>
          <div class="tile"><div class="n">${x.counts.assets}</div><div class="l">Assets</div></div><div class="tile"><div class="n">${x.counts.documents}</div><div class="l">Documents</div></div>
          <div class="tile"><div class="n">${x.counts.forms}</div><div class="l">Forms</div></div><div class="tile ${x.counts.issues ? 'warn' : ''}"><div class="n">${x.counts.issues}</div><div class="l">Issues logged</div></div>
          <div class="tile"><div class="n">${pct}%</div><div class="l">Verified (this browser)</div><div class="progress"><i style="width:${pct}%"></i></div></div></div></div>`;
      }).join('') || '<div class="note">No site captured yet. Run <code>tools/run.sh</code> (or run.bat on Windows).</div>'}
      ${M.comparisons.length ? '<h2>Comparison reports</h2>' + M.comparisons.map((c) => `<div class="card" style="margin-bottom:8px"><a href="${c.href}"><b>${esc(c.title)}</b></a> <span class="muted">${esc(c.summary)}</span></div>`).join('') : ''}
    </div>`;
    $('#theme').appendChild(themeBtn());
  }

  // ---------- compare.py report ----------
  function renderCompare(C) {
    document.title = 'Compare — ' + C.title;
    $('#app').innerHTML = `<header class="top"><div class="wrap"><div class="brand"><span class="dot"></span>Compare</div><div class="crumbs"><a href="${C.rootHref}">All sites</a> › ${esc(C.title)}</div><div class="spacer"></div>${deadlineChip()}<span id="theme"></span></div></header>
    <div class="wrap"><h1>${esc(C.title)}</h1><div class="sub">A = ${esc(C.a_label)} · B = ${esc(C.b_label)} · built ${esc(C.built)}</div>
    <div class="tiles">${C.tiles.map(([n, l, cls]) => `<div class="tile ${cls || ''}"><div class="n">${n}</div><div class="l">${esc(l)}</div></div>`).join('')}</div>
    <div class="toolbar"><input type="search" id="q" placeholder="Search…"><select id="f"><option value="">All</option><option value="diff">Differences only</option><option value="missing">Missing in B</option></select></div>
    <table class="grid" id="t"><thead><tr><th>ID</th><th>Page</th><th>Text match</th><th>Images A/B</th><th>Missing imgs in B</th><th>Links A/B</th><th>Visual diff</th><th>Verdict</th></tr></thead><tbody></tbody></table></div>`;
    $('#theme').appendChild(themeBtn());
    const draw = () => {
      const q = $('#q').value.toLowerCase(), f = $('#f').value;
      $('#t tbody').innerHTML = C.rows.filter((r) => (!q || (r.id + r.title + r.url).toLowerCase().includes(q)) && (!f || (f === 'missing' ? r.missing_b : r.verdict !== 'MATCH'))).map((r) => `<tr>
        <td><a href="${r.href}"><b>${r.id}</b></a></td><td><div class="ttl"><a href="${r.href}">${esc(r.title)}</a></div><div class="url">${esc(dec(r.url))}</div></td>
        <td class="num">${r.missing_b ? '—' : r.text_ratio + '%'}</td><td class="num">${r.img_a}/${r.img_b}</td><td class="num">${r.img_missing || ''}</td><td class="num">${r.link_a}/${r.link_b}</td>
        <td class="num">${r.visual == null ? '—' : r.visual + '%'}</td><td><span class="chip ${r.verdict === 'MATCH' ? 'ok' : r.verdict === 'CHECK' ? 'warn' : 'bad'}">${r.verdict}</span></td></tr>`).join('');
    };
    $('#q').oninput = draw; $('#f').oninput = draw; draw();
  }

  window.LSA = { renderSite, renderPage, renderMaster, renderCompare };
})();

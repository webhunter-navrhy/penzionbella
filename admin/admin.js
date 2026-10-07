/* =====================================================================
   Administrace Penzion Bella
   Obsah webu je v repozitáři (_data/*.json). Uložení = jeden commit přes backend
   webhunter-admin (Cloudflare Worker, přihlášení heslem); GitHub Action pak web
   přegeneruje (~1 min). Vzor: administrace Med Shop / A Studio.
   ===================================================================== */
'use strict';
(() => {
const CFG = {
  id: 'penzionbella', site: '../',
  api: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.search.includes('local') ? 'http://localhost:8787' : 'https://webhunter-admin.webhunter.workers.dev',
};
const FILES = {
  cenik: '_data/cenik.json', apartmany: '_data/apartmany.json', fotky: '_data/fotky.json', texty: '_data/texty.json',
  site: '_data/site.json', okoli: '_data/okoli.json', recenze: '_data/recenze.json', faq: '_data/faq.json', gdpr: '_data/gdpr.json',
};
const LABEL = { cenik: 'Ceník', apartmany: 'Apartmány', fotky: 'Fotky', texty: 'Texty', site: 'Kontakty', okoli: 'Okolí', recenze: 'Recenze', faq: 'Časté dotazy', gdpr: 'Ochrana údajů' };
const SK = 'penzionbella_admin';

const S = { sess: null, def: false, D: {}, snap: {}, pending: {}, preview: {}, saving: false, lib: null };

/* ---------------------------------------------------------------- ikony */
const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  home: I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  phone: I('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  tag: I('<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
  bed: I('<path d="M3 19V6M3 13h18v6M21 13v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="10" r="1.6"/>'),
  text: I('<path d="M5 6h14M5 11h14M5 16h9"/>'),
  pages: I('<rect x="4" y="3" width="13" height="16" rx="1.5"/><path d="M8 21h11a1 1 0 0 0 1-1V7"/><path d="M8 8h5M8 12h5"/>'),
  map: I('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  star: I('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  q: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h0"/>'),
  doc: I('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-2.8 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.8-1.2 2 2 0 1 1-2.8-2.8A1.7 1.7 0 0 0 3.3 14a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.8 2 2 0 1 1 2.8-2.8A1.7 1.7 0 0 0 10 3.3a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.8 1.2 2 2 0 1 1 2.8 2.8A1.7 1.7 0 0 0 20.7 10a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.3 1z"/>'),
  help: I('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h0"/>'),
  ext: I('<path d="M14 4h6v6M20 4L10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  x: I('<path d="M18 6L6 18M6 6l12 12"/>'),
  up: I('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  down: I('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  left: I('<path d="M15 18l-6-6 6-6"/>'),
  right: I('<path d="M9 18l6-6-6-6"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  chev: I('<path d="M6 9l6 6 6-6"/>'),
  eye: I('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'),
  upload: I('<path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  image: I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h0"/>'),
  logout: I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  cal: I('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
};
const LOGO = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 15.5 L16 4 L28 15.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 14.5 V27 h19 V14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 27 v-7.5 a3 3 0 0 1 6 0 V27" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20.5 a2.5 2.5 0 0 1 5 0 v3 h-5 z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
/* ikony, které web umí zobrazit (src/icons.json) */
const WEB_ICONS = [['house', 'Dům'], ['users', 'Lidé'], ['bed-double', 'Postel'], ['bath', 'Koupelna'], ['utensils', 'Kuchyň / jídlo'], ['tv', 'Televize'], ['wifi', 'Wi-Fi'],
  ['gamepad2', 'Hry'], ['beer', 'Pivo'], ['flame', 'Oheň / gril'], ['thermometer', 'Topení'], ['car', 'Auto / parkování'], ['tram-front', 'Vlak'], ['navigation', 'Navigace'],
  ['map-pin', 'Místo'], ['map', 'Mapa'], ['mountain', 'Hory'], ['snowflake', 'Zima'], ['sun', 'Léto'], ['landmark', 'Památka'], ['door-open', 'Vchod'],
  ['calendar-check', 'Kalendář'], ['shield-check', 'Jistota'], ['check', 'Fajfka'], ['phone', 'Telefon'], ['mail', 'E-mail']];

/* ---------------------------------------------------------------- utils */
const $ = (s, c = document) => c.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8);
const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const imgSrc = (p) => !p ? '' : S.preview[p] || (/^(https?:|blob:|data:)/.test(p) ? p : CFG.site + p);
const kc = (v) => { const s = String(v ?? '').trim(); if (!s) return '–'; return /^\d[\d\s]*$/.test(s) ? (+s.replace(/\s/g, '')).toLocaleString('cs-CZ') + ' Kč' : (s.includes('Kč') ? s : s + ' Kč'); };

/** h('div.class', {attr}, ...children) — malý DOM helper */
function h(sel, props = {}, ...kids) {
  const [tag, ...cls] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (cls.length) el.className = cls.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}

function toast(title, sub = '', type = '') {
  const el = h('div.toast' + (type ? '.' + type : ''), {}, h('b', {}, title), sub ? h('small', {}, sub) : null);
  $('#toasts').append(el);
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, type === 'err' ? 7000 : 4000);
}
function modal({ title, body, actions = [] }) {
  return new Promise((resolve) => {
    const close = (v) => { bg.remove(); resolve(v); };
    const box = h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, h('h2', {}, title));
    if (typeof body === 'string') box.append(h('div', { html: body })); else if (body) box.append(body);
    box.append(h('div.modal-actions', {}, actions.map((a) => h('button.btn' + (a.cls ? '.' + a.cls : ''), { type: 'button', onclick: () => close(typeof a.value === 'function' ? a.value(box) : a.value) }, a.label))));
    const bg = h('div.modal-bg', { onclick: (e) => { if (e.target === bg) close(null); } }, box);
    $('#modal-root').append(bg);
    const f = box.querySelector('input,textarea,select,button.btn-primary'); if (f) setTimeout(() => f.focus(), 50);
  });
}
const confirmDlg = (title, text, ok = 'Smazat', cls = 'btn-dark') => modal({ title, body: `<p>${esc(text)}</p>`, actions: [{ label: 'Zrušit', value: false }, { label: ok, cls, value: true }] }).then((v) => v === true);

/* ---------------------------------------------------------------- API */
const b64e = (bytes) => { let s = ''; bytes = new Uint8Array(bytes); for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const utf8b64 = (str) => b64e(new TextEncoder().encode(str));
function saveSess() { localStorage.setItem(SK, JSON.stringify({ t: S.sess, def: S.def, exp: Date.now() + 11.5 * 3600e3 })); }
async function api(path, opt = {}, retried = false) {
  const headers = { ...(typeof opt.body === 'string' ? { 'Content-Type': 'application/json' } : {}) };
  if (S.sess) headers.Authorization = 'Bearer ' + S.sess;
  let r;
  try { r = await fetch(`${CFG.api}/api/${CFG.id}${path}`, { ...opt, headers, cache: 'no-store' }); }
  catch { throw new Error('Nelze se spojit se serverem. Zkontrolujte připojení k internetu.'); }
  if (r.status === 401 && path !== '/login' && !retried && S.D.site) { if (await reauth()) return api(path, opt, true); }
  if (!r.ok) { let m = r.statusText; try { m = (await r.json()).error || m; } catch {} const e = new Error(m); e.status = r.status; throw e; }
  return opt.raw ? r.text() : r.json();
}
const readFile = (p) => api('/file?path=' + encodeURIComponent(p) + '&t=' + Date.now(), { raw: true });
async function commit(files, message) {
  const out = []; const queue = [...files];
  const worker = async () => { while (queue.length) { const f = queue.shift(); const { sha } = await api('/blob', { method: 'POST', body: JSON.stringify({ content: f.b64 ?? utf8b64(f.content), encoding: 'base64' }) }); out.push({ path: f.path, sha }); } };
  await Promise.all([worker(), worker(), worker()]);
  return (await api('/commit', { method: 'POST', body: JSON.stringify({ files: out, message }) })).sha;
}
async function reauth() {
  const inp = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Heslo' });
  const pw = await modal({ title: 'Přihlášení vypršelo', body: h('div', {}, h('p', {}, 'Zadejte prosím heslo znovu — rozdělaná práce zůstane zachovaná.'), inp), actions: [{ label: 'Zrušit', value: null }, { label: 'Přihlásit', cls: 'btn-primary', value: () => inp.value }] });
  if (!pw) return false;
  try { const r = await api('/login', { method: 'POST', body: JSON.stringify({ password: pw }) }); S.sess = r.token; S.def = r.def; saveSess(); return true; }
  catch (e) { toast('Přihlášení se nepovedlo', e.message, 'err'); return false; }
}

/* ---------------------------------------------------------------- data */
async function loadAll() {
  const keys = Object.keys(FILES);
  const res = await Promise.all(keys.map((k) => readFile(FILES[k]).then(JSON.parse)));
  keys.forEach((k, i) => { S.D[k] = res[i]; });
  snapshot();
}
function snapshot(keys = Object.keys(FILES)) { keys.forEach((k) => { S.snap[k] = JSON.stringify(S.D[k]); }); }
const dirtyKeys = () => Object.keys(FILES).filter((k) => S.D[k] && JSON.stringify(S.D[k]) !== S.snap[k]);
const changed = debounce(() => updateSavebar(), 100);
window.addEventListener('beforeunload', (e) => { if (dirtyKeys().length) { e.preventDefault(); e.returnValue = ''; } });

function validate() {
  const ids = new Set();
  for (const a of S.D.apartmany) {
    if (!a.nazev?.trim()) return 'Jeden apartmán nemá název.';
    if (!(+a.luzka > 0)) return `${a.nazev}: vyplňte počet lůžek.`;
    a.luzka = +a.luzka; a.loznice = +a.loznice || 0;
    if (!a.id) a.id = slugify(a.nazev.replace(/č\.\s*/i, '')) || 'apartman-' + uid();
    while (ids.has(a.id)) a.id = a.id + '-' + uid();
    ids.add(a.id);
  }
  if (!S.D.site.telefony.some((t) => t.cislo?.trim())) return 'Vyplňte alespoň jeden telefon (Kontakty).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.D.site.email || '')) return 'E-mail v Kontaktech nevypadá správně.';
  if (!(+S.D.cenik.od_ceny > 0)) return 'Vyplňte cenu „od“ v Ceníku (např. 300).';
  S.D.cenik.od_ceny = +S.D.cenik.od_ceny;
  S.D.recenze.prumer = +String(S.D.recenze.prumer).replace(',', '.') || 5;
  for (const r of S.D.recenze.recenze) { if (!r.text?.trim()) return 'Jedna recenze nemá text.'; r.hodnoceni = Math.min(5, Math.max(1, +String(r.hodnoceni).replace(',', '.') || 5)); }
  if (!S.D.fotky.hero.length) return 'Přidejte alespoň jednu úvodní fotku (Fotky).';
  return null;
}
async function saveAll() {
  const keys = dirtyKeys();
  if (!keys.length || S.saving) return;
  const err = validate(); if (err) return toast('Nelze uložit', err, 'err');
  S.saving = true; updateSavebar();
  const bar = h('div.progress-line'); document.body.append(bar);
  try {
    const keys2 = dirtyKeys();
    const files = keys2.map((k) => ({ path: FILES[k], content: JSON.stringify(S.D[k], null, 2) + '\n' }));
    const used = JSON.stringify(S.D);
    const imgs = Object.keys(S.pending).filter((p) => used.includes(p));
    imgs.forEach((p) => files.push({ path: p, b64: S.pending[p] }));
    const sha = await commit(files, keys2.map((k) => LABEL[k]).join(', ') + (imgs.length ? ` (+${imgs.length} foto)` : ''));
    imgs.forEach((p) => delete S.pending[p]);
    snapshot(keys2);
    toast('Uloženo', 'Změny se na webu objeví přibližně za minutu.', 'ok');
    watchPublish(sha);
  } catch (e) { toast('Uložení se nepovedlo', e.message, 'err'); }
  finally { S.saving = false; bar.remove(); updateSavebar(); }
}
function discard() { dirtyKeys().forEach((k) => { S.D[k] = JSON.parse(S.snap[k]); }); updateSavebar(); route(); toast('Změny zahozeny'); }

/* publikace — čeká, až version.json na webu obsahuje nový commit */
let pubTimer = null;
function setPub(state, text) { const el = $('.pub'); if (el) { el.className = 'pub ' + state; el.innerHTML = `<i></i><span>${esc(text)}</span>`; } }
function watchPublish(sha) {
  localStorage.setItem(SK + '_pub', JSON.stringify({ sha, t: Date.now() }));
  clearInterval(pubTimer); setPub('busy', 'Zveřejňuji změny…');
  const t0 = Date.now();
  pubTimer = setInterval(async () => {
    try {
      const v = await fetch(CFG.site + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json());
      if (v.sha === sha) { clearInterval(pubTimer); localStorage.removeItem(SK + '_pub'); setPub('', 'Web je aktuální'); toast('Změny jsou na webu', 'Web byl právě aktualizován.', 'ok'); return; }
    } catch {}
    if (Date.now() - t0 > 8 * 60000) { clearInterval(pubTimer); setPub('warn', 'Zveřejnění trvá déle'); }
  }, 6000);
}
function initPub() { const p = JSON.parse(localStorage.getItem(SK + '_pub') || 'null'); if (p && Date.now() - p.t < 10 * 60000) watchPublish(p.sha); else setPub('', 'Web je aktuální'); }

/* ---------------------------------------------------------------- fotky */
async function compress(file, max = 1800) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { throw new Error(`Soubor „${file.name}“ nejde načíst. Použijte fotku JPG, PNG nebo WebP (fotky z iPhonu ve formátu HEIC nejdřív uložte jako JPG).`); }
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.82)), ext = 'webp';
  if (!blob || blob.type !== 'image/webp') { blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86)); ext = 'jpg'; }
  return { blob, ext, w: c.width, h: c.height };
}
async function upload(file, hint, max) {
  const { blob, ext, w, h: hh } = await compress(file, max);
  const d = new Date();
  const name = (slugify(hint) || slugify(file.name.replace(/\.[^.]+$/, '')) || 'foto').slice(0, 40);
  const path = `img/uploads/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}/${name}-${uid()}.${ext}`;
  S.pending[path] = b64e(await blob.arrayBuffer());
  S.preview[path] = URL.createObjectURL(blob);
  return { src: path, w, h: hh };
}
async function library() {
  if (!S.lib) { try { S.lib = await fetch(CFG.site + 'admin/images.json?t=' + Date.now()).then((r) => r.json()); } catch { S.lib = []; } }
  return [...Object.keys(S.pending), ...S.lib];
}
/** výběr fotky z webu (vrátí cestu nebo null) */
async function pickFromLibrary(title = 'Vybrat fotku z webu') {
  const list = await library();
  return new Promise((resolve) => {
    let done = false;
    const grid = h('div.lib', {}, list.map((p) => h('button', { type: 'button', onclick: () => { done = true; resolve(p); document.querySelector('.modal-bg')?.remove(); } }, h('img', { src: imgSrc(p), loading: 'lazy', alt: '' }))));
    modal({ title, body: grid, actions: [{ label: 'Zavřít', value: null }] }).then(() => { if (!done) resolve(null); });
  });
}
const setPhoto = (obj, r) => { obj.src = r.src; if (r.w) { obj.w = r.w; obj.h = r.h; } else { delete obj.w; delete obj.h; } delete obj.m; };

/* ---------------------------------------------------------------- pole formulářů */
const bump = () => changed();
function fText(obj, key, label, o = {}) {
  const inp = o.multi
    ? h('textarea', { rows: o.rows || 4, placeholder: o.ph || '', oninput: (e) => { obj[key] = e.target.value; bump(); o.on?.(); } })
    : h('input', { type: o.type || 'text', placeholder: o.ph || '', inputmode: o.inputmode, autocomplete: 'off', oninput: (e) => { obj[key] = o.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value; bump(); o.on?.(); } });
  inp.value = obj[key] ?? '';
  return h('label.field', {}, h('span', {}, label), inp, o.hint ? h('small', {}, o.hint) : null);
}
function fSelect(obj, key, label, options, o = {}) {
  if (obj[key] != null && !options.some(([v]) => String(v) === String(obj[key]))) options = [[obj[key], String(obj[key])], ...options];
  const sel = h('select', { onchange: (e) => { obj[key] = e.target.value; bump(); o.on?.(); } }, options.map(([v, t]) => h('option', { value: v }, t)));
  sel.value = String(obj[key] ?? options[0][0]);
  return h('label.field', {}, h('span', {}, label), sel);
}
const fIcon = (obj, key = 'ikona', label = 'Ikona') => fSelect(obj, key, label, WEB_ICONS);
function fCheck(obj, key, label, on) {
  return h('label.check', {}, h('input', { type: 'checkbox', checked: obj[key], onchange: (e) => { obj[key] = e.target.checked; bump(); on?.(); } }), h('span', {}, label));
}
/** jedna fotka; obj[key] = cesta (pole s w/h volitelně v objektu dims) */
function fImage(obj, key, label, hint = '', o = {}) {
  const prev = h('img.prev', { src: imgSrc(obj[key]), alt: '' });
  const set = (r) => { obj[key] = r.src; if (o.dims) { if (r.w) { obj[o.dims[0]] = r.w; obj[o.dims[1]] = r.h; } else { delete obj[o.dims[0]]; delete obj[o.dims[1]]; } } prev.src = imgSrc(r.src); bump(); o.on?.(); };
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { set(await upload(f, hint)); toast('Fotka připravena', 'Na web se nahraje po uložení.'); } catch (er) { toast('Fotku se nepodařilo načíst', er.message, 'err'); }
    e.target.value = '';
  } });
  return h('div.field', {}, h('span', {}, label),
    h('div.img-field', {}, prev, h('div.acts', {},
      h('button.btn.btn-sm', { type: 'button', onclick: () => file.click(), html: IC.upload + 'Nahrát novou' }),
      h('button.btn.btn-sm.btn-ghost', { type: 'button', onclick: async () => { const p = await pickFromLibrary(); if (p) set({ src: p }); }, html: IC.image + 'Vybrat z webu' }), file)),
    o.hint ? h('small', {}, o.hint) : null);
}
/** mřížka fotek: nahrát více najednou, popis, pořadí, mazání */
function fPhotos(arr, o = {}) {
  const wrap = h('div');
  const render = () => {
    const grid = h('div.photos');
    arr.forEach((p, i) => {
      const alt = h('textarea', { rows: 2, placeholder: o.altPh || 'Popis fotky (co na ní je)', 'aria-label': 'Popis fotky', oninput: (e) => { p.alt = e.target.value; bump(); } }); alt.value = p.alt || '';
      const extra = [];
      if (o.popisek) { const pp = h('input', { type: 'text', placeholder: 'Popisek pod fotkou', style: 'border:0;border-top:1px solid var(--line);border-radius:0;font-size:.8rem', oninput: (e) => { p.popisek = e.target.value; bump(); } }); pp.value = p.popisek || ''; extra.push(pp); }
      if (o.koupelna) extra.push(h('label.check', { style: 'padding:.3rem .5rem;font-size:.78rem' }, h('input', { type: 'checkbox', checked: !!p.koupelna, onchange: (e) => { if (e.target.checked) p.koupelna = true; else delete p.koupelna; bump(); } }), h('span', {}, 'koupelna (ne jako náhled)')));
      const img = h('img', { src: imgSrc(p.m && !S.preview[p.src] ? p.m : p.src), alt: '', title: 'Vyměnit fotku', onclick: () => replace(i) });
      grid.append(h('div.photo', {}, img, (o.first && i === 0) ? h('span.ph-first', {}, o.first) : null,
        h('div.ph-tools', {},
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout dopředu', 'aria-label': 'Posunout dopředu', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.left }),
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Smazat fotku', 'aria-label': 'Smazat fotku', onclick: async () => { if (await confirmDlg('Smazat fotku?', 'Fotka zmizí z webu (po uložení).')) { arr.splice(i, 1); bump(); render(); } }, html: IC.trash }),
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout dozadu', 'aria-label': 'Posunout dozadu', disabled: i === arr.length - 1, onclick: () => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.right })),
        alt, ...extra));
    });
    if (!o.max || arr.length < o.max) {
      const file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => {
        const fs = [...e.target.files]; e.target.value = '';
        for (const f of fs) {
          try { const r = await upload(f, o.hint || 'foto', o.maxPx); const it = { src: r.src, alt: '', w: r.w, h: r.h }; if (o.make) Object.assign(it, o.make()); arr.push(it); bump(); }
          catch (er) { toast('Fotku se nepodařilo načíst', er.message, 'err'); }
        }
        render(); if (fs.length) toast(fs.length === 1 ? 'Fotka přidána' : `Přidáno ${fs.length} fotek`, 'Doplňte popis a uložte změny.');
      } });
      grid.append(h('button.photo-add', { type: 'button', onclick: () => file.click(), html: IC.upload + '<span>Nahrát fotky<br><small>můžete vybrat víc najednou</small></span>' }), file);
      grid.append(h('button.photo-add', { type: 'button', onclick: async () => { const p = await pickFromLibrary(); if (p) { const it = { src: p, alt: '' }; if (o.make) Object.assign(it, o.make()); arr.push(it); bump(); render(); } }, html: IC.image + '<span>Vybrat z fotek na webu</span>' }));
    }
    wrap.replaceChildren(grid);
  };
  const replace = async (i) => {
    const r = await modal({ title: 'Vyměnit fotku', body: '<p>Nahrajte novou fotku, nebo vyberte některou z fotek, které už na webu jsou. Popis fotky zůstane.</p>', actions: [{ label: 'Zrušit', value: null }, { label: 'Vybrat z webu', value: 'lib' }, { label: 'Nahrát novou', cls: 'btn-primary', value: 'up' }] });
    if (r === 'lib') { const p = await pickFromLibrary(); if (p) { setPhoto(arr[i], { src: p }); bump(); render(); } }
    if (r === 'up') {
      const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { setPhoto(arr[i], await upload(f, o.hint || 'foto', o.maxPx)); bump(); render(); toast('Fotka vyměněna', 'Na web se nahraje po uložení.'); } catch (er) { toast('Fotku se nepodařilo načíst', er.message, 'err'); }
      } });
      document.body.append(file); file.click(); setTimeout(() => file.remove(), 60000);
    }
  };
  render();
  return wrap;
}
/** seznam položek s rozbalováním, řazením a mazáním */
function fList(arr, o) {
  const wrap = h('div');
  const render = (openIdx = -1) => {
    wrap.replaceChildren();
    const items = h('div.items');
    if (!arr.length) items.append(h('p.empty', {}, o.empty || 'Zatím tu nic není.'));
    arr.forEach((it, i) => {
      const title = h('b'), sub = h('small'), thumb = o.thumb ? h('img.thumb', { alt: '' }) : null;
      const refresh = () => { title.textContent = o.title(it) || '(bez názvu)'; sub.textContent = o.sub ? o.sub(it) : ''; if (thumb) thumb.src = imgSrc(o.thumb(it)); };
      const body = h('div.item-body');
      let built = false;
      const el = h('div.item');
      const toggle = () => { if (!built) { o.body(it, body, refresh); built = true; } el.classList.toggle('open'); };
      const head = h('div.item-head', {},
        thumb, h('div.t', { onclick: toggle }, title, sub),
        h('div.item-tools', {},
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout nahoru', 'aria-label': 'Posunout nahoru', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.up }),
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout dolů', 'aria-label': 'Posunout dolů', disabled: i === arr.length - 1, onclick: () => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.down }),
          o.noDelete ? null : h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Smazat', 'aria-label': 'Smazat', onclick: async () => { if (await confirmDlg('Smazat položku?', `„${o.title(it) || 'bez názvu'}“ bude odstraněna.`)) { arr.splice(i, 1); bump(); render(); } }, html: IC.trash }),
          h('button.btn.btn-icon.btn-ghost.chev', { type: 'button', 'aria-label': 'Rozbalit', onclick: toggle, html: IC.chev })));
      el.append(head, body); items.append(el); refresh();
      if (i === openIdx) toggle();
    });
    wrap.append(items, o.make ? h('button.btn.add', { type: 'button', onclick: () => { arr.push(o.make()); bump(); render(arr.length - 1); }, html: IC.plus + (o.addLabel || 'Přidat') }) : null);
  };
  render();
  return wrap;
}
/** seznam textů (odrážky) */
function fStrList(arr, label, o = {}) {
  const box = h('div.field', {}, h('span', {}, label));
  const list = h('div');
  const render = () => {
    list.replaceChildren(...arr.map((v, i) => {
      const inp = o.multi ? h('textarea', { rows: 2 }) : h('input', { type: 'text' });
      inp.value = v; inp.addEventListener('input', (e) => { arr[i] = e.target.value; bump(); });
      return h('div', { style: 'display:flex;gap:.4rem;align-items:flex-start;margin-bottom:.45rem' }, inp,
        h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Posunout nahoru', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.up }),
        h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Smazat', onclick: () => { arr.splice(i, 1); bump(); render(); }, html: IC.trash }));
    }), h('button.btn.btn-sm', { type: 'button', onclick: () => { arr.push(''); bump(); render(); }, html: IC.plus + (o.add || 'Přidat') }));
  };
  render(); box.append(list, o.hint ? h('small', {}, o.hint) : null);
  return box;
}
/** tabulka řádků (ceník): cols = [[klíč, popisek, placeholder, typ]] */
function fRows(arr, cols, o = {}) {
  const box = h('div');
  const cls = cols.length > 2 ? '.t3' : '';
  const render = () => {
    box.replaceChildren(h('div.trow.thead' + cls, {}, ...cols.map((c) => h('span', {}, c[1])), h('span')),
      ...arr.map((r, i) => h('div.trow' + cls, {},
        ...cols.map(([k, l, ph, t]) => {
          const inp = h('input', { type: 'text', placeholder: ph || '', 'aria-label': l, inputmode: t === 'cena' ? 'text' : undefined, oninput: (e) => { r[k] = e.target.value; bump(); } });
          inp.value = r[k] ?? '';
          return t === 'cena' ? h('div.price-in', {}, inp) : inp;
        }),
        h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Smazat řádek', onclick: () => { arr.splice(i, 1); bump(); render(); }, html: IC.trash }))),
      h('button.btn.btn-sm', { type: 'button', style: 'margin-top:.3rem', onclick: () => { arr.push(Object.fromEntries(cols.map(([k]) => [k, '']))); bump(); render(); }, html: IC.plus + (o.add || 'Přidat řádek') }));
  };
  render();
  return box;
}
const card = (title, hint, ...kids) => h('section.card', {}, title ? h('h2', {}, title) : null, hint ? h('p.hint', {}, hint) : null, ...kids);
const row2 = (...kids) => h('div.row2', {}, ...kids);
const view = (title, lead, ...kids) => { const m = $('main.view'); m.replaceChildren(h('div.view-head', {}, h('h1', {}, title), lead ? h('p', {}, lead) : null), ...kids); window.scrollTo(0, 0); };
const plural = (n, a, b, c) => (n === 1 ? a : n >= 2 && n <= 4 ? b : c);

/* ---------------------------------------------------------------- pohledy */
const NAV = [
  ['', 'Přehled', 'home'], ['-'],
  ['cenik', 'Ceník a volné termíny', 'tag', 'cenik'], ['apartmany', 'Apartmány a jejich fotky', 'bed', 'apartmany'], ['fotky', 'Úvodní fotky a galerie', 'image', 'fotky'],
  ['texty', 'Texty úvodní stránky', 'text', 'texty'], ['stranky', 'Podstránky', 'pages', 'texty'], ['okoli', 'Okolí a výlety', 'map', 'okoli'],
  ['recenze', 'Recenze hostů', 'star', 'recenze'], ['dotazy', 'Časté dotazy', 'q', 'faq'], ['kontakty', 'Kontakty', 'phone', 'site'], ['gdpr', 'Ochrana osobních údajů', 'doc', 'gdpr'], ['-'],
  ['napoveda', 'Návod', 'help'], ['nastaveni', 'Heslo a odhlášení', 'gear'],
];

function vDash() {
  const tiles = [['cenik', 'Ceník', 'tag', 'Ceny, sezóny, podmínky'], ['cenik', 'Volné termíny', 'cal', 'Last minute víkendy'], ['apartmany', 'Apartmány', 'bed', 'Popisy, lůžka, fotky'],
    ['fotky', 'Fotky', 'image', 'Úvod, galerie, okolí'], ['texty', 'Texty', 'text', 'Úvodní stránka'], ['recenze', 'Recenze', 'star', 'Hodnocení hostů']]
    .map(([id, label, ic, sub]) => h('a.tile', { href: '#/' + id }, h('span', { html: IC[ic] }), h('b', {}, label), h('small', {}, sub)));
  view('Dobrý den 👋', 'Tady si upravujete web penzionu: ceník, volné termíny, apartmány a fotky, texty i recenze. Změny uložíte tlačítkem „Uložit změny“ dole – na webu se objeví zhruba za minutu.',
    h('div.tiles', {}, tiles),
    card('Jak to funguje', null, h('div.help', { html: '<ol><li>Vlevo (na mobilu v menu ☰) vyberte, co chcete upravit.</li><li>Přepište text nebo nahrajte fotku. Fotky se samy zmenší, nemusíte je nijak upravovat.</li><li>Dole se objeví lišta – klikněte na <b>Uložit změny</b>.</li><li>Nahoře uvidíte „Zveřejňuji změny…“ a za chvíli „Web je aktuální“.</li></ol>' })),
    h('a.btn.btn-dark', { href: CFG.site, target: '_blank', rel: 'noopener', style: 'margin-top:.5rem', html: IC.ext + 'Otevřít web' }));
}

function vCenik() {
  const c = S.D.cenik, v = c.volne;
  view('Ceník a volné termíny', 'Ceny pište číslem (např. 300) – „Kč“ se na webu doplní samo. Rozpětí napište s pomlčkou (310–380). Ceník se zobrazuje na úvodní stránce, na stránce Ceník i u poptávky.',
    card('Volné termíny (last minute)', 'Tabulka volných víkendů vedle ceníku. Když žádné nemáte, vypněte zobrazení.',
      fCheck(v, 'zobrazit', 'Zobrazovat volné termíny na webu'),
      row2(fText(v, 'nadpis', 'Nadpis', { ph: 'Volné podzimní víkendy 2026' }), fText(v, 'tlacitko', 'Text tlačítka', { ph: 'Poptat víkend' })),
      fText(v, 'text', 'Text pod nadpisem', { multi: true, rows: 2 }),
      fRows(v.terminy, [['termin', 'Termín', '16.–18. 10. 2026'], ['cena', 'Cena za osobu a noc', '370', 'cena']], { add: 'Přidat termín' })),
    card('Hlavní ceny', null,
      row2(fText(c, 'nadpis', 'Nadpis ceníku', { ph: 'Ceník 2026' }), fText(c, 'od_ceny', 'Cena „od“ (Kč za osobu a noc)', { type: 'number', inputmode: 'numeric', hint: 'Zobrazuje se u apartmánů a nahoře na úvodní stránce.' })),
      fText(c, 'od_ceny_pozn', 'Upřesnění ceny „od“', { ph: 'při pobytu na 6–7 nocí' }),
      fText(c, 'uvod', 'Úvodní text ceníku', { multi: true, rows: 3 })),
    card('Cena podle délky pobytu', null, fText(c, 'delka_nadpis', 'Nadpis tabulky'),
      fRows(c.delka, [['noci', 'Délka pobytu', '6–7 nocí'], ['cena', 'Cena za osobu a noc', '300', 'cena']]),
      h('div', { style: 'margin-top:1rem' }, fText(c, 'min_pobyt', 'Minimální délka pobytu', { ph: '2 noci' }))),
    card('Sezóny a zvláštní termíny', 'Štítek se zobrazí u názvu červeně (např. „2026 obsazeno“).', fText(c, 'sezony_nadpis', 'Nadpis tabulky'),
      fRows(c.sezony, [['nazev', 'Název', 'Vánoce'], ['pozn', 'Poznámka', 'Plus spotřebovaný plyn.'], ['stitek', 'Štítek', 'obsazeno'], ['cena', 'Cena', '330', 'cena']], { add: 'Přidat sezónu' })),
    card('Poplatky a podmínky', null, fText(c, 'podminky_nadpis', 'Nadpis'), fStrList(c.podminky, 'Odrážky', { multi: true, add: 'Přidat podmínku' }), fText(c, 'poznamka', 'Poznámka pod podmínkami')),
    card('Pro vyhledávače', 'Cenové rozpětí, které vidí Google a AI asistenti.', fText(c, 'rozpeti', 'Rozpětí cen', { ph: '300–370 Kč / osoba / noc' })));
}

function apParams(a) { return `${a.patro || ''} · ${a.luzka || '?'} ${plural(+a.luzka, 'lůžko', 'lůžka', 'lůžek')} · ${(a.fotky || []).length} ${plural((a.fotky || []).length, 'fotka', 'fotky', 'fotek')}`; }
function vApartmany() {
  view('Apartmány a jejich fotky', 'Klikněte na apartmán a upravte popis, počet lůžek nebo fotky. První dvě fotky (kromě koupelny) se ukazují jako náhled na kartě apartmánu. Pořadí apartmánů zde = pořadí na webu.',
    fList(S.D.apartmany, {
      title: (a) => a.nazev, sub: apParams, thumb: (a) => (a.fotky?.[0]?.m && !S.preview[a.fotky[0].src]) ? a.fotky[0].m : a.fotky?.[0]?.src,
      addLabel: 'Přidat apartmán',
      make: () => ({ id: '', nazev: 'Nový apartmán', patro: '1. patro', luzka: 2, loznice: 1, kuchynka: false, balkon: false, vlastni_vchod: false, popis: '', dispozice: '', vybaveni: '', vchod: '', fotky: [] }),
      body: (a, b, r) => b.append(
        row2(fText(a, 'nazev', 'Název', { on: r, ph: 'Apartmán č. 1' }), fText(a, 'patro', 'Patro', { on: r, ph: 'přízemí / 1. patro' })),
        row2(fText(a, 'luzka', 'Počet lůžek', { type: 'number', inputmode: 'numeric', on: r }), fText(a, 'loznice', 'Počet ložnic', { type: 'number', inputmode: 'numeric' })),
        fText(a, 'popis', 'Popis apartmánu', { multi: true, rows: 4 }),
        h('div.field', {}, h('span', {}, 'Vybavení (ikonky na kartě)'), fCheck(a, 'kuchynka', 'kuchyňka'), fCheck(a, 'balkon', 'balkon'), fCheck(a, 'vlastni_vchod', 'samostatný vchod')),
        fText(a, 'dispozice', 'Dispozice (tabulka parametrů)', { ph: 'manželská postel a dvě samostatná lůžka ve dvou ložnicích' }),
        fText(a, 'vybaveni', 'Vybavení (tabulka parametrů)', { ph: 'kuchyňka, WC a sprchový kout' }),
        fText(a, 'vchod', 'Samostatný vchod (tabulka parametrů)', { ph: 'ano, vnitřní i zvenku / ne, vstup z domu' }),
        h('div.field', {}, h('span', {}, 'Fotky apartmánu'), fPhotos(a.fotky, { hint: a.nazev, koupelna: true, first: 'hlavní' }),
          h('small', {}, 'Klikněte na fotku pro výměnu. Šipkami měníte pořadí. Fotky apartmánů se automaticky ukazují i v Galerii.')),
        a.id ? h('p', { style: 'color:var(--muted);font-size:.82rem' }, `Stránka apartmánu: ${new URL(CFG.site, location.href).href}apartmany/${a.id}/`) : null),
    }));
}

function vFotky() {
  const f = S.D.fotky;
  view('Úvodní fotky a galerie', 'Fotky se po nahrání samy zmenší pro web. U každé fotky vyplňte krátký popis – čtou ho vyhledávače a nevidomí návštěvníci.',
    card('Velké fotky nahoře na úvodní stránce', 'Střídají se každých 7 vteřin. Ideálně fotky na šířku.', fPhotos(f.hero, { hint: 'uvod', first: 'první', maxPx: 2000 })),
    card('Fotky domu a společných prostor', 'Prvních 8 se ukazuje na úvodní stránce, všechny v Galerii (spolu s fotkami apartmánů).', fPhotos(f.spolecne, { hint: 'penzion' })),
    card('Další fotky v galerii', 'Ukazují se v Galerii za fotkami apartmánů (např. koupelny, vchody).', fPhotos(f.dalsi, { hint: 'penzion' })),
    card('Okolí Desné', 'Galerie okolí na stránce Galerie.', fPhotos(f.okoli, { hint: 'okoli' })),
    card('Tři fotky u textu „Celý dům…“', 'Na úvodní stránce vedle hlavního textu. Popisek se zobrazí pod fotkou.', fPhotos(f.kolaz, { hint: 'penzion', popisek: true, max: 3 })));
}

function vTexty() {
  const u = S.D.texty.uvod, t = S.D.texty;
  view('Texty úvodní stránky', 'Texty úvodní stránky odshora dolů. Texty podstránek najdete v menu „Podstránky“.',
    card('Úvod (první obrazovka)', null, fText(u, 'h1', 'Hlavní nadpis'), fText(u, 'perex', 'Text pod nadpisem', { multi: true, rows: 2 }), fText(u, 'perex_detail', 'Doplňující věta (na mobilu se skryje)', { multi: true, rows: 2 }),
      h('div.field', {}, h('span', {}, 'Štítky nad nadpisem'), fList(u.znacky, { title: (x) => x.text, addLabel: 'Přidat štítek', make: () => ({ ikona: 'check', text: '' }), body: (x, b, r) => b.append(row2(fText(x, 'text', 'Text', { on: r }), fIcon(x))) })),
      fText(u, 'lista_poznamka', 'Věta pod lištou „Ověřit dostupnost“')),
    card('Výhody v pruhu pod úvodem', null, fList(u.usp, { title: (x) => x.nadpis, sub: (x) => x.text, addLabel: 'Přidat výhodu', make: () => ({ ikona: 'check', nadpis: '', text: '' }),
      body: (x, b, r) => b.append(row2(fText(x, 'nadpis', 'Nadpis', { on: r }), fIcon(x)), fText(x, 'text', 'Text', { on: r })) })),
    card('Celý dům pro několik rodin…', null, fText(u, 'onas_nadpis', 'Nadpis'), fText(u, 'onas_lead', 'Úvodní odstavec', { multi: true, rows: 4 }), fStrList(u.onas_body, 'Odrážky', { multi: true, add: 'Přidat odrážku' }),
      h('div.field', {}, h('span', {}, 'Čísla pod textem'), fList(u.cisla, { title: (x) => x.cislo, sub: (x) => x.popis, addLabel: 'Přidat číslo', make: () => ({ cislo: '', popis: '' }), body: (x, b, r) => b.append(row2(fText(x, 'cislo', 'Číslo', { on: r }), fText(x, 'popis', 'Popis', { on: r }))) }))),
    card('Nadpisy sekcí', null, row2(fText(u, 'apartmany_nadpis', 'Apartmány – nadpis'), fText(u, 'galerie_nadpis', 'Fotografie – nadpis')), fText(u, 'apartmany_text', 'Apartmány – text', { multi: true, rows: 2 }), fText(u, 'galerie_text', 'Fotografie – text', { multi: true, rows: 2 }),
      fText(u, 'recenze_nadpis', 'Recenze – nadpis'), fText(u, 'recenze_text', 'Recenze – text', { multi: true, rows: 2 })),
    card('Vybavení a služby v domě', 'Zobrazuje se na úvodní stránce a na stránce Apartmány.', row2(fText(t.vybaveni, 'nadpis', 'Nadpis'), fText(t.vybaveni, 'text', 'Text pod nadpisem')),
      fList(t.vybaveni.polozky, { title: (x) => x.nadpis, sub: (x) => x.text, addLabel: 'Přidat vybavení', make: () => ({ ikona: 'check', nadpis: '', text: '' }),
        body: (x, b, r) => b.append(row2(fText(x, 'nadpis', 'Nadpis', { on: r }), fIcon(x)), fText(x, 'text', 'Text', { multi: true, rows: 2, on: r })) })),
    card('Poptávka termínu', 'Blok s formulářem (na všech stránkách).', fText(t.poptavka, 'nadpis', 'Nadpis'), fText(t.poptavka, 'lead', 'Text pod nadpisem', { multi: true, rows: 2 }),
      fList(t.poptavka.body, { title: (x) => x.text, addLabel: 'Přidat odrážku', make: () => ({ ikona: 'check', text: '' }), body: (x, b, r) => b.append(fText(x, 'text', 'Text', { multi: true, rows: 2, on: r }), fIcon(x)) }),
      fText(t.poptavka, 'dekujeme', 'Poděkování po odeslání formuláře', { multi: true, rows: 2 })),
    card('Časté dotazy, výzva a patička', null, row2(fText(t.faq, 'nadpis', 'Časté dotazy – nadpis'), fText(t.faq, 'text', 'Časté dotazy – text')),
      fText(t.cta, 'nadpis', 'Výzva dole – nadpis'), fText(t.cta, 'text', 'Výzva dole – text', { multi: true, rows: 2 }),
      fText(t.paticka, 'text', 'Patička – text', { multi: true, rows: 2 }), fStrList(t.paticka.informace, 'Patička – informace', { add: 'Přidat řádek' })),
    card('Vyhledávače (Google, AI)', 'Titulek a popis úvodní stránky ve výsledcích hledání.', fText(u, 'title', 'Titulek'), fText(u, 'description', 'Popis', { multi: true, rows: 3, hint: 'Ideálně 120–160 znaků.' }),
      fText(u, 'og_description', 'Popis při sdílení na Facebooku', { multi: true, rows: 2 }), fText(u, 'seo_popis', 'Popis penzionu pro vyhledávače', { multi: true, rows: 3 })));
}

function pageCard(key, title, ...extra) {
  const p = S.D.texty[key];
  return card(title, null, fText(p, 'h1', 'Nadpis stránky'), fText(p, 'perex', 'Text pod nadpisem', { multi: true, rows: 2 }),
    p.foto !== undefined ? fImage(p, 'foto', 'Fotka v záhlaví', key) : null,
    p.foto !== undefined ? fText(p, 'foto_alt', 'Popis fotky') : null,
    ...extra,
    p.poptavka_nadpis !== undefined ? row2(fText(p, 'poptavka_nadpis', 'Formulář – nadpis'), fText(p, 'poptavka_lead', 'Formulář – text', { multi: true, rows: 2 })) : null,
    h('details', { style: 'margin-top:.6rem' }, h('summary', { style: 'cursor:pointer;color:var(--muted);font-size:.88rem' }, 'Vyhledávače (titulek a popis)'),
      h('div', { style: 'margin-top:.8rem' }, fText(p, 'title', 'Titulek'), fText(p, 'description', 'Popis', { multi: true, rows: 3 }))));
}
function vStranky() {
  const t = S.D.texty;
  view('Podstránky', 'Nadpisy, fotky v záhlaví a texty jednotlivých stránek. Texty apartmánů, ceníku a okolí upravíte v jejich vlastních sekcích.',
    pageCard('apartmany', 'Apartmány', row2(fText(t.apartmany, 'seznam_nadpis', 'Nadpis seznamu'), fText(t.apartmany, 'kapacita_nadpis', 'Nadpis tabulky kapacity')), fText(t.apartmany, 'seznam_text', 'Text u seznamu', { multi: true, rows: 2 }),
      fText(t.apartmany, 'kapacita_pozn', 'Poznámka pod tabulkou kapacity', { multi: true, rows: 2 }), fStrList(t.apartmany.detail_body, 'Odrážky na stránce každého apartmánu', { multi: true })),
    pageCard('cenik', 'Ceník'),
    pageCard('galerie', 'Galerie', row2(fText(t.galerie, 'dum_nadpis', 'Dům a apartmány – nadpis'), fText(t.galerie, 'okoli_nadpis', 'Okolí – nadpis')), fText(t.galerie, 'dum_text', 'Dům a apartmány – text'), fText(t.galerie, 'okoli_text', 'Okolí – text', { multi: true, rows: 2 }),
      h('p', { style: 'color:var(--muted);font-size:.82rem;margin-bottom:1rem' }, 'V textu pod nadpisem můžete použít {fotky} a {okoli} – doplní se počet fotek.')),
    pageCard('okoli', 'Okolí'),
    pageCard('recenze', 'Recenze'),
    pageCard('kontakt', 'Kontakt', fText(t.kontakt, 'nadpis', 'Nadpis „Kde nás najdete“'), fText(t.kontakt, 'uvod', 'Text o poloze', { multi: true, rows: 3 }), fText(t.kontakt, 'email_pozn', 'Poznámka pod e-mailem'),
      h('div.field', {}, h('span', {}, 'Příjezd'), fList(t.kontakt.prijezd, { title: (x) => x.nadpis, sub: (x) => x.text, addLabel: 'Přidat', make: () => ({ ikona: 'car', nadpis: '', text: '' }), body: (x, b, r) => b.append(row2(fText(x, 'nadpis', 'Nadpis', { on: r }), fIcon(x)), fText(x, 'text', 'Text', { multi: true, rows: 3 })) }))),
    pageCard('rezervace', 'Poptávka termínu', fText(t.rezervace, 'kroky_nadpis', 'Nadpis postupu'), fStrList(t.rezervace.kroky, 'Kroky rezervace', { multi: true, add: 'Přidat krok' })));
}

function vOkoli() {
  const o = S.D.okoli, t = S.D.texty.okoli;
  view('Okolí a výlety', 'Tipy na výlety na úvodní stránce a na stránce Okolí.',
    card('Nadpisy', null, fText(t, 'nadpis', 'Nadpis sekce'), fText(t, 'text', 'Text', { multi: true, rows: 2 }), row2(fText(t, 'zima_nadpis', 'Zima – nadpis'), fText(t, 'leto_nadpis', 'Léto – nadpis')), fText(t, 'den_nadpis', 'Výlety na celý den – nadpis')),
    card('Zima', null, fList(o.zima, { title: (x) => x.nadpis, sub: (x) => x.text, addLabel: 'Přidat tip', make: () => ({ ikona: 'mountain', nadpis: '', text: '', stitek: '' }),
      body: (x, b, r) => b.append(row2(fText(x, 'nadpis', 'Název', { on: r }), fIcon(x)), fText(x, 'text', 'Text', { multi: true, rows: 2, on: r }), fText(x, 'stitek', 'Štítek (nepovinné)')) })),
    card('Léto a výlety (s fotkou)', null, fList(o.leto, { title: (x) => x.nadpis, sub: (x) => x.stitek, thumb: (x) => x.foto?.src, addLabel: 'Přidat výlet', make: () => ({ foto: { src: '', alt: '' }, stitek: '', nadpis: '', text: '' }),
      body: (x, b, r) => b.append(fText(x, 'nadpis', 'Název', { on: r }), fText(x, 'text', 'Text', { multi: true, rows: 2 }), fText(x, 'stitek', 'Štítek na fotce (např. 8,5 km)', { on: r }),
        fImage(x.foto, 'src', 'Fotka', x.nadpis, { dims: ['w', 'h'], on: r }), fText(x.foto, 'alt', 'Popis fotky')) })),
    card('Na celý den', null, fList(o.den, { title: (x) => x.nazev, sub: (x) => x.text, addLabel: 'Přidat tip', make: () => ({ nazev: '', text: '' }),
      body: (x, b, r) => b.append(fText(x, 'nazev', 'Název', { on: r }), fText(x, 'text', 'Text', { multi: true, rows: 2, on: r })) })));
}

function vRecenze() {
  const R = S.D.recenze;
  view('Recenze hostů', 'Souhrn hodnocení a recenze. Zaškrtnuté „na úvodní stránce“ se ukazují na úvodu (nejvýš 6).',
    card('Souhrn hodnocení', null, row2(fText(R, 'prumer', 'Průměrné hodnocení', { ph: '4.9' }), fText(R, 'pocet', 'Počet hodnocení', { type: 'number', inputmode: 'numeric' })),
      row2(fText(R, 'doporucuje', 'Kolik % doporučuje', { type: 'number', inputmode: 'numeric' }), fText(R, 'zdroj', 'Zdroj', { ph: 'e-chalupy.cz' })),
      fText(R, 'url', 'Odkaz na hodnocení', { type: 'url' }), fText(R, 'kategorie', 'Hodnocené kategorie')),
    card('Recenze', null, fList(R.recenze, { title: (x) => `${x.jmeno || 'Host'} · ${String(x.hodnoceni).replace('.', ',')} ★${x.na_uvod ? ' · na úvodu' : ''}`, sub: (x) => (x.text || '').slice(0, 90),
      addLabel: 'Přidat recenzi', make: () => ({ jmeno: '', skupina: 's rodinou', datum: '', hodnoceni: 5, text: '', odpoved: '', na_uvod: false }),
      body: (x, b, r) => b.append(row2(fText(x, 'jmeno', 'Jméno hosta', { on: r }), fText(x, 'hodnoceni', 'Hodnocení (1–5)', { ph: '5', on: r })),
        row2(fText(x, 'skupina', 'Typ pobytu', { ph: 's rodinou / s více rodinami' }), fText(x, 'datum', 'Datum', { ph: '22. 6. 2024' })),
        fText(x, 'text', 'Text recenze', { multi: true, rows: 4, on: r }), fText(x, 'odpoved', 'Odpověď majitele (nepovinné)', { multi: true, rows: 2 }),
        fCheck(x, 'na_uvod', 'Zobrazit na úvodní stránce', r)) })));
}

function vDotazy() {
  view('Časté dotazy', 'Otázky a odpovědi na úvodní stránce, u ceníku a v kontaktech. Vyhledávače a AI asistenti je čtou jako „časté dotazy“. Při změně cen zkontrolujte i odpověď „Kolik stojí ubytování?“.',
    card(null, null, fList(S.D.faq, { title: (x) => x.q, addLabel: 'Přidat otázku', make: () => ({ q: '', a: '' }),
      body: (x, b, r) => b.append(fText(x, 'q', 'Otázka', { on: r }), fText(x, 'a', 'Odpověď', { multi: true, rows: 4, hint: 'Nový řádek = nový odstavec.' })) })));
}

function vKontakty() {
  const s = S.D.site;
  view('Kontakty', 'Telefony, e-mail a adresa – zobrazují se v hlavičce, patičce, kontaktech i u formuláře.',
    card('Telefony', 'První telefon je v hlavičce webu a na tlačítku „Zavolat“ na mobilu.', fList(s.telefony, { title: (x) => `${x.jmeno} ${x.cislo}`, addLabel: 'Přidat telefon', make: () => ({ jmeno: '', cislo: '' }),
      body: (x, b, r) => b.append(row2(fText(x, 'jmeno', 'Jméno', { on: r }), fText(x, 'cislo', 'Číslo', { type: 'tel', on: r, ph: '721 929 462' }))) })),
    card('E-mail a adresa', null, fText(s, 'email', 'E-mail', { type: 'email', hint: 'Zobrazuje se na webu. Poptávky z formuláře chodí na petr.silhan@centrum.cz – když je chcete posílat jinam, napište nám.' }),
      row2(fText(s, 'ulice', 'Ulice a číslo'), fText(s, 'psc', 'PSČ')), row2(fText(s, 'obec', 'Obec'), fText(s, 'majitel', 'Majitel / provozovatel'))),
    card('Penzion', null, row2(fText(s, 'nazev', 'Celý název'), fText(s, 'kratky', 'Krátký název (v hlavičce)')), fText(s, 'podtitul', 'Podtitul v hlavičce'),
      row2(fText(s.kapacita, 'min', 'Kapacita od (osob)', { type: 'number', inputmode: 'numeric' }), fText(s.kapacita, 'max', 'Kapacita do (osob)', { type: 'number', inputmode: 'numeric' }))),
    card('Odkazy', null, fText(s, 'mapy_url', 'Odkaz na mapu', { type: 'url' }), fText(s, 'echalupy_url', 'Profil na e-chalupy.cz', { type: 'url' }), fText(s, 'echalupy_terminy', 'Kalendář volných termínů na e-chalupy.cz', { type: 'url' })));
}

function vGdpr() {
  const g = S.D.gdpr;
  view('Ochrana osobních údajů', 'Text stránky o ochraně osobních údajů (odkaz je u formuláře a v patičce).',
    card(null, null, fText(g, 'h1', 'Nadpis'), fList(g.oddily, { title: (x) => x.nadpis, addLabel: 'Přidat oddíl', make: () => ({ nadpis: '', text: '', body: [] }),
      body: (x, b, r) => b.append(fText(x, 'nadpis', 'Nadpis', { on: r }), fText(x, 'text', 'Text', { multi: true, rows: 5, hint: 'Nový řádek = nový odstavec.' }), fStrList(x.body, 'Odrážky', { multi: true })) })));
}

function vNapoveda() {
  view('Návod', null,
    card('Úprava textu', null, h('div.help', { html: '<ol><li>V menu vyberte sekci (např. <b>Ceník a volné termíny</b>).</li><li>Klikněte do políčka a přepište text.</li><li>Dole klikněte na <b>Uložit změny</b>. Za minutu je změna na webu.</li></ol>' })),
    card('Fotky apartmánu', null, h('div.help', { html: '<ol><li>Otevřete <b>Apartmány a jejich fotky</b> a klikněte na apartmán.</li><li><b>Nahrát fotky</b> – vyberte jednu nebo víc fotek z telefonu či počítače. Zmenší se samy.</li><li>Pod fotku napište krátký popis (např. „ložnice s manželskou postelí“).</li><li>Šipkami změníte pořadí, košem fotku smažete, kliknutím na fotku ji vyměníte.</li><li>Uložte změny.</li></ol>' })),
    card('Volné termíny', null, h('div.help', { html: '<ol><li><b>Ceník a volné termíny</b> → tabulka nahoře.</li><li>Obsazený termín smažte košem, nový přidejte tlačítkem <b>Přidat termín</b>.</li><li>Když žádné last minute termíny nemáte, odškrtněte „Zobrazovat volné termíny“.</li></ol>' })),
    card('Něco nejde?', null, h('p', {}, 'Napište nám na weboviny@email.cz – rádi pomůžeme.')));
}

function vSettings() {
  const f = { old: '', pw: '', pw2: '' };
  const msg = h('p', { style: 'color:var(--err);font-size:.9rem;min-height:1.2rem' });
  const pwInput = (key, label, ac) => h('label.field', {}, h('span', {}, label), h('input', { type: 'password', autocomplete: ac, oninput: (e) => { f[key] = e.target.value; } }));
  view('Heslo a odhlášení', null,
    card('Změnit heslo', 'Po změně hesla se odhlásí všechna ostatní zařízení. Heslo musí mít alespoň 8 znaků.',
      pwInput('old', 'Současné heslo', 'current-password'), pwInput('pw', 'Nové heslo', 'new-password'), pwInput('pw2', 'Nové heslo znovu', 'new-password'), msg,
      h('button.btn.btn-primary', { type: 'button', onclick: async (e) => {
        msg.textContent = '';
        if (f.pw.length < 8) return (msg.textContent = 'Nové heslo musí mít alespoň 8 znaků.');
        if (f.pw !== f.pw2) return (msg.textContent = 'Nová hesla se neshodují.');
        e.target.disabled = true;
        try { const r = await api('/password', { method: 'POST', body: JSON.stringify({ old: f.old, password: f.pw }) }); S.sess = r.token; S.def = false; saveSess(); toast('Heslo změněno', 'Příště se přihlaste novým heslem.', 'ok'); route(); }
        catch (er) { msg.textContent = er.message; } finally { e.target.disabled = false; }
      } }, 'Uložit nové heslo')),
    card('Odhlásit se', null, h('button.btn', { type: 'button', onclick: logout, html: IC.logout + 'Odhlásit' })));
}

/* ---------------------------------------------------------------- shell */
function renderShell() {
  const nav = h('nav.nav', { id: 'nav', 'aria-label': 'Sekce administrace' },
    h('button.btn.btn-icon.btn-ghost.nav-close', { type: 'button', 'aria-label': 'Zavřít menu', onclick: () => nav.classList.remove('open'), html: IC.x }),
    NAV.map(([id, label, ic, key]) => id === '-' ? h('hr') : h('a', { href: '#/' + id, 'data-id': id, 'data-key': key || '', onclick: () => nav.classList.remove('open'), html: IC[ic] + `<span>${esc(label)}</span>` })),
    h('hr'), h('a', { href: CFG.site, target: '_blank', rel: 'noopener', html: IC.ext + '<span>Zobrazit web</span>' }));
  const bar = h('div.savebar', { id: 'savebar' }, h('span', {}, ''),
    h('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: async () => { if (await confirmDlg('Zahodit změny?', 'Neuložené úpravy se ztratí.', 'Zahodit')) discard(); } }, 'Zahodit'),
    h('button.btn.btn-primary', { type: 'button', onclick: saveAll }, 'Uložit změny'));
  $('#app').replaceChildren(h('div.shell', {},
    h('header.top', {},
      h('button.btn.btn-icon.btn-ghost.menu-btn', { type: 'button', 'aria-label': 'Menu', onclick: () => nav.classList.add('open'), html: IC.menu }),
      h('a.top-logo.brand', { href: '#/', html: LOGO + '<b>Penzion Bella</b><span>Administrace</span>' }),
      h('div.pub'), h('a.btn.btn-sm', { href: CFG.site, target: '_blank', rel: 'noopener', html: IC.eye + '<span>Web</span>' })),
    h('div.layout', {}, nav, h('main.view'))), bar);
  initPub();
}
function updateSavebar() {
  const keys = dirtyKeys(); const bar = $('#savebar'); if (!bar) return;
  bar.classList.toggle('on', keys.length > 0 || S.saving);
  bar.querySelector('span').textContent = S.saving ? 'Ukládám…' : `Neuložené změny: ${keys.map((k) => LABEL[k]).join(', ')}`;
  bar.querySelectorAll('button').forEach((b) => { b.disabled = S.saving; });
  document.querySelectorAll('.nav a[data-key]').forEach((a) => { a.querySelector('.dot')?.remove(); if (keys.includes(a.dataset.key)) a.append(h('i.dot')); });
}
const VIEWS = { '': vDash, cenik: vCenik, apartmany: vApartmany, fotky: vFotky, texty: vTexty, stranky: vStranky, okoli: vOkoli, recenze: vRecenze, dotazy: vDotazy, kontakty: vKontakty, gdpr: vGdpr, napoveda: vNapoveda, nastaveni: vSettings };
function route() {
  const [id, arg] = location.hash.replace(/^#\/?/, '').split('/');
  (VIEWS[id] || vDash)(arg);
  document.querySelectorAll('.nav a[data-id]').forEach((a) => a.classList.toggle('on', a.dataset.id === (VIEWS[id] ? id : '')));
  updateSavebar();
}
window.addEventListener('hashchange', route);

/* ---------------------------------------------------------------- přihlášení */
function renderLogin(msg = '') {
  const inp = h('input', { type: 'password', id: 'pw', autocomplete: 'current-password', placeholder: 'Heslo', required: true });
  const err = h('p.login-err', {}, msg);
  const btn = h('button.btn.btn-primary', { type: 'submit' }, 'Přihlásit se');
  const form = h('form.login-card', { onsubmit: async (e) => {
    e.preventDefault(); err.textContent = ''; btn.disabled = true; btn.textContent = 'Přihlašuji…';
    try {
      const r = await api('/login', { method: 'POST', body: JSON.stringify({ password: inp.value }) });
      S.sess = r.token; S.def = r.def; saveSess(); await start();
    } catch (er) { err.textContent = er.message; btn.disabled = false; btn.textContent = 'Přihlásit se'; inp.select(); }
  } },
  h('div.brand', { html: LOGO + '<span>Penzion Bella</span>' }), h('h1', {}, 'Administrace webu'), h('p', {}, 'Přihlaste se heslem k administraci.'),
  h('label.field', {}, h('span', {}, 'Heslo'), h('div.pw-wrap', {}, inp, h('button.pw-eye', { type: 'button', 'aria-label': 'Zobrazit heslo', onclick: () => { inp.type = inp.type === 'password' ? 'text' : 'password'; }, html: IC.eye }))),
  btn, err);
  $('#app').replaceChildren(h('div.login', {}, form));
  setTimeout(() => inp.focus(), 50);
}
function logout() {
  if (dirtyKeys().length && !confirm('Máte neuložené změny. Opravdu se odhlásit?')) return;
  localStorage.removeItem(SK); S.sess = null; S.D = {}; renderLogin();
}
async function start() {
  $('#app').innerHTML = `<div class="boot"><div class="brand">${LOGO}<span>Penzion Bella</span></div><span class="spin"></span></div>`;
  try { await loadAll(); } catch (e) {
    if (e.status === 401) { localStorage.removeItem(SK); S.sess = null; return renderLogin('Přihlášení vypršelo, přihlaste se prosím znovu.'); }
    return renderLogin('Obsah webu se nepodařilo načíst: ' + e.message);
  }
  renderShell(); route();
}
function boot() {
  const s = JSON.parse(localStorage.getItem(SK) || 'null');
  if (s && s.exp > Date.now()) { S.sess = s.t; S.def = s.def; start(); } else renderLogin();
}
boot();
})();

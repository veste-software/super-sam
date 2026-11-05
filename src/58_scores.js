/* =========================================================================
   BESTENLISTE
   Wer alle acht Sektoren in einem Lauf schafft (Start bei Sektor 1), trägt sich nach dem Abspann mit
   Namen ein. Die Liste liegt bei einem kleinen Cloudflare Worker (Ordner worker/). Der Dialog ist ein
   HTML-Overlay über dem Canvas, damit Tastatur, Handy-Tastatur und Scrollen einfach funktionieren.
   Vom Titel aus: Taste H oder der Knopf oben rechts.
   ========================================================================= */
const HS = {
  api: 'https://super-sam-scores.data-vestesoftware.workers.dev', ver: 2, home: 'https://veste-software.github.io', nameKey: 'supersam.name',
  open: false, mode: 'list', run: null, opened: false, sent: false, busy: false, loading: false, loadErr: false,
  rows: null, total: 0, rank: 0, mine: null, msg: '', msgErr: false, after: null, root: null, btn: null, ui: {}, shown: null,
};
HS.canWrite = () => location.origin === HS.home;
const hsTime = s => { s = Math.max(0, s | 0); const h = s / 3600 | 0, m = (s % 3600) / 60 | 0, c = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(c).padStart(2, '0'); };
const hsNum = n => String(Math.max(0, n | 0)).padStart(6, '0');
const hsStore = { get() { try { return localStorage.getItem(HS.nameKey) || ''; } catch (e) { return ''; } }, set(v) { try { localStorage.setItem(HS.nameKey, v); } catch (e) { } } };

/* the run that just ended; only a run that started at sector 1 counts */
HS.begin = function () {
  const r = G.run, st = G.stats;
  HS.opened = false; HS.sent = false; HS.rank = 0; HS.mine = null; HS.msg = ''; HS.msgErr = false;
  HS.run = r && r.from === 0 && st ? { score: st.score | 0, time: Math.round(r.t), deaths: S.deaths | 0, kills: S.kills | 0, chips: S.chips | 0 } : null;
};

async function hsFetch(path, opt) {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 10000);
  try {
    const r = await fetch(HS.api + path, Object.assign({ signal: ac.signal, cache: 'no-store' }, opt || {}));
    let j = null; try { j = await r.json(); } catch (e) { }
    return { status: r.status, j };
  } finally { clearTimeout(to); }
}
HS.load = async function () {
  HS.loading = true; HS.loadErr = false; hsRender();
  try { const r = await hsFetch('/scores?limit=100'); if (r.j && r.j.ok) { HS.rows = r.j.scores; HS.total = r.j.total; } else HS.loadErr = true; }
  catch (e) { HS.loadErr = true; }
  HS.loading = false; hsRender();
  const me = HS.root && HS.root.querySelector('.hsl.me'); if (me && me.scrollIntoView) { try { me.scrollIntoView({ block: 'center' }); } catch (e) { } }
};
function hsErr(r) {
  const e = r && r.j && r.j.error;
  if (e === 'name_gesperrt') return 'Dieser Name ist nicht erlaubt. Nimm bitte einen anderen.';
  if (e === 'name') return 'Dieser Name geht nicht. Nimm 2 bis 12 Zeichen: Buchstaben, Zahlen, Leerzeichen, - _ !';
  if (e === 'werte') return 'Der Eintrag wurde abgelehnt. Die Werte passen nicht zu einem echten Lauf.';
  if (e === 'zu_oft' || (r && r.status === 429)) return 'Von dieser Adresse kamen zu viele Einträge. Versuch es in ein paar Minuten noch einmal.';
  if (e === 'origin') return 'Eintragen geht nur auf der Spielseite: veste-software.github.io/super-sam';
  return 'Das hat nicht geklappt (Fehler ' + ((r && r.status) || '?') + '). Versuch es noch einmal.';
}
HS.submit = async function (raw) {
  if (HS.busy || !HS.run || HS.sent) return;
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if ([...name].length < 2) { HS.msg = 'Bitte gib mindestens 2 Zeichen ein.'; HS.msgErr = true; hsRender(); return; }
  HS.busy = true; HS.msg = 'Sende ...'; HS.msgErr = false; hsRender();
  try {
    const r = await hsFetch('/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ name, v: HS.ver }, HS.run)) });
    if (r.j && r.j.ok) {
      HS.sent = true; HS.rank = r.j.rank; HS.total = r.j.total; HS.mine = { name: r.j.name, score: HS.run.score, time: HS.run.time }; HS.msg = ''; hsStore.set(name);
      HS.busy = false; await HS.load(); return;
    }
    HS.msg = hsErr(r); HS.msgErr = true;
  } catch (e) { HS.msg = 'Nicht erreichbar. Prüf deine Verbindung und versuch es noch einmal.'; HS.msgErr = true; }
  HS.busy = false; hsRender();
};

/* ---------- the overlay ---------- */
const hsEl = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
function hsInit() {
  if (HS.root) return;
  const F = "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace";
  const css = hsEl('style'); css.textContent = `
#hs[hidden],#hsb[hidden],#hs [hidden]{display:none!important}
#hsb{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:calc(10px + env(safe-area-inset-right,0px));z-index:6;margin:0;font:700 12px/1 ${F};letter-spacing:.14em;color:#ffe45e;background:rgba(2,3,10,.62);border:1px solid rgba(255,228,94,.6);border-radius:4px;padding:10px 13px;cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#hsb:hover,#hsb:focus-visible{background:rgba(255,228,94,.16);outline:none}
@media (pointer:coarse){#hsb{top:auto;right:auto;bottom:calc(10px + env(safe-area-inset-bottom,0px));left:calc(10px + env(safe-area-inset-left,0px))}}
#hs{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;box-sizing:border-box;background:rgba(2,3,10,.86);padding:max(10px,env(safe-area-inset-top,0px)) max(10px,env(safe-area-inset-right,0px)) max(10px,env(safe-area-inset-bottom,0px)) max(10px,env(safe-area-inset-left,0px));cursor:auto;touch-action:manipulation;-webkit-user-select:text;user-select:text;color:#eaf6ff;font:700 14px/1.35 ${F}}
#hs *{cursor:auto}
#hs button{cursor:pointer}
.hsp{box-sizing:border-box;width:min(580px,100%);max-height:100%;display:flex;flex-direction:column;gap:10px;padding:16px 18px;background:#05061a;border:2px solid #19f0ff;box-shadow:0 0 0 1px #02030a,0 0 28px rgba(25,240,255,.35),inset 0 0 40px rgba(25,240,255,.06);overflow-y:auto}
.hsh{margin:0;text-align:center;font-size:18px;letter-spacing:.32em;color:#ff2fb9;text-shadow:0 0 12px rgba(255,47,185,.6)}
.hss{text-align:center;color:#8a96c4;font-size:11px;letter-spacing:.16em}
.hsrun{text-align:center;color:#ffe45e;letter-spacing:.06em}
.hsrun b{display:block;color:#5dffb0;font-size:16px;letter-spacing:.12em;margin-bottom:4px}
.hsrow{display:flex;gap:8px;flex-wrap:wrap}
.hsin{flex:1 1 180px;min-width:0;box-sizing:border-box;font:inherit;font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#eaf6ff;background:#02030a;border:1px solid #19f0ff;border-radius:3px;padding:10px 12px;outline:none;-webkit-user-select:text;user-select:text}
.hsin:focus{border-color:#5dffb0;box-shadow:0 0 12px rgba(93,255,176,.4)}
.hsbtn{font:inherit;font-size:13px;letter-spacing:.16em;color:#02030a;background:#19f0ff;border:1px solid #19f0ff;border-radius:3px;padding:11px 16px;touch-action:manipulation}
.hsbtn.alt{color:#19f0ff;background:transparent;border-color:rgba(25,240,255,.6)}
.hsbtn:disabled{opacity:.5;cursor:default!important}
.hsbtn:focus-visible{outline:2px solid #ffe45e;outline-offset:2px}
.hsmsg{min-height:1.35em;font-size:12px;color:#8a96c4;text-align:center}
.hsmsg.err{color:#ff7a8a}
.hsplace{text-align:center;color:#ffe45e;font-size:16px;letter-spacing:.14em}
.hst{flex:1 1 auto;min-height:72px;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;border-top:1px solid rgba(25,240,255,.25);border-bottom:1px solid rgba(25,240,255,.25)}
.hsl{display:grid;grid-template-columns:2.4em minmax(0,1fr) 5.2em 4.6em 3.6em;gap:0 8px;padding:5px 6px;font-size:13px;white-space:nowrap}
.hsl>span{overflow:hidden;text-overflow:ellipsis}
.hsl>span:nth-child(n+3){text-align:right}
.hsl.hd{position:sticky;top:0;background:#05061a;color:#8a96c4;font-size:10px;letter-spacing:.14em}
.hsl.me{background:rgba(255,228,94,.15);color:#ffe45e}
.hsl.r1 .rk{color:#ffe45e}.hsl.r2 .rk{color:#d8e4ff}.hsl.r3 .rk{color:#ffb347}
.hsnote{padding:18px 10px;text-align:center;color:#8a96c4;font-size:13px}
@media (max-height:480px){.hsp{padding:10px 14px;gap:6px}.hsh{font-size:15px}.hss{display:none}.hsl{font-size:12px;padding:3px 6px}.hsin{font-size:16px;padding:7px 10px}.hsbtn{padding:8px 12px}.hsrun b{font-size:14px;margin-bottom:2px}.hsplace{font-size:14px}}`;
  document.head.appendChild(css);
  const root = hsEl('div'); root.id = 'hs'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Bestenliste');
  const ui = HS.ui, panel = hsEl('div', 'hsp');
  ui.head = hsEl('h2', 'hsh', 'B E S T E N L I S T E'); ui.sub = hsEl('div', 'hss', 'SUPER SAM  //  ALLE ACHT SEKTOREN IN EINEM LAUF');
  ui.run = hsEl('div', 'hsrun'); ui.place = hsEl('div', 'hsplace');
  ui.form = hsEl('div', 'hsrow'); ui.input = hsEl('input', 'hsin'); ui.input.type = 'text'; ui.input.maxLength = 12; ui.input.placeholder = 'DEIN NAME';
  ui.input.autocomplete = 'off'; ui.input.spellcheck = false; ui.input.setAttribute('autocapitalize', 'characters'); ui.input.setAttribute('autocorrect', 'off'); ui.input.setAttribute('enterkeyhint', 'send'); ui.input.setAttribute('aria-label', 'Dein Name');
  ui.send = hsEl('button', 'hsbtn', 'EINTRAGEN'); ui.send.type = 'button';
  ui.form.append(ui.input, ui.send);
  ui.msg = hsEl('div', 'hsmsg'); ui.msg.setAttribute('role', 'status');
  ui.table = hsEl('div', 'hst');
  ui.btns = hsEl('div', 'hsrow'); ui.btns.style.justifyContent = 'center';
  ui.skip = hsEl('button', 'hsbtn alt', 'ÜBERSPRINGEN'); ui.skip.type = 'button';
  ui.retry = hsEl('button', 'hsbtn alt', 'NOCHMAL LADEN'); ui.retry.type = 'button';
  ui.close = hsEl('button', 'hsbtn', 'SCHLIESSEN'); ui.close.type = 'button';
  ui.btns.append(ui.skip, ui.retry, ui.close);
  panel.append(ui.head, ui.sub, ui.run, ui.place, ui.form, ui.msg, ui.table, ui.btns); root.append(panel);
  ui.input.addEventListener('input', () => { const v = ui.input.value.toUpperCase(); if (v !== ui.input.value) { const p = ui.input.selectionStart; ui.input.value = v; try { ui.input.setSelectionRange(p, p); } catch (e) { } } });
  ui.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); HS.submit(ui.input.value); } });
  ui.send.addEventListener('click', () => HS.submit(ui.input.value));
  ui.skip.addEventListener('click', () => { HS.mode = 'list'; hsRender(); if (!HS.rows) HS.load(); });
  ui.retry.addEventListener('click', () => HS.load());
  ui.close.addEventListener('click', () => HS.hide());
  /* nothing in here may reach the game: it listens on the window and on the canvas */
  for (const t of ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'wheel', 'contextmenu', 'click'])
    root.addEventListener(t, e => { e.stopPropagation(); if (t === 'keydown' && e.key === 'Escape') { e.preventDefault(); if (!hsForm()) HS.hide(); } });
  /* a tap on the dark backdrop closes the list (but never the entry form) */
  root.addEventListener('click', e => { if (e.target === root && !hsForm()) HS.hide(); });
  document.body.appendChild(root); HS.root = root;
  const b = hsEl('button', null, TC.coarse ? 'BESTENLISTE' : 'BESTENLISTE  [H]'); b.id = 'hsb'; b.type = 'button'; b.hidden = true; b.setAttribute('aria-label', 'Bestenliste öffnen');
  for (const t of ['mousedown', 'pointerdown', 'touchstart', 'keydown']) b.addEventListener(t, e => e.stopPropagation());
  b.addEventListener('click', e => { e.stopPropagation(); if (G.scene === 'title') HS.show('list'); });
  document.body.appendChild(b); HS.btn = b;
}
/* the entry form is open: Esc and a tap on the backdrop must not throw the score away */
const hsForm = () => HS.mode === 'submit' && !!HS.run && !HS.sent && HS.canWrite();
function hsRender() {
  const ui = HS.ui; if (!HS.root) return;
  const submitting = HS.mode === 'submit' && HS.run && !HS.sent, can = HS.canWrite();
  const showForm = hsForm(), showRes = HS.mode === 'submit' && HS.sent, listing = !showForm;
  ui.run.hidden = !(HS.mode === 'submit' && HS.run && !HS.sent);
  if (!ui.run.hidden) { ui.run.textContent = ''; const b = hsEl('b', null, 'DU HAST ZENIT BEFREIT!'); ui.run.append(b, document.createTextNode('PUNKTE ' + hsNum(HS.run.score) + '   ZEIT ' + hsTime(HS.run.time) + '   TODE ' + HS.run.deaths)); }
  ui.place.hidden = !showRes; if (showRes) ui.place.textContent = 'PLATZ ' + HS.rank + ' VON ' + HS.total;
  ui.form.hidden = !showForm; ui.input.disabled = ui.send.disabled = HS.busy;
  ui.msg.className = 'hsmsg' + (HS.msgErr ? ' err' : '');
  ui.msg.textContent = HS.msg || (submitting && !can ? 'Eintragen geht nur auf der Spielseite: veste-software.github.io/super-sam' : ''); ui.msg.hidden = !ui.msg.textContent;
  ui.table.hidden = !listing;
  if (listing) {
    ui.table.textContent = '';
    if (HS.loading && !HS.rows) ui.table.append(hsEl('div', 'hsnote', 'Lade Bestenliste ...'));
    else if (HS.loadErr && !HS.rows) ui.table.append(hsEl('div', 'hsnote', 'Die Bestenliste ist gerade nicht erreichbar. Sie gibt es nur online, auf veste-software.github.io/super-sam'));
    else if (HS.rows && !HS.rows.length) ui.table.append(hsEl('div', 'hsnote', 'Noch kein Eintrag. Sei die oder der Erste!'));
    else if (HS.rows) {
      const hd = hsEl('div', 'hsl hd'); for (const t of ['#', 'NAME', 'PUNKTE', 'ZEIT', 'TODE']) hd.append(hsEl('span', null, t)); ui.table.append(hd);
      let marked = false;
      for (const r of HS.rows) {
        const mine = !marked && HS.sent && HS.mine && r.name === HS.mine.name && r.score === HS.mine.score && r.time === HS.mine.time; if (mine) marked = true;
        const row = hsEl('div', 'hsl' + (r.rank <= 3 ? ' r' + r.rank : '') + (mine ? ' me' : ''));
        const rk = hsEl('span', 'rk', String(r.rank)), nm = hsEl('span', null, r.name); nm.title = r.name;
        row.append(rk, nm, hsEl('span', null, hsNum(r.score)), hsEl('span', null, hsTime(r.time)), hsEl('span', null, String(r.deaths)));
        ui.table.append(row);
      }
    }
  }
  ui.skip.hidden = !showForm; ui.retry.hidden = !(listing && HS.loadErr && !HS.loading);
  ui.close.textContent = HS.after ? 'WEITER ZUM TITEL' : 'SCHLIESSEN';
  ui.close.hidden = showForm;   // while the form is open the way out is ÜBERSPRINGEN
}
HS.show = function (mode) {
  hsInit(); HS.mode = mode; HS.open = true; HS.root.hidden = false; HS.msg = HS.sent ? '' : HS.msg; HS.msgErr = HS.sent ? false : HS.msgErr;
  if (mode === 'submit' && HS.run && !HS.sent) { HS.ui.input.value = HS.ui.input.value || hsStore.get().toUpperCase(); }
  if (mode === 'list' || !HS.run || !HS.canWrite()) { if (!HS.rows || mode === 'list') HS.load(); }
  hsRender(); HS.sync();
  if (mode === 'submit' && HS.run && !HS.sent && HS.canWrite() && !TC.coarse) { try { HS.ui.input.focus(); HS.ui.input.select(); } catch (e) { } }
};
HS.hide = function () {
  if (!HS.open) return; HS.open = false; HS.root.hidden = true; HS.sync();
  try { cv.focus(); } catch (e) { }
  const f = HS.after; HS.after = null; if (f) f();
};
/* the title screen's button: visible on the title only */
HS.sync = function () {
  const want = G.scene === 'title' && !HS.open && !portraitNow();
  if (want === HS.shown) return; HS.shown = want; hsInit(); HS.btn.hidden = !want;
};

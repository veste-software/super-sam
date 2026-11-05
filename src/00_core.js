'use strict';
/* =========================================================================
   SUPER SAM  ::  core  (math, palette, glyph renderer, input, audio)
   ========================================================================= */
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const smooth = t => t * t * (3 - 2 * t);
const fract = v => v - Math.floor(v);
function RNG(seed) {
  let s = seed >>> 0 || 1;
  const f = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.i = (a, b) => Math.floor(a + f() * (b - a + 1));
  f.r = (a, b) => a + f() * (b - a);
  f.pick = a => a[Math.floor(f() * a.length)];
  return f;
}
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

/* ---------- colour ---------- */
function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mixc(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return `rgb(${A[0] + (B[0] - A[0]) * t | 0},${A[1] + (B[1] - A[1]) * t | 0},${A[2] + (B[2] - A[2]) * t | 0})`; }
function mixh(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); const h = v => ('0' + Math.round(v).toString(16)).slice(-2); return '#' + h(A[0] + (B[0] - A[0]) * t) + h(A[1] + (B[1] - A[1]) * t) + h(A[2] + (B[2] - A[2]) * t); }
function ramp(stops, n) { const out = []; for (let i = 0; i < n; i++) { const t = i / (n - 1) * (stops.length - 1); const k = Math.min(stops.length - 2, Math.floor(t)); out.push(mixh(stops[k], stops[k + 1], t - k)); } return out; }

/* ---------- global palette (tiles store indices into this) ---------- */
const PAL = ['rgba(0,0,0,0)'], C = {};
function defc(n, c) { C[n] = PAL.length; PAL.push(c); }
[['void', '#05030d'], ['ink', '#0a0b1f'], ['navy', '#10163a'], ['slate', '#1b2358'], ['steel', '#2c3a7a'], ['haze', '#4a5aa8'],
['cyan', '#19f0ff'], ['cyanD', '#0b8ea0'], ['cyanDD', '#075866'], ['mag', '#ff2fb9'], ['magD', '#9b1a78'], ['magDD', '#541045'],
['vio', '#9d5cff'], ['violD', '#4d2c99'], ['violDD', '#271650'], ['amber', '#ffb347'], ['amberD', '#a86a1a'], ['amberDD', '#573612'],
['red', '#ff3b4d'], ['redD', '#8e1c2b'], ['mint', '#5dffb0'], ['mintD', '#228a5e'], ['white', '#eaf6ff'], ['grey', '#8a96c4'], ['greyD', '#3d4676'], ['greyDD', '#242a52'],
['yel', '#ffe45e'], ['conc', '#2a2f55'], ['concL', '#454d86'], ['rust', '#7a3f30'], ['rustD', '#43221c'], ['b0', '#0a0d26'], ['b1', '#0c1130'], ['b2', '#0f1537'],
['i0', '#090a18'], ['i1', '#0c0e20'], ['i2', '#10122b'], ['blk', '#020208'], ['pink', '#ff8ad8'], ['ice', '#bff6ff'], ['g0', '#07161f'], ['g1', '#082230'], ['hull0', '#161b3f'], ['hull1', '#1d2350'], ['hullL', '#8c9cd8'], ['wamb', '#4a3412'], ['wcy', '#0e3a48'], ['wmg', '#46123c'], ['wwh', '#363e60'], ['wgr', '#12402e'], ['f0', '#0b1020'], ['f1', '#0e1428'], ['f2', '#120f26'], ['f3', '#0a1a22'], ['f4', '#1a1024'],
].forEach(a => defc(a[0], a[1]));

/* ---------- canvas / glyph renderer ---------- */
const cv = document.getElementById('cv'), vctx = cv.getContext('2d', { alpha: false });
const scn = document.createElement('canvas'), sctx = scn.getContext('2d', { alpha: false });
let g = sctx;
const bl1 = document.createElement('canvas'), bl1x = bl1.getContext('2d');
const bl2 = document.createElement('canvas'), bl2x = bl2.getContext('2d');
let W = 0, H = 0, DPR = 1, CW = 10, CH = 20, COLS = 100, ROWS = 34, FS = 16, BASE = 15, DOT = 1;
const ROWS_TARGET = 30;
const FONT_FAMILY = '"JetBrains Mono","DejaVu Sans Mono","Cascadia Mono","SF Mono",Menlo,Consolas,monospace';
const resizeHooks = [];
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, TC.coarse ? 1.4 : 1.6);
  const cw = Math.max(320, innerWidth), ch = Math.max(240, innerHeight);
  W = Math.floor(cw * DPR); H = Math.floor(ch * DPR);
  cv.width = W; cv.height = H; cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  scn.width = W; scn.height = H;
  CH = Math.max(12, Math.floor(H / ROWS_TARGET)); if (CH & 1) CH++;
  CW = CH / 2;
  ROWS = Math.ceil(H / CH); COLS = Math.ceil(W / CW);
  FS = Math.round(CW / 0.6); BASE = Math.round(CH * 0.76); DOT = Math.max(1, Math.round(DPR));
  bl1.width = Math.max(8, W / 3 | 0); bl1.height = Math.max(8, H / 3 | 0);
  bl2.width = Math.max(4, bl1.width / 3 | 0); bl2.height = Math.max(4, bl1.height / 3 | 0);
  shadeCache.clear();
  target(sctx);
  resizeHooks.forEach(f => f());
}
function target(ctx) { g = ctx; lastFill = ''; ctx.lineCap = 'butt'; setFont(); }
function setFont(w) { g.font = (w || 700) + ' ' + FS + 'px ' + FONT_FAMILY; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; }

/* shade blocks ░▒▓ as dithered cell bitmaps (no swimming while scrolling) */
const shadeCache = new Map();
function shadeBmp(kind, col) {
  const key = kind + col; let c = shadeCache.get(key);
  if (c) return c;
  if (shadeCache.size > 500) shadeCache.clear();
  c = document.createElement('canvas'); c.width = Math.ceil(CW); c.height = Math.ceil(CH);
  const x = c.getContext('2d'); x.fillStyle = col;
  const d = DOT, nx = Math.ceil(c.width / d), ny = Math.ceil(c.height / d);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let on;
    if (kind === 1) on = (i % 2 === 0 && j % 2 === 0) || (i % 4 === 2 && j % 4 === 1 && false);
    else if (kind === 2) on = (i + j) % 2 === 0;
    else on = !(i % 2 === 1 && j % 2 === 1);
    if (on) x.fillRect(i * d, j * d, d, d);
  }
  shadeCache.set(key, c); return c;
}
const QUAD = { 0x2596: 4, 0x2597: 8, 0x2598: 1, 0x2599: 13, 0x259A: 9, 0x259B: 7, 0x259C: 11, 0x259D: 2, 0x259E: 6, 0x259F: 14 };
const BOX = { // up,down,left,right ; 1 single 2 double
  0x2500: [0, 0, 1, 1], 0x2502: [1, 1, 0, 0], 0x250C: [0, 1, 0, 1], 0x2510: [0, 1, 1, 0], 0x2514: [1, 0, 0, 1], 0x2518: [1, 0, 1, 0],
  0x251C: [1, 1, 0, 1], 0x2524: [1, 1, 1, 0], 0x252C: [0, 1, 1, 1], 0x2534: [1, 0, 1, 1], 0x253C: [1, 1, 1, 1],
  0x2550: [0, 0, 2, 2], 0x2551: [2, 2, 0, 0], 0x2554: [0, 2, 0, 2], 0x2557: [0, 2, 2, 0], 0x255A: [2, 0, 0, 2], 0x255D: [2, 0, 2, 0],
  0x2560: [2, 2, 0, 2], 0x2563: [2, 2, 2, 0], 0x2566: [0, 2, 2, 2], 0x2569: [2, 0, 2, 2], 0x256C: [2, 2, 2, 2],
  0x256D: [0, 1, 0, 1], 0x256E: [0, 1, 1, 0], 0x2570: [1, 0, 0, 1], 0x256F: [1, 0, 1, 0],
};
let lastFill = '';
function fillS(c) { if (c !== lastFill) { g.fillStyle = c; lastFill = c; } }
/* draw one glyph in the cell whose top-left is device px (px,py). returns nothing */
function gl(ch, px, py, col, a) {
  const code = ch.charCodeAt(0);
  if (a !== undefined && a !== 1) g.globalAlpha = a;
  if (code >= 0x2500 && code <= 0x259F) {
    fillS(col);
    if (code === 0x2588) g.fillRect(px, py, CW + .5, CH + .5);
    else if (code === 0x2580) g.fillRect(px, py, CW + .5, CH / 2 + .5);
    else if (code >= 0x2581 && code <= 0x2587) { const h = CH * (code - 0x2580) / 8; g.fillRect(px, py + CH - h, CW + .5, h + .5); }
    else if (code >= 0x2589 && code <= 0x258F) { const w = CW * (0x2590 - code) / 8; g.fillRect(px, py, w + .5, CH + .5); }
    else if (code === 0x2590) g.fillRect(px + CW / 2, py, CW / 2 + .5, CH + .5);
    else if (code === 0x2594) g.fillRect(px, py, CW + .5, CH / 8);
    else if (code === 0x2595) g.fillRect(px + CW * 7 / 8, py, CW / 8, CH);
    else if (code >= 0x2591 && code <= 0x2593) g.drawImage(shadeBmp(code - 0x2590, col), px, py);
    else if (QUAD[code]) {
      const m = QUAD[code], hw = CW / 2, hh = CH / 2;
      if (m & 1) g.fillRect(px, py, hw + .5, hh + .5); if (m & 2) g.fillRect(px + hw, py, hw + .5, hh + .5);
      if (m & 4) g.fillRect(px, py + hh, hw + .5, hh + .5); if (m & 8) g.fillRect(px + hw, py + hh, hw + .5, hh + .5);
    } else if (BOX[code]) {
      const b = BOX[code], t = Math.max(1, Math.round(CW / 9)), cx = px + CW / 2, cy = py + CH / 2;
      const arm = (dir, k) => {
        if (!k) return;
        const offs = k === 2 ? [-t, t] : [0];
        for (const o of offs) {
          if (dir === 0) g.fillRect(cx + o - t / 2, py, t, CH / 2 + t * (k === 2 ? 1.5 : .5));
          else if (dir === 1) g.fillRect(cx + o - t / 2, cy - t * (k === 2 ? 1.5 : .5), t, CH / 2 + t * (k === 2 ? 1.5 : .5) + .5);
          else if (dir === 2) g.fillRect(px, cy + o - t / 2, CW / 2 + t * (k === 2 ? 1.5 : .5), t);
          else g.fillRect(cx - t * (k === 2 ? 1.5 : .5), cy + o - t / 2, CW / 2 + t * (k === 2 ? 1.5 : .5) + .5, t);
        }
      };
      arm(0, b[0]); arm(1, b[1]); arm(2, b[2]); arm(3, b[3]);
    } else if (code >= 0x2571 && code <= 0x2573) {
      g.strokeStyle = col; g.lineWidth = Math.max(1.2, CW / 6); g.lineCap = 'butt'; g.beginPath();
      if (code !== 0x2572) { g.moveTo(px + CW, py); g.lineTo(px, py + CH); }
      if (code !== 0x2571) { g.moveTo(px, py); g.lineTo(px + CW, py + CH); }
      g.stroke();
    } else { fillS(col); g.fillText(ch, px + CW / 2, py + BASE); }
  } else if (ch !== ' ') { fillS(col); g.fillText(ch, px + CW / 2, py + BASE); }
  if (a !== undefined && a !== 1) g.globalAlpha = 1;
}
/* text in cell coordinates already converted to px */
function txtPx(s, px, py, col, a) { for (let i = 0; i < s.length; i++) { const c = s[i]; if (c !== ' ') gl(c, px + i * CW, py, col, a); } }
function txtC(s, cx, cy, col, a) { txtPx(s, Math.round(cx * CW - s.length * CW / 2), Math.round(cy * CH), col, a); }
function rectPx(px, py, w, h, col, a) { if (a !== undefined && a !== 1) g.globalAlpha = a; fillS(col); g.fillRect(px, py, w, h); if (a !== undefined && a !== 1) g.globalAlpha = 1; }
const hasGlyphCache = {};
function hasGlyph(ch) {
  if (ch in hasGlyphCache) return hasGlyphCache[ch];
  let ok = false;
  try {
    const a = document.createElement('canvas'); a.width = a.height = 40; const x = a.getContext('2d');
    const d = c => { x.clearRect(0, 0, 40, 40); x.font = '700 28px ' + FONT_FAMILY; x.fillStyle = '#000'; x.fillText(c, 4, 30); return x.getImageData(0, 0, 40, 40).data; };
    const d1 = d(ch), d0 = d('\u{10FFFE}'); let diff = 0, ink = 0;
    for (let i = 3; i < d1.length; i += 4) { if (d1[i] > 40) ink++; if (Math.abs(d1[i] - d0[i]) > 60) diff++; }
    ok = ink > 15 && diff > 30;
  } catch (e) { ok = false; }
  hasGlyphCache[ch] = ok; return ok;
}

/* ---------- post: bloom ---------- */
const hasFilter = 'filter' in vctx;
let glitchAmt = 0;
function present(bloomK) {
  bloomK = bloomK === undefined ? 1 : bloomK;
  vctx.globalCompositeOperation = 'source-over'; vctx.globalAlpha = 1; vctx.imageSmoothingEnabled = true;
  vctx.drawImage(scn, 0, 0);
  if (bloomK > 0) {
    bl1x.globalCompositeOperation = 'copy'; if (hasFilter) bl1x.filter = 'brightness(1.0) contrast(1.25) saturate(1.15)';
    bl1x.drawImage(scn, 0, 0, bl1.width, bl1.height); if (hasFilter) bl1x.filter = 'none';
    bl2x.globalCompositeOperation = 'copy'; bl2x.drawImage(bl1, 0, 0, bl2.width, bl2.height);
    vctx.globalCompositeOperation = 'lighter';
    vctx.globalAlpha = .22 * bloomK; vctx.drawImage(bl1, 0, 0, W, H);
    if (hasFilter) vctx.filter = 'blur(' + (6 * DPR) + 'px)';
    vctx.globalAlpha = .5 * bloomK; vctx.drawImage(bl2, 0, 0, W, H);
    if (hasFilter) vctx.filter = 'none';
    vctx.globalCompositeOperation = 'source-over'; vctx.globalAlpha = 1;
  }
  if (glitchAmt > 0.02) {
    const n = 3 + (glitchAmt * 14 | 0);
    for (let i = 0; i < n; i++) {
      const sy = Math.random() * H | 0, sh = (4 + Math.random() * H * 0.06 * glitchAmt) | 0, dx = (Math.random() - .5) * W * .08 * glitchAmt | 0;
      vctx.drawImage(scn, 0, sy, W, sh, dx, sy, W, sh);
    }
    vctx.globalCompositeOperation = 'lighter'; vctx.globalAlpha = .35 * glitchAmt;
    vctx.drawImage(scn, 3 * DPR * glitchAmt * 3, 0); vctx.drawImage(scn, -3 * DPR * glitchAmt * 3, 0);
    vctx.globalCompositeOperation = 'source-over'; vctx.globalAlpha = 1;
  }
}

/* ---------- input ---------- */
const KEY = {}, KP = {};
/* touch state (filled in by 45_touch.js) and a tiny helper to word text differently for touch players */
const TC = { on: false, coarse: false, lastT: -1e9, keys: {}, ptrs: new Map(), mv: null, aim: null, firing: false, latched: false, aimDX: 1, aimDY: -1, aimAge: 99, jumpHeld: false, hookHold: false, hookSeen: false, hookReq: false, hookAuto: false, btn: {}, safe: { t: 0, r: 0, b: 0, l: 0 }, u: 46, fsDone: false };
const TX = (pc, touch) => TC.on ? touch : pc;
const MOUSE = { x: COLS / 2, y: ROWS / 2, l: false, r: false, lp: false, rp: false, moved: -99, touch: false };
const BLOCKKEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'ShiftLeft', 'ShiftRight']);
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey) return;
  if (!KEY[e.code]) KP[e.code] = true; KEY[e.code] = true;
  if (BLOCKKEYS.has(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { KEY[e.code] = false; });
addEventListener('blur', () => { for (const k in KEY) KEY[k] = false; MOUSE.l = MOUSE.r = false; if (window.onGameBlur) window.onGameBlur(); });
cv.addEventListener('contextmenu', e => e.preventDefault());
function mpos(e) { if (performance.now() - TC.lastT < 700) return; const r = cv.getBoundingClientRect(); MOUSE.x = (e.clientX - r.left) / r.width * W / CW; MOUSE.y = (e.clientY - r.top) / r.height * H / CH; MOUSE.moved = performance.now() / 1000; }
cv.addEventListener('mousemove', mpos);
cv.addEventListener('mousedown', e => { if (performance.now() - TC.lastT < 700) { e.preventDefault(); return; } TC.on = TC.coarse && TC.on; mpos(e); if (e.button === 0) { MOUSE.l = true; MOUSE.lp = true; } if (e.button === 2) { MOUSE.r = true; MOUSE.rp = true; } e.preventDefault(); });
addEventListener('mouseup', e => { if (e.button === 0) MOUSE.l = false; if (e.button === 2) MOUSE.r = false; });
cv.addEventListener('wheel', e => { MOUSE.wheel = (MOUSE.wheel || 0) + sign(e.deltaY); e.preventDefault(); }, { passive: false });
addEventListener('touchstart', () => { MOUSE.touch = true; }, { passive: true });
const pressed = c => !!KP[c];
function endFrameInput() { for (const k in KP) KP[k] = false; MOUSE.lp = MOUSE.rp = false; MOUSE.wheel = 0; }

/* =========================================================================
   AUDIO — everything synthesised, nothing sampled
   ========================================================================= */
const AU = { ctx: null, muted: false, nbuf: null };
function auInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)(); AU.ctx = A;
    const comp = A.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = .004; comp.release.value = .18;
    AU.master = A.createGain(); AU.master.gain.value = AU.muted ? 0 : .8; AU.master.connect(comp); comp.connect(A.destination);
    AU.sfx = A.createGain(); AU.sfx.gain.value = .85; AU.sfx.connect(AU.master);
    AU.mus = A.createGain(); AU.mus.gain.value = .5; AU.mus.connect(AU.master);
    AU.dly = A.createDelay(1); AU.dly.delayTime.value = .36; const fb = A.createGain(); fb.gain.value = .38; const dl = A.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2400;
    AU.dly.connect(dl); dl.connect(fb); fb.connect(AU.dly); AU.dsend = A.createGain(); AU.dsend.gain.value = .5; AU.dsend.connect(AU.dly); dl.connect(AU.mus);
    AU.verb = A.createConvolver(); const len = A.sampleRate * 1.8, ib = A.createBuffer(2, len, A.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    AU.verb.buffer = ib; AU.vsend = A.createGain(); AU.vsend.gain.value = .35; AU.vsend.connect(AU.verb); AU.verb.connect(AU.master);
    const nb = A.createBuffer(1, A.sampleRate * 2, A.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; AU.nbuf = nb;
  } catch (e) { AU.ctx = null; }
}
function auMute(m) { AU.muted = m; if (AU.master) AU.master.gain.setTargetAtTime(m ? 0 : .8, AU.ctx.currentTime, .05); }
function tone(type, f0, f1, dur, vol, when, dest, o) {
  const A = AU.ctx; if (!A) return; o = o || {};
  const t = A.currentTime + (when || 0), os = A.createOscillator(), gn = A.createGain();
  os.type = type; os.frequency.setValueAtTime(f0, t); if (f1 !== f0) os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  if (o.det) os.detune.value = o.det;
  const atk = o.atk || .004; gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vol, t + atk); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = os;
  if (o.lp) { const f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + dur); f.Q.value = o.q || 1; os.connect(f); node = f; }
  node.connect(gn); gn.connect(dest || AU.sfx);
  if (o.send) { const s = A.createGain(); s.gain.value = o.send; gn.connect(s); s.connect(AU.dsend); }
  if (o.vsend) { const s = A.createGain(); s.gain.value = o.vsend; gn.connect(s); s.connect(AU.vsend); }
  os.start(t); os.stop(t + dur + .05);
}
function nz(dur, vol, ft, f0, f1, when, dest, q) {
  const A = AU.ctx; if (!A) return;
  const t = A.currentTime + (when || 0), s = A.createBufferSource(); s.buffer = AU.nbuf; s.loop = true; s.loopStart = Math.random();
  const f = A.createBiquadFilter(); f.type = ft || 'lowpass'; f.frequency.setValueAtTime(f0 || 2000, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q || 1;
  const gn = A.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(gn); gn.connect(dest || AU.sfx); s.start(t, Math.random()); s.stop(t + dur + .05);
}
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
let sfxGate = {};
function sfx(n, v) {
  if (!AU.ctx) return; v = v === undefined ? 1 : v;
  const now = AU.ctx.currentTime; if (sfxGate[n] && now - sfxGate[n] < .03) return; sfxGate[n] = now;
  switch (n) {
    case 'shoot': tone('square', 1100, 140, .09, .16 * v, 0, null, { lp: 4000 }); nz(.04, .15 * v, 'highpass', 3000); break;
    case 'scatter': nz(.22, .5 * v, 'lowpass', 3500, 200); tone('sawtooth', 160, 40, .2, .35 * v); break;
    case 'rail': tone('sawtooth', 2400, 50, .5, .22 * v, 0, null, { lp: 6000, lp2: 200 }); tone('sine', 90, 30, .5, .5 * v); nz(.4, .3 * v, 'bandpass', 5000, 300, 0, null, 2); break;
    case 'jump': tone('sine', 260, 560, .13, .22 * v); break;
    case 'djump': tone('triangle', 400, 900, .12, .2 * v); nz(.1, .1 * v, 'highpass', 4000); break;
    case 'land': nz(.09, .35 * v, 'lowpass', 600, 120); tone('sine', 90, 45, .09, .3 * v); break;
    case 'dash': nz(.22, .4 * v, 'bandpass', 600, 4200, 0, null, 3); tone('sawtooth', 200, 700, .15, .08 * v, 0, null, { lp: 1800 }); break;
    case 'hook': tone('sawtooth', 300, 1500, .07, .14 * v); nz(.05, .15 * v, 'highpass', 5000); break;
    case 'attach': tone('square', 110, 60, .1, .3 * v); tone('square', 2200, 1800, .04, .12 * v); nz(.08, .3 * v, 'bandpass', 2400, 800, 0, null, 4); break;
    case 'release': tone('triangle', 900, 300, .1, .12 * v); break;
    case 'hit': tone('square', 700, 220, .05, .18 * v); nz(.05, .25 * v, 'bandpass', 2500, 1500); break;
    case 'boom': nz(.7, .8 * v, 'lowpass', 2200, 60); tone('sine', 120, 28, .6, .7 * v); nz(.15, .4 * v, 'highpass', 2000); break;
    case 'bigboom': nz(1.6, 1 * v, 'lowpass', 2600, 40); tone('sine', 100, 20, 1.4, .9 * v); nz(.5, .5 * v, 'bandpass', 800, 100, .05, null, 2); break;
    case 'hurt': tone('sawtooth', 520, 70, .32, .35 * v, 0, null, { lp: 2000, lp2: 150 }); nz(.2, .4 * v, 'lowpass', 1800, 200); break;
    case 'die': tone('sawtooth', 700, 25, 1.0, .35 * v, 0, null, { lp: 3000, lp2: 90 }); nz(1.0, .45 * v, 'lowpass', 3000, 60); break;
    case 'pick': [0, 4, 7, 12].forEach((s, i) => tone('triangle', midi(76 + s), midi(76 + s), .14, .18 * v, i * .05, null, { send: .3 })); break;
    case 'chip': tone('square', 1500, 2200, .06, .1 * v); tone('square', 2200, 2200, .08, .08 * v, .05); break;
    case 'heal': [0, 4, 7].forEach((s, i) => tone('sine', midi(69 + s), midi(69 + s), .3, .2 * v, i * .07, null, { vsend: .4 })); break;
    case 'door': nz(.5, .5 * v, 'lowpass', 900, 80); tone('square', 70, 40, .35, .25 * v); nz(.12, .2 * v, 'bandpass', 3000, 1500, .3); break;
    case 'dooropen': nz(.35, .3 * v, 'bandpass', 400, 2000, 0, null, 2); tone('sawtooth', 80, 160, .3, .1 * v, 0, null, { lp: 500 }); break;
    case 'cp': [0, 7, 12, 16].forEach((s, i) => tone('sine', midi(60 + s), midi(60 + s), .6, .2 * v, i * .09, null, { vsend: .6 })); break;
    case 'warn': tone('square', 880, 880, .09, .1 * v); tone('square', 660, 660, .09, .1 * v, .11); break;
    case 'ebullet': tone('sawtooth', 500, 200, .1, .1 * v, 0, null, { lp: 1800 }); break;
    case 'laser': tone('sawtooth', 180, 90, .6, .12 * v, 0, null, { lp: 800 }); nz(.5, .12 * v, 'highpass', 5000); break;
    case 'thunder': nz(2.2, .8 * v, 'lowpass', 500, 40); nz(.3, .5 * v, 'bandpass', 1500, 100, 0, null, 1); break;
    case 'zap': nz(.18, .35 * v, 'bandpass', 3000, 700, 0, null, 6); tone('square', 120, 80, .15, .1 * v); break;
    case 'boot': [0, 3, 7, 10, 14, 19].forEach((s, i) => tone('square', midi(57 + s), midi(57 + s), .1, .08 * v, i * .06, null, { send: .5 })); break;
    case 'select': tone('square', 880, 1320, .05, .08 * v); break;
    case 'step': nz(.03, .06 * v, 'bandpass', 900, 500); break;
    case 'vent': nz(.5, .22 * v, 'bandpass', 700, 2500, 0, null, 1.5); break;
    case 'stomp': nz(.35, .8 * v, 'lowpass', 700, 50); tone('sine', 70, 25, .35, .8 * v); break;
    case 'blip': tone('square', 1200, 1200, .02, .04 * v); break;
    case 'board': tone('square', 200, 120, .09, .22 * v); nz(.12, .3 * v, 'lowpass', 1200, 200); tone('sawtooth', 160, 520, .35, .12 * v, .05, null, { lp: 1500 }); break;
    case 'rocket': nz(.5, .4 * v, 'bandpass', 1200, 5000, 0, null, 1.5); tone('sawtooth', 300, 90, .45, .18 * v, 0, null, { lp: 2000, lp2: 200 }); break;
    case 'rocketHit': nz(.25, .3 * v, 'highpass', 3000, 800); break;
    case 'rotor': nz(.07, .17 * v, 'lowpass', 320, 110); tone('triangle', 62, 52, .07, .1 * v); break;
    case 'engine': tone('sawtooth', 50 + v * 55, 45 + v * 45, .13, .07 * v, 0, null, { lp: 520 }); nz(.05, .04 * v, 'lowpass', 600, 200); break;
  }
}

/* ---------- generative synthwave score ---------- */
const MUS = { on: false, bpm: 104, step: 0, next: 0, timer: null, track: null, inten: 0, inten_t: 0 };
const TRACKS = {
  rain: { bpm: 104, roots: [45, 41, 48, 43], q: [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]], arp: [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, 1], bass: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0], kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1] },
  bazaar: { bpm: 92, roots: [38, 34, 43, 33], q: [[0, 3, 7], [0, 4, 7], [0, 3, 7], [0, 4, 7]], arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 2, 1, 0, 1], bass: [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0] },
  tower: { bpm: 118, roots: [40, 40, 36, 38], q: [[0, 3, 7], [0, 3, 7], [0, 4, 7], [0, 4, 7]], arp: [0, 0, 2, 0, 1, 0, 2, 0, 0, 0, 2, 1, 2, 0, 1, 2], bass: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0], kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0] },
  spire: { bpm: 128, roots: [42, 38, 40, 37], q: [[0, 3, 7], [0, 4, 7], [0, 3, 7], [0, 3, 6]], arp: [0, 1, 2, 1, 2, 1, 0, 1, 0, 1, 2, 1, 2, 1, 2, 1], bass: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1], kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
  boss: { bpm: 142, roots: [41, 41, 44, 40], q: [[0, 3, 7], [0, 3, 6], [0, 4, 7], [0, 3, 7]], arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 2, 1, 2, 0], bass: [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1], kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0] },
  title: { bpm: 84, roots: [45, 41, 43, 40], q: [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 3, 7]], arp: [0, 1, 2, 1, 2, 1, 0, 1, 0, 1, 2, 1, 2, 1, 0, 2], bass: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
};
function musPlay(name) {
  if (!AU.ctx) return; const tr = TRACKS[name]; if (!tr || MUS.name === name && MUS.on) return;
  MUS.name = name; MUS.track = tr; MUS.step = 0; MUS.next = AU.ctx.currentTime + .08; MUS.on = true;
  if (!MUS.timer) MUS.timer = setInterval(musTick, 30);
}
function musStop() { MUS.on = false; MUS.name = null; }
function musTick() {
  if (!MUS.on || !AU.ctx) return; const A = AU.ctx, tr = MUS.track;
  while (MUS.next < A.currentTime + .12) { musStep(tr, MUS.step, MUS.next - A.currentTime); MUS.next += 60 / tr.bpm / 4; MUS.step++; }
}
function musStep(tr, s, w) {
  const st = s % 16, bar = (s / 16 | 0) % 4, root = tr.roots[bar], ch = tr.q[bar], it = MUS.inten;
  if (tr.kick[st]) { tone('sine', 150, 42, .22, .75, w, AU.mus); nz(.02, .2, 'highpass', 3000, 0, w, AU.mus); }
  if (st === 4 || st === 12) { nz(.16, .32, 'bandpass', 1800, 900, w, AU.mus, .8); tone('triangle', 220, 140, .08, .15, w, AU.mus); }
  if (st % 2 === 0 || it > .5) nz(.035, (st % 4 === 2 ? .16 : .08) * (it > .5 && st % 2 ? .6 : 1), 'highpass', 7000, 0, w, AU.mus);
  if (tr.bass[st]) { const n = root + (st === 14 ? 12 : 0); tone('sawtooth', midi(n), midi(n), .22, .3, w, AU.mus, { lp: 700 + it * 700, lp2: 120, q: 6 }); tone('square', midi(n - 12), midi(n - 12), .22, .18, w, AU.mus, { lp: 300 }); }
  if (st === 0) for (let i = 0; i < 3; i++) { const n = root + 12 + ch[i]; tone('sawtooth', midi(n), midi(n), 60 / tr.bpm * 4, .06, w, AU.mus, { lp: 900, lp2: 500, atk: .5, det: i * 7 - 7, vsend: .5 }); tone('sawtooth', midi(n), midi(n), 60 / tr.bpm * 4, .05, w, AU.mus, { lp: 700, lp2: 400, atk: .6, det: 9 - i * 5 }); }
  const ai = tr.arp[st]; if (s % 2 === 0 || it > .3) { const n = root + 24 + ch[ai] + (st >= 8 && st % 4 === 3 ? 12 : 0); tone('square', midi(n), midi(n), .13, .045 + it * .03, w, AU.mus, { lp: 3200, lp2: 800, send: .55 }); }
}

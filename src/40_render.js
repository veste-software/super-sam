/* =========================================================================
   world rendering
   ========================================================================= */
let CXp = 0, CYp = 0;
const CHS = []; const chr = c => CHS[c] || (CHS[c] = String.fromCharCode(c));
const MIR = { '╱': '╲', '╲': '╱', '▐': '▌', '▌': '▐', '▙': '▟', '▟': '▙', '▛': '▜', '▜': '▛', '▘': '▝', '▝': '▘', '▖': '▗', '▗': '▖', '►': '◄', '◄': '►', '<': '>', '>': '<', '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '/': '\\', '\\': '/' };
const SPC = { w: '#eaf6ff', c: '#19f0ff', m: '#ff2fb9', v: '#b9a8ff', V: '#dcd3ff', k: '#2a2f55', y: '#ffe45e', a: '#ffb347', r: '#ff3b4d', R: '#b42a40', g: '#8a96c4', G: '#3d4676', p: '#ff8ad8', n: '#5dffb0', o: '#ff7a3a', q: '#7f70ff', Q: '#8e1c2b' };
function frameCam() { CXp = (S.cam.x + S.cam.sx) * CW; CYp = (S.cam.y + S.cam.sy) * CH; }
function wgl(ch, x, y, col, a) { gl(ch, Math.round(x * CW - CXp), Math.round(y * CH - CYp), col, a); }
function onScr(x, y, m) { m = m || 4; const sx = x * CW - CXp, sy = y * CH - CYp; return sx > -m * CW && sx < W + m * CW && sy > -m * CH && sy < H + m * CH; }

const glowCache = new Map();
function glowSprite(col) { let c = glowCache.get(col); if (!c) { c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), gr = x.createRadialGradient(48, 48, 0, 48, 48, 48); gr.addColorStop(0, hexA(col, 1)); gr.addColorStop(.22, hexA(col, .4)); gr.addColorStop(.6, hexA(col, .08)); gr.addColorStop(1, hexA(col, 0)); x.fillStyle = gr; x.fillRect(0, 0, 96, 96); glowCache.set(col, c); } return c; }
function glow(wx, wy, rCells, col, a) { const r = rCells * CW, px = wx * CW - CXp, py = wy * CH - CYp; if (px < -r || px > W + r || py < -r || py > H + r) return; g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.drawImage(glowSprite(col), px - r, py - r, r * 2, r * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }

let animCh = 0;
function anim(an, x, y, t) {
  animCh = 0; const h = hash2(x, y) * 6.28;
  switch (an) {   // readability: lights glow steadily or breathe slowly, nothing strobes
    case AN.BLINK: case AN.BLINKF: case AN.FLICK: return .85;
    case AN.PULSE: return .78 + .22 * Math.sin(t * 1.1 + h);
    case AN.DATA: { const k = hash2(x, y + Math.floor(t * 6 + h)); animCh = ('0123456789ABCDEF#%=+-<>/'.charCodeAt((k * 24) | 0)); return .5 + .5 * k; }
    case AN.FLOW: { const k = ((x - Math.floor(t * 9)) % 3 + 3) % 3; animCh = k === 0 ? 187 : k === 1 ? 183 : 32; return k === 2 ? .2 : 1; }
    case AN.SPARK: { animCh = ['≈', '~', '=', '≈'][Math.floor(t * 12 + h) & 3].charCodeAt(0); return Math.random() < .75 ? 1 : .3; }
    case AN.SCAN: return .25 + .75 * Math.max(0, Math.sin(x * .25 - t * 3 + h * .2));
  }
  return 1;
}

function drawTiles(t, pass) {
  const L = S.L, Wd = L.W, Hd = L.H, th = L.th, front = pass === 1;
  const cx0 = Math.floor(CXp / CW), cy0 = Math.floor(CYp / CH);
  const xs = Math.max(0, cx0 - 1), xe = Math.min(Wd, cx0 + COLS + 2), ys = Math.max(0, cy0 - 1), ye = Math.min(Hd, cy0 + ROWS + 2);
  if (!front) {
    for (let y = ys; y < ye; y++) {
      const py = Math.round(y * CH - CYp), row = y * Wd;
      for (let x = xs; x < xe; x++) {
        const i = row + x, px = Math.round(x * CW - CXp), bb = L.bbg[i], bc = L.bch[i];
        if (bb) { fillS(PAL[bb]); g.fillRect(px, py, CW + 1, CH + 1); }
        if (bc) { const an = L.ban[i]; const al = an ? anim(an, x, y, t) : 1; gl(animCh ? chr(animCh) : chr(bc), px, py, PAL[L.bfg[i]], al); }
      }
    }
    return;
  }
  const rim = th.rimCol || (th.rimCol = mixc(PAL[th.edge], '#ffffff', .38)), rimD = th.rimDim || (th.rimDim = mixc(PAL[th.edge], '#ffffff', .1)), dep = L.dep, ln = Math.max(2, DOT * 2);
  const sol = (x, y) => L.solid(x, y);
  for (let y = ys; y < ye; y++) {
    const py = Math.round(y * CH - CYp), row = y * Wd;
    for (let x = xs; x < xe; x++) {
      const i = row + x, px = Math.round(x * CW - CXp), fb = L.bg[i], fc = L.ch[i], isS = L.t[i] !== 0 && sol(x, y);
      if (fb) { fillS(PAL[fb]); g.fillRect(px, py, CW + 1, CH + 1); }
      if (fc) { const an = L.an[i]; const al = an ? anim(an, x, y, t) : 1; gl(animCh ? chr(animCh) : chr(fc), px, py, PAL[L.fg[i]], al); }
      if (isS) {
        // solid masses fade to a quiet dark interior; only the lit skin reads
        const d = dep[i]; if (d > 2) { const a = Math.min(.62, (d - 2) * .15); fillS('#03040c'); g.globalAlpha = a; g.fillRect(px, py, CW + 1, CH + 1); g.globalAlpha = 1; }
        // rim light on every exposed face
        if (!sol(x, y - 1)) { fillS(rim); g.fillRect(px, py, CW + 1, ln); }
        if (!sol(x - 1, y)) { fillS(rimD); g.globalAlpha = .7; g.fillRect(px, py, ln, CH + 1); g.globalAlpha = 1; }
        if (!sol(x + 1, y)) { fillS(rimD); g.globalAlpha = .7; g.fillRect(px + CW + 1 - ln, py, ln, CH + 1); g.globalAlpha = 1; }
      } else if (!fb) {
        // contact shadow: air touching a solid face is darker, so silhouettes separate from the backdrop
        const n = (sol(x, y + 1) ? 1 : 0) + (sol(x - 1, y) ? 1 : 0) + (sol(x + 1, y) ? 1 : 0) + (sol(x, y - 1) ? 1 : 0);
        if (n) { fillS('#02030a'); g.globalAlpha = .13 * n; g.fillRect(px, py, CW + 1, CH + 1); g.globalAlpha = 1; }
      }
    }
  }
  // rain splashes on exposed tops
  if (th.rain && !S.paused) {
    for (let k = 0; k < 7 * th.rain.n; k++) {
      const x = xs + ((Math.random() * (xe - xs)) | 0); let y = ys; const L2 = L;
      for (; y < ye; y++) { const tt = L2.t[y * Wd + x]; if (tt === T.SOL || tt === T.ONE) break; }
      if (y < ye && (y === 0 || L2.t[(y - 1) * Wd + x] === 0)) { pt(x + Math.random(), y - .1, rr(-6, 6), rr(-9, -3), rr(.15, .3), ['·', '.', "'"], th.rain.col, { g: 38, col: false }); }
    }
  }
}

/* depth veil: everything drawn so far is the backdrop. Flatten and darken it so the playfield reads first. */
function drawVeil(th) {
  const v = th.veil || {};
  g.globalCompositeOperation = 'saturation'; g.globalAlpha = v.desat === undefined ? .42 : v.desat; g.fillStyle = '#808080'; lastFill = ''; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = v.dark === undefined ? .46 : v.dark; g.fillStyle = v.col || '#04050f'; g.fillRect(0, 0, W, H);
  g.globalAlpha = 1; lastFill = '';
}
/* soft dark halo behind characters so bright sprites never melt into a busy backdrop */
let haloCv = null;
function halo(wx, wy, rCells, a) {
  if (!haloCv) { haloCv = document.createElement('canvas'); haloCv.width = haloCv.height = 96; const x = haloCv.getContext('2d'), gr = x.createRadialGradient(48, 48, 0, 48, 48, 48); gr.addColorStop(0, 'rgba(2,3,10,1)'); gr.addColorStop(.55, 'rgba(2,3,10,.6)'); gr.addColorStop(1, 'rgba(2,3,10,0)'); x.fillStyle = gr; x.fillRect(0, 0, 96, 96); }
  const r = rCells * CW, px = wx * CW - CXp, py = wy * CH - CYp; if (px < -r || px > W + r || py < -r || py > H + r) return;
  g.globalAlpha = a; g.drawImage(haloCv, px - r, py - r * 1.1, r * 2, r * 2.2); g.globalAlpha = 1;
}

/* ---------- doors & movers ---------- */
function drawDoors(t) {
  for (const d of S.L.doors) {
    if (!onScr(d.x, d.y + d.h / 2, d.h)) continue;
    const rows = Math.ceil(d.h * (1 - d.open) - 1e-6), locked = d.mode !== 'auto', col = locked ? '#ff3b4d' : '#19f0ff';
    for (let r = 0; r < rows; r++) for (let c = 0; c < d.w; c++) {
      const x = d.x + c, y = d.y + r, last = r === rows - 1;
      wgl('█', x, y, '#171c40');
      if (last) wgl('▄', x, y, (Math.floor(t * 5) % 2 || !locked) ? col : '#551018');
      else if ((r + c) % 2 === 0) wgl('▚', x, y, locked ? '#8e3a1a' : '#2a3a7a');
      else wgl('│', x, y, '#2a3470');
    }
    if (rows > 0) { wgl('▀', d.x, d.y, '#6a78c0'); wgl('▀', d.x + 1, d.y, '#6a78c0'); if (locked) glow(d.x + 1, d.y + rows, 5, '#ff3b4d', .25 * (1 - d.open)); }
  }
}
function drawMovers(t) {
  for (const m of S.L.movers) {
    if (!onScr(m.x + m.w / 2, m.y, m.w / 2 + 6)) continue;
    if (m.kind === 'car') {
      g.save(); g.beginPath(); g.rect(m.x0 * CW - CXp, 0, (m.x1 - m.x0) * CW, H); g.clip();
      const w = m.w, x = m.x, y = m.y, wc = m.i % 2 ? '#ffb347' : '#6ad8ff';
      for (let i = 0; i < w; i++) {
        const mid = i % 6, end = i === 0 || i === w - 1, win = mid >= 1 && mid <= 4 && i > 1 && i < w - 2;
        wgl('▀', x + i, y, '#5a6ac0');
        wgl(end ? (i ? '▌' : '▐') : '█', x + i, y + 1, '#1a2050'); if (win) wgl('▄', x + i, y + 1, wc, .95);
        wgl('█', x + i, y + 2, '#161b45'); if (win) wgl('▀', x + i, y + 2, wc, .8);
        wgl('▄', x + i, y + 3, i % 3 === 0 ? '#ff2fb9' : '#3a1a60');
      }
      wgl('╥', x + w / 2 | 0, y - 1, '#8a96c4'); if (Math.random() < .25) sparks(x + (w / 2 | 0) + .5, y - 1, 1, 0, -1, PAL[C.cyan], 14);
      for (let i = 3; i < w - 3; i += 8) { wgl('◙', x + i, y + 4 - .15, '#6a78c0'); wgl('◙', x + i + 2, y + 4 - .15, '#6a78c0'); }
      g.restore();
    } else if (m.kind === 'elev') {
      for (let j = Math.floor(m.cableTop === undefined ? m.y0 - 20 : m.cableTop); j < m.y; j++) wgl('│', m.x + m.w / 2 | 0, j, '#3a4690', .8);
      for (let i = 0; i < m.w; i++) { wgl(i === 0 ? '╞' : i === m.w - 1 ? '╡' : '═', m.x + i, m.y, '#19f0ff'); wgl(i % 2 ? '▀' : '▄', m.x + i, m.y + .6, '#2c3a7a'); }
      glow(m.x + m.w / 2, m.y + 1, 4, '#19f0ff', .25);
    } else {
      for (let i = 0; i < m.w; i++) { wgl('▀', m.x + i, m.y, i === 0 || i === m.w - 1 ? '#ff2fb9' : '#19f0ff'); wgl('▄', m.x + i, m.y + .55, '#2c3a7a'); }
      for (let i = 1; i < m.w - 1; i += 2) if (Math.random() < .8) wgl(Math.random() < .5 ? '▼' : '·', m.x + i, m.y + 1.2 + Math.random() * .5, '#19f0ff', .6);
      glow(m.x + m.w / 2, m.y + 1.4, m.w * .8, '#19f0ff', .22);
    }
  }
}

/* ---------- procedural holograms ---------- */
function donutBuf(t, w, h) {
  const out = new Uint8Array(w * h), zb = new Float32Array(w * h), A = t * 1.1, B = t * .7;
  const sA = Math.sin(A), cA = Math.cos(A), sB = Math.sin(B), cB = Math.cos(B);
  for (let th = 0; th < TAU; th += .09) { const ct = Math.cos(th), st = Math.sin(th); for (let ph = 0; ph < TAU; ph += .035) {
    const sp = Math.sin(ph), cp = Math.cos(ph), hh = ct + 2, D = 1 / (sp * hh * sA + st * cA + 5), tt = sp * hh * cA - st * sA;
    const x = (w / 2 + w * .375 * D * (cp * hh * cB - tt * sB)) | 0, y = (h / 2 + h * .68 * D * (cp * hh * sB + tt * cB)) | 0, o = x + w * y;
    const N = 8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB) | 0;
    if (y >= 0 && y < h && x >= 0 && x < w && D > zb[o]) { zb[o] = D; out[o] = N > 0 ? N + 1 : 1; }
  } }
  return out;
}
function drawHolo(d, t) {
  if (!onScr(d.x + d.w / 2, d.y + d.h / 2, d.w)) return;
  const flick = .92 + .08 * Math.sin(t * 1.7 + d.x), col = d.col || '#ff2fb9', col2 = d.col2 || '#19f0ff';
  g.globalAlpha = 1;
  glow(d.x + d.w / 2, d.y + d.h / 2, d.w * .7, col, .12 * flick);
  if (d.kind === 'donut') {
    if (!d._t || t - d._t > 1 / 24) { d._t = t; d._b = donutBuf(t, d.w, d.h); }
    const ramp = ' .,-~:;=!*#$@', b = d._b;
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) { const v = b[j * d.w + i]; if (!v) continue; wgl(ramp[Math.min(12, v)], d.x + i, d.y + j, mixc(col2, col, j / d.h), (.45 + v / 14) * flick); }
  } else if (d.kind === 'globe') {
    const rx = d.w / 2, ry = d.h / 2, rot = t * .5;
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
      const u = (i + .5 - rx) / rx, v = (j + .5 - ry) / ry, r2 = u * u + v * v; if (r2 > 1) continue; const z = Math.sqrt(1 - r2);
      const lat = Math.asin(-v), lon = Math.atan2(u, z) + rot;
      const land = vnoise(lon * 1.6 + 3, lat * 2.4 + 5, 10) * .65 + vnoise(lon * 3.3, lat * 5, 21) * .35 > .52, lum = clamp(-.4 * u - .3 * v + .8 * z, 0, 1);
      const grid = (Math.abs(((lon * 4 / PI) % 1)) < .05 || Math.abs(((lat * 6 / PI) % 1)) < .06);
      let ch, c; if (land) { ch = lum > .6 ? '#' : lum > .3 ? '%' : '+'; c = mixc('#0a6a58', '#5dffb0', lum); } else { ch = grid ? '·' : lum > .5 ? ':' : '.'; c = mixc('#0a2a60', '#3a90ff', lum); }
      if (r2 > .86) { ch = '░'; c = '#19f0ff'; }
      wgl(ch, d.x + i, d.y + j, c, (.5 + lum * .5) * flick);
    }
  } else if (d.kind === 'eye') {
    const rx = d.w / 2, ry = d.h / 2, P = S.P; const ex = clamp((P.x - (d.x + rx)) / 40, -1, 1), ey = clamp((P.y - (d.y + ry)) / 20, -1, 1);
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
      const u = (i + .5 - rx) / rx, v = (j + .5 - ry) / ry; const e = Math.abs(v) < 1 - u * u * .9 ? 1 : 0; if (!e && Math.abs(v) > 1.1 - u * u) continue;
      const lid = Math.abs(Math.abs(v) - (1 - u * u * .9)) < .13;
      const iu = (u - ex * .35) , iv = (v - ey * .3) * 1.8, ir = iu * iu + iv * iv;
      if (lid) { wgl(v < 0 ? '▀' : '▄', d.x + i, d.y + j, col, .9 * flick); continue; }
      if (!e) continue;
      if (ir < .018) wgl('█', d.x + i, d.y + j, '#0a0010'); else if (ir < .05) wgl('●', d.x + i, d.y + j, '#ffe0e0', flick); else if (ir < .19) wgl('▓', d.x + i, d.y + j, mixc('#ff3b4d', '#ff9a4d', ir * 4), .95 * flick); else wgl(((i + j) & 1) ? '░' : '·', d.x + i, d.y + j, '#6a2a5a', .7);
    }
  } else if (d.kind === 'ad') {
    const w = d.w; txtPx('╔' + '═'.repeat(w - 2) + '╗', Math.round(d.x * CW - CXp), Math.round(d.y * CH - CYp), col, .9 * flick);
    txtPx('║' + ' '.repeat(w - 2) + '║', Math.round(d.x * CW - CXp), Math.round((d.y + 1) * CH - CYp), col, .9);
    txtPx('╚' + '═'.repeat(w - 2) + '╝', Math.round(d.x * CW - CXp), Math.round((d.y + 2) * CH - CYp), col, .9 * flick);
    const tx = d.text, off = Math.floor(t * 8) % tx.length; let s = ''; for (let i = 0; i < w - 4; i++) s += tx[(off + i) % tx.length];
    txtPx(s, Math.round((d.x + 2) * CW - CXp), Math.round((d.y + 1) * CH - CYp), col2, flick);
  }
  if (d.label) txtPx(d.label, Math.round((d.x + (d.w - d.label.length) / 2) * CW - CXp), Math.round((d.y + d.h + .3) * CH - CYp), col, .7 * flick);
  // scanlines
  g.globalAlpha = .12; fillS('#000'); for (let j = 0; j < d.h; j += 2) g.fillRect(Math.round(d.x * CW - CXp), Math.round((d.y + j + .5) * CH - CYp), d.w * CW, 2); g.globalAlpha = 1;
}
const NPCCOL = ['#ff2fb9', '#19f0ff', '#ffb347', '#9d5cff', '#5dffb0'];
function drawDecor(t, layer) {
  for (const d of S.L.decor) {
    switch (d.k) {
      case 'holo': if (layer === 0) drawHolo(d, t); break;
      case 'ad': if (layer === 0) drawHolo(Object.assign(d, { kind: 'ad', h: 3 }), t); break;
      case 'sign': {
        if (layer !== (d.front ? 1 : 0) || !onScr(d.x, d.y, 12)) break;
        const fl = .9 + .1 * Math.sin(t * 1.3 + d.x);
        const px = Math.round(d.x * CW - CXp), py = Math.round(d.y * CH - CYp);
        const n = signPx(d.text, px, py, d.col, fl, d.vert);
        if (d.frame && !d.vert) { txtPx('╔' + '═'.repeat(n + 2) + '╗', px - CW * 2, py - CH, d.col, .7 * fl); txtPx('╚' + '═'.repeat(n + 2) + '╝', px - CW * 2, py + CH, d.col, .7 * fl); gl('║', px - CW * 2, py, d.col, .7 * fl); gl('║', px + CW * (n + 1), py, d.col, .7 * fl); }
        glow(d.x + (d.vert ? 1 : n / 2), d.y + (d.vert ? n / 2 : 0), (d.vert ? n : n) * .9 + 3, d.col, .12 * fl);
        break;
      }
      case 'beacon': if (layer === 1 && onScr(d.x, d.y)) { const k = .3 + .22 * Math.sin(t * 1.2 + d.x); wgl('·', d.x - .5, d.y - .5, d.col || '#ff3b4d', k + .2); } break;
      case 'lamp': {
        if (layer !== 0 || !onScr(d.x, d.y + d.len / 2, d.len)) break;
        const px = d.x * CW - CXp, py = d.y * CH - CYp, len = d.len * CH, wd = d.w * CW; g.globalCompositeOperation = 'lighter';
        const gr = g.createLinearGradient(0, py, 0, py + len); gr.addColorStop(0, hexA(d.col, .22)); gr.addColorStop(1, hexA(d.col, 0)); g.fillStyle = gr; lastFill = '';
        g.beginPath(); g.moveTo(px - CW * .6, py); g.lineTo(px + CW * .6, py); g.lineTo(px + wd / 2, py + len); g.lineTo(px - wd / 2, py + len); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over';
        wgl('▀', d.x - .5, d.y - 1, '#cfe6ff'); glow(d.x, d.y, 4, d.col, .3);
        for (let k = 0; k < 3; k++) { const mt = (t * .3 + k * .33 + d.x) % 1; wgl('·', d.x - d.w * .4 + Math.sin(k * 3 + d.x) * d.w * .4 * mt, d.y + mt * d.len, '#ffffff', .4 * (1 - mt)); }
        break;
      }
      case 'cable': {
        if (layer !== 0) break; const n = Math.ceil(Math.hypot(d.x2 - d.x, (d.y2 - d.y) * 2)); let px = d.x, py = d.y;
        for (let i = 1; i <= n; i++) { const u = i / n, x = lerp(d.x, d.x2, u), y = lerp(d.y, d.y2, u) + d.sag * 4 * u * (1 - u) + Math.sin(t * 1.3 + u * 6 + d.x) * .08; const dx = x - px, dy = (y - py) * 2; const ch = Math.abs(dy) < Math.abs(dx) * .5 ? '─' : Math.abs(dx) < Math.abs(dy) * .3 ? '│' : (dx * dy > 0 ? '╲' : '╱'); if (onScr(x, y, 2)) wgl(ch, x - .5, y - .5, d.col || '#3a4690', .8); px = x; py = y; }
        break;
      }
      case 'npc': {
        if (layer !== 1 || !onScr(d.x, d.y, 8)) break;
        const wk = d.kind === 'walker'; if (wk) { d.t = (d.t || 0) + .016; d.x += d.dir * .016 * (d.sp || 2.2); if (d.x > d.x1) d.dir = -1; if (d.x < d.x0) d.dir = 1; }
        const f = Math.floor(t * 2.6 + d.ph) % 2, c = d.col, x = d.x - 1, y = d.y - 4;
        if (d.umb) { wgl('▄', x - 1, y, c, .5); wgl('▀', x, y, c, .5); wgl('█', x + 1, y, c, .5); wgl('▀', x + 2, y, c, .5); wgl('▄', x + 3, y, c, .5); wgl('╷', x + 1, y + 1, '#4a5a90', .5); }
        wgl('▟', x + .5, y + 1, '#8a96c4', .55); wgl('▙', x + 1.5, y + 1, '#8a96c4', .55); wgl('▜', x + .5, y + 2, '#3a4690', .55); wgl('▛', x + 1.5, y + 2, '#4a56a8', .55);
        wgl(wk && f ? '▟' : '▐', x + .5, y + 3, '#5a6ab0', .55); wgl(wk && f ? '▙' : '▌', x + 1.5, y + 3, '#5a6ab0', .55);
        break;
      }
      case 'vent': break;
    }
  }
}
function updDecorFx(dt) {
  const L = S.L; if (S.mode === 'title') return;
  for (const d of L.decor) {
    if (!onScr(d.x + (d.w || 0) / 2, d.y + (d.h || 0) / 2, 40)) continue;
    if (d.k === 'steam' && Math.random() < dt * d.rate) pt(d.x + rr(-.4, .4), d.y, rr(-1, 1) + (d.dx || 0), -rr(5, 10), rr(.9, 1.7), ['░', '▒', '░', '·'], d.col || PAL[C.greyD], { drag: .8, g: -2 });
    if (d.k === 'vent' && Math.random() < dt * 22) { pt(d.x + Math.random() * d.w, d.y + d.h - 1, 0, -rr(20, 38), rr(.4, .9), ['│', '¦', '░', '·'], PAL[C.cyan], { drag: .2 }); }
    if (d.k === 'spark' && Math.random() < dt * d.rate) { sparks(d.x, d.y, 8, 0, 1, PAL[C.yel], 26); if (Math.random() < .3) sfx('zap', .3); }
  }
}

/* ---------- reflections (wet street) ---------- */
let reflCv = null;
function drawReflection(t) {
  const w = S.L.wet; if (!w) return; const sy = Math.round(w.y * CH - CYp); if (sy < 0 || sy > H) return;
  const hh = Math.round(w.h * CH), srcH = Math.min(hh, sy), dstH = Math.min(hh, H - sy); if (srcH <= 0 || dstH <= 0) return;
  if (!reflCv) { reflCv = document.createElement('canvas'); } if (reflCv.width !== W || reflCv.height !== hh) { reflCv.width = W; reflCv.height = hh; }
  const rx = reflCv.getContext('2d'); rx.globalCompositeOperation = 'copy'; rx.drawImage(scn, 0, sy - srcH, W, srcH, 0, hh - srcH, W, srcH); rx.globalCompositeOperation = 'source-over';
  const sx0 = clamp(Math.round(w.x0 * CW - CXp), 0, W), sx1 = clamp(Math.round(w.x1 * CW - CXp), 0, W); if (sx1 <= sx0) return;
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = w.a; const sh = Math.max(2, Math.round(CH / 7));
  for (let k = 0; k * sh < dstH; k++) {
    const dy = k * sh, srcY = hh - dy - sh, off = Math.round(Math.sin(k * .75 + t * 2.6) * 2.4 * DPR * (1 + k / 24));
    if (srcY < 0) break; g.globalAlpha = w.a * (1 - k * sh / dstH) * .9;
    g.drawImage(reflCv, sx0, srcY, sx1 - sx0, sh, sx0 + off, sy + dy, sx1 - sx0, sh);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

/* ---------- sprites ---------- */
function spr(rows, cols, x, y, face, al, flash) {
  for (let j = 0; j < rows.length; j++) { const r = rows[j], n = r.length, cr = cols[j]; for (let i = 0; i < n; i++) {
    const ii = face > 0 ? i : n - 1 - i; let c = r[ii]; if (c === ' ') continue; if (face < 0 && MIR[c]) c = MIR[c];
    wgl(c, x + i, y + j, flash ? '#ffffff' : SPC[cr[ii]] || '#fff', al);
  } }
}
/* hero + grunt frames: 3x3 quadrant-block pixel glyphs (6x6 sub-pixels), facing right */
const LEG = { idle: ['▐ ▌', 'v V'], r0: ['▟ ▙', 'v v'], r1: [' ▐▌', ' vv'], r2: ['▙ ▟', 'v v'], r3: ['▐▌ ', 'vv '], up: ['▝▀▘', 'vvv'], fall: ['▜ ▛', 'v v'], slide: [' ▐▌', ' vv'] };
const frameOf = (head, torso, leg) => [[head[0], torso[0], LEG[leg][0]], [head[1], torso[1], LEG[leg][1]]];
const GRUNT_H = [' ▟▙', ' Rr'], GRUNT_T = ['▜█▛', 'RaR'];
const GF = {};
for (const k of ['idle', 'r0', 'r1', 'r2', 'r3', 'up', 'fall', 'slide']) GF[k] = frameOf(GRUNT_H, GRUNT_T, k);
/* the hero (Super Sam) lives in 41_sam.js */
function gunGlyph(a) { const c = Math.cos(a), s = Math.sin(a); if (Math.abs(s) < .38) return '▬'; if (Math.abs(c) < .38) return '║'; return (c * s > 0) ? '╲' : '╱'; }
function drawPlayer(t) {
  const p = S.P; if (p.dead) return;
  const al = p.inv > 0 && p.dashT <= 0 && p.hurtT <= 0 ? (Math.floor(t * 18) % 2 ? .35 : .95) : 1, flash = p.hurtT > 0.2;
  // afterimages
  for (const tr of p.trail) { const k = 1 - (t - tr.t) / .22; if (k > 0) { g.globalAlpha = k * .45; const gcol = SPC.c; const old = { v: SPC.v, V: SPC.V, w: SPC.w, m: SPC.m, c: SPC.c }; SPC.v = SPC.V = SPC.w = SPC.m = gcol; drawPlayerBody(p, tr.x, tr.y, tr.f, k * .5, false, true); Object.assign(SPC, old); g.globalAlpha = 1; } }
  // spawn scan-in
  if (p.spawnT > 0) {
    const k = 1 - p.spawnT / 1.1; g.save(); g.beginPath(); g.rect(0, 0, W, Math.round((p.y - 3 + 3 * clamp(k * 1.4, 0, 1)) * CH - CYp)); g.clip();
    drawPlayerBody(p, p.x, p.y, p.face, al, false); g.restore();
    const sy = (p.y - 3 + 3 * clamp(k * 1.4, 0, 1)); for (let i = -2; i < 3; i++) wgl('═', p.x - 1.5 + i * .5 + .5, sy, '#19f0ff', .8); glow(p.x, sy, 5, '#19f0ff', .4); return;
  }
  drawPlayerBody(p, p.x, p.y, p.face, al, flash, false, true);
  glow(p.x, p.y - 1.6, 5, '#19f0ff', .2);
}
function drawHook(t) {
  const p = S.P, h = p.hook; if (!h.st || p.dead) return; const c = chest(p); let ex, ey;
  if (h.st === 1) { ex = h.x; ey = h.y; } else if (h.st === 2) { ex = h.ax; ey = h.ay; } else { const k = smooth(clamp(h.rt, 0, 1)); ex = lerp(h.sx, c.x, k); ey = lerp(h.sy, c.y, k); }
  const dx = ex - c.x, dy = ey - c.y, dist = Math.hypot(dx, dy * 2), n = Math.max(2, Math.ceil(dist));
  const ang = Math.atan2(dy * 2, dx), ch = Math.abs(Math.sin(ang)) < .38 ? '─' : Math.abs(Math.cos(ang)) < .38 ? '│' : (Math.cos(ang) * Math.sin(ang) > 0 ? '╲' : '╱');
  let amp = h.st === 3 ? 1.1 * (1 - h.rt) : h.st === 1 ? .5 : clamp((h.len - Math.hypot(c.x - h.ax, (c.y - h.ay))) * .25, .08, 1.4);
  if (h.st === 2) amp = Math.max(.1, amp);
  const nx = -dy, ny = dx, nl = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < n; i++) {
    const u = i / n, w = Math.sin(u * PI) * amp * Math.sin(t * 22 - u * 14), x = lerp(c.x, ex, u) + nx / nl * w * .5, y = lerp(c.y, ey, u) + ny / nl * w * .5 + (h.st === 2 ? Math.sin(u * PI) * Math.max(0, amp - .1) * .6 : 0);
    const pulse = ((t * 30 - i) % 10) < 2; wgl(ch, x - .5, y - .5, pulse ? '#ffffff' : '#19f0ff', pulse ? 1 : .85);
  }
  wgl('◊', ex - .5, ey - .5, '#ffffff'); glow(ex, ey, 4, '#19f0ff', .45);
}

/* ---------- enemies ---------- */
const TXT_WARN = '!';
function drawEnemy(e, t) {
  if (!onScr(e.x, e.y - e.h / 2, 30)) return; const fl = e.flash > 0, pl = S.P, tele = e.tele > 0;
  if (e.k === 'drone') {
    const x = e.x - 1.5 + e.vx * .02, y = e.y - 2, rot = Math.floor(t * 28) % 2, col = e.elite ? SPC.p : SPC.g;
    wgl(rot ? '═' : '─', x - .5, y, fl ? '#fff' : col); wgl('╤', x + .5, y, fl ? '#fff' : '#6a78c0'); wgl(rot ? '═' : '─', x + 1.5, y, fl ? '#fff' : col);
    wgl('(', x - .5 + .5, y + 1, fl ? '#fff' : '#8a96c4'); wgl('◙', x + .5, y + 1, fl ? '#fff' : (tele && Math.floor(t * 20) % 2 ? '#ffffff' : e.elite ? '#ff2fb9' : '#ff3b4d')); wgl(')', x + 1.5 - .5, y + 1, fl ? '#fff' : '#8a96c4');
    glow(e.x, e.y - 1, 4, e.elite ? '#ff2fb9' : '#ff3b4d', tele ? .5 : .16);
    if (tele) wgl(TXT_WARN, e.x - .5, e.y - 3.2, '#ff3b4d');
  } else if (e.k === 'turret') {
    const down = e.dir === 'down', x = e.x - 1.5, y = e.y - 2;
    if (!down) { wgl('▟', x, y + .1, fl ? '#fff' : '#7a86c8'); wgl('█', x + 1, y + .1, fl ? '#fff' : '#5a66a8'); wgl('▙', x + 2, y + .1, fl ? '#fff' : '#7a86c8'); wgl('▀', x, y + 1, '#2a3470'); wgl('▀', x + 1, y + 1, '#2a3470'); wgl('▀', x + 2, y + 1, '#2a3470'); }
    else { wgl('▄', x, y, '#2a3470'); wgl('▄', x + 1, y, '#2a3470'); wgl('▄', x + 2, y, '#2a3470'); wgl('▜', x, y + 1, fl ? '#fff' : '#7a86c8'); wgl('█', x + 1, y + 1, fl ? '#fff' : '#5a66a8'); wgl('▛', x + 2, y + 1, fl ? '#fff' : '#7a86c8'); }
    const cx = e.x, cy = down ? e.y + .4 : e.y - 1.6, a = e.aimA === undefined ? -PI / 2 : e.aimA, gg = gunGlyph(a);
    wgl(gg, cx + Math.cos(a) * 1.1 - .5, cy + Math.sin(a) * .55 - .5, fl ? '#fff' : '#d0d8ff'); wgl(gg, cx + Math.cos(a) * 2.1 - .5, cy + Math.sin(a) * 1.05 - .5, fl ? '#fff' : '#ff3b4d');
    wgl('●', e.x - .5, cy - .5 + (down ? 0 : .1), tele || e.burst > 0 ? '#ffffff' : '#ff3b4d', .9); glow(e.x, cy, 4, '#ff3b4d', tele ? .5 : .12);
    if (tele) { const L = 18; for (let i = 3; i < L; i++) wgl('·', cx + Math.cos(a) * i - .5, cy + Math.sin(a) * i * .5 - .5, '#ff3b4d', (1 - i / L) * .7); }
  } else if (e.k === 'grunt') {
    const mov = Math.abs(e.vx) > 2, k = Math.floor(t * 7 + e.seed) % 4, f = mov ? [GF.r0, GF.r1, GF.r2, GF.r3][k] : GF.idle;
    const rows = f[0], cols = f[1].map(r => r.replace(/v/g, 'Q'));
    spr(rows, cols, e.x - 1.5, e.y - 3, e.face, e.stun > 0 ? .5 : 1, fl);
    const a = vang(pl.x - e.x, pl.y - 1.6 - (e.y - 2)), sx = e.x + e.face * .2, sy = e.y - 2.1, gg = gunGlyph(a);
    wgl(gg, sx + Math.cos(a) * 1.1 - .5, sy + Math.sin(a) * .55 - .5, fl ? '#fff' : '#d0d8ff'); wgl(gg, sx + Math.cos(a) * 2 - .5, sy + Math.sin(a) * 1 - .5, fl ? '#fff' : '#ff7a3a');
    if (tele) { wgl(TXT_WARN, e.x - .5, e.y - 4.4, '#ff3b4d'); glow(sx + Math.cos(a) * 2, sy + Math.sin(a), 4, '#ff3b4d', .5); }
    glow(e.x, e.y - 2, 4, '#ff3b4d', .07);
  } else if (e.k === 'warden') {
    const x = e.x - 2.5, y = e.y - 5, c = fl ? '#fff' : '#b42a40', c2 = fl ? '#fff' : '#6a1a2a', mov = Math.abs(e.vx) > 1.5 && Math.floor(t * 4) % 2;
    const R = [' ▄◙▄ ', '▟███▙', '█▓█▓█', '▜███▛', mov ? ' ╱ ╲ ' : ' ║ ║ '];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { let ch = R[j][i]; if (ch === ' ') continue; const ii = e.face > 0 ? i : 4 - i; ch = R[j][ii]; if (e.face < 0 && MIR[ch]) ch = MIR[ch]; wgl(ch, x + i, y + j, ch === '◙' ? (tele && Math.floor(t * 18) % 2 ? '#fff' : '#ff3b4d') : j === 2 && (i & 1) ? c2 : c, e.stun > 0 ? (Math.floor(t * 20) % 2 ? .4 : .8) : 1); }
    const sx = e.x + e.face * 2.6, sy = e.y - 3.6; wgl('▬', sx - .5, sy - .5, fl ? '#fff' : '#ff7a3a'); wgl('▬', sx + e.face - .5, sy - .5, fl ? '#fff' : '#ffb347');
    glow(e.x, e.y - 4.6, 5, '#ff3b4d', tele ? .6 : .14); if (tele) wgl(TXT_WARN, e.x - .5, e.y - 6.4, '#ff3b4d');
    const hp = e.hp / e.maxhp, bw = 12; txtPx('▐' + '█'.repeat(Math.round(bw * hp)) + '░'.repeat(bw - Math.round(bw * hp)) + '▌', Math.round((e.x - bw / 2 - 1) * CW - CXp), Math.round((e.y - 7.4) * CH - CYp), '#ff3b4d', .9);
  } else if (e.k === 'seeker') {
    const p = .6 + .4 * Math.sin(t * 14 + e.seed), c = fl ? '#fff' : '#ff3b4d'; wgl('▟', e.x - 1, e.y - 2, c, p); wgl('▙', e.x, e.y - 2, c, p); wgl('▜', e.x - 1, e.y - 1, c, p); wgl('▛', e.x, e.y - 1, c, p); glow(e.x, e.y - 1, 4, '#ff3b4d', .4 * p);
  } else if (e.k === 'boss') drawBoss(e, t);
}
function drawBoss(e, t) {
  const cx = e.x, cy = e.y - 5, fl = e.flash > 0, ph = e.ph, P = S.P;
  const rx = 12, ry = 6, ex = clamp((P.x - cx) / 40, -1, 1), ey = clamp((P.y - cy) / 24, -1, 1);
  const hot = ph === 1 ? ['#3a0a30', '#ff2fb9', '#ffd0f0'] : ph === 2 ? ['#3a0a1a', '#ff3b4d', '#ffe0c0'] : ['#400808', '#ff5a2d', '#fff4d0'];
  const alive = e.intro > 0 ? clamp(1 - e.intro / 2.6, 0, 1) : 1;
  glow(cx, cy, 34, hot[1], .18 * alive); glow(cx, cy, 16, hot[1], .2 * alive);
  // back half of rings
  const ringPts = (front) => { for (let k = 0; k < 3; k++) { const n = 26 + k * 6, rr_ = 15 + k * 3, tilt = .28 + k * .14, base = e.rot * (k % 2 ? -.7 : .9) + k; for (let i = 0; i < n; i++) { const a = base + i / n * TAU, z = Math.sin(a); if ((z > 0) !== front) continue; const x = cx + Math.cos(a) * rr_, y = cy + Math.sin(a) * rr_ * tilt * .5 + (k - 1) * 1.8 * Math.cos(e.rot * .5 + k); const ch = i % 5 === 0 ? '╬' : i % 2 ? '═' : '─'; wgl(ch, x - .5, y - .5, fl ? '#fff' : (k === 1 ? hot[1] : '#6a78c0'), (front ? .95 : .45) * alive); } } };
  ringPts(false);
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
    const u = i / rx, v = j / ry, r2 = u * u + v * v; if (r2 > 1) continue; const z = Math.sqrt(1 - r2);
    const n = -.45 * u - .5 * v + .75 * z, tex = vnoise(u * 7 + e.rot * .3, v * 7, 0) * .3; let lum = clamp(n * .85 + tex - .1, 0, 1);
    const iu = u - ex * .38, iv = (v - ey * .3) * 1.7, ir = iu * iu + iv * iv; let ch, col;
    if (ir < .02) { ch = '█'; col = '#0a0010'; } else if (ir < .055) { ch = '●'; col = tele_flash(e, t) ? '#ffffff' : hot[2]; } else if (ir < .22) { ch = '▓'; col = mixc(hot[1], hot[2], clamp((.22 - ir) * 5, 0, 1)); }
    else { const idx = Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length)); ch = RAMP[idx]; if (r2 > .8) ch = ((i + j) & 1) ? '▒' : '░'; if (ch === ' ') ch = '·'; col = lum < .5 ? mixc(hot[0], hot[1], lum * 2) : mixc(hot[1], hot[2], (lum - .5) * 2); }
    wgl(ch, cx + i - .5, cy + j * .9 - .5, fl ? '#fff' : col, alive * (r2 > .85 ? .8 : 1));
  }
  // crown spikes
  for (let k = -3; k <= 3; k++) { const h = 3 - Math.abs(k) * .5 + Math.sin(t * 3 + k) * .4; for (let j = 0; j < h; j++) wgl(Math.abs(k) < 1 ? '║' : k < 0 ? '╱' : '╲', cx + k * 2.2 - .5 + (k < 0 ? -j * .4 : k > 0 ? j * .4 : 0), cy - ry - 1 - j, fl ? '#fff' : hot[1], alive * .9); }
  ringPts(true);
  // laser
  if (e.laser) {
    const L = e.laser, fy = e.bounds.floor;
    if (L.t < L.tele) { const bl = Math.floor(L.t * 14) % 2; for (let y = cy + ry; y < fy; y += 1) wgl(bl ? '¦' : '·', L.x - .5, y, '#ff3b4d', .6); wgl('▼', L.x - .5, fy - 1, '#ff3b4d', bl ? 1 : .4); }
    else if (L.on) { for (let y = cy + ry - 1; y < fy; y++) { wgl('█', L.x - 1.5, y, '#ffe0e0'); wgl('█', L.x - .5, y, '#ffffff'); wgl('█', L.x + .5, y, '#ffe0e0'); wgl('▒', L.x - 2.5, y, '#ff3b4d', .8); wgl('▒', L.x + 1.5, y, '#ff3b4d', .8); } glow(L.x, (cy + fy) / 2, 14, '#ff3b4d', .5); glow(L.x, fy, 8, '#ffe0e0', .6); }
  }
  // HP shown in HUD
}
function tele_flash(e, t) { return e.laser && e.laser.t < e.laser.tele && Math.floor(t * 14) % 2; }

/* ---------- misc entities ---------- */
function drawPickups(t) {
  for (const k of S.pks) {
    if (!onScr(k.x, k.y)) continue; const bob = Math.sin(t * 3 + k.x) * .25;
    if (k.k === 'hp') { wgl('┌', k.x - 1.5, k.y - 1 + bob, '#5dffb0'); wgl('┐', k.x + .5, k.y - 1 + bob, '#5dffb0'); wgl('└', k.x - 1.5, k.y + bob, '#5dffb0'); wgl('┘', k.x + .5, k.y + bob, '#5dffb0'); wgl('+', k.x - .5, k.y - .5 + bob, '#ffffff'); glow(k.x, k.y, 5, '#5dffb0', .3); }
    else if (k.k === 'chip') { wgl(['◊', '♦', '◊', '▪'][Math.floor(t * 8 + k.x) & 3], k.x - .5, k.y - .5 + bob * .6, '#ffe45e'); glow(k.x, k.y, 3, '#ffe45e', .25); }
    else { const c = k.k === 'w_scatter' ? '#ffb347' : '#ff2fb9', l = k.k === 'w_scatter' ? 'S' : 'R'; txtPx('╔═╗', Math.round((k.x - 1.5) * CW - CXp), Math.round((k.y - 2 + bob) * CH - CYp), c); txtPx('║' + l + '║', Math.round((k.x - 1.5) * CW - CXp), Math.round((k.y - 1 + bob) * CH - CYp), c); txtPx('╚═╝', Math.round((k.x - 1.5) * CW - CXp), Math.round((k.y + bob) * CH - CYp), c); glow(k.x, k.y - 1, 9, c, .35 + .15 * Math.sin(t * 4)); if (Math.random() < .2) pt(k.x + rr(-1.5, 1.5), k.y, 0, -rr(4, 9), .8, ['·', '*'], c, {}); }
  }
}
function drawCheckpoints(t) {
  for (const c of S.L.cps) {
    if (!onScr(c.x, c.y, 10)) continue; const col = c.on ? '#5dffb0' : '#8fe3ff', dim = c.on ? '#228a5e' : '#3a6a8a';
    wgl('╔', c.x - 1.5, c.y - 4, dim); wgl('═', c.x - .5, c.y - 4, dim); wgl('╗', c.x + .5, c.y - 4, dim); wgl('║', c.x - 1.5, c.y - 3, dim); wgl('◙', c.x - .5, c.y - 3, col, c.on ? 1 : .7 + .3 * Math.sin(t * 2.4)); wgl('║', c.x + .5, c.y - 3, dim);
    wgl('╠', c.x - 1.5, c.y - 2, dim); wgl('═', c.x - .5, c.y - 2, dim); wgl('╣', c.x + .5, c.y - 2, dim); wgl('║', c.x - 1.5, c.y - 1, dim); wgl('▒', c.x - .5, c.y - 1, dim); wgl('║', c.x + .5, c.y - 1, dim);
    glow(c.x, c.y - 3, c.on ? 7 : 4, col, c.on ? .3 : .15);
    if (c.on) for (let i = 0; i < 4; i++) { const u = (t * .7 + i * .25) % 1; wgl(['0', '1', '+', '·'][i], c.x - .5 + Math.sin(i * 5 + t) * 1.5, c.y - 4 - u * 5, '#5dffb0', 1 - u); }
  }
}
function drawBullets(t) {
  for (const b of S.bul) { if (!onScr(b.x, b.y)) continue; const bgl = gunGlyph(b.a), gch = bgl === '▬' ? '═' : bgl; wgl(gch, b.x - .5, b.y - .5, '#ffffff'); wgl(gch, b.x - b.vx * .014 - .5, b.y - b.vy * .014 - .5, b.col, .8); glow(b.x, b.y, 3, b.col, .3); }
  for (const b of S.ebul) { if (!onScr(b.x, b.y)) continue; wgl(b.big ? '●' : '•', b.x - .5, b.y - .5, '#ff7a6a'); wgl(b.big ? 'o' : '·', b.x - .5, b.y - .5, '#ffffff', .0); glow(b.x, b.y, b.big ? 4 : 3, '#ff3b4d', .4); }
  for (const w of S.waves) { for (let k = 0; k < 3; k++) wgl(k === 0 ? '▌' : '▒', w.x - w.dir * k - .5, w.y - 1, '#ffb347', 1 - k * .3), wgl(k === 0 ? '▌' : '▒', w.x - w.dir * k - .5, w.y - 2, '#ffb347', .6 - k * .15); glow(w.x, w.y - 1, 5, '#ffb347', .3); }
  for (const b of S.bolts) {
    const k = b.t / b.dur, dx = b.x1 - b.x0, dy = b.y1 - b.y0, n = Math.ceil(Math.hypot(dx, dy * 2) * 1.0), ang = Math.atan2(dy * 2, dx), ch = Math.abs(Math.sin(ang)) < .38 ? '═' : Math.abs(Math.cos(ang)) < .38 ? '║' : (Math.cos(ang) * Math.sin(ang) > 0 ? '╲' : '╱');
    for (let i = 0; i < n; i++) { const u = i / n, x = b.x0 + dx * u, y = b.y0 + dy * u; if (!onScr(x, y, 2)) continue; const jit = k < .3 ? (Math.random() - .5) * .8 : 0; wgl(ch, x - .5, y - .5 + jit, k < .25 ? '#ffffff' : b.col, 1 - k); if (k < .5 && i % 3 === 0) glow(x, y, 3, b.col, (1 - k) * .3); }
  }
}
function drawFxParts(t) {
  for (const q of S.parts) {
    if (!onScr(q.x, q.y)) continue; const u = 1 - q.life / q.max, ch = q.chs[Math.min(q.chs.length - 1, Math.floor(u * q.chs.length))];
    gl(ch, Math.round(q.x * CW - CXp - CW / 2), Math.round(q.y * CH - CYp - CH / 2), q.col, Math.min(1, q.life / q.max * 1.8));
  }
  for (const r of S.rings) {
    const n = Math.max(10, Math.floor(r.r * 4.5)), a = 1 - r.t / r.dur, ch = r.chs[Math.min(r.chs.length - 1, Math.floor((r.t / r.dur) * r.chs.length))];
    for (let i = 0; i < n; i++) { const an = i / n * TAU; wgl(ch, r.x + Math.cos(an) * r.r - .5, r.y + Math.sin(an) * r.r * .5 - .5, r.col, a); }
  }
}
function drawLasers(t) {
  for (const l of S.L.lasers) {
    const st = l.st || 0, vert = !l.h; if (!onScr(l.x, vert ? (l.y0 + l.y1) / 2 : l.y0, 70)) continue;
    const n = vert ? l.y1 - l.y0 : l.y1 - l.x;
    if (vert) { wgl('▼', l.x - .5, l.y0 - 1, st === 2 ? '#ffffff' : '#ff3b4d'); wgl('▲', l.x - .5, l.y1, st === 2 ? '#ffffff' : '#ff3b4d'); }
    else { wgl('►', l.x - 1.5, l.y0 - .5, '#ff3b4d'); wgl('◄', l.y1 + .5, l.y0 - .5, '#ff3b4d'); }
    for (let i = 0; i < n; i++) {
      const x = vert ? l.x : l.x + i, y = vert ? l.y0 + i : l.y0;
      if (st === 0) { if (i % 4 === 0) wgl('·', x - .5, y - (vert ? 0 : .5), '#ff3b4d', .22); }
      else if (st === 1) { if (Math.floor(t * 16 + i * .3) % 2) wgl(vert ? '¦' : '┄', x - .5, y - (vert ? 0 : .5), '#ff3b4d', .75); }
      else { wgl(vert ? '║' : '═', x - .5, y - (vert ? 0 : .5), '#ffffff'); wgl(vert ? '▒' : '▒', x - 1 + (vert ? 0 : 0), y - (vert ? 0 : .5), '#ff3b4d', .0); if (i % 3 === 0) glow(x, y, 3, '#ff3b4d', .35); if (Math.random() < .03) sparks(x, y, 3, vert ? 1 : 0, vert ? 0 : 1, PAL[C.red], 18); }
    }
  }
}
function drawBlades(t) {
  for (const b of S.L.blades) {
    if (!onScr(b.x, b.y, 12)) continue; const n = 8, rot = t * 9;
    for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; wgl(i % 2 ? '*' : '╳', b.x + Math.cos(a) * b.r - .5, b.y + Math.sin(a) * b.r * .5 - .5, i % 2 ? '#ff7a6a' : '#ffffff'); }
    wgl('╬', b.x - .5, b.y - .5, '#ff3b4d'); wgl('○', b.x - 1.5, b.y - .5, '#ff3b4d', .4); wgl('○', b.x + .5, b.y - .5, '#ff3b4d', .4); glow(b.x, b.y, 6, '#ff3b4d', .4);
  }
}
function drawZap(t) {
  const z = S.zap, B = S.boss && S.boss.bounds; if (!z || !B || z.ph === 0) return; const sx0 = B.x0 + z.seg * (B.w / 4), w = B.w / 4;
  for (let i = 0; i < w; i++) { if (z.ph === 1) { if (Math.floor(t * 10) % 2) wgl('▔', sx0 + i, B.floor - 1, '#ff3b4d', .7); } else { wgl(['≈', '~', '='][((i + Math.floor(t * 20)) % 3)], sx0 + i, B.floor - 1, '#ffffff'); if (Math.random() < .5) wgl('║', sx0 + i, B.floor - 2 - Math.random() * 2, '#9d5cff', .7); } }
  if (z.ph === 2) glow(sx0 + w / 2, B.floor - 1, w * .6, '#9d5cff', .5);
}

/* ---------- foreground atmosphere ---------- */
function drawFog(t) {
  const th = S.L.th; if (!th.fogFront) return;
  g.globalAlpha = th.fogFront; g.drawImage(SKY.clouds[1].cv, ((-(S.cam.x * .5 + t * 4) * CW % SKY.clouds[1].cv.width) - SKY.clouds[1].cv.width) % SKY.clouds[1].cv.width, H - CH * 8); g.globalAlpha = 1;
}

/* =========================================================================
   frame
   ========================================================================= */
function drawWorld(t) {
  frameCam(); const L = S.L, th = L.th;
  drawSky(S.cam.x + S.cam.sx, S.cam.y + S.cam.sy, t);
  drawDecor(t, 0);
  drawTiles(t, 0);
  drawVeil(th);
  drawTiles(t, 1);
  drawMovers(t); drawDoors(t);
  drawDecor(t, 1);
  drawCheckpoints(t); drawPickups(t);
  for (const e of S.en) { if (e.k !== 'boss' && !e.dead && onScr(e.x, e.y - e.h / 2, 12)) halo(e.x, e.y - e.h / 2, e.k === 'warden' ? 8 : 5, .55); drawEnemy(e, t); }
  drawLasers(t); drawBlades(t); drawZap(t);
  if (!S.P.dead && S.mode !== 'title') halo(S.P.x, S.P.y - 1.5, 6, .6);
  drawHook(t); drawPlayer(t);
  drawBullets(t); drawFxParts(t);
  drawReflection(t);
  drawRain(t, S.cam.x, S.cam.y, th);
  drawLightning();
  if (S.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(.5, S.flash); g.fillStyle = S.flashCol; lastFill = ''; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
}

/* =========================================================================
   HUD
   ========================================================================= */
function panel(x, y, w, h, col, title, bgA) {
  const px = Math.round(x * CW), py = Math.round(y * CH);
  rectPx(px, py, w * CW, h * CH, '#05060f', bgA === undefined ? .72 : bgA);
  gl('╔', px, py, col); gl('╗', px + (w - 1) * CW, py, col); gl('╚', px, py + (h - 1) * CH, col); gl('╝', px + (w - 1) * CW, py + (h - 1) * CH, col);
  for (let i = 1; i < w - 1; i++) { gl('═', px + i * CW, py, col); gl('═', px + i * CW, py + (h - 1) * CH, col); }
  for (let j = 1; j < h - 1; j++) { gl('║', px, py + j * CH, col); gl('║', px + (w - 1) * CW, py + j * CH, col); }
  if (title) { txtPx(' ' + title + ' ', px + CW * 2, py, col); }
}
function wrapText(s, n) { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { if ((cur + ' ' + w).trim().length > n) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; } if (cur.trim()) lines.push(cur.trim()); return lines; }
function drawHud(t) {
  const p = S.P, L = S.L; if (!p) return;
  // vitals
  const hpf = clamp(p.hp / 100, 0, 1), hcol = hpf > .55 ? '#5dffb0' : hpf > .28 ? '#ffb347' : '#ff3b4d';
  panel(2, 1, 41, 6, '#19f0ff', 'SUPER SAM');
  { const bu = Math.max(2, Math.floor(CH * .25)); drawSamBadge(Math.round(3.4 * CW), Math.round(2 * CH + (4 * CH - 12 * bu) / 2), bu, S.t); }
  txtPx('LP', Math.round(11 * CW), Math.round(2 * CH), '#8a96c4'); const bw = 20, fill = Math.round(bw * hpf);
  for (let i = 0; i < bw; i++) gl(i < fill ? '█' : '░', Math.round((14 + i) * CW), Math.round(2 * CH), i < fill ? hcol : '#3d4676');
  txtPx(String(Math.max(0, Math.round(p.hp))).padStart(3, ' '), Math.round(35 * CW), Math.round(2 * CH), hcol);
  txtPx('DASH', Math.round(11 * CW), Math.round(3 * CH), '#8a96c4'); const dk = p.dashCd > 0 ? 1 - p.dashCd / EASY.dashCd : 1; for (let i = 0; i < 6; i++) gl('▰', Math.round((16 + i) * CW), Math.round(3 * CH), i < dk * 6 ? '#19f0ff' : '#2a3470');
  txtPx('◊ ' + String(S.chips).padStart(3, '0'), Math.round(24 * CW), Math.round(3 * CH), '#ffe45e'); txtPx('GEGNER ' + String(S.kills).padStart(2, '0'), Math.round(31 * CW), Math.round(3 * CH), '#8a96c4');
  let wx = 11; for (let i = 0; i < 3; i++) { if (!p.wpns[i]) continue; const on = p.wpn === i, c = on ? ['#19f0ff', '#ffb347', '#ff2fb9'][i] : '#3d4676', lab = (i + 1) + ':' + WEAPONS[i].name; txtPx((on ? '[' : ' ') + lab + (on ? ']' : ' '), Math.round(wx * CW), Math.round(4 * CH), c); wx += lab.length + 3; }
  { // flight fuel
    const low = p.fuel < .2, blink = low && Math.floor(S.t * 6) % 2, col = p.fly ? '#ffe45e' : low ? '#ff3b4d' : '#19f0ff', n = 14, on = Math.round(n * p.fuel);
    txtPx('FLUG', Math.round(11 * CW), Math.round(5 * CH), p.fly ? '#ffe45e' : '#8a96c4');
    for (let i = 0; i < n; i++) gl(i < on ? '▰' : '▱', Math.round((16 + i) * CW), Math.round(5 * CH), i < on ? (blink ? '#ffffff' : col) : '#2a3470');
    txtPx(p.fly ? '[F] LANDEN' : p.fuel > .06 ? '[F] FLIEGEN' : 'TANKEN', Math.round(31 * CW), Math.round(5 * CH), p.fly ? '#ffe45e' : p.fuel > .06 ? '#5dffb0' : '#ff3b4d');
    if (p.flyHint > 0) txtC('TANK LEER  -  ZUM AUFTANKEN LANDEN', COLS / 2, 9, '#ff3b4d', Math.min(1, p.flyHint));
  }
  // top right
  const sc = 'PUNKTE ' + String(S.score).padStart(6, '0'); panel(COLS - 26, 1, 24, 4, '#ff2fb9', L.intro.title);
  txtPx(sc, Math.round((COLS - 24) * CW), Math.round(2 * CH), '#eaf6ff'); const tm = S.stageT | 0; txtPx('ZEIT   ' + String(tm / 60 | 0).padStart(2, '0') + ':' + String(tm % 60).padStart(2, '0'), Math.round((COLS - 24) * CW), Math.round(3 * CH), '#8a96c4');
  // boss bar: top centre, between the two panels (drops under them on narrow screens)
  if (S.boss && S.boss.intro <= 0.5) {
    const b = S.boss, free = COLS - 90, wide = free >= 20, bw2 = wide ? Math.min(60, free) : Math.min(60, COLS - 8), by = wide ? 2.6 : 6.8, f = Math.round(bw2 * clamp(b.hp / b.maxhp, 0, 1)), x0 = Math.round((COLS - bw2) / 2);
    txtC(wide && bw2 < 54 ? 'A R C H O N' : 'A R C H O N   //   W Ä C H T E R   D E R   S P I T Z E', COLS / 2, by - 1.3, '#ff3b4d');
    for (let i = 0; i < bw2; i++) gl(i < f ? '█' : '░', Math.round((x0 + i) * CW), Math.round(by * CH), i < f ? (b.ph === 3 ? '#ff5a2d' : '#ff3b4d') : '#3a1a30');
    gl('▐', Math.round((x0 - 1) * CW), Math.round(by * CH), '#ff3b4d'); gl('▌', Math.round((x0 + bw2) * CW), Math.round(by * CH), '#ff3b4d');
  }
  // comms
  if (S.comms.length) {
    const c = S.comms[0], bwid = Math.min(78, COLS - 8), lines = wrapText(c.text, bwid - 10), shown = Math.floor(c.t * 62), x0 = Math.round((COLS - bwid) / 2), y0 = ROWS - 4 - lines.length - 1;
    const slide = Math.min(1, c.t * 5, (c.dur - c.t) * 5); g.globalAlpha = Math.max(0, slide);
    panel(x0, y0, bwid, lines.length + 3, '#5dffb0', c.who + ' // SICHERE LEITUNG', .82);
    // portrait
    const blink = Math.floor(c.t * 3) % 7 === 0; const face = [' ▄▄▄ ', '▐' + (blink ? '─ ─' : '◙ ◙') + '▌', ' ▀▀▀ ']; for (let j = 0; j < 3; j++) txtPx(face[j], Math.round((x0 + 2) * CW), Math.round((y0 + 1 + j) * CH), '#5dffb0');
    let rem = shown; for (let j = 0; j < lines.length; j++) { const ln = lines[j].slice(0, Math.max(0, rem)); rem -= lines[j].length + 1; txtPx(ln, Math.round((x0 + 9) * CW), Math.round((y0 + 1 + j) * CH), '#eaf6ff'); }
    g.globalAlpha = 1; if (shown < c.text.length && shown % 4 === 0) sfx('blip', .5);
  }
  // banner
  if (S.banner) {
    const b = S.banner, k = b.t, a = Math.min(1, k * 3, (3.4 - k) * 3), word = b.text.split('').join(' '), cx = COLS / 2, cy = ROWS * .26;
    g.globalAlpha = clamp(a, 0, 1); const scr = k < .4 ? Math.floor((1 - k / .4) * word.length * .5) : 0; let w2 = ''; for (let i = 0; i < word.length; i++) w2 += (scr && Math.random() < scr / word.length * 1.4 && word[i] !== ' ') ? '#%&$0123456789@'[(Math.random() * 15) | 0] : word[i];
    const wd = Math.max(w2.length, b.sub.length) + 8; const x0 = Math.round(cx - wd / 2);
    for (let i = 0; i < wd; i++) { gl('═', Math.round((x0 + i) * CW), Math.round((cy - 1) * CH), PAL[b.col], .8); gl('═', Math.round((x0 + i) * CW), Math.round((cy + 2) * CH), PAL[b.col], .8); }
    rectPx(Math.round(x0 * CW), Math.round(cy * CH), wd * CW, CH * 2, '#05060f', .55);
    txtC(w2, cx, cy, PAL[b.col]); txtC(b.sub, cx, cy + 1, '#eaf6ff', .8); g.globalAlpha = 1;
  }
  // crosshair
  if (!p.dead && S.mode === 'play') {
    const c = chest(p), a = p.aim; const hit = rayTile(c.x, c.y, a.x, a.y, PH.hook), ok = hit && hit.d < PH.hook && a.d > 3; let enemy = false; for (const e of S.en) if (!e.dead && Math.abs(MOUSE.x + S.cam.x - e.x) < e.w / 2 + .6 && Math.abs(MOUSE.y + S.cam.y - (e.y - e.h / 2)) < e.h / 2 + .6) enemy = true;
    const col = p.hook.st === 2 ? '#ffffff' : enemy ? '#ff3b4d' : ok ? '#5dffb0' : '#19f0ff', mx = MOUSE.x * CW, my = MOUSE.y * CH, o = Math.sin(t * 5) * .1 + (MOUSE.l ? -.3 : 0);
    gl('┌', mx - CW * (1.8 + o), my - CH * (1.1 + o), col); gl('┐', mx + CW * (.8 + o), my - CH * (1.1 + o), col); gl('└', mx - CW * (1.8 + o), my + CH * (.1 + o), col); gl('┘', mx + CW * (.8 + o), my + CH * (.1 + o), col); gl('+', mx - CW * .5, my - CH * .5, col);
    if (hasMouse()) for (let i = 4; i < 14; i += 2) { const px = c.x + a.cx * i, py = c.y + a.cy * i; if (solidAt(px, py)) break; if (i < a.d) wgl('·', px - .5, py - .5, '#19f0ff', .22 * (1 - i / 14)); }
  }
}
const hasMouse = () => MOUSE.moved > 0;

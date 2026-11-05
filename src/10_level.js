/* =========================================================================
   level data model, tile styling, themes
   ========================================================================= */
const T = { AIR: 0, SOL: 1, ONE: 2, HAZ: 3, GLASS: 4, VENT: 5 };
const AN = { NONE: 0, BLINK: 1, BLINKF: 2, FLICK: 3, PULSE: 4, DATA: 5, FLOW: 6, SPARK: 7, SCAN: 8 };
const ST = { ROOF: 1, GLASS: 2, BRICK: 3, METAL: 4, INT: 5, ASPH: 6, HULL: 7 };
const CUSTOM = 0x80;

class Level {
  constructor(id, W, H, th) {
    this.id = id; this.W = W; this.H = H; this.th = th;
    const n = W * H;
    this.t = new Uint8Array(n); this.ch = new Uint16Array(n); this.fg = new Uint8Array(n); this.bg = new Uint8Array(n); this.an = new Uint8Array(n);
    this.bch = new Uint16Array(n); this.bfg = new Uint8Array(n); this.bbg = new Uint8Array(n); this.ban = new Uint8Array(n);
    this.sty = new Uint8Array(n); this.bid = new Uint8Array(n);
    this.ents = []; this.pks = []; this.cps = []; this.zones = []; this.movers = []; this.doors = []; this.decor = []; this.arenas = [];
    this.start = { x: 8, y: 20 }; this.exit = null; this.deathY = H + 6; this.nb = 1;
    this.camBox = null; this.intro = { title: 'SEKTOR', sub: '', lines: [] };
    this.wet = null; this.wind = 0; this.lasers = []; this.blades = []; this.camRef = 50; this.vehs = []; this.gmul = 1; this.brk = null; this.race = null; this.inv = null;
  }
  idx(x, y) { return y * this.W + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  tt(x, y) { if (x < 0 || x >= this.W || y < 0) return T.SOL; if (y >= this.H) return T.AIR; return this.t[y * this.W + x]; }
  solid(x, y) { const t = this.tt(x, y); return t === T.SOL || t === T.GLASS; }
  set(x, y, t, ch, fg, bg, an, sty) {
    if (!this.inb(x, y)) return; const i = y * this.W + x;
    if (t !== undefined && t !== null) this.t[i] = t;
    if (ch !== undefined) this.ch[i] = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
    if (fg !== undefined) this.fg[i] = fg; if (bg !== undefined) this.bg[i] = bg; if (an !== undefined) this.an[i] = an; if (sty !== undefined) this.sty[i] = sty;
  }
  bset(x, y, ch, fg, bg, an) {
    if (!this.inb(x, y)) return; const i = y * this.W + x;
    this.bch[i] = typeof ch === 'string' ? (ch === ' ' ? 0 : ch.charCodeAt(0)) : ch; this.bfg[i] = fg || 0; this.bbg[i] = bg || 0; this.ban[i] = an || 0;
  }
  /* solid masses */
  mass(x, top, w, style, bot) {
    bot = bot === undefined ? this.H : bot; const id = (this.nb++) & 255;
    for (let yy = top; yy < bot; yy++) for (let xx = x; xx < x + w; xx++) { if (!this.inb(xx, yy)) continue; const i = yy * this.W + xx; this.t[i] = T.SOL; this.sty[i] = style || ST.ROOF; this.bid[i] = id; this.ch[i] = 0; this.bg[i] = 0; this.an[i] = 0; }
    return id;
  }
  rect(x, y, w, h, style) { return this.mass(x, y, w, style, y + h); }
  clear(x, y, w, h) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (this.inb(xx, yy)) { const i = yy * this.W + xx; this.t[i] = 0; this.ch[i] = 0; this.bg[i] = 0; this.an[i] = 0; this.sty[i] = 0; } }
  plat(x, y, w, ch, fg, an) { for (let i = 0; i < w; i++) this.set(x + i, y, T.ONE, ch || '▔', fg || C.cyan, 0, an || 0, CUSTOM); }
  haz(x, y, w, h) { for (let yy = 0; yy < (h || 1); yy++) for (let i = 0; i < w; i++) { const hs = hash2(x + i, y); this.set(x + i, y + yy, T.HAZ, pick2(hs, ['≈', '~', '≈', '=']), C.cyan, 0, AN.SPARK, CUSTOM); } }
  vent(x, y, w, h) { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const i = this.idx(x + xx, y + yy); if (this.inb(x + xx, y + yy) && this.t[i] === 0) this.t[i] = T.VENT; } this.decor.push({ k: 'vent', x, y, w, h }); }
  /* back layer */
  bfill(x, y, w, h, ch, fg, bg, an) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.bset(xx, yy, ch, fg, bg, an); }
  bfillFn(x, y, w, h, fn) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const r = fn(xx, yy, xx - x, yy - y); if (r) this.bset(xx, yy, r[0], r[1], r[2], r[3]); } }
  /* ASCII art stamps. spec: s=solid chars, o=oneway chars, c={char:colour}, d=default colour, a={char:anim}, bg={char:colour}, back:true -> back layer */
  stamp(x, y, rows, spec) {
    spec = spec || {}; const s = spec.s || '', o = spec.o || '', cm = spec.c || {}, d = spec.d === undefined ? C.grey : spec.d, am = spec.a || {}, bgm = spec.bg || {};
    for (let j = 0; j < rows.length; j++) { const r = rows[j]; for (let i = 0; i < r.length; i++) {
      const ch = r[i]; if (ch === ' ') continue; const xx = x + i, yy = y + j; if (!this.inb(xx, yy)) continue;
      const col = cm[ch] !== undefined ? cm[ch] : d, an = am[ch] || 0, bg = bgm[ch] || 0, cc = ch === '_' && spec.us ? ' ' : ch;
      if (spec.back) this.bset(xx, yy, cc, col, bg, an);
      else if (s.includes(ch)) this.set(xx, yy, T.SOL, cc, col, bg, an, CUSTOM | ST.METAL);
      else if (o.includes(ch)) this.set(xx, yy, T.ONE, cc, col, bg, an, CUSTOM);
      else this.set(xx, yy, undefined, cc, col, bg, an, undefined);
    } }
  }
  /* entities */
  en(k, x, y, o) { this.ents.push(Object.assign({ k, x, y }, o || {})); }
  pk(k, x, y) { this.pks.push({ k, x, y }); }
  veh(k, x, y, o) { const v = Object.assign({ k, x, y }, o || {}); this.vehs.push(v); return v; }
  cp(x, y, label) { this.cps.push({ x, y, label: label || 'KONTROLLPUNKT', on: false }); }
  zone(x, y, w, h, o) { this.zones.push(Object.assign({ x, y, w, h, done: false }, o)); }
  dec(k, x, y, o) { const d = Object.assign({ k, x, y }, o || {}); this.decor.push(d); return d; }
  door(x, y, h, o) { const d = Object.assign({ x, y, h, w: 2, open: 0, target: 0, id: this.doors.length }, o || {}); this.doors.push(d); doorTiles(this, d); return d; }
  laser(x, y0, y1, per, on, ph, o) { const l = Object.assign({ x, y0, y1, per, on, tele: .55, ph: ph || 0 }, o || {}); this.lasers.push(l); return l; }
  blade(cx, cy, ax, ay, sp, ph, r) { this.blades.push({ cx, cy, ax, ay, sp, ph: ph || 0, r: r || 2.4, x: cx, y: cy }); }
  mv(o) { this.movers.push(o); return o; }
  /* bunker: solid blocks that crumble under fire */
  brkRect(x, y, w, h, style) { this.rect(x, y, w, h, style); if (!this.brk) this.brk = new Uint8Array(this.W * this.H); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (this.inb(xx, yy)) this.brk[yy * this.W + xx] = 1; }
  hint(x, w, y, h, who, text) { this.zone(x, y, w, h, { once: true, say: [who, text] }); }
}
function doorTiles(L, d) { const rows = Math.ceil(d.h * (1 - d.open) - 1e-6); for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) { const i = L.idx(d.x + c, d.y + r); L.t[i] = r < rows ? T.SOL : T.AIR; L.ch[i] = 0; L.bg[i] = 0; L.an[i] = 0; L.sty[i] = CUSTOM; } }
function pick2(h, arr) { return arr[Math.floor(h * arr.length) % arr.length]; }

/* ---------------------------------------------------------------------
   tile visual styles — decided once per level at finalize()
   --------------------------------------------------------------------- */
function finalizeLevel(L) {
  const W = L.W, H = L.H, th = L.th, dcount = new Uint8Array(L.W * L.H);
  for (let x = 0; x < W; x++) { let d = 0; for (let y = 0; y < H; y++) { const i = y * W + x; if (L.t[i] === T.SOL || L.t[i] === T.GLASS) { d = Math.min(250, d + 1); dcount[i] = d; } else d = 0; } }
  L.dep = dcount;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, t = L.t[i];
    if (t !== T.SOL && t !== T.GLASS) continue;
    if (L.sty[i] & CUSTOM) continue;
    const up = !L.solid(x, y - 1), dn = !L.solid(x, y + 1), lf = !L.solid(x - 1, y), rt = !L.solid(x + 1, y), d = dcount[i], b = L.bid[i], h = hash2(x, y + b * 7), st = L.sty[i] & 15;
    let ch = 0, fg = 0, bg = 0, an = 0;
    const body = th.body;
    switch (st) {
      case ST.ROOF: default: {
        bg = body[(h * 3) | 0];
        const bx = (b * 3) % 6;
        if (up) { ch = '▀'; fg = (b % 6 === 0 ? th.accent[b % th.accent.length] : th.edge); an = (b % 6 === 0 ? AN.PULSE : 0); }
        else if (d === 2) { ch = '░'; fg = th.edgeD; }
        else if (lf && !up) { ch = '▌'; fg = th.edgeD; } else if (rt && !up) { ch = '▐'; fg = th.edgeD; }
        else if (d >= 4 && ((x + bx) % 6 === 2 || (x + bx) % 6 === 3) && d % 3 === 0 && !lf && !rt) {
          const lit = hash2(x >> 1, y + b * 13) < 0.42;
          if (lit) { ch = '▄'; fg = th.win[(hash2(x >> 1, b) * th.win.length) | 0]; if (hash2(x, y) < .05) an = AN.FLICK; }
          else { ch = '▄'; fg = C.greyDD; }
        } else if (h < .045) { ch = '·'; fg = C.greyD; }
        break;
      }
      case ST.GLASS: {
        bg = (h < .5) ? C.g0 : C.g1;
        if (up) { ch = '▀'; fg = C.cyan; an = AN.PULSE; }
        else if (lf) { ch = '▌'; fg = C.cyanD; } else if (rt) { ch = '▐'; fg = C.cyanD; }
        else if ((x + y) % 9 === 0) { ch = '╱'; fg = C.cyanDD; }
        else if (x % 5 === 0) { ch = '│'; fg = C.cyanDD; }
        else if (y % 4 === 0) { ch = '─'; fg = C.cyanDD; }
        else if (h < .06) { ch = '░'; fg = C.cyanD; an = AN.FLICK; }
        break;
      }
      case ST.BRICK: {
        bg = h < .5 ? C.i1 : C.i2;
        if (up) { ch = '▀'; fg = C.rust; }
        else if (lf) { ch = '▌'; fg = C.rustD; } else if (rt) { ch = '▐'; fg = C.rustD; }
        else if (d >= 3 && (x + b) % 6 === 2 && d % 4 === 1 && !lf && !rt) { const lit = hash2(x, y + b) < .5; ch = '▀'; fg = lit ? th.win[(hash2(b, y) * th.win.length) | 0] : C.greyDD; if (lit && hash2(x, y) < .08) an = AN.FLICK; }
        else { ch = (((x + (y & 1) * 2) & 3) < 2) ? '▚' : '▞'; fg = h < .12 ? C.rust : C.rustD; if (h > .88) ch = '▒'; }
        break;
      }
      case ST.METAL: {
        bg = C.navy;
        if (up) { ch = '▀'; fg = C.cyanD; } else if (dn) { ch = '▄'; fg = C.greyD; }
        else if (lf) { ch = '▌'; fg = C.greyD; } else if (rt) { ch = '▐'; fg = C.greyD; }
        else if (x % 6 === 0 && y % 3 === 1) { ch = '·'; fg = C.grey; } else { ch = '▒'; fg = C.greyDD; }
        break;
      }
      case ST.INT: {
        bg = (h < .5) ? C.i0 : C.i1;
        if (up) { ch = '▀'; fg = C.greyD; } else if (dn) { ch = '▄'; fg = C.greyD; }
        else if (lf) { ch = '▌'; fg = C.greyDD; } else if (rt) { ch = '▐'; fg = C.greyDD; }
        else if (x % 8 === 0) { ch = '│'; fg = C.greyDD; } else if (y % 6 === 3) { ch = '─'; fg = C.greyDD; }
        else if (h < .03) { ch = '·'; fg = C.greyD; } else if (h > .985) { ch = '■'; fg = th.accent[0]; an = AN.BLINK; }
        break;
      }
      case ST.ASPH: {
        bg = C.blk;
        if (up) { ch = '▀'; fg = C.greyD; } else if (d === 2) { ch = '░'; fg = C.greyDD; }
        else if (h < .1) { ch = '░'; fg = C.greyDD; } else if (h < .12) { ch = '·'; fg = C.greyD; }
        break;
      }
      case ST.HULL: {
        bg = (h < .5) ? C.hull0 : C.hull1;
        if (up) { ch = '▀'; fg = C.hullL; } else if (dn) { ch = '▄'; fg = C.greyD; }
        else if (lf) { ch = '▌'; fg = C.greyD; } else if (rt) { ch = '▐'; fg = C.greyD; }
        else if (y % 4 === 0) { ch = '─'; fg = C.greyD; } else if (x % 7 === 0) { ch = '│'; fg = C.greyDD; }
        else if (h < .035) { ch = '■'; fg = C.cyan; an = AN.PULSE; } else if (h < .06) { ch = '·'; fg = C.grey; }
        break;
      }
    }
    L.ch[i] = typeof ch === 'string' ? ch.charCodeAt(0) : ch; L.fg[i] = fg; L.bg[i] = bg; L.an[i] = an;
  }
}

/* ---------------------------------------------------------------------
   themes
   --------------------------------------------------------------------- */
const THEMES = {
  rain: {
    name: 'rain', sky: ['#04020c', '#0d0830', '#2a0d55', '#6a1670', '#c2307e', '#ff7a6a'], fog: '#8a2a8c', fogA: .55, stars: .9,
    moon: { x: .74, y: .27, r: 11, tint: ['#2a0a3a', '#ff9ad8', '#fff0ff'], glow: '#ff3fc0' },
    body: [C.b0, C.b1, C.b2], edge: C.cyanD, edgeD: C.steel, accent: [C.cyan, C.mag, C.vio], win: [C.amber, C.cyan, C.mag, C.yel, C.amber],
    rain: { col: '#7fe8ff', n: 1, wind: -.28 }, track: 'rain', amb: '#ff2fb9', lightning: false,
    layers: [
      { f: .06, fy: .06, base: .64, minH: 8, maxH: 18, minW: 10, maxW: 22, body: '#2a0f48', edge: '#4d1a78', win: '#a44ad0', winP: .18, detail: 0, period: 220, seed: 11, fogK: .55 },
      { f: .14, fy: .1, base: .78, minH: 10, maxH: 24, minW: 9, maxW: 20, body: '#1c0c3a', edge: '#6a2aa8', win: '#ff5fd0', winP: .25, detail: 1, period: 230, seed: 23, fogK: .38 },
      { f: .28, fy: .16, base: .94, minH: 12, maxH: 30, minW: 10, maxW: 24, body: '#10092b', edge: '#3a56b8', win: '#ffb347', winP: .28, detail: 2, period: 260, seed: 37, fogK: .2 },
    ],
    traffic: true, blimp: true, beams: true, holoMoon: true,
  },
  bazaar: {
    name: 'bazaar', sky: ['#02060c', '#07182a', '#0c3040', '#124a52', '#7a3a58', '#d0602e'], fog: '#2a6a7a', fogA: .5, stars: .3,
    moon: { x: .22, y: .22, r: 7, tint: ['#08222a', '#7ff0e0', '#eafffb'], glow: '#19f0ff' },
    body: [C.i0, C.i1, C.i2], edge: C.mag, edgeD: C.magD, accent: [C.mag, C.cyan, C.amber], win: [C.amber, C.yel, C.pink, C.cyan],
    rain: { col: '#8fe6ff', n: 1.1, wind: -.12 }, track: 'bazaar', amb: '#19f0ff', lightning: false,
    layers: [
      { f: .06, fy: .08, base: .62, minH: 14, maxH: 26, minW: 12, maxW: 24, body: '#0c3a46', edge: '#1a6a7a', win: '#3ae0e0', winP: .2, detail: 0, period: 220, seed: 5, fogK: .5 },
      { f: .16, fy: .12, base: .8, minH: 14, maxH: 34, minW: 10, maxW: 22, body: '#08262e', edge: '#2aa0b0', win: '#ffd05a', winP: .3, detail: 1, period: 240, seed: 8, fogK: .32 },
      { f: .3, fy: .2, base: .98, minH: 16, maxH: 40, minW: 10, maxW: 24, body: '#061219', edge: '#ff2fb9', win: '#ffb347', winP: .35, detail: 2, period: 280, seed: 12, fogK: .12 },
    ],
    traffic: true, blimp: false, beams: false,
  },
  tower: {
    name: 'tower', sky: ['#020409', '#06101e', '#0b1d38', '#12335a', '#1c5a82', '#3a8aa8'], fog: '#1a4a6a', fogA: .45, stars: .5,
    moon: { x: .8, y: .2, r: 6, tint: ['#05182a', '#9ae8ff', '#f0ffff'], glow: '#19f0ff' },
    body: [C.i0, C.i1, C.i2], edge: C.cyanD, edgeD: C.greyD, accent: [C.cyan, C.mag, C.amber], win: [C.cyan, C.ice, C.amber],
    rain: null, track: 'tower', amb: '#19f0ff', lightning: false,
    layers: [
      { f: .05, fy: .06, base: .6, minH: 18, maxH: 34, minW: 10, maxW: 20, body: '#0b2a44', edge: '#1a5a88', win: '#6ad8ff', winP: .22, detail: 0, period: 220, seed: 31, fogK: .5 },
      { f: .12, fy: .1, base: .8, minH: 18, maxH: 40, minW: 10, maxW: 20, body: '#071a2e', edge: '#2a8ac0', win: '#bff6ff', winP: .3, detail: 1, period: 240, seed: 41, fogK: .3 },
      { f: .22, fy: .18, base: 1.0, minH: 20, maxH: 46, minW: 10, maxW: 22, body: '#040e1b', edge: '#19f0ff', win: '#ffb347', winP: .3, detail: 2, period: 260, seed: 51, fogK: .1 },
    ],
    traffic: true, blimp: false, beams: true,
  },
  spire: {
    name: 'spire', sky: ['#020208', '#0a0420', '#1a0838', '#3a0c58', '#7a1468', '#c4286e'], fog: '#5a1a78', fogA: .6, stars: 1,
    moon: { x: .5, y: .3, r: 16, tint: ['#2a0610', '#ff3b4d', '#ffd0c8'], glow: '#ff3b4d' },
    body: [C.hull0, C.hull1, C.b2], edge: C.hullL, edgeD: C.greyD, accent: [C.vio, C.cyan, C.mag], win: [C.vio, C.violD || C.vio, C.greyD],
    rain: { col: '#c8a0ff', n: 1.5, wind: -.55 }, track: 'spire', amb: '#ff3b4d', lightning: true,
    layers: [
      { f: .05, fy: .05, base: .74, minH: 12, maxH: 28, minW: 10, maxW: 22, body: '#1e0a3a', edge: '#4a1a7a', win: '#8a4fc0', winP: .2, detail: 0, period: 220, seed: 61, fogK: .5 },
      { f: .1, fy: .1, base: .9, minH: 14, maxH: 34, minW: 10, maxW: 22, body: '#130828', edge: '#6a2a9a', win: '#a04ab8', winP: .25, detail: 1, period: 240, seed: 71, fogK: .35 },
    ],
    traffic: false, blimp: false, beams: false,
  },
  /* sector 5 :: the grand prix, a sunset highway */
  speed: {
    name: 'speed', sky: ['#07011a', '#1f0846', '#5a0f6e', '#b21e72', '#ff5a52', '#ffc060'], fog: '#c0306a', fogA: .5, stars: .45,
    moon: { x: .62, y: .5, r: 15, tint: ['#5a0a30', '#ff7a4a', '#fff0b0'], glow: '#ff7a4a' },
    body: [C.i0, C.i1, C.i2], edge: C.mag, edgeD: C.magD, accent: [C.mag, C.amber, C.cyan], win: [C.amber, C.mag, C.yel],
    rain: null, track: 'speed', amb: '#ff2fb9', lightning: false, veil: { desat: .3, dark: .38 },
    layers: [
      { f: .05, fy: .06, base: .66, minH: 10, maxH: 24, minW: 10, maxW: 22, body: '#3a0f52', edge: '#8a2a8a', win: '#ff9ad0', winP: .2, detail: 0, period: 220, seed: 81, fogK: .55 },
      { f: .13, fy: .1, base: .82, minH: 12, maxH: 30, minW: 9, maxW: 20, body: '#240a3c', edge: '#ff2fb9', win: '#ffd05a', winP: .28, detail: 1, period: 240, seed: 82, fogK: .35 },
      { f: .26, fy: .16, base: .98, minH: 14, maxH: 34, minW: 10, maxW: 22, body: '#12072a', edge: '#19f0ff', win: '#ffb347', winP: .3, detail: 2, period: 260, seed: 83, fogK: .12 },
    ],
    traffic: true, blimp: false, beams: true,
  },
  /* sector 6 :: a glass megatower above the clouds */
  glass: {
    name: 'glass', sky: ['#010308', '#05102a', '#0c2a5a', '#1c5a96', '#5aa8d0', '#d8f0ff'], fog: '#5a9ac0', fogA: .6, stars: .9,
    moon: { x: .78, y: .22, r: 9, tint: ['#06203a', '#a8e8ff', '#ffffff'], glow: '#7ad8ff' },
    body: [C.i0, C.i1, C.i2], edge: C.cyan, edgeD: C.cyanD, accent: [C.cyan, C.ice, C.amber], win: [C.cyan, C.ice, C.amber],
    rain: null, track: 'glass', amb: '#7ad8ff', lightning: false, veil: { desat: .35, dark: .4 },
    layers: [
      { f: .04, fy: .05, base: .8, minH: 24, maxH: 48, minW: 8, maxW: 14, body: '#0a2a4a', edge: '#2a6aa0', win: '#8ad8ff', winP: .22, detail: 0, period: 230, seed: 91, fogK: .6 },
      { f: .1, fy: .09, base: .96, minH: 26, maxH: 56, minW: 8, maxW: 16, body: '#061a30', edge: '#4ab0e0', win: '#c8f4ff', winP: .3, detail: 1, period: 250, seed: 92, fogK: .4 },
    ],
    traffic: true, blimp: false, beams: true,
  },
  /* sector 7 :: inside the arcade machine */
  arcade: {
    name: 'arcade', sky: ['#04010c', '#0c0522', '#1a0838', '#2c0a58', '#46086e', '#6a0a80'], fog: '#5a1a8a', fogA: .4, stars: .55,
    moon: { x: .5, y: .34, r: 12, tint: ['#30063a', '#ff2fb9', '#ffe45e'], glow: '#ff2fb9' },
    body: [C.i0, C.i1, C.i2], edge: C.mint, edgeD: C.mintD, accent: [C.mint, C.mag, C.yel], win: [C.mint, C.mag, C.yel],
    signs: ['1UP', 'HI-SCORE', 'COIN', 'READY', 'LEVEL 7', 'GAME', 'BONUS', 'PLAYER 1', 'PIXEL', 'x3000'],
    rain: null, track: 'arcade', amb: '#5dffb0', lightning: false, veil: { desat: .2, dark: .42, col: '#02040a' },
    layers: [
      { f: .06, fy: .06, base: .7, minH: 8, maxH: 18, minW: 8, maxW: 14, body: '#1a0a40', edge: '#5dffb0', win: '#ff2fb9', winP: .3, detail: 1, period: 200, seed: 101, fogK: .5 },
      { f: .16, fy: .12, base: .9, minH: 10, maxH: 24, minW: 8, maxW: 16, body: '#0e0628', edge: '#ff2fb9', win: '#ffe45e', winP: .35, detail: 2, period: 240, seed: 102, fogK: .25 },
    ],
    traffic: false, blimp: false, beams: false,
  },
  /* sector 8 :: the orbital station, Earth below */
  orbit: {
    name: 'orbit', sky: ['#000004', '#01010a', '#02031a', '#040628', '#060a3a', '#0a1252'], fog: '#102a6a', fogA: .25, stars: 1,
    moon: { x: .3, y: .78, r: 30, tint: ['#020a1e', '#2a78ff', '#eaf8ff'], glow: '#4a9aff' },
    body: [C.hull0, C.hull1, C.b2], edge: C.hullL, edgeD: C.greyD, accent: [C.cyan, C.mag, C.amber], win: [C.cyan, C.ice, C.amber],
    rain: null, track: 'orbit', amb: '#4a9aff', lightning: false, veil: { desat: .3, dark: .34, col: '#02030c' },
    layers: [
      { f: .03, fy: .04, base: .9, minH: 10, maxH: 28, minW: 3, maxW: 7, body: '#0a1030', edge: '#2a4a9a', win: '#8ad8ff', winP: .15, detail: 0, period: 240, seed: 111, fogK: .4 },
    ],
    traffic: false, blimp: false, beams: false,
  },
};

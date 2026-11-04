/* =========================================================================
   sky, parallax skylines, weather, big font
   ========================================================================= */
const SKY = { th: null, stars: [], moon: null, layers: [], clouds: [], grad: null, camRef: 50, kana: false, signs: [] };
const SIGNS_ASCII = ['NEON', 'BAR', '24H', 'RAMEN', 'CYBER', 'HOTEL', 'DATA', 'PHARMA', 'NOODLE', 'ARCADE', 'KAIJU', 'CHROME', 'SAKE', 'VOID'];
const SIGNS_KANA = ['ネオン', '電脳', '酒場', '夜市', '麺屋', '薬局', '危険', '未来', 'ラーメン', '龍', '刀', '夢'];
function isWide(c) { return c.charCodeAt(0) >= 0x2E80; }
/* draw mixed ascii / full-width text at device px; returns advance in cells */
function signPx(s, px, py, col, a, vertical) {
  let ox = 0, oy = 0;
  for (const ch of s) {
    const w = isWide(ch);
    if (a !== undefined && a !== 1) g.globalAlpha = a;
    fillS(col);
    if (vertical) { g.fillText(ch, px + CW * (w ? 1 : .5), py + oy * CH + BASE); oy++; }
    else { g.fillText(ch, px + (ox + (w ? 1 : .5)) * CW, py + BASE); ox += w ? 2 : 1; }
    if (a !== undefined && a !== 1) g.globalAlpha = 1;
  }
  return vertical ? oy : ox;
}
function vnoise(x, y, per) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = smooth(xf), v = smooth(yf);
  const h = (a, b) => hash2(per ? ((a % per) + per) % per : a, b);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
const RAMP = ' .·:;+=*#%@';

function buildSky(th, camRef) {
  SKY.th = th; SKY.camRef = camRef === undefined ? 50 : camRef;
  SKY.kana = hasGlyph('ネ') && hasGlyph('電');
  const R = RNG(1234);
  SKY.stars = []; for (let i = 0; i < 190; i++) SKY.stars.push({ x: R(), y: R() * .75, ph: R() * 6.28, ch: pick2(R(), ['.', '.', '·', '·', '*', '+']), z: .2 + R() * .8 });
  const gr = sctx.createLinearGradient(0, 0, 0, H); th.sky.forEach((c, i) => gr.addColorStop(i / (th.sky.length - 1), c)); SKY.grad = gr;
  SKY.moon = makeMoon(th);
  SKY.layers = th.layers.map(d => makeLayer(d, th));
  SKY.clouds = [makeClouds(th, 5, .22, 301), makeClouds(th, 7, .5, 302)];
  // traffic
  SKY.traffic = []; if (th.traffic) { const rt = RNG(77); for (let i = 0; i < 16; i++) { const dep = rt(); SKY.traffic.push({ y: .15 + rt() * .45, sp: (rt() < .5 ? -1 : 1) * (4 + rt() * 12) * (1.2 - dep * .6), ph: rt() * 400, dep, col: rt.pick(['#19f0ff', '#ff2fb9', '#ffb347', '#eaf6ff', '#9d5cff']), len: 2 + (rt() * 3 | 0), tail: 4 + rt() * 7 }); } }
}
function withCanvas(w, h, fn) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); const x = c.getContext('2d'); const prev = g; target(x); fn(x, c); target(prev); return c;
}
function makeMoon(th) {
  const m = th.moon, ry = Math.max(4, Math.round(m.r * .6)), rx = ry * 2, cw = rx * 2 + 4, chh = ry * 2 + 4;
  const t0 = m.tint[0], t1 = m.tint[1], t2 = m.tint[2];
  const cvm = withCanvas(cw * CW, chh * CH, () => {
    for (let j = 0; j < chh; j++) for (let i = 0; i < cw; i++) {
      const u = (i + .5 - cw / 2) / rx, v = (j + .5 - chh / 2) / ry, r2 = u * u + v * v; if (r2 > 1) continue;
      const z = Math.sqrt(1 - r2), n = -.5 * u - .55 * v + .72 * z;
      let lum = clamp(n, 0, 1);
      const tex = vnoise(u * 5 + 9, v * 5 + 3) * .5 + vnoise(u * 11 + 1, v * 11 + 7) * .3 + vnoise(u * 24, v * 24) * .2;
      lum = clamp(lum * (.55 + .8 * tex) + (r2 > .9 ? .05 : 0), 0, 1);
      const idx = Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length)), ch = RAMP[idx]; if (ch === ' ') continue;
      const col = lum < .5 ? mixh(t0, t1, lum * 2) : mixh(t1, t2, (lum - .5) * 2);
      gl(ch, i * CW, j * CH, col);
    }
  });
  return { cv: cvm, cw, ch: chh, rx, ry };
}
function makeClouds(th, rows, yf, seed) {
  const per = 260, cvc = withCanvas(per * CW, rows * CH, () => {
    for (let j = 0; j < rows; j++) for (let i = 0; i < per; i++) {
      const n = vnoise(i * .045, j * .55 + seed, per * .045) * .6 + vnoise(i * .12, j * 1.3 + seed, per * .12) * .4;
      const edge = Math.sin((j + .5) / rows * PI), d = (n - .42) * 2.6 * edge; if (d < .12) continue;
      const ch = d < .35 ? '░' : d < .7 ? '▒' : '▓', col = mixh(th.fog, '#ffffff', .05 + .1 * hash2(i, j));
      gl(ch, i * CW, j * CH, col, Math.min(.5, .12 + d * .3));
    }
  });
  return { cv: cvc, per, rows, yf, sp: seed % 2 ? 1.6 : 3.1 };
}
function makeLayer(d, th) {
  const per = d.period, rows = Math.ceil(ROWS * 1.7), baseRow = Math.round(d.base * ROWS + ROWS * .3), R = RNG(d.seed), beacons = [], signs = [];
  const cvl = withCanvas(per * CW, rows * CH, (x) => {
    let bx = 0, id = 0;
    while (bx < per) {
      let w = R.i(d.minW, d.maxW); if (bx + w > per) w = per - bx; if (w < 3) break;
      const hgt = R.i(d.minH, d.maxH), top = baseRow - hgt, kind = R.i(0, 5);
      const body = d.body, edge = d.edge;
      const block = (bxx, ww, tt) => { x.fillStyle = body; x.fillRect(bxx * CW, tt * CH, ww * CW + 1, (rows - tt) * CH); gl2(bxx, ww, tt); };
      const gl2 = (bxx, ww, tt) => {
        for (let i = 0; i < ww; i++) gl('▀', (bxx + i) * CW, tt * CH, edge, .95);
        gl('▌', bxx * CW, (tt + 1) * CH, edge, .6); gl('▐', (bxx + ww - 1) * CW, (tt + 1) * CH, edge, .6);
        for (let j = tt + 1; j < baseRow; j++) { gl('▌', bxx * CW, j * CH, edge, .35); gl('▐', (bxx + ww - 1) * CW, j * CH, edge, .35); }
        // windows
        const step = d.detail === 0 ? 3 : 2;
        for (let j = tt + 2; j < baseRow + 6; j += step) for (let i = 2; i < ww - 2; i += 3) {
          const hsh = hash2(bxx + i + d.seed, j);
          if (hsh < d.winP) { const wc = d.detail === 0 ? '·' : '▄'; gl(wc, (bxx + i) * CW, j * CH, d.win, .5 + hsh * 1.3); if (d.detail > 0 && ww > 6 && wc === '▄') gl('▄', (bxx + i + 1) * CW, j * CH, d.win, .5 + hsh * 1.3); }
        }
      };
      if (kind === 1 && w >= 12) { block(bx, w, top + 4); block(bx + 2, w - 4, top); block(bx + 4, w - 8, top - 4); }
      else if (kind === 2 && w >= 8) { block(bx, w, top); const sx = bx + (w >> 1), sh = R.i(5, 12); for (let j = 1; j <= sh; j++) gl('│', sx * CW, (top - j) * CH, edge, .9); beacons.push({ x: (sx + .5) * CW, y: (top - sh) * CH, col: d.detail > 0 ? '#ff3b4d' : edge }); }
      else if (kind === 3 && w >= 10) { block(bx, w, top + 2); block(bx + 1, w - 2, top); for (let i = 0; i < 3; i++) { const ax = bx + 2 + i * ((w - 5) >> 1); const ah = R.i(2, 6); for (let j = 1; j <= ah; j++) gl('│', ax * CW, (top - j) * CH, edge, .8); if (i === 1) beacons.push({ x: (ax + .5) * CW, y: (top - ah) * CH, col: '#ff3b4d' }); } }
      else block(bx, w, top);
      if (d.detail === 2 && w >= 9) {
        // neon vertical sign + accent strip
        const acc = th.accent[id % th.accent.length], accHex = PAL[acc];
        if (R() < .6) { const sx = bx + R.i(2, w - 3); for (let j = top + 3; j < top + 3 + R.i(5, 12) && j < baseRow; j++) gl('║', sx * CW, j * CH, accHex, .85); }
        if (R() < .65) { const pool = SKY.kana ? SIGNS_KANA.concat(SIGNS_ASCII.slice(0, 5)) : SIGNS_ASCII; const txt = R.pick(pool); const vert = R() < .5; signs.push({ x: (bx + R.i(1, Math.max(1, w - (vert ? 3 : txt.length + 1)))), y: top + R.i(3, 8), txt, col: accHex, vert, ph: R() * 9, flick: R() < .4 }); }
        // rooftop ac boxes
        for (let i = bx + 1; i < bx + w - 3; i += R.i(3, 6)) { if (R() < .5) { gl('▄', i * CW, (top - 1) * CH + CH / 2, edge, .6); gl('▄', (i + 1) * CW, (top - 1) * CH + CH / 2, edge, .6); } }
      }
      bx += w + R.i(0, 2); id++;
    }
    // fog gradient over the buildings (denser toward the bottom)
    x.globalCompositeOperation = 'source-atop';
    const fg = x.createLinearGradient(0, (baseRow - d.maxH - 10) * CH, 0, (baseRow + 4) * CH);
    fg.addColorStop(0, hexA(th.fog, 0)); fg.addColorStop(1, hexA(th.fog, d.fogK * th.fogA * 1.4));
    x.fillStyle = fg; x.fillRect(0, 0, per * CW, rows * CH); x.globalCompositeOperation = 'source-over';
  });
  return { cv: cvl, pw: per * CW, d, beacons, signs, rows };
}
function hexA(h, a) { const c = hex2rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

const BLIMP = ['        ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄        ', '    ▄▟██▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀██▙▄    ', '  ▟█▀                                  ▀█▙  ', ' ▐█▌                                    ▐█▌ ', '  ▜█▄                                  ▄█▛  ', '    ▀▜██▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄██▛▀    ', '        ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀        ', '              ▀▀▌▐▀▀▀▀▀▀▀▀▌▐▀▀              '];
const AD_TEXT = '   MERIDIAN :: TOMORROW, SECURED   ///   NEURAL LACE 40% OFF   ///   STAY IN YOUR LANE, CITIZEN   ///   ';
function drawBlimp(t, camX, camY) {
  const wI = BLIMP[0].length, x0 = (((t * 2.4 - camX * .09) % (COLS + wI + 40)) + (COLS + wI + 40)) % (COLS + wI + 40) - wI - 20, y0 = ROWS * .13 - (camY - SKY.camRef) * .05;
  const a = .85;
  for (let j = 0; j < BLIMP.length; j++) { const r = BLIMP[j]; for (let i = 0; i < r.length; i++) { const c = r[i]; if (c === ' ') continue; gl(c, Math.round((x0 + i) * CW), Math.round((y0 + j) * CH), j < 2 ? '#5a4a9a' : '#2a2260', a); } }
  const off = Math.floor(t * 9) % AD_TEXT.length, w = 36;
  for (let i = 0; i < w; i++) { const c = AD_TEXT[(off + i) % AD_TEXT.length]; if (c !== ' ') gl(c, Math.round((x0 + 4 + i) * CW), Math.round((y0 + 3) * CH), i < 3 || i > w - 4 ? '#7a5aa8' : '#ff9ad8', 1); }
  if (Math.floor(t * 1.4) % 2) { gl('●', Math.round((x0 + wI / 2) * CW), Math.round((y0 + 8) * CH), '#ff3b4d'); gl('●', Math.round((x0 + 2) * CW), Math.round((y0 + 3) * CH), '#ff3b4d', .6); }
}

function drawSky(camX, camY, t) {
  const th = SKY.th, ref = SKY.camRef;
  sctx.globalAlpha = 1; sctx.fillStyle = SKY.grad; sctx.fillRect(0, 0, W, H);
  // stars
  const sa = th.stars; if (sa > 0) for (const s of SKY.stars) {
    const x = (((s.x * COLS - camX * .01 * s.z) % COLS) + COLS) % COLS, y = s.y * ROWS - (camY - ref) * .01 * s.z;
    const tw = .45 + .55 * Math.sin(t * (1 + s.z * 2) + s.ph); gl(s.ch, Math.round(x * CW), Math.round(y * CH), '#cfe6ff', sa * tw * (1 - s.y * .7));
  }
  // moon + halo
  const m = SKY.moon, mc = th.moon, mxC = mc.x * COLS - camX * .012 - m.cw / 2, myC = mc.y * ROWS - (camY - ref) * .03 - m.ch / 2;
  const mcx = (mxC + m.cw / 2) * CW, mcy = (myC + m.ch / 2) * CH;
  g.globalCompositeOperation = 'lighter';
  const hr = m.rx * CW * 2.2, hg = g.createRadialGradient(mcx, mcy, m.ry * CH * .6, mcx, mcy, hr);
  hg.addColorStop(0, hexA(mc.glow, .28)); hg.addColorStop(.35, hexA(mc.glow, .1)); hg.addColorStop(1, hexA(mc.glow, 0)); g.fillStyle = hg; lastFill = ''; g.fillRect(mcx - hr, mcy - hr, hr * 2, hr * 2);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(m.cv, Math.round(mxC * CW), Math.round(myC * CH));
  // clouds
  for (const c of SKY.clouds) {
    const pw = c.per * CW, x0 = (((-(camX * .03 + t * c.sp) * CW) % pw) + pw) % pw, y = Math.round((ROWS * c.yf - (camY - ref) * .05) * CH);
    g.globalAlpha = .9; g.drawImage(c.cv, x0 - pw, y); g.drawImage(c.cv, x0, y); if (x0 + pw < W) g.drawImage(c.cv, x0 + pw, y); g.globalAlpha = 1;
  }
  if (th.beams) drawBeams(t, camX, camY);
  // layers w/ traffic between
  SKY.layers.forEach((L, li) => {
    const d = L.d, pw = L.pw, x0 = (((-camX * d.f * CW) % pw) + pw) % pw, y = Math.round((-ROWS * .3 - (camY - ref) * d.fy) * CH);
    g.drawImage(L.cv, x0 - pw, y); g.drawImage(L.cv, x0, y); if (x0 + pw < W) g.drawImage(L.cv, x0 + pw, y);
    for (const b of L.beacons) { for (let k = -1; k <= 1; k++) { const bx = x0 + k * pw + b.x; if (bx < -20 || bx > W + 20) continue; gl('·', Math.round(bx - CW / 2), Math.round(y + b.y - CH * .1), b.col, .35 + .2 * Math.sin(t * 1.1 + b.x)); } }
    for (const s of L.signs) {
      const fl = .8 + .1 * Math.sin(t * 1.2 + s.ph);
      for (let k = -1; k <= 1; k++) { const sx = x0 + k * pw + s.x * CW; if (sx < -CW * 8 || sx > W) continue; signPx(s.txt, Math.round(sx), Math.round(y + s.y * CH), s.col, fl, s.vert); }
    }
    if (li === 0 && th.blimp) drawBlimp(t, camX, camY);
    if (li === 1 || (SKY.layers.length === 2 && li === 0)) drawTraffic(t, camX, camY, li);
  });
}
function drawTraffic(t, camX, camY, li) {
  if (!SKY.traffic) return; const span = COLS + 70;
  for (const v of SKY.traffic) {
    if ((v.dep < .5) !== (li === 0)) continue;
    const f = .1 + v.dep * .22, x = ((((v.ph + t * v.sp - camX * f) % span) + span) % span) - 25, y = v.y * ROWS - (camY - SKY.camRef) * (.1 + v.dep * .16), dir = sign(v.sp), a = .55 + v.dep * .45;
    for (let i = 0; i < v.len; i++) gl(i === 0 ? (dir > 0 ? '►' : '◄') : '▬', Math.round((x - dir * i) * CW), Math.round(y * CH), v.col, a);
    for (let i = 0; i < v.tail; i++) gl(i % 2 ? '·' : '─', Math.round((x - dir * (v.len + i)) * CW), Math.round(y * CH), v.col, a * (1 - i / v.tail) * .6);
  }
}
function drawBeams(t, camX, camY) {
  const th = SKY.th; g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const ox = ((i * .37 + .15) * W - camX * .05 * CW + W * 4) % (W * 1.2) - W * .1, oy = H * (1.02 + .02 * i), ang = -PI / 2 + Math.sin(t * (.25 + i * .09) + i * 2) * .7, len = H * 1.3, wd = .045 + .01 * i;
    const gr = g.createLinearGradient(ox, oy, ox + Math.cos(ang) * len, oy + Math.sin(ang) * len); gr.addColorStop(0, hexA(th.amb, .16)); gr.addColorStop(1, hexA(th.amb, 0));
    g.fillStyle = gr; lastFill = ''; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(ang - wd) * len, oy + Math.sin(ang - wd) * len); g.lineTo(ox + Math.cos(ang + wd) * len, oy + Math.sin(ang + wd) * len); g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}
/* rain in screen space — two depths */
let RAIN = null;
function rainInit() { const R = RNG(9); RAIN = { n: [], f: [] }; for (let i = 0; i < 220; i++) RAIN.n.push({ x: R(), y: R(), v: 55 + R() * 40, l: R() }); for (let i = 0; i < 160; i++) RAIN.f.push({ x: R(), y: R(), v: 28 + R() * 22 }); }
function drawRain(t, camX, camY, th) {
  if (!th.rain) return; if (!RAIN) rainInit();
  const r = th.rain, wind = r.wind, cnt = Math.min(RAIN.n.length, Math.floor(RAIN.n.length * r.n * .7 * (COLS / 120))), cf = Math.min(RAIN.f.length, Math.floor(RAIN.f.length * r.n * .6 * (COLS / 120)));
  const ch = Math.abs(wind) > .38 ? '╱' : '│', col = r.col;
  for (let i = 0; i < cf; i++) { const d = RAIN.f[i]; const y = ((d.y * (ROWS + 4) + t * d.v) % (ROWS + 4)) - 2, x = (((d.x * COLS + (t * d.v * wind) - camX * .3) % COLS) + COLS) % COLS; gl(i % 3 ? '·' : '¦', Math.round(x * CW), Math.round(y * CH), col, .15); }
  for (let i = 0; i < cnt; i++) { const d = RAIN.n[i]; const y = ((d.y * (ROWS + 4) + t * d.v) % (ROWS + 4)) - 2, x = (((d.x * COLS + (t * d.v * wind) - camX * .9) % COLS) + COLS) % COLS; gl(ch, Math.round(x * CW), Math.round(y * CH), col, .3 + .2 * d.l); }
}
function drawLightning() {
  const lb = S.lbolt; if (!lb || S.lightning <= 0) return; const a = S.lightning;
  g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(190,170,255,${a * .22})`; lastFill = ''; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  const seg = (p0, p1, al) => { const x0 = p0[0] * COLS, y0 = p0[1] * ROWS * 2, x1 = p1[0] * COLS, y1 = p1[1] * ROWS * 2, n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, (y1 - y0)) )); for (let i = 0; i <= n; i++) { const tt = i / n, x = lerp(x0, x1, tt), y = lerp(y0, y1, tt), dx = x1 - x0, ch = Math.abs(dx) < .4 ? '║' : dx > 0 ? '╲' : '╱'; gl(ch, Math.round(x * CW), Math.round(y * CH), '#f4eaff', al); } };
  for (let i = 1; i < lb.pts.length; i++) seg(lb.pts[i - 1], lb.pts[i], Math.min(1, a * 1.6));
  for (const b of lb.branches) for (let i = 1; i < b.length; i++) seg(b[i - 1], b[i], a * .8);
}

/* =========================================================================
   big block font (5x5)
   ========================================================================= */
const BF = {};
(function () {
  const d = 'A: ### |#   #|#####|#   #|#   #;B:#### |#   #|#### |#   #|#### ;C: ####|#    |#    |#    | ####;D:#### |#   #|#   #|#   #|#### ;E:#####|#    |#### |#    |#####;F:#####|#    |#### |#    |#    ;G: ####|#    |# ###|#   #| ####;H:#   #|#   #|#####|#   #|#   #;I:#####|  #  |  #  |  #  |#####;J:  ###|    #|    #|#   #| ### ;K:#   #|#  # |###  |#  # |#   #;L:#    |#    |#    |#    |#####;M:#   #|## ##|# # #|#   #|#   #;N:#   #|##  #|# # #|#  ##|#   #;O: ### |#   #|#   #|#   #| ### ;P:#### |#   #|#### |#    |#    ;Q: ### |#   #|# # #|#  # | ## #;R:#### |#   #|#### |#  # |#   #;S: ####|#    | ### |    #|#### ;T:#####|  #  |  #  |  #  |  #  ;U:#   #|#   #|#   #|#   #| ### ;V:#   #|#   #|#   #| # # |  #  ;W:#   #|#   #|# # #|## ##|#   #;X:#   #| # # |  #  | # # |#   #;Y:#   #| # # |  #  |  #  |  #  ;Z:#####|   # |  #  | #   |#####;0: ### |#  ##|# # #|##  #| ### ;1:  #  | ##  |  #  |  #  | ### ;2: ### |#   #|  ## | #   |#####;3:#### |    #| ### |    #|#### ;4:#  # |#  # |#####|   # |   # ;5:#####|#    |#### |    #|#### ;6: ### |#    |#### |#   #| ### ;7:#####|   # |  #  | #   | #   ;8: ### |#   #| ### |#   #| ### ;9: ### |#   #| ####|    #| ### ;/:    #|   # |  #  | #   |#    ;-:     |     |#####|     |     ;::     |  #  |     |  #  |     ;.:     |     |     |     |  #  ;!:  #  |  #  |  #  |     |  #  ; :     |     |     |     |     ';
  d.split(';').forEach(e => { const k = e[0]; BF[k] = e.slice(2).split('|'); });
  BF[' '] = ['     ', '     ', '     ', '     ', '     '];
})();
function bigWidth(s, sx) { return s.length * (5 * sx + 1) - 1; }
/* grad: array of colours per row; shadow colour optional; (cx,cy) = top-left in cells; a = alpha, rev = reveal amount 0..1 (random cells) */
function bigText(s, cx, cy, sx, grad, shadow, a, glitch) {
  for (let k = 0; k < s.length; k++) {
    const gph = BF[s[k]] || BF[' '];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (gph[j][i] === '#') for (let q = 0; q < sx; q++) {
      const x = cx + k * (5 * sx + 1) + i * sx + q; let xo = 0;
      if (glitch && Math.random() < glitch * .08) xo = (Math.random() - .5) * 6;
      if (shadow) gl('▒', Math.round((x + 1) * CW), Math.round((cy + j + 1) * CH), shadow, (a === undefined ? 1 : a) * .8);
      gl('█', Math.round((x + xo) * CW), Math.round((cy + j) * CH), grad[j], a);
    }
  }
}

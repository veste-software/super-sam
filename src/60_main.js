/* =========================================================================
   MAIN :: scenes, stage loading, loop
   scenes: boot -> title -> intro -> play <-> pause -> clearing -> clear -> intro...
                                      play -> (boss dies) -> ending -> title
   ========================================================================= */
const STAGES = [
  { build: buildStage1, name: 'RAINLINE', sub: 'DACHLAUF // SPRAWL-BEZIRK 7', par: 230 },
  { build: buildStage2, name: 'NEON BASAR', sub: 'STRASSENEBENE // KOWLOON-TÜRME', par: 230 },
  { build: buildStage3, name: 'MERIDIAN TURM', sub: 'KONZERNINNERES // EBENEN 01-88', par: 300 },
  { build: buildStage4, name: 'DIE SPITZE', sub: 'GIPFELAUFSTIEG // ARCHON', par: 240 },
  { build: buildStage5, name: 'NEON GRAND PRIX', sub: 'DAS RENNEN // ORBITAL-RING', par: 200 },
  { build: buildStage6, name: 'KRONOS-TURM', sub: 'FASSADENAUFSTIEG // EBENE 0-300', par: 330 },
  { build: buildStage7, name: 'ARCADE ORBIT', sub: 'LIFTSTATION // SPIEL ODER STIRB', par: 300 },
  { build: buildStage8, name: 'ZENITH', sub: 'ORBITALSTATION // SCHWERELOS', par: 330 },
];
const G = { scene: 'boot', t: 0, sel: 0, stage: 0, introT: 0, clearT: 0, endT: 0, pauseSel: 0, base: null, stats: null, fade: 1, started: false, titleL: null, camGY: 40 };
const STEP = 1 / 60;

function resetRun() { S.score = 0; S.chips = 0; S.kills = 0; S.deaths = 0; }
function clearTransient() {
  S.parts.length = 0; S.rings.length = 0; S.bul.length = 0; S.ebul.length = 0; S.en.length = 0; S.pks.length = 0; S.bolts.length = 0; S.waves.length = 0; S.comms.length = 0;
  S.banner = null; S.boss = null; S.zap = null; S.phase3 = false; S.bossBody = null; S.lightning = 0; S.lbolt = null; S.lightningT = undefined; S.flash = 0; S.freeze = 0; S.slow = 1;
  S.bossFinal = false; S.endTimer = 0; S.bossFx = 0; S.bossDeadT = 0;
  S.cam.lock = null; S.cam.shake = 0; S.respawn = null; MUS.inten = 0; MUS.inten_t = 0; glitchAmt = 0;
  S.veh = []; S.rkt = []; S.near = null; S.vseen = {}; S.race = null; S.inv = null;
}
function loadStage(i, wpns) {
  const L = STAGES[i].build();
  clearTransient();
  S.L = L; S.mode = 'play'; S.t = 0; S.stageT = 0; G.stage = i;
  S.P = newPlayer(L.start.x, L.start.y); S.P.wpns = wpns || [true, i >= 2, i >= 3]; S.P.wpn = 0;
  buildSky(L.th, L.camRef);
  for (const e of L.ents) spawnEnemy(Object.assign({}, e));
  for (const k of L.pks) S.pks.push({ k: k.k, x: k.x, y: k.y, t: 0 });
  resetVehicles(); initRace(); initInvaders();
  S.cam.x = 0; S.cam.y = 0; updCam(.016, true);
  G.base = { score: S.score, kills: S.kills, chips: S.chips, deaths: S.deaths };
  glitchAmt = 0;
}
function stageClear() {
  if (G.scene !== 'play') return;
  G.scene = 'clearing'; G.clearT = 0;
  banner('SEKTOR GESCHAFFT', STAGES[G.stage].name + ' // SIGNAL GESICHERT', C.mint); sfx('cp'); sfx('pick'); ring(S.P.x, S.P.y - 1.5, 20, 1, PAL[C.mint]); MUS.inten_t = 0;
}
function rankFor(t, d, par) { return d === 0 && t < par ? 'S' : d <= 1 && t < par * 1.5 ? 'A' : d <= 4 ? 'B' : 'C'; }
function computeStats() {
  const st = STAGES[G.stage], t = S.stageT, d = S.deaths - G.base.deaths, rank = rankFor(t, d, st.par);
  const bonus = Math.max(0, Math.round((st.par - t) * 10)) + (d === 0 ? 500 : 0) + (S.chips - G.base.chips) * 10;
  S.score += bonus;
  G.stats = { t, d, k: S.kills - G.base.kills, c: S.chips - G.base.chips, bonus, rank, score: S.score };
}

/* ---------------- boss death cascade ---------------- */
function bossDieStep(dt) {
  const b = S.bossBody; if (!b) return; S.bossDeadT += dt;
  const bd = S.bossDeadT;
  if (bd < 3.2) {
    S.slow = bd < 1.6 ? .3 : lerp(.3, 1, (bd - 1.6) / 1.6);
    S.bossFx = (S.bossFx || 0) - dt;
    if (S.bossFx <= 0) {
      S.bossFx = Math.max(.05, .2 - bd * .05);
      const x = b.x + rr(-9, 9), y = b.y - 5 + rr(-8, 6);
      boom(x, y, rr(.8, 1.8)); sfx(Math.random() < .3 ? 'bigboom' : 'boom', .6); shake(.5 + bd * .15);
      for (let i = 0; i < 4; i++) pt(x, y, rr(-30, 30), rr(-40, -6), rr(.8, 1.8), ['█', '▓', '▒', '#', '◙', '●'], PAL[pick([C.red, C.mag, C.amber, C.white])], { g: 60, drag: .5, glow: 1 });
    }
    glitchAmt = Math.max(glitchAmt, .3 + bd * .15);
  } else if (!S.bossFinal) {
    S.bossFinal = true; S.slow = 1; S.flash = 1.2; S.flashCol = '#ffffff'; glitchAmt = 1.6; shake(1.6);
    for (let k = 0; k < 4; k++) ring(b.x, b.y - 5, 18 + k * 14, .8 + k * .25, PAL[pick([C.white, C.red, C.cyan, C.mag])], ['.', '·', 'o', '○']);
    for (let i = 0; i < 160; i++) { const a = rr(0, TAU), s = rr(10, 70); pt(b.x, b.y - 5, Math.cos(a) * s, Math.sin(a) * s * .6, rr(.8, 2.4), ['0', '1', '#', '$', '@', '▒', '░'], PAL[pick([C.cyan, C.mag, C.white, C.red, C.amber])], { g: 6, drag: 1.2, glow: 1 }); }
    sfx('bigboom'); sfx('bigboom', .6); musStop();
  } else if (bd > 3.4 && S.mode === 'bossdie') {
    S.mode = 'play'; S.cam.lock = null; S.L.doors.forEach(d => { if (d.mode === 'arena') d.target = 1; }); MUS.inten_t = 0;
    { const bo = S.L.bossOff || ['ARCHON OFFLINE', 'DIE SPITZE IST DUNKEL']; banner(bo[0], bo[1], C.mint); } S.pks.push({ k: 'hp', x: b.x, y: S.L.bossArena.floor - 2, t: 0 }); sfx('cp');
    S.endTimer = 0;
  }
}

/* ---------------- sim step ---------------- */
function stepPlay(dt) {
  if (S.freeze > 0) { S.freeze -= dt; return; }
  if (S.mode === 'bossdie') bossDieStep(dt);
  const sdt = dt * (S.slow || 1);
  updWorld(sdt); updCam(sdt);
  if (S.mode === 'play' && S.bossFinal) { S.endTimer = (S.endTimer || 0) + dt; if (S.endTimer > 3.2) { S.bossFinal = false; if (G.stage < STAGES.length - 1) stageClear(); else { G.scene = 'ending'; G.endT = 0; computeStats(); musPlay('title'); } } }
}

/* ---------------- title ---------------- */
const TITLE_GRADS = [
  ['#f4ffff', '#a6f8ff', '#19f0ff', '#2a8cff', '#5a3bff'],
  ['#fff0fa', '#ff9bd8', '#ff2fb9', '#c21cff', '#7a1cff'],
];
function setupTitle() {
  const L = STAGES[0].build(); clearTransient(); S.L = L; S.mode = 'title'; S.P = newPlayer(-400, -400); S.t = 0; S.stageT = 0; G.titleL = L;
  buildSky(L.th, L.camRef); S.cam.x = 30; S.cam.y = 30; G.camGY = 40;
}
function groundBelow(L, x, y0) { x = clamp(Math.floor(x), 0, L.W - 1); for (let y = Math.max(0, Math.floor(y0)); y < L.H; y++) if (L.solid(x, y)) return y; return L.H - 10; }
function updTitle(dt) {
  const L = S.L, t = G.t, span = 400, ph = (t * 5.5) % (span * 2), cx = ph < span ? ph : span * 2 - ph;
  S.cam.x += ((20 + cx) - S.cam.x) * Math.min(1, dt * 2);
  const gy = groundBelow(L, S.cam.x + COLS * .55, 20); G.camGY += (gy - G.camGY) * Math.min(1, dt * 1.2);
  S.cam.y = clamp(G.camGY - ROWS * .66 + Math.sin(t * .4) * 1.2, 0, L.H - ROWS); S.cam.sx = S.cam.sy = 0;
  updWorld(dt);
  if (Math.random() < dt * .6) glitchAmt = Math.max(glitchAmt, .25);
}
function bigFit(s, maxsx, maxw) { let sx = maxsx; while (sx > 1 && bigWidth(s, sx) > maxw) sx--; return sx; }
/* logo block (SUPER / SAM) with Sam's portrait to its right; the portrait is dropped on very narrow windows */
function logoLayout() {
  const bu = Math.floor(CH * .41), bcells = Math.ceil(30 * bu / CW), gap = 6;
  const withBust = bu >= 3 && bigWidth('SUPER', 1) + gap + bcells <= COLS - 6;
  const sx = bigFit('SUPER', 3, withBust ? COLS - 8 - gap - bcells : COLS - 8), lw0 = bigWidth('SUPER', sx);
  const block = withBust ? lw0 + gap + bcells : lw0, lx0 = Math.round((COLS - block) / 2);
  return { bu, withBust, sx, lw0, lx0, tcx: lx0 + lw0 / 2, bx: lx0 + lw0 + gap, samX: lx0 + Math.round((lw0 - bigWidth('SAM', sx)) / 2) };
}
function drawTitle(t) {
  drawWorld(t);
  // darken top and bottom for legibility
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(2,3,10,.9)'); grd.addColorStop(.3, 'rgba(2,3,10,.72)'); grd.addColorStop(.46, 'rgba(2,3,10,.3)'); grd.addColorStop(.72, 'rgba(2,3,10,.2)'); grd.addColorStop(1, 'rgba(2,3,10,.88)'); g.fillStyle = grd; lastFill = ''; g.fillRect(0, 0, W, H);
  const LO = logoLayout(), { bu, withBust, sx: sx1, lw0, lx0, tcx } = LO, sx2 = sx1;
  const top = 1, a = Math.min(1, G.t * .8);
  bigText('SUPER', lx0, top, sx1, TITLE_GRADS[0], '#1a0838', a, Math.max(0, glitchAmt));
  bigText('SAM', LO.samX, top + 6, sx2, TITLE_GRADS[1], '#1a0838', Math.min(1, Math.max(0, (G.t - .25) * .8)), Math.max(0, glitchAmt));
  if (withBust) drawSamBust(LO.bx * CW, 1.1 * CH, bu, t, Math.min(1, Math.max(0, (G.t - .4) * 1.1)));
  // underline scan
  const ly = top + 12, lw = Math.max(lw0, 40);
  for (let i = 0; i < lw; i++) { const k = (i / lw), on = Math.sin(t * 3 - i * .2) * .5 + .5; gl(i % 4 === 0 ? '◆' : '═', Math.round((tcx - lw / 2 + i) * CW), Math.round(ly * CH), k < .5 ? '#19f0ff' : '#ff2fb9', .35 + on * .5); }
  txtC('M I T   S A M U E L   A U M A N N', tcx, ly + 1.5, '#ffe45e', Math.min(1, G.t * .6));
  txtC('N E O N   ·   R E G E N   ·   S T A H L', tcx, ly + 2.9, '#8a96c4', Math.min(1, G.t * .6));
  // stage select
  const sy = Math.max(top + 17, ROWS - 12), st = STAGES[G.sel], bw = 54;
  panel(Math.round((COLS - bw) / 2), sy - 1, bw, 6, '#19f0ff', 'SEKTOR WÄHLEN', .66);
  G.titleHit = { x: Math.round((COLS - bw) / 2) * CW, y: (sy - 1) * CH, w: bw * CW, h: 6 * CH };
  const wob = Math.floor(t * 2.5) % 2;
  txtC('◄', COLS / 2 - bw / 2 + 4 - wob * .4, sy + 1.3, '#19f0ff'); txtC('►', COLS / 2 + bw / 2 - 4 + wob * .4, sy + 1.3, '#19f0ff');
  txtC('S E K T O R   0' + (G.sel + 1), COLS / 2, sy + .2, '#8a96c4');
  txtC(st.name.split('').join(' '), COLS / 2, sy + 1.3, '#eaf6ff'); txtC(st.sub, COLS / 2, sy + 2.4, '#ff2fb9');
  for (let i = 0; i < STAGES.length; i++) gl(i === G.sel ? '◆' : '◇', Math.round((COLS / 2 - STAGES.length * 1.5 + i * 3 + .5) * CW), Math.round((sy + 3.6) * CH), i === G.sel ? '#ffe45e' : '#3d4676');
  const bl = Math.floor(t * 1.8) % 2 === 0;
  if (bl) txtC(TC.on ? '[ TIPPEN ZUM EINSTEIGEN ]' : '[ ENTER DRÜCKEN ODER KLICKEN ZUM EINSTEIGEN ]', COLS / 2, sy + 6.2, '#5dffb0');
  // controls
  const cy = Math.min(ROWS, Math.floor(H / CH)) - 4.4;
  if (TC.on) {
    txtC('LINKER STICK  LAUFEN, HOCH = SPRINGEN        RECHTER STICK  ZIELEN + FEUER', COLS / 2, cy, '#7384c8');
    txtC('HAKEN  SEILSCHWUNG     FLUG  FLIEGEN     DASH  SPRINT     SPRUNG  SPRINGEN', COLS / 2, cy + 1.3, '#7384c8');
    txtC('häng dich an alles. schwing. lass los. flieg.', COLS / 2, cy + 2.6, '#4d5a96');
    if (IS_IOS && !isStandalone()) txtC('TIPP: TEILEN > ZUM HOME-BILDSCHIRM = VOLLBILD', COLS / 2, 1.6, '#ffb347');
    else if (!fsEl() && fsCan() && TC.fsDone) txtC('TIPP: AUF <> TIPPEN FÜR VOLLBILD', COLS / 2, 1.6, '#ffb347');
  } else {
    txtC('A D  LAUFEN     LEERTASTE  SPRINGEN     F  FLIEGEN     SHIFT  DASH', COLS / 2, cy, '#7384c8');
    txtC('MAUS  ZIELEN     LINKSKLICK  SCHIESSEN     RECHTSKLICK  ENTERHAKEN     1 2 3  WAFFE', COLS / 2, cy + 1.3, '#7384c8');
    txtC('M  TON     P  PAUSE     R  NEUSTART          häng dich an alles. schwing. lass los. flieg.', COLS / 2, cy + 2.6, '#4d5a96');
  }
}

/* ---------------- intro / clear / ending / pause ---------------- */
function drawBand(y, h, a) { const py = Math.round(y * CH); rectPx(0, py, W, Math.round(h * CH), '#02030a', a); }
function drawIntro(t) {
  drawWorld(t); drawHud(t);
  const k = G.introT, a = clamp(Math.min(k * 3, (3.6 - k) * 3), 0, 1), L = S.L, st = STAGES[G.stage], cy = Math.round(ROWS * .3);
  g.globalAlpha = a; drawBand(cy - 2, 12, .78);
  txtC('S E K T O R   0' + (G.stage + 1), COLS / 2, cy - .5, '#ff2fb9');
  const sx = bigFit(L.intro.title, 3, COLS - 10), x = Math.round((COLS - bigWidth(L.intro.title, sx)) / 2);
  bigText(L.intro.title, x, cy + 1, sx, TITLE_GRADS[G.stage % 2 ? 1 : 0], '#1a0838', a, k < .5 ? 1 - k * 2 : 0);
  txtC(L.intro.sub, COLS / 2, cy + 7.2, '#8a96c4');
  const w = Math.round(Math.min(COLS - 20, 80) * Math.min(1, k * 1.4)); for (let i = 0; i < w; i++) gl('─', Math.round((COLS / 2 - w / 2 + i) * CW), Math.round((cy + 8.4) * CH), '#19f0ff', .7);
  g.globalAlpha = 1;
}
function drawClear(t) {
  drawWorld(t); drawBand(0, ROWS, .62);
  const s = G.stats, k = G.clearT, x = Math.round((COLS - 56) / 2), y = Math.max(1, Math.round(ROWS * .1));
  panel(x, y, 56, 23, '#5dffb0', 'SEKTOR GESCHAFFT', .85);
  txtC((STAGES[G.stage].name).split('').join(' '), COLS / 2, y + 2, '#eaf6ff'); txtC(STAGES[G.stage].sub, COLS / 2, y + 3, '#8a96c4');
  const rows = [['ZEIT', String(s.t / 60 | 0).padStart(2, '0') + ':' + String(Math.floor(s.t % 60)).padStart(2, '0') + '   (SOLL ' + String(STAGES[G.stage].par / 60 | 0) + ':' + String(STAGES[G.stage].par % 60).padStart(2, '0') + ')'], ['GEGNER', String(s.k)], ['DATENCHIPS', '◊ ' + String(s.c)], ['TODE', String(s.d)], ['BONUS', '+' + s.bonus], ['GESAMTPUNKTE', String(s.score).padStart(6, '0')]];
  rows.forEach((r, i) => { const on = clamp((k - .3 - i * .28) * 4, 0, 1); if (on <= 0) return; g.globalAlpha = on; txtPx(r[0], Math.round((x + 8) * CW), Math.round((y + 5 + i * 1.5) * CH), '#8a96c4'); txtPx(r[1], Math.round((x + 30) * CW), Math.round((y + 5 + i * 1.5) * CH), i === 5 ? '#ffe45e' : '#eaf6ff'); g.globalAlpha = 1; });
  const rk = clamp((k - 2.2) * 3, 0, 1); if (rk > 0) { g.globalAlpha = rk; const col = { S: '#ffe45e', A: '#5dffb0', B: '#19f0ff', C: '#8a96c4' }[s.rank]; txtC('R A N G', COLS / 2, y + 15.2, '#8a96c4'); const gx = Math.round(COLS / 2 - 3); bigText(s.rank, gx, y + 16.4, 1, [col, col, col, col, col], '#0a0a20', rk, 0); g.globalAlpha = 1; }
  if (k > 3 && Math.floor(k * 1.8) % 2 === 0) txtC(G.stage < STAGES.length - 1 ? (TC.on ? '[ TIPPEN :: NÄCHSTER SEKTOR ]' : '[ ENTER :: NÄCHSTER SEKTOR ]') : (TC.on ? '[ TIPPEN ]' : '[ ENTER ]'), COLS / 2, y + 24.2, '#5dffb0');
}
const END_LINES = [
  ['ECHO', 'ZENITH ist offline. Das Signal, dem wir gefolgt sind, ist verstummt.'],
  ['ECHO', 'Zum ersten Mal sind Sprawl, Turm und Station getrennt. Niemand gibt mehr Befehle.'],
  ['ECHO', 'Sieh nach unten, Sam. Das ist die Erde, und sie gehört denen, die darauf leben.'],
  ['ECHO', 'Gut gemacht, Samuel Aumann. Die Stadt hat einen Helden, und der Himmel auch.'],
];
function drawEnding(t) {
  drawWorld(t); const k = G.endT; drawBand(0, ROWS, clamp(k * .3, 0, .78));
  const a = clamp((k - .6) * 1.2, 0, 1), top = Math.round(ROWS * .12), LO = logoLayout(), sx = LO.sx;
  g.globalAlpha = a; bigText('SUPER', LO.lx0, top, sx, TITLE_GRADS[0], '#1a0838', a, 0); bigText('SAM', LO.samX, top + 6, sx, TITLE_GRADS[1], '#1a0838', a, 0);
  if (LO.withBust) drawSamBust(LO.bx * CW, (top - .9) * CH, LO.bu, t, a);
  txtC('S A M U E L   A U M A N N   ::   S I G N A L   F R E I', COLS / 2, top + 12.5, '#5dffb0', a); g.globalAlpha = 1;
  const ly = top + 15;
  END_LINES.forEach((l, i) => {
    const st = 2 + i * 3.4, sh = Math.floor((k - st) * 42); if (sh <= 0) return;
    const full = l[0] + ': ' + l[1], x0 = Math.round((COLS - full.length) / 2) * CW;
    txtPx(full.slice(0, sh + l[0].length + 2), x0, Math.round((ly + i * 1.8) * CH), '#c8d4ff', clamp((k - st) * 3, 0, 1));
    if (sh < l[1].length && sh % 4 === 0) sfx('blip', .4);
  });
  const st = G.stats, sy = ly + 7.6; if (k > 11) {
    const aa = clamp((k - 11) * 2, 0, 1); g.globalAlpha = aa;
    const t0 = S.stageT | 0; txtC('PUNKTE ' + String(st.score).padStart(6, '0') + '     TODE ' + S.deaths + '     CHIPS ◊ ' + S.chips + '     GEGNER ' + S.kills, COLS / 2, sy, '#ffe45e');
    if (Math.floor(k * 1.8) % 2 === 0) txtC(TC.on ? '[ TIPPEN :: ZUM TITEL ]' : '[ ENTER :: ZUM TITEL ]', COLS / 2, sy + 2.4, '#5dffb0'); g.globalAlpha = 1;
  }
}
function drawPause(t) {
  drawWorld(t); drawBand(0, ROWS, .82);
  if (TC.on) {   // touch: big tap rows instead of the key list
    const pw = 50, x = Math.round((COLS - pw) / 2), y = Math.max(1, Math.round(ROWS * .1)), ph = 20, sp = 2.9;
    panel(x, y, pw, ph, '#19f0ff', 'PAUSE', .92);
    const items = ['WEITER', 'SEKTOR NEU STARTEN', 'ZUM TITEL', AU.muted ? 'TON: AUS' : 'TON: AN'];
    G.pauseRows = []; G.pauseRect = { x: x * CW, y: y * CH, w: pw * CW, h: ph * CH };
    items.forEach((s, i) => { const on = i === G.pauseSel, ry = y + 2.6 + i * sp; if (on) rectPx((x + 3) * CW, Math.round((ry - .75) * CH), (pw - 6) * CW, Math.round(2.4 * CH), '#19f0ff', .12); txtC((on ? '► ' : '  ') + s + (on ? ' ◄' : '  '), COLS / 2, ry, on ? '#5dffb0' : '#c8d4ff'); G.pauseRows.push([Math.round((ry - .8) * CH), Math.round((ry + 1.6) * CH)]); });
    txtC('LINKS: LAUFEN, HOCH = SPRINGEN', COLS / 2, y + 15.4, '#5a6aa8'); txtC('RECHTS: ZIELEN + FEUER', COLS / 2, y + 16.6, '#5a6aa8');
    return;
  }
  const pw = 66, x = Math.round((COLS - pw) / 2), y = Math.max(1, Math.round(ROWS * .12));
  panel(x, y, pw, 24, '#19f0ff', 'PAUSE', .92);
  const items = ['WEITER', 'SEKTOR NEU STARTEN', 'ZUM TITEL', AU.muted ? 'TON: AUS' : 'TON: AN'];
  items.forEach((s, i) => { const on = i === G.pauseSel; txtC((on ? '► ' : '  ') + s + (on ? ' ◄' : '  '), COLS / 2, y + 2.5 + i * 1.5, on ? '#5dffb0' : '#8a96c4'); });
  const cs = [['A D  /  ← →', 'LAUFEN'], ['LEERTASTE  /  W', 'SPRINGEN  (an Wänden abspringen)'], ['NOCHMAL IN DER LUFT', 'DOPPELSPRUNG MIT SALTO'], ['SHIFT', 'DASH  (dabei unverwundbar)'], ['F', 'FLIEGEN  (WASD lenkt, Boden tankt)'], ['V', 'FAHRZEUG EIN / AUS  (SHIFT TURBO)'], ['MAUS', 'ZIELEN'], ['LINKSKLICK', 'SCHIESSEN'], ['RECHTSKLICK / E / K', 'HAKEN: halten = schwingen'], ['LEERTASTE (am Haken)', 'MIT SCHWUNG LOSLASSEN'], ['1 2 3  /  Q  /  RAD', 'WAFFE WECHSELN'], ['S  /  ↓', 'DURCH DÜNNE PLATTFORMEN'], ['R', 'NEUSTART AM KONTROLLPUNKT'], ['M  /  P  oder  ESC', 'TON  /  PAUSE']];
  cs.forEach((r, i) => { txtPx(r[0], Math.round((x + 4) * CW), Math.round((y + 9.2 + i) * CH), '#7f8fd8'); txtPx(r[1], Math.round((x + 28) * CW), Math.round((y + 9.2 + i) * CH), '#5a6aa8'); });
}

/* ---------------- frame ---------------- */
let last = 0, acc = 0;
function goTitle() { resetRun(); setupTitle(); G.scene = 'title'; G.t = 0; musPlay('title'); }
function beginStage(i) { loadStage(i, G.carry); G.carry = null; G.scene = 'intro'; G.introT = 0; musStop(); }
function startPlaying() { G.scene = 'play'; S.P.spawnT = 1.1; S.P.inv = 1.2; sfx('boot', .7); glitchAmt = .7; const L = S.L; musPlay(L.th.track); L.intro.lines.forEach(s => { const m = /^([A-Z]+):\s*(.*)$/.exec(s); if (m) say(m[1], m[2]); }); }
function confirmKey() { return pressed('Enter') || pressed('Space') || pressed('NumpadEnter') || MOUSE.lp; }
function activateAudio() { if (!G.started) { G.started = true; } auInit(); }
function doPauseItem(i) {
  if (i === 0) G.scene = 'play';
  else if (i === 1) { resetStageStats(); G.carry = null; beginStage(G.stage); }
  else if (i === 2) { goTitle(); }
  else if (i === 3) { auMute(!AU.muted); }
}
function resetStageStats() { if (G.base) { S.score = G.base.score; S.kills = G.base.kills; S.chips = G.base.chips; S.deaths = G.base.deaths; } }
window.onGameBlur = () => { if (G.scene === 'play') { G.scene = 'pause'; G.pauseSel = 0; } };

function update(dt) {
  G.t += dt;
  // global keys
  if (pressed('KeyM')) { auMute(!AU.muted); KP.KeyM = false; }
  if (KP.Enter || KP.Space || MOUSE.lp || KP.KeyW || KP.KeyD) activateAudio();
  if (G.scene === 'title') {
    if (pressed('ArrowRight') || pressed('KeyD')) { G.sel = (G.sel + 1) % STAGES.length; sfx('select'); }
    if (pressed('ArrowLeft') || pressed('KeyA')) { G.sel = (G.sel + STAGES.length - 1) % STAGES.length; sfx('select'); }
    if ([1, 2, 3, 4, 5, 6, 7, 8].some(i => pressed('Digit' + i))) { for (let i = 1; i <= 8; i++) if (pressed('Digit' + i)) G.sel = i - 1; sfx('select'); }
    if (pressed('Enter') || pressed('Space') || pressed('NumpadEnter') || MOUSE.lp) { activateAudio(); resetRun(); G.carry = null; sfx('pick'); beginStage(G.sel); endFrameInput(); return; }
    updTitle(dt); musPlay('title'); endFrameInput(); return;
  }
  if (G.scene === 'intro') {
    G.introT += dt; if (G.introT > .9 && confirmKey() || G.introT > 3.6) startPlaying();
    S.t += dt; updDecorFx(dt); updMovers(dt); S.cam.sx = S.cam.sy = 0; endFrameInput(); return;
  }
  if (G.scene === 'pause') {
    if (pressed('KeyP') || pressed('Escape')) { G.scene = 'play'; KP.KeyP = KP.Escape = false; }
    if (pressed('ArrowDown') || pressed('KeyS')) { G.pauseSel = (G.pauseSel + 1) % 4; sfx('select'); }
    if (pressed('ArrowUp') || pressed('KeyW')) { G.pauseSel = (G.pauseSel + 3) % 4; sfx('select'); }
    if (pressed('Enter') || pressed('Space')) { sfx('pick'); doPauseItem(G.pauseSel); }
    endFrameInput(); return;
  }
  if (G.scene === 'clear') {
    G.clearT += dt; if (G.clearT > 3 && confirmKey()) { G.carry = S.P.wpns.slice(); if (G.stage < STAGES.length - 1) beginStage(G.stage + 1); else goTitle(); }
    S.t += dt; updDecorFx(dt); endFrameInput(); return;
  }
  if (G.scene === 'ending') {
    G.endT += dt; S.t += dt; updDecorFx(dt); updParts(dt);
    if (G.endT > 11.5 && (pressed('Enter') || pressed('Space') || MOUSE.lp)) goTitle();
    endFrameInput(); return;
  }
}
function render(t) {
  target(sctx); lastFill = '';
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#02030a'; g.fillRect(0, 0, W, H);
  switch (G.scene) {
    case 'title': drawTitle(t); break;
    case 'intro': drawIntro(t); break;
    case 'pause': drawPause(t); break;
    case 'clear': drawClear(t); break;
    case 'ending': drawEnding(t); break;
    case 'boot': break;
    default: drawWorld(t); drawHud(t);
  }
  if (TC.on) drawTouch(t);
  if (G.fade > 0) { rectPx(0, 0, W, H, '#02030a', G.fade); }
  if (portraitNow()) drawRotate(t);
  present(G.scene === 'title' ? 1.05 : 1);
}
function tick(dt) {
  if (G.scene === 'boot') return;
  if (portraitNow()) { acc = 0; return; }   // phone held upright: wait for landscape
  touchApply(dt);
  if (G.scene === 'play' || G.scene === 'clearing') {
    acc += dt; let n = 0;
    if (pressed('KeyM')) { auMute(!AU.muted); KP.KeyM = false; }
    if (pressed('KeyP') || pressed('Escape')) { G.scene = 'pause'; G.pauseSel = 0; KP.KeyP = KP.Escape = false; acc = 0; return; }
    if (pressed('KeyR') && S.mode === 'play' && G.scene === 'play') { KP.KeyR = false; if (S.P.dead) respawnPlayer(); else { S.P.hp = 0; killPlayer(); } }
    while (acc >= STEP && n < 4) {
      G.t += STEP; stepPlay(STEP);
      if (G.scene === 'clearing') { G.clearT += STEP; if (G.clearT > 2.0) { computeStats(); G.scene = 'clear'; G.clearT = 0; } }
      acc -= STEP; n++; endFrameInput();   // presses are consumed by the first step that sees them
    }
    if (n === 4) acc = 0;
  } else { acc = 0; update(dt); endFrameInput(); }
}
function frame(ts) {
  requestAnimationFrame(frame); if (window.__manual) return;
  const now = ts / 1000, dt = Math.min(.1, now - (last || now)); last = now;
  G.fade = Math.max(0, G.fade - dt * 1.4);
  tick(dt); render(now);
}

/* ---------------- boot ---------------- */
resizeHooks.push(() => { if (S.L) buildSky(S.L.th, S.L.camRef); });
addEventListener('resize', resize);
addEventListener('visibilitychange', () => { if (document.hidden) window.onGameBlur(); });
addEventListener('mousedown', () => { activateAudio(); try { cv.focus(); } catch (e) { } });
addEventListener('keydown', () => { if (!AU.ctx && (KEY.Enter || KEY.Space)) auInit(); });
function boot() {
  try { window.focus(); cv.focus(); } catch (e) { }
  resize(); goTitle(); G.scene = 'title'; G.fade = 1; requestAnimationFrame(frame);
  window.__G = G; window.__S = S;
  window.__warp = (i, x, y) => { resetRun(); loadStage(i, [true, true, true]); G.scene = 'play'; S.P.spawnT = 0; if (x !== undefined) { S.P.x = x; S.P.y = y; S.respawn = { x, y }; updCam(.016, true); } };
}
(function () {
  let done = false; const go = () => { if (done) return; done = true; boot(); };
  try { Promise.race([document.fonts.load('700 16px "JetBrains Mono"'), new Promise(r => setTimeout(r, 1800))]).then(go, go); } catch (e) { go(); }
  setTimeout(go, 2200);
})();

/* =========================================================================
   SEKTOR 7 :: ARCADE ORBIT
   Pixelhüpfer und Geister für die Spielhalle, dazu das Space-Invaders-Minispiel:
   Sam steigt automatisch in eine Laserkanone, schießt nur nach oben und wehrt drei Wellen ab,
   die letzte ist das MUTTERSCHIFF. Level-Daten: L.inv = { x0, x1, fy, cx, trig, doors, bunkers }.
   ========================================================================= */
ENEMY.pixel = { w: 2.6, h: 2.2, hp: 2, hook: true, score: 120, tdmg: 10, hpc: .18, chips: 2 };
ENEMY.ghost = { w: 4, h: 3, hp: 2, hook: true, score: 200, tdmg: 12, hpc: .2, chips: 3, halo: 4 };
ENEMY.invader = { w: 4, h: 2, hp: 1, hook: false, score: 60, tdmg: 0, heavy: true, noRam: true, hpc: 0, chips: 0, die(e) { invBoom(e); } };
ENEMY.ufo = { w: 7, h: 2, hp: 3, hook: false, score: 1000, tdmg: 0, heavy: true, noRam: true, halo: 6, die(e) { ufoDie(e); } };
ENEMY.mother = { w: 26, h: 5, hp: 46, hook: false, score: 8000, tdmg: 0, heavy: true, noRam: true, big: true, halo: 16, chips: 30, hpc: 1, die(e) { motherDie(e); } };

/* ---------- pixel hopper ---------- */
AIK.pixel = function (e, dt, dxp, dyp, dist) {
  e.vy = Math.min(PH.maxFall, e.vy + PH.grav * dt); if (e.ground) e.vx *= Math.exp(-12 * dt);
  e.hop = (e.hop === undefined ? .3 + e.seed % 1 : e.hop) - dt; e.face = sign(dxp) || e.face;
  if (e.ground && e.hop <= 0) { if (e.see) { e.vy = -(24 + (e.seed * 7) % 7); e.vx = sign(dxp) * (11 + (e.seed * 3) % 6); } else { e.vy = -15; e.vx = Math.sin(e.seed * 9 + e.t) * 6; } e.hop = .75 + (e.seed * 11) % .6; e.ground = false; }
  moveEnt(e, dt); if (e.y > S.L.deathY) { e.hp = 0; killEnemy(e); }
};
/* ---------- ghost: drifts straight through walls ---------- */
AIK.ghost = function (e, dt, dxp, dyp, dist) {
  const sp = e.see || dist < 40 ? 10 : 3.5, d = Math.hypot(dxp, dyp * 2) || 1, k = Math.min(1, 2.2 * dt);
  e.vx += (dxp / d * sp + Math.sin(e.t * 1.7 + e.seed) * 2 - e.vx) * k; e.vy += (dyp / d * sp * .5 + Math.cos(e.t * 1.3 + e.seed) * .8 - e.vy) * k;
  e.x += e.vx * dt; e.y += e.vy * dt; e.face = sign(e.vx) || e.face;
};
const GHOST_C = ['r', 'p', 'c', 'a'], PIX_C = ['n', 'c', 'y', 'm'];
FOE_DRAW.ghost = function (e, t) {
  const fl = e.flash > 0, c = GHOST_C[Math.floor(e.seed) % 4], f = Math.floor(t * 6 + e.seed) % 2;
  spr(['▗▄▄▖', '▟◉◉▙', f ? '█▜▛█' : '▜▚▞▛'], [c.repeat(4), c + 'ww' + c, c.repeat(4)], e.x - 2, e.y - 3, e.face, e.stun > 0 ? .5 : .95, fl);
  glow(e.x, e.y - 1.5, 4, SPC[c], .14);
};
FOE_DRAW.pixel = function (e, t) {
  const fl = e.flash > 0, c = PIX_C[Math.floor(e.seed) % 4], air = !e.ground;
  spr(['▛▀▀▜', air ? '▙▃▃▟' : '▙▄▄▟'], [c.repeat(4), c.repeat(4)], e.x - 2, e.y - 2.2 + (air ? 0 : .2), e.face, e.stun > 0 ? .5 : 1, fl);
  wgl('▪', e.x - 1.5, e.y - 1.9, fl ? '#fff' : '#05060f'); wgl('▪', e.x + .5, e.y - 1.9, fl ? '#fff' : '#05060f');
};

/* ---------- the invaders ---------- */
const INV_R = [[[' ▟▙ ', '▗▘▝▖'], [' ▟▙ ', '▝▖▗▘']], [['▟▜▛▙', '▝▘▝▘'], ['▟▜▛▙', ' ▚▞ ']], [['▟██▙', '▜▚▞▛'], ['▟██▙', '▝▞▚▘']]], INV_COL = ['m', 'c', 'n'];
FOE_DRAW.invader = function (e, t) {
  const I = S.inv, fr = e.free ? Math.floor(t * 8) % 2 : (I ? I.frame : 0), ty = e.free ? 1 : e.row === 0 ? 0 : e.row < 3 ? 1 : 2, c = e.free ? 'r' : INV_COL[ty], rows = INV_R[ty][fr];
  spr(rows, [c.repeat(4), c.repeat(4)], e.x - 2, e.y - 2, 1, 1, e.flash > 0);
  if (!(e.flash > 0)) { wgl('▪', e.x - 1.5, e.y - 1.8, '#05060f', .9); wgl('▪', e.x + .5, e.y - 1.8, '#05060f', .9); }
  glow(e.x, e.y - 1, 3, SPC[c], .16);
};
AIK.invader = function (e, dt) {
  const I = S.inv, p = S.P; if (!e.free) return; if (!I) { e.dead = true; return; }
  e.x += clamp(p.x - e.x, -1, 1) * 7 * dt; e.y += (13 + I.wave * 2) * dt;
  const v = I.cannon;
  if (v && !v.dead && Math.abs(e.x - v.x) < (v.w + e.w) / 2 && e.y > v.y - v.h) { e.dead = true; boom(e.x, e.y - 1, 1); cannonHit(v); }
  else if (e.y >= I.fy) { e.dead = true; boom(e.x, e.y - 1, .8); sfx('boom', .4); }
};
function invBoom(e) { const cx = e.x, cy = e.y - 1; boom(cx, cy, .9); sfx('boom', .55); for (let i = 0; i < 8; i++) pt(cx, cy, rr(-22, 22), rr(-16, 6), rr(.3, .7), ['▪', '▒', '·'], PAL[C.mint], { g: 30 }); }
/* the UFO: shoot it for an extra life */
FOE_DRAW.ufo = function (e, t) {
  const fl = e.flash > 0, f = Math.floor(t * 10) % 3, lamp = i => f === i ? 'y' : 'R';
  spr([' ▗▄██▄▖ ', '▟██████▙', ' ▀▘▝▘▝▀ '], ['  rrrr  ', 'rrrrrrrr', ' y' + lamp(0) + lamp(1) + lamp(2) + 'y '], e.x - 4, e.y - 2.4, 1, 1, fl);
  glow(e.x, e.y - 1, 7, '#ff3b4d', .25);
};
AIK.ufo = function (e, dt) {
  const I = S.inv; if (!I) { e.dead = true; return; } e.dirx = e.dirx || 1; e.x += e.dirx * 16 * dt; e.ufoT = (e.ufoT || 0) - dt; if (e.ufoT <= 0) { e.ufoT = .32; sfx('ufo', .5); }
  if ((e.dirx > 0 && e.x > I.x1 + 6) || (e.dirx < 0 && e.x < I.x0 - 6)) { e.dead = true; I.ufo = 0; }
};
function ufoDie(e) {
  const I = S.inv; boom(e.x, e.y - 1, 1.6); sfx('bigboom'); shake(.5);
  for (let i = 0; i < 18; i++) S.pks.push({ k: 'chip', x: e.x + rr(-3, 3), y: e.y - 1, t: 0, vy: rr(-18, -6), vx: rr(-12, 12), drop: true });
  if (I) { I.ufo = 0; if (I.lives < 5) { I.lives++; banner('EXTRALEBEN', 'UFO ABGESCHOSSEN', C.mint); sfx('heal'); } else { S.score += 1500; } }
}

/* ---------- the MOTHERSHIP ---------- */
const fit = (s, n) => { const k = Math.max(0, n - s.length), l = k >> 1; return (' '.repeat(l) + s + ' '.repeat(k - l)).slice(0, n); };
const MOM_R = ['▗▄▄▟██████▙▄▄▖', '▗▟██▀██▀▀▀▀██▀██▙▖', '▗▟' + '█'.repeat(22) + '▙▖', '▀▀' + '▜██▛▀▀'.repeat(4), '▝▀▘      ▝▀▘      ▝▀▘'].map(r => fit(r, 26));
const MOM_COL = (i, ch) => i === 0 ? 'c' : i === 1 ? 'r' : i === 3 && ch === '█' ? 'y' : 'R';
const MOM_C = MOM_R.map((r, i) => r.split('').map(ch => MOM_COL(i, ch)).join(''));
FOE_DRAW.mother = function (e, t) {
  const fl = e.flash > 0, tele = e.tele > 0, blink = Math.floor(t * 8) % 2, cols = MOM_C.map((r, i) => i === 3 && blink ? r.replace(/y/g, 'a') : r);
  spr(MOM_R, cols, e.x - 13, e.y - 5, 1, 1, fl || (tele && Math.floor(t * 20) % 2 === 0));
  glow(e.x, e.y - 2.5, 14, '#ff3b4d', tele ? .5 : .2);
  if (tele) wgl(TXT_WARN, e.x - .5, e.y - 7, '#ff3b4d');
  bossBar(e, 28, 6.4, '#ff3b4d'); txtPx('MUTTERSCHIFF', Math.round(e.x * CW - CXp - 6 * CW), Math.round((e.y + .6) * CH - CYp), '#ff3b4d', .9);
};
AIK.mother = function (e, dt) {
  const I = S.inv; if (!I) { e.dead = true; return; }
  const rage = e.hp < e.maxhp * .5, x0 = I.x0 + 14, x1 = I.x1 - 14;
  e.ph = (e.ph || 0) + dt; e.dirx = e.dirx || 1; e.x += e.dirx * (rage ? 15 : 9.5) * dt; if (e.x > x1) { e.x = x1; e.dirx = -1; } if (e.x < x0) { e.x = x0; e.dirx = 1; }
  e.y = I.fy - 20 + Math.sin(e.ph * 1.3) * 1.1; e.vx = e.vy = 0;
  if (e.fire === undefined) e.fire = 1.6;
  if (e.tele > 0) {
    e.tele -= dt;
    if (e.tele <= 0) {
      e.volley = (e.volley || 0) + 1; sfx('rocket', .5);
      if (e.volley % 3 === 0) { for (let i = -1; i <= 1; i++) spawnEnemy({ k: 'invader', x: e.x + i * 7, y: e.y + 2, free: true, always: true, range: 999, hp: 1, row: 1 }); sfx('boot', .6); }
      else if (e.volley % 2 === 0) { for (let i = -3; i <= 3; i++) ebullet(e.x + i * 3.4, e.y, PI / 2 + i * .1, 21, 1, { big: 1, inv: 1, life: 4 }); }
      else { for (let i = -2; i <= 2; i++) ebullet(e.x + i * 4, e.y, PI / 2 + i * .3, 20, 1, { big: 1, inv: 1, life: 4 }); }
      e.fire = rage ? 1.15 : 1.8;
    }
  } else { e.fire -= dt; if (e.fire <= 0) { e.tele = .55; sfx('warn', .4); } }
};
function motherDie(e) {
  boom(e.x, e.y - 2, 3); sfx('bigboom'); sfx('bigboom'); shake(1.4); S.freeze = .15; glitchAmt = 1;
  for (let k = 0; k < 8; k++) boom(e.x + rr(-11, 11), e.y - rr(0, 5), 1.4 + Math.random());
  for (let i = 0; i < 30; i++) S.pks.push({ k: 'chip', x: e.x + rr(-8, 8), y: e.y - 2, t: 0, vy: rr(-24, -8), vx: rr(-14, 14), drop: true });
}

/* =========================================================================
   die Laserkanone (Fahrzeug, nur im Minispiel)
   ========================================================================= */
VEH.cannon = { name: 'LASERKANONE', w: 5, h: 3, hp: 100, speed: 34, boost: 34 };
function cannonHit(v) {
  const I = S.inv; if (!v || v.dead || v.inv > 0) return false;
  v.inv = 1.3; v.flash = .3; shake(.7); sfx('hurt', .8); sfx('bigboom', .5); boom(v.x, v.y - 1.5, 1.3); S.flash = Math.max(S.flash, .15); S.flashCol = '#ff3b4d'; glitchAmt = Math.max(glitchAmt, .6);
  if (I) { I.lives--; if (I.lives <= 0) failInvaders('KANONE ZERSTÖRT'); }
  return true;
}
function updCannon(v, dt) {
  const p = S.P, I = S.inv, left = KEY.KeyA || KEY.ArrowLeft, right = KEY.KeyD || KEY.ArrowRight, dir = (right ? 1 : 0) - (left ? 1 : 0), d = VEH.cannon;
  v.fireCd = Math.max(0, v.fireCd - dt); v.inv = Math.max(0, v.inv - dt); v.flash = Math.max(0, v.flash - dt); v.t += dt; v.boosting = false;
  v.vx += (dir * d.speed - v.vx) * Math.min(1, 10 * dt); if (!dir && Math.abs(v.vx) < .6) v.vx = 0; if (dir) v.face = dir;
  v.vy = Math.min(PH.maxFall, v.vy + 84 * dt); moveEnt(v, dt, false);
  const B = v.bounds; if (B) { if (v.x - v.w / 2 < B.x0) { v.x = B.x0 + v.w / 2; v.vx = Math.max(0, v.vx); } if (v.x + v.w / 2 > B.x1) { v.x = B.x1 - v.w / 2; v.vx = Math.min(0, v.vx); } }
  const held = MOUSE.l || KEY.KeyJ || KEY.Space || KEY.KeyK || KEY.KeyE || KEY.ArrowUp || KEY.KeyW;
  if (held && v.fireCd <= 0 && !(I && I.phase === 1)) {
    v.fireCd = .27; S.bul.push({ x: v.x, y: v.y - v.h - .2, vx: 0, vy: -48, life: 1.3, dmg: 1, col: PAL[C.mint], a: -PI / 2, pierce: 0, hit: [] });
    sfx('shoot', .55); pt(v.x, v.y - v.h, 0, -8, .12, ['*'], PAL[C.mint], {}); v.recoil = .12;
  }
  v.recoil = Math.max(0, (v.recoil || 0) - dt);
  if (Math.abs(v.vx) > 3 && Math.random() < dt * 24) pt(v.x - sign(v.vx) * 2.4, v.y - .1, -sign(v.vx) * rr(2, 8), rr(-3, -.5), rr(.2, .4), ['·', '░'], PAL[C.greyD], { drag: 3 });
  p.x = v.x; p.y = v.y; p.vx = v.vx; p.vy = v.vy; p.ground = true; p.face = v.face; p.w = v.w; p.h = v.h; p.inv = 0; p.hitT = 0; p.hp = 100; p.aim = { x: 0, y: -1, a: -PI / 2, cx: 0, cy: -.5, d: 20, wx: v.x, wy: v.y - 20, mx: v.x, my: v.y - v.h };
}
function drawCannon(v, t) {
  const fl = v.flash > .02, blink = v.inv > 0 && Math.floor(t * 20) % 2, x0 = v.x - 2.5, rec = v.recoil > 0 ? .5 : 0;
  spr(['  ▲  ', '  █  ', '▟███▙'], ['  c  ', '  c  ', 'nnnnn'], x0, v.y - 3 + rec * .4, 1, blink ? .45 : 1, fl);
  spr(['▐███▌'], ['GGGGG'], x0, v.y - 1 + 0, 1, blink ? .45 : 1, fl);
  wgl('▀', v.x - .5, v.y - 3.9 + rec * .4, '#ffffff', blink ? .3 : .9); glow(v.x, v.y - 1.5, 7, '#5dffb0', .22); if (rec) glow(v.x, v.y - 3.6, 4, '#ffffff', .4);
  cockpit(v.x, v.y - 1.1, 3, 1, 1, t);
}
function drawCannonHud(p, t) {
  const v = p.veh, I = S.inv, X = c => Math.round(c * CW), Y = r => Math.round(r * CH);
  panel(2, 1, 41, 6, '#5dffb0', 'LASERKANONE');
  { const bu = Math.max(2, Math.floor(CH * .25)); drawSamBadge(Math.round(3.4 * CW), Math.round(2 * CH + (4 * CH - 12 * bu) / 2), bu, S.t); }
  txtPx('LEBEN', X(11), Y(2), '#8a96c4'); for (let i = 0; i < 5; i++) txtPx(i < (I ? I.lives : 3) ? '♥' : '·', X(17 + i * 2), Y(2), i < (I ? I.lives : 3) ? '#ff3b4d' : '#3d4676');
  txtPx('WELLE', X(11), Y(3), '#8a96c4'); txtPx((I ? Math.max(1, I.wave) : 1) + ' / 3', X(17), Y(3), '#5dffb0');
  txtPx('◊ ' + String(S.chips).padStart(3, '0'), X(24), Y(3), '#ffe45e'); txtPx('INVADER ' + String(S.en.filter(e => e.k === 'invader' && !e.dead).length).padStart(2, '0'), X(11), Y(4), '#8a96c4');
  txtPx(TX('A D FAHREN  //  J / LEERTASTE / MAUS FEUER', 'STICK FAHREN  //  FEUER-KNOPF'), X(11), Y(5), '#5dffb0');
}

/* =========================================================================
   Steuerung des Minispiels
   ========================================================================= */
function initInvaders() {
  const L = S.L; S.inv = null; if (!L || !L.inv) return; const D = L.inv;
  S.inv = { phase: 0, wave: 0, lives: 3, t: 0, timer: 0, frame: 0, done: false, x0: D.x0, x1: D.x1, fy: D.fy, ox: 0, oy: 0, dir: 1, stepT: 0, step: 0, bombT: 1.5, ufo: 0, ufoT: 9, cannon: null, total: 1, retry: false };
  /* bunkers: bright green blocks that crumble; remember them so every new try starts clean */
  const I = S.inv; I.snap = [];
  for (const b of D.bunkers) {
    const cells = [];
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { const i = y * L.W + x; if (L.t[i] === T.SOL) { L.ch[i] = (x + y) % 3 ? '▓'.charCodeAt(0) : '█'.charCodeAt(0); L.fg[i] = C.mint; L.bg[i] = 0; L.sty[i] = CUSTOM | ST.METAL; } cells.push([i, L.t[i], L.ch[i], L.fg[i], L.bg[i], L.an[i], L.sty[i], L.brk ? L.brk[i] : 0]); }
    I.snap.push(cells);
  }
}
function restoreBunkers() {
  const I = S.inv, L = S.L; if (!I || !I.snap) return;
  for (const cells of I.snap) for (const [i, t, ch, fg, bg, an, sty, br] of cells) { L.t[i] = t; L.ch[i] = ch; L.fg[i] = fg; L.bg[i] = bg; L.an[i] = an; L.sty[i] = sty; if (L.brk) L.brk[i] = br; }
}
function clearInvaderFoes() {
  for (const e of S.en) if (e.k === 'invader' || e.k === 'ufo' || e.k === 'mother') e.dead = true;
  S.ebul = S.ebul.filter(b => !b.inv); if (S.inv) { S.inv.ufo = 0; }
}
function resetInvaders(hard) {
  const I = S.inv, L = S.L; if (!I || !L || !L.inv || I.phase === 5) return; const D = L.inv, p = S.P;
  clearInvaderFoes(); S.veh = S.veh.filter(v => v.k !== 'cannon'); I.cannon = null;
  if (p && p.veh && p.veh.k === 'cannon') { p.veh = null; p.w = 1.6; p.h = 2.9; }
  restoreBunkers(); D.doors[0].target = 1; D.doors[1].target = 0; S.cam.lock = null; MUS.inten = 0; MUS.inten_t = 0;
  I.phase = 0; I.wave = 0; I.lives = 3;
}
function startInvaders() {
  const I = S.inv, L = S.L, D = L.inv, p = S.P; if (!I || I.phase !== 0) return;
  I.phase = 1; I.timer = 3.6; I.wave = 1; I.lives = 3; D.doors[0].target = 0; D.doors[1].target = 0;
  for (const e of S.en) if (!e.dead && e.k !== 'invader' && e.k !== 'ufo' && e.k !== 'mother' && Math.abs(e.x - D.cx) < 120) { e.dead = true; ring(e.x, e.y - e.h / 2, 5, .4, PAL[C.mag]); }   // nobody from the hall may drift in
  const v = spawnVeh({ k: 'cannon', x: D.x0 + 8, y: D.fy, face: 1, bounds: { x0: D.x0, x1: D.x1 } }); I.cannon = v; S.vseen.cannon = true; boardVeh(v);
  S.cam.lock = { x: D.cx, y: D.fy - 12.5 }; S.respawn = D.respawn || S.respawn; MUS.inten_t = 1; MUS.inten = 1;
  banner('SPACE INVADERS', TX('ABWEHRWELLE 1 VON 3', 'ABWEHRWELLE 1 VON 3'), C.mint); sfx('go'); say('ECHO', TX('Das ist ein echtes Arcade-Spiel, Sam. Die Kanone schießt nur nach oben: A und D fahren, J oder LEERTASTE feuern. Hinter den Bunkern bist du sicher.', 'Das ist ein echtes Arcade-Spiel, Sam. Die Kanone schießt nur nach oben: Stick fährt, FEUER schießt. Hinter den Bunkern bist du sicher.'), 3.4);
}
function spawnWave(w) {
  const I = S.inv, L = S.L, D = L.inv; I.wave = w; I.ox = 0; I.oy = 0; I.dir = 1; I.stepT = 0; I.step = 0; I.bombT = 1.8; I.ufo = 0; I.ufoT = 7 + Math.random() * 5; I.phase = 2; I.lives = Math.max(I.lives, 3);
  const rows = w === 1 ? 4 : 5, cols = 10; I.rows = rows; I.cols = cols; I.total = rows * cols;
  if (w <= 2) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const e = spawnEnemy({ k: 'invader', x: D.x0 + 5 + c * 5, y: D.fy - 23 + r * 3, row: r, col: c, always: true, range: 999, hp: w === 2 && r === 0 ? 2 : 1 }); if (e) { e.bx = e.x; e.by = e.y; } }
    banner('WELLE ' + w + ' VON 3', w === 1 ? 'SCHIESS SIE AB' : 'SCHNELLER UND DICHTER', C.mint); sfx('go', .8);
  } else {
    const m = spawnEnemy({ k: 'mother', x: D.cx, y: D.fy - 20, always: true, range: 999, hp: 46, maxhp: 46 }); if (m) { m.dirx = 1; }
    banner('MUTTERSCHIFF', 'WELLE 3 VON 3 // BLEIB IN BEWEGUNG', C.red); sfx('warn'); sfx('warn');
  }
}
function failInvaders(msg) {
  const I = S.inv, L = S.L, D = L.inv; if (!I || I.phase === 3 || I.phase === 4) return;
  banner(msg, 'WELLE NEU // KEINE PANIK', C.red); sfx('warn'); sfx('bigboom'); shake(1); glitchAmt = 1; clearInvaderFoes(); restoreBunkers();
  I.phase = 3; I.timer = 2.6; I.retry = true; I.lives = 3; const v = I.cannon; if (v) { v.x = D.x0 + 8; v.vx = 0; v.hp = v.maxhp; v.dead = false; v.inv = 2; }
}
function winInvaders() {
  const I = S.inv, L = S.L, D = L.inv, p = S.P; I.phase = 4; I.timer = 2.5; clearInvaderFoes();
  banner('SPACE INVADERS GESCHLAGEN', 'DAS TOR ÖFFNET SICH', C.mint); sfx('heal'); sfx('go'); MUS.inten = 0; MUS.inten_t = 0;
  say('ECHO', 'Geschafft, Sam! Das Spiel ist aus, und das Tor nach Zenit steht offen. Die Station ist das Ende dieser Signalspur.', 6);
}
function updInvaders(dt) {
  const I = S.inv, L = S.L, p = S.P; if (!I || !L || !L.inv) return; const D = L.inv;
  if (I.phase === 0) { const t = D.trig; if (!p.dead && !p.veh && p.x > t.x && p.x < t.x + t.w && p.y > t.y && p.y < t.y + t.h) startInvaders(); return; }
  if (I.phase === 5) return;
  I.t += dt; const alive = S.en.filter(e => e.k === 'invader' && !e.free && !e.dead);
  if (I.phase === 1) { I.timer -= dt; if (I.timer <= 0) spawnWave(1); return; }
  if (I.phase === 3) { I.timer -= dt; if (I.timer <= 0) { if (I.retry) { I.retry = false; spawnWave(I.wave); } else if (I.wave >= 3) winInvaders(); else spawnWave(I.wave + 1); } return; }
  if (I.phase === 4) { I.timer -= dt; if (I.timer <= 0) {
    const v = I.cannon; if (v) { exitVeh(v); v.dead = true; v.x = -999; v.y = -999; v.vx = v.vy = 0; }
    D.doors[0].target = 1; D.doors[1].target = 1; S.cam.lock = null; I.phase = 5; I.done = true; S.pks.push({ k: 'hp', x: D.cx, y: D.fy - 3, t: 0 }); S.respawn = D.after || S.respawn; return; }
    return; }
  /* phase 2: the march */
  if (I.wave <= 2) {
    const total = I.total, speed = I.wave === 1 ? 1 : .72, every = (.06 + .5 * Math.pow(alive.length / total, .8)) * speed;
    I.stepT += dt;
    if (alive.length > 0 && I.stepT >= every) {
      I.stepT = 0; let minX = 1e9, maxX = -1e9; for (const e of alive) { minX = Math.min(minX, e.bx + I.ox - 2); maxX = Math.max(maxX, e.bx + I.ox + 2); }
      if ((I.dir > 0 && maxX + 1 > I.x1 - .5) || (I.dir < 0 && minX - 1 < I.x0 + .5)) { I.dir = -I.dir; I.oy += 1; } else I.ox += I.dir;
      I.frame ^= 1; I.step++; sfx('inv' + (I.step % 4), .5);
    }
    for (const e of alive) {
      e.x = e.bx + I.ox; e.y = e.by + I.oy;
      for (let y = Math.floor(e.y - 2); y <= Math.floor(e.y); y++) for (let x = Math.floor(e.x - 2); x <= Math.floor(e.x + 2); x++) { if (L.brk && L.inb(x, y) && L.brk[y * L.W + x] && L.t[y * L.W + x] === T.SOL) { const i = y * L.W + x; L.brk[i] = 0; L.t[i] = 0; L.ch[i] = 0; L.bg[i] = 0; L.sty[i] = 0; } }
      if (e.y >= D.fy - 3.5) { failInvaders('INVASION'); return; }
    }
    /* bombs: mostly from the column near the cannon */
    I.bombT -= dt;
    if (I.bombT <= 0 && alive.length) {
      I.bombT = (I.wave === 1 ? 1.6 : 1.0) * (.6 + Math.random() * .8);
      const v = I.cannon, cols = {}; for (const e of alive) if (!cols[e.col] || e.y > cols[e.col].y) cols[e.col] = e;
      const low = Object.values(cols); let pick = low[Math.floor(Math.random() * low.length)];
      if (v && Math.random() < .4) { let bd = 1e9; for (const e of low) if (Math.abs(e.x - v.x) < bd) { bd = Math.abs(e.x - v.x); pick = e; } }
      ebullet(pick.x, pick.y, PI / 2, 21 + I.wave * 3, 1, { big: 1, inv: 1, life: 4 }); sfx('beep', .35);
    }
    /* the mystery UFO */
    I.ufoT -= dt;
    if (I.ufoT <= 0 && !I.ufo && alive.length > 6) { I.ufoT = 16 + Math.random() * 8; const dir = Math.random() < .5 ? 1 : -1; const u = spawnEnemy({ k: 'ufo', x: dir > 0 ? I.x0 - 5 : I.x1 + 5, y: D.fy - 25, always: true, range: 999 }); if (u) { u.dirx = dir; I.ufo = 1; } }
    if (!alive.length && !S.en.some(e => e.k === 'invader' && !e.dead)) { I.phase = 3; I.timer = 2.3; I.retry = false; S.ebul = S.ebul.filter(b => !b.inv); banner('WELLE ' + I.wave + ' GESCHAFFT', 'NÄCHSTE WELLE KOMMT', C.mint); sfx('heal', .8); }
  } else {
    const m = S.en.find(e => e.k === 'mother' && !e.dead);
    if (!m) { if (!S.en.some(e => e.k === 'invader' && !e.dead)) { I.phase = 3; I.timer = 1.8; I.retry = false; clearInvaderFoes(); } }
  }
}
function drawInvHud(t) {
  const I = S.inv; if (!I || I.phase === 0 || I.phase === 5) return;
  const msg = I.phase === 1 ? 'BEREIT?' : I.phase === 4 ? 'GESCHAFFT' : 'SPACE INVADERS  //  WELLE ' + Math.max(1, I.wave) + ' VON 3', w = msg.length * CW + 2 * CW, px = Math.round(W / 2 - w / 2), py = Math.round(CH * 1.2);
  rectPx(px, py - 3, w, CH + 6, '#05060f', .6); txtPx(msg, px + CW, py, I.phase === 4 ? '#5dffb0' : '#ffe45e');
}

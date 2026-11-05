/* =========================================================================
   RENNEN :: Neon Grand Prix (Sektor 5)
   Sam fährt einen Rennwagen gegen drei Rivalen. Boost-Pads, Gruben, Sperren und eine Dampfwalze,
   die ab der Streckenmitte hinter dir her rollt. Ins Ziel kommt man mit Platz 1 oder 2.
   Rivalen sind Gegner der Art 'racer': sie fahren die Strecke selbst (springen über Gruben und Sperren),
   die Gummiband-Regel hält das Feld zusammen, Treffer und Rempler bremsen sie aus.
   ========================================================================= */
ENEMY.racer = { w: 9, h: 3.2, hp: 28, hook: false, score: 400, tdmg: 0, heavy: true, big: true, halo: 6, chips: 6, noRam: true, die: dieRacer };
ENEMY.walze = { w: 20, h: 7, hp: 60, hook: false, score: 2000, tdmg: 0, heavy: true, big: true, halo: 11, chips: 16, hpc: 1, noRam: true, die: dieWalze };
const RACE_PLACES = 4;
const RCR_R = ['▄ ▗▄▄▄▖  ', '▟███████▙', ' ●▀▀▀▀▀● '], RCR_C = ['t qVVVq  ', 'ttttttttt', 'qGmmmmmGq'];

/* ---------- set-up ---------- */
function spawnRivals() {
  const R = S.L.race;
  S.en = S.en.filter(e => e.k !== 'racer' && e.k !== 'walze');
  for (const r of R.rivals) spawnEnemy({ k: 'racer', x: r.x, y: R.y, top: r.top, team: r.team, name: r.name, always: true, face: 1, bump: -9 });
}
function initRace() {
  const L = S.L; if (!L.race) { S.race = null; return; }
  S.race = { phase: 'grid', t: 0, cd: 4.4, place: 1, fin: 0, retryT: 0, walzeOn: false, count: 4, safe: null, noExit: -9, best: 1, padSnd: 0 };
  spawnRivals(); S.vseen.racer = true;
  const v = S.veh[0], p = S.P; if (v && !p.veh) { boardVeh(v); S.banner = null; }
  S.respawn = { x: L.start.x, y: L.start.y };
}
function retryRace() {
  const L = S.L; if (!L.race) return;
  S.bul.length = 0; S.ebul.length = 0; S.rkt.length = 0;
  S.race = { phase: 'grid', t: 0, cd: 3.4, place: 1, fin: 0, retryT: 0, walzeOn: false, count: 4, safe: null, noExit: -9, best: 1, padSnd: 0 };
  spawnRivals();
  const v = S.veh[0], p = S.P; if (v) { boardVeh(v); S.banner = null; }
  S.en = S.en.filter(e => e.k === 'racer' || e.k === 'walze' || e.always || e.k === 'grunt' || e.k === 'turret' || e.k === 'drone' || e.k === 'gunship' || e.k === 'seeker' || e.k === 'raider');
}
const raceRivals = () => S.en.filter(e => e.k === 'racer' && !e.dead);
function racePlace() { const p = S.P; let n = 1; for (const r of raceRivals()) if (r.x > p.x) n++; return n; }
function groundAt(x, y0, maxD) {
  const L = S.L, tx = Math.floor(x); for (let y = Math.floor(y0); y < Math.floor(y0) + (maxD || 40); y++) if (L.solid(tx, y) || L.tt(tx, y) === T.ONE) return y; return null;
}
function inPad(x) { for (const q of S.L.race.pads) if (x > q.x && x < q.x + q.w) return true; return false; }

/* ---------- the controller ---------- */
function updRace(dt) {
  const R = S.race, L = S.L, p = S.P, RC = L.race; R.t += dt;
  const v = p.veh;
  if (R.phase === 'grid') {
    const cd0 = Math.ceil(R.cd); R.cd -= dt; const cd1 = Math.ceil(R.cd);
    if (cd1 !== cd0 && R.cd > 0 && cd1 <= 3) { sfx('beep'); }
    if (R.cd <= 0) { R.phase = 'run'; R.t = 0; sfx('go'); banner('LOS!', 'PLATZ 1 ODER 2 BRINGT DICH WEITER', C.mint); shake(.5); MUS.inten_t = .7; }
    return;
  }
  /* position, pads, rescue from the pits */
  R.place = racePlace();
  const subjects = []; if (v && !v.dead) subjects.push(v); for (const r of raceRivals()) subjects.push(r);
  for (const o of subjects) {
    o.padT = o.padT || 0;
    if (o.ground && inPad(o.x) && !(o.padT > .3)) { o.padT = .85; if (o === v) { v.nitro = Math.min(1, v.nitro + .4); if (S.t - R.padSnd > .4) { sfx('pad'); R.padSnd = S.t; } shake(.15); } }
    if (o.ground) { o.sx = o.x - 6; o.sy = o.y; }
    if (o.y > RC.y + 15 && !o.dead && o.sx !== undefined) {   // fell into a pit: set back on the road, a little the worse for wear
      const o2 = o; o2.x = o2.sx; o2.y = o2.sy; o2.vx = 14; o2.vy = 0; o2.inv = Math.max(o2.inv || 0, 1.2);
      ring(o2.x, o2.y - 2, 10, .5, PAL[C.cyan]); sfx('boot', .6);
      if (o === v) { hurtVeh(v, 10, v.x - 3, v.y); v.inv = 1.4; banner('ZURÜCKGESETZT', 'GRUBE ERWISCHT', C.amber); }
    }
    if (o.padT > 0 && Math.random() < dt * 60 && onScr(o.x, o.y, 10)) pt(o.x - 5, o.y - rr(.4, 2.6), rr(-34, -12), rr(-3, 3), rr(.2, .4), ['═', '─', '»'], PAL[C.cyan], { drag: 2 });
  }
  /* the steamroller wakes up */
  if (R.phase === 'run' && !R.walzeOn && v && p.x >= RC.walzeAt) {
    R.walzeOn = true; const w = spawnEnemy({ k: 'walze', x: p.x - RC.walzeGap, y: RC.y, always: true, face: 1, sp: 32, tt: 0 });
    banner('DAMPFWALZE', 'LAUF! SIE IST SCHNELLER ALS DU', C.red); sfx('bigboom', .8); sfx('warn'); say('ECHO', TX('Die Dampfwalze, Sam! Die planiert alles hinter dir. Halt nicht an, nutz Turbo und die Pads. Mit Raketen kriegst du sie klein.', 'Die Dampfwalze, Sam! Die planiert alles hinter dir. Halt nicht an, nutz TURBO und die Pads. Mit RAKETE kriegst du sie klein.'), 6.5);
  }
  /* lost the car (wrecked or left) */
  if (R.phase === 'run' && (!v || v.dead)) { R.phase = 'lose'; R.retryT = 2.6; banner('RENNEN VERLOREN', 'DER WAGEN IST SCHROTT  //  NOCHMAL', C.red); }
  if (R.phase === 'run' && v && p.x >= RC.x1) {   // the finish line
    R.phase = 'done'; R.place = racePlace(); R.fin = R.t; const win = R.place <= 2;
    banner(win ? 'ZIEL! PLATZ ' + R.place : 'ZIEL! NUR PLATZ ' + R.place, win ? 'LIFTKARTE GEHÖRT DIR' : 'NUR DIE ERSTEN ZWEI KOMMEN WEITER', win ? C.mint : C.red);
    sfx(win ? 'cp' : 'hurt'); if (win) { ring(p.x, p.y - 2, 22, 1, PAL[C.mint]); S.score += (RACE_PLACES - R.place + 1) * 500; } R.retryT = win ? 0 : 3.4; R.winT = win ? 2.4 : 0; MUS.inten_t = 0;
  }
  if (R.phase === 'done') {
    if (R.winT > 0) { R.winT -= dt; if (R.winT <= 0) stageClear(); }
    else if (R.retryT > 0) { R.retryT -= dt; if (R.retryT <= 0) { respawnPlayer(); } }
  }
  if (R.phase === 'lose') { R.retryT -= dt; if (R.retryT <= 0) respawnPlayer(); }
  /* no exit trap if the finish car keeps rolling */
  if (R.phase === 'done' && v && p.x > RC.x1 + 70) { v.vx *= Math.exp(-3 * dt); }
}

/* ---------- rivals ---------- */
function dieRacer(e) {
  const cx = e.x, cy = e.y - 1.6; boom(cx, cy, 2.2); boom(cx + rr(-3, 3), cy, 1.4); sfx('bigboom', .7); S.freeze = .08; shake(.7);
  for (let i = 0; i < 16; i++) pt(cx + rr(-4, 4), cy + rr(-1, 1), rr(-24, 24), rr(-28, -4), rr(.7, 1.5), ['▪', '▒', '#', '%'], PAL[pick([C.greyD, C.amber, C.red])], { g: 40, bounce: .3 });
  for (let i = 0; i < 6; i++) S.pks.push({ k: 'chip', x: cx + rr(-1, 1), y: cy, t: 0, vy: rr(-22, -8), vx: rr(-10, 10), drop: true });
  if (S.race) say('ECHO', e.name + ' ist raus. Ein Rivale weniger.', 3);
}
AIK.racer = function aiRacer(e, dt) {
  const R = S.race, L = S.L, p = S.P; if (!R) return;
  e.vy = Math.min(PH.maxFall, e.vy + 84 * dt); e.face = 1; e.stun = Math.max(0, (e.stun || 0) - dt); e.boostT = Math.max(0, (e.boostT || 0) - dt); e.padT = Math.max(0, (e.padT || 0) - dt);
  let want = 0;
  if (R.phase === 'run' || R.phase === 'done' || R.phase === 'lose') {
    const gap = p.x - e.x;   // > 0: the player is ahead of this rival
    const k = clamp(1 + gap * .0048, .84, 1.2);
    want = e.top * k * (e.stun > 0 ? .3 : 1) * (e.boostT > 0 ? 1.4 : 1) * (e.padT > 0 ? 1.3 : 1);
    if (R.phase !== 'run') want = e.top * .6;
    e.nt = (e.nt === undefined ? rr(3, 6) : e.nt) - dt; if (e.nt <= 0) { e.nt = rr(5, 9); if (gap > -20) e.boostT = rr(.9, 1.7); }
  }
  e.vx = lerp(e.vx, want, Math.min(1, (e.stun > 0 ? 4 : 1.7) * dt));
  moveEnt(e, dt);
  if (e.ground && want > 5) {
    const ax = e.x + e.w / 2 + 1.2 + e.vx * .05;
    const pit = !solidAt(ax, e.y + .6) && !solidAt(ax, e.y + 1.6) && L.tt(Math.floor(ax), Math.floor(e.y + .6)) !== T.ONE;
    const wall = solidAt(e.x + e.w / 2 + .9 + e.vx * .07, e.y - 1.2) || solidAt(e.x + e.w / 2 + .9 + e.vx * .07, e.y - 2.4);
    if (pit || wall || e.hitR) { e.vy = -31; e.ground = false; if (e.hitR) e.vx = Math.max(e.vx, 22); }
  }
  if (e.ground && Math.random() < dt * 30 && Math.abs(e.vx) > 8) pt(e.x - 4.5, e.y - .1, -rr(2, 9), rr(-4, -.5), rr(.2, .5), ['░', '·', '.'], PAL[C.greyD], { drag: 3 });
  /* a collision with the player's car: whoever is faster wins the shove */
  const v = p.veh;
  if (v && !v.dead && R.phase === 'run' && Math.abs(e.x - v.x) < 8.4 && Math.abs(e.y - v.y) < 2.8 && S.t - e.bump > .45) {
    e.bump = S.t; const rel = v.vx - e.vx; sparks((e.x + v.x) / 2, e.y - 1.5, 12, sign(rel), -.3, PAL[C.yel], 36); sfx('stomp', .5); shake(.3);
    if (rel > 6) { e.stun = .9; e.vx *= .5; damageEnemy(e, 2, 1, -.3, false); v.vx *= .94; }
    else if (rel < -6) { hurtVeh(v, 5, e.x, e.y); v.vx *= .86; }
    else { v.vx *= .97; e.vx *= .97; }
  }
  if (e.y > L.deathY - 3) { e.hp = 0; killEnemy(e); }
};

/* ---------- the steamroller ---------- */
function dieWalze(e) {
  const cx = e.x, cy = e.y - 3;
  for (let k = 0; k < 4; k++) setTimeout(() => { if (S.L) { boom(cx + rr(-8, 8), cy + rr(-2, 2), 2); sfx('bigboom', .7); } }, k * 120);
  boom(cx, cy, 3); shake(1.2); S.freeze = .12; sfx('bigboom');
  for (let i = 0; i < 30; i++) pt(cx + rr(-9, 9), cy + rr(-3, 2), rr(-26, 26), rr(-34, -6), rr(.8, 1.8), ['▪', '▒', '#', '%', '@'], PAL[pick([C.greyD, C.amber, C.red, C.white])], { g: 40, bounce: .3 });
  for (let i = 0; i < 16; i++) S.pks.push({ k: 'chip', x: cx + rr(-6, 6), y: cy, t: 0, vy: rr(-24, -8), vx: rr(-14, 14), drop: true });
  S.pks.push({ k: 'hp', x: cx, y: e.y - 2, t: 0, vy: -12, drop: true });
  banner('WALZE ZERSTÖRT', 'DIE STRECKE GEHÖRT DIR', C.mint); sfx('cp');
}
AIK.walze = function aiWalze(e, dt) {
  const R = S.race, L = S.L, p = S.P; if (!R) return;
  const run = R.phase === 'run';
  if (run) { e.tt += dt; e.sp = Math.min(L.race.walzeMax, 32 + e.tt * L.race.walzeAcc); e.x += e.sp * dt; } else e.sp = lerp(e.sp, 0, Math.min(1, 3 * dt));
  if (R.phase === 'done') e.x += e.sp * dt;
  const gy = groundAt(e.x + 5, e.y - 12, 34); if (gy !== null) e.y = lerp(e.y, gy, Math.min(1, 9 * dt));
  e.vx = e.sp;
  if (!onScr(e.x, e.y, 90)) { /* far away: silent */ }
  const dd = Math.abs(p.x - e.x);
  if (dd < 90) { shake(clamp((90 - dd) / 90, 0, 1) * .16); e.snd = (e.snd || 0) - dt; if (e.snd <= 0) { e.snd = .42; sfx('stomp', clamp(.7 - dd / 160, .12, .7)); } }
  if (onScr(e.x, e.y - 3, 14)) {
    if (Math.random() < dt * 90) pt(e.x + 8, e.y - rr(0, 2), rr(8, 30), rr(-16, -2), rr(.25, .6), ['░', '▒', '·', '*'], PAL[pick([C.greyD, C.amber, C.yel])], { g: 20, drag: 1.5 });
    if (Math.random() < dt * 20) pt(e.x - 6, e.y - 7.4, -rr(1, 4), rr(-9, -4), rr(.6, 1.2), ['░', '▒', '▓'], PAL[C.greyD], { g: -4, drag: .8 });
  }
  /* it flattens everything it touches */
  for (const o of S.en) if (o.k === 'racer' && !o.dead && o.x < e.x + e.w / 2 - 2 && o.x > e.x - e.w / 2 - 4 && Math.abs(o.y - e.y) < 5) { o.hp = 0; killEnemy(o); }
  const v = p.veh;
  if (v && !v.dead && v.x < e.x + e.w / 2 - 1 && v.x > e.x - e.w / 2 - 5 && Math.abs(v.y - e.y) < 5.5) { v.hp = 0; destroyVeh(v); banner('ZERQUETSCHT', 'DIE WALZE HAT DICH ERWISCHT', C.red); }
  else if (!v && !p.dead && Math.abs(p.x - e.x) < e.w / 2 && Math.abs(p.y - e.y) < 6) { p.hp = 0; killPlayer(); }
  if (e.x > L.race.x1 + 30) { e.dead = true; boom(e.x, e.y - 3, 2.4); }
};

/* ---------- drawing ---------- */
FOE_DRAW.racer = function (e, t) {
  const fl = e.flash > 0, x0 = e.x - 4.5, y0 = e.y - 3, cols = RCR_C.map(r => r.replace(/t/g, e.team || 'r'));
  spr(RCR_R, cols, x0, y0, 1, e.stun > 0 && Math.floor(t * 20) % 2 ? .5 : 1, fl);
  cockpit(e.x - .4, y0 + 1, 3, 1, 2, t);
  const wf = Math.floor(e.x * .6) % 2 ? '+' : 'x'; wgl(wf, x0 + 1 - .5, y0 + 2, '#eaf6ff', .85); wgl(wf, x0 + 7 - .5, y0 + 2, '#eaf6ff', .85);
  const col = SPC[e.team || 'r']; glow(e.x, e.y - 1, 7, col, e.boostT > 0 || e.padT > 0 ? .5 : .16);
  if (e.boostT > 0 || e.padT > 0) for (let i = 0; i < 3; i++) wgl(['═', '─', '»'][i], x0 - 1.5 - i - .5, e.y - 1.6, col, .8 - i * .2);
  if (e.stun > 0) wgl('*', e.x - .5 + Math.sin(t * 14) * 2, y0 - 1.2, '#ffe45e');
  const nm = e.name, px = Math.round(e.x * CW - CXp - nm.length * CW / 2), py = Math.round((e.y - 5) * CH - CYp); txtPx(nm, px, py, col, .9);
  const hp = e.hp / e.maxhp; if (hp < 1) { const bw = 8, n = Math.round(bw * hp); txtPx('▐' + '█'.repeat(n) + '░'.repeat(bw - n) + '▌', Math.round((e.x - bw / 2 - 1) * CW - CXp), Math.round((e.y - 5.9) * CH - CYp), col, .8); }
};
FOE_DRAW.walze = function (e, t) {
  const fl = e.flash > 0, x = e.x, y = e.y, col = fl ? '#ffffff' : '#b42a40', col2 = fl ? '#ffffff' : '#6a1a2a', rot = (x * .9) % 4;
  /* cab with a window and a smokestack */
  for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) { const ch = j === 0 ? '▄' : (j === 1 && i > 1 && i < 6) ? '◙' : j === 4 ? '▀' : '█'; wgl(ch, x - 10 + i - .5, y - 6.2 + j + (j === 4 ? .2 : 0), (j === 1 && ch === '◙') ? (Math.floor(t * 12) % 2 ? '#ffe45e' : '#ff7a3a') : (j === 2 ? col2 : col)); }
  for (let j = 0; j < 3; j++) wgl('█', x - 9 - .5, y - 8.2 + j, '#3d4676'); wgl('▄', x - 9 - .5, y - 8.2, '#8a96c4');
  /* chassis */
  for (let i = -10; i <= 4; i++) wgl('▀', x + i - .5, y - 1.2, '#3d4676'); for (let i = -10; i <= 1; i++) wgl('▄', x + i - .5, y - 1.0, '#2a3470');
  /* the drum: a rolling ellipse with spikes */
  const dx = x + 4.2, dy = y - 3.5, rx = 7, ry = 3.5;
  for (let j = -4; j <= 3; j++) for (let i = -rx; i <= rx; i++) {
    const u = i / rx, w = (j + .5) / ry, r2 = u * u + w * w; if (r2 > 1) continue;
    const edge = r2 > .72, ch = edge ? '█' : (((Math.floor(i + rot * 2) + j) & 1) ? '▓' : '▒');
    wgl(ch, dx + i - .5, dy + j, edge ? (fl ? '#fff' : '#ff3b4d') : (fl ? '#fff' : '#8e1c2b'));
  }
  for (let k = 0; k < 9; k++) { const a = rot * 1.2 + k / 9 * TAU, sx = dx + Math.cos(a) * (rx + .6), sy = dy + Math.sin(a) * (ry + .6); wgl(Math.cos(a) > 0 ? '►' : '◄', sx - .5, sy - .5, '#ffb347', .9); }
  wgl('◙', dx - .5, dy - .5, '#ffe45e');
  glow(x, y - 3, 12, '#ff3b4d', .26); glow(dx + 4, dy, 9, '#ffb347', .12);
  const hp = e.hp / e.maxhp, bw = 18, n = Math.round(bw * hp); txtPx('▐' + '█'.repeat(n) + '░'.repeat(bw - n) + '▌', Math.round((x - bw / 2 - 1) * CW - CXp), Math.round((y - 10.4) * CH - CYp), '#ff3b4d', .9);
  wgl(Math.floor(t * 4) % 2 ? '!' : ' ', x - .5, y - 11.6, '#ff3b4d');
};

function drawArch(d, t) {
  const x0 = d.x, x1 = d.x + d.w, y0 = d.y, col = d.col;
  for (let y = y0; y < d.y2; y++) { wgl('█', x0 - .5, y, '#2a3470'); wgl('▐', x0 + .5 - .5, y, '#3d4676'); wgl('█', x1 - .5, y, '#2a3470'); wgl('▌', x1 - 1.5 + .5, y, '#3d4676'); }
  rectPx(Math.round(x0 * CW - CXp), Math.round(y0 * CH - CYp), Math.round((x1 - x0 + 1) * CW), Math.round(3 * CH), '#05060f', .85);
  for (let x = x0; x <= x1; x++) { wgl(((x + 0) & 1) ? '▀' : '▄', x - .5, y0, '#ffffff', .95); wgl(((x + 1) & 1) ? '▀' : '▄', x - .5, y0 + 2, '#ffffff', .95); }
  const n = signPx(d.text, 0, -999, col, 0); signPx(d.text, Math.round((x0 + (x1 - x0 - n) / 2 + .5) * CW - CXp), Math.round((y0 + 1) * CH - CYp), col, .6 + .4 * Math.sin(t * 6));
  glow((x0 + x1) / 2, y0 + 1.5, (x1 - x0) * .6, col, .14);
}
function drawCrowd(d, t) {
  const n = d.w, y = d.y;
  for (let r = 0; r < 3; r++) for (let i = 0; i < n; i++) wgl(r === 2 ? '▀' : '░', d.x + i - .5, y + r + 1, r === 2 ? '#3d4676' : '#1a2050', .9);
  for (let i = 0; i < n; i++) {
    const h = hash2(i + d.x, 3), bob = Math.sin(t * (3 + h * 4) + i * 1.7) > .55 ? -.5 : 0, c = ['#ffe45e', '#ff2fb9', '#19f0ff', '#5dffb0', '#ff7a3a'][Math.floor(h * 5)];
    if (h < .8) { wgl('●', d.x + i - .5, y + .4 + bob, c, .9); wgl('▾', d.x + i - .5, y + 1.3, c, .6); }
  }
}
function drawBoostPad(d, t) {
  for (let i = 0; i < d.w; i++) { const k = (Math.floor(t * 10) - i) % 3; wgl(k === 0 ? '»' : k === 1 ? '›' : '·', d.x + i - .5, d.y, k === 0 ? '#ffffff' : '#19f0ff', .95); }
  glow(d.x + d.w / 2, d.y, d.w * .8, '#19f0ff', .22);
}

function drawRaceHud(t) {
  const R = S.race, L = S.L, p = S.P, RC = L.race, bw = Math.min(54, COLS - 100 > 20 ? COLS - 100 : COLS - 12), x0 = Math.round((COLS - bw) / 2), by = COLS - 100 > 20 ? 1.6 : 7.8;
  const px = x => x0 + Math.round(clamp((x - RC.x0) / (RC.x1 - RC.x0), 0, 1) * (bw - 1));
  for (let i = 0; i < bw; i++) gl('─', Math.round((x0 + i) * CW), Math.round(by * CH), '#3d4676');
  gl('▐', Math.round((x0 + bw) * CW), Math.round(by * CH), '#ffffff'); gl('▌', Math.round((x0 - 1) * CW), Math.round(by * CH), '#ffffff');
  for (const e of raceRivals()) gl('●', Math.round(px(e.x) * CW), Math.round(by * CH), SPC[e.team], .95);
  const w = S.en.find(e => e.k === 'walze' && !e.dead); if (w) gl(Math.floor(t * 4) % 2 ? '▲' : '△', Math.round(px(w.x) * CW), Math.round((by - 1) * CH), '#ff3b4d');
  gl('◆', Math.round(px(p.x) * CW), Math.round(by * CH), '#19f0ff');
  const pl = R.phase === 'grid' ? 1 : R.place; txtC('PLATZ ' + pl + '/' + RACE_PLACES, COLS / 2, by + 1.3, pl <= 2 ? '#5dffb0' : '#ffb347');
  const tm = R.phase === 'run' ? R.t : R.phase === 'done' ? R.fin : 0; txtC(String(tm / 60 | 0).padStart(2, '0') + ':' + String(Math.floor(tm % 60)).padStart(2, '0') + '.' + String(Math.floor(tm * 10) % 10), COLS / 2, by + 2.5, '#8a96c4');
  if (R.phase === 'grid') {
    const n = Math.ceil(R.cd), s = n > 3 ? 'BEREIT' : String(Math.max(1, n)), sx = n > 3 ? 3 : 6, a = clamp(R.cd - Math.floor(R.cd) + .25, .3, 1), xx = Math.round((COLS - bigWidth(s, sx)) / 2), yy = Math.round(ROWS * .26);
    bigText(s, xx, yy, sx, n > 3 ? TITLE_GRADS[0] : [ '#ffe45e', '#ffd05a', '#ffb347', '#ff7a3a', '#ff3b4d' ], '#1a0838', a, 0);
  }
}

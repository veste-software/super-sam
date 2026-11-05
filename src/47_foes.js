/* =========================================================================
   NEUE GEGNER (ab Sektor 6), jeder größer als der vorige
   sniper   Scharfschütze: zielt mit rotem Laser, schießt auf die gemerkte Stelle (ausweichen!)
   mech     Brecher: stampft Schockwellen, feuert Salven. Mit scale 2 wird er zum Titan (Zwischenboss)
   orb      Satellit: Kugel mit Schildplatten, die Kugeln umkreisen
   koloss   Wächter der Station: wandelnder Turm mit Geschütz, Raketen und Stampfschlag
   ========================================================================= */
ENEMY.sniper = { w: 1.8, h: 2.9, hp: 4, hook: true, score: 300, tdmg: 0, hpc: .4 };
ENEMY.mech = { w: 8, h: 7, hp: 42, hook: true, strike: 10, score: 900, tdmg: 16, heavy: true, big: true, halo: 9, chips: 10, hpc: 1 };
ENEMY.orb = { w: 4, h: 4, hp: 7, hook: true, score: 250, tdmg: 10, heavy: true, halo: 6, chips: 3 };
ENEMY.koloss = { w: 14, h: 12, hp: 110, hook: false, strike: 8, score: 2500, tdmg: 22, heavy: true, big: true, halo: 14, chips: 20, hpc: 1 };

/* sprite scaled by an integer factor (every glyph becomes k x k glyphs) */
function sprK(rows, cols, x, y, face, al, flash, k) {
  for (let j = 0; j < rows.length; j++) { const r = rows[j], n = r.length, cr = cols[j]; for (let i = 0; i < n; i++) {
    const ii = face > 0 ? i : n - 1 - i; let c = r[ii]; if (c === ' ') continue; if (face < 0 && MIR[c]) c = MIR[c];
    const col = flash ? '#ffffff' : SPC[cr[ii]] || '#fff';
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) wgl(c, x + i * k + a, y + j * k + b, col, al);
  } }
}
function bossBar(e, w, dy, col) {
  const hp = clamp(e.hp / e.maxhp, 0, 1), n = Math.round(w * hp);
  txtPx('▐' + '█'.repeat(n) + '░'.repeat(w - n) + '▌', Math.round((e.x - w / 2 - 1) * CW - CXp), Math.round((e.y - dy) * CH - CYp), col || '#ff3b4d', .9);
}

/* ---------- sniper ---------- */
AIK.sniper = function (e, dt, dxp, dyp, dist) {
  const p = S.P; e.vy = Math.min(PH.maxFall, e.vy + PH.grav * dt); e.vx *= Math.exp(-8 * dt); moveEnt(e, dt);
  e.face = sign(dxp) || e.face; const cx = e.x + e.face * .6, cy = e.y - 2.1; e.rec = Math.max(0, (e.rec || 0) - dt);
  if (e.see && dist < (e.range || 85) && !p.dead) {
    e.fire -= dt / EASY.fireSlow;
    if (e.fire <= 0 && e.tele <= 0) { e.tele = 1.2; e.ax = p.x; e.ay = p.y - 1.5; sfx('warn', .5); }
  } else if (e.tele <= 0 && e.fire < .6) e.fire = .6;
  if (e.tele > 0) {
    e.tele -= dt;
    if (e.tele > .38) { const k = Math.min(1, 3.4 * dt); e.ax = lerp(e.ax, p.x, k); e.ay = lerp(e.ay, p.y - 1.5, k); }   // follows, then locks
    if (e.tele <= 0) { const a = vang(e.ax - cx, e.ay - cy); ebullet(cx, cy, a, 105, 22, { big: 1, life: 2.4 }); sfx('rail', .55); e.fire = rr(2.2, 3.3); e.rec = .25; sparks(cx, cy, 6, Math.cos(a), 0, PAL[C.mag], 30); }
  }
};
FOE_DRAW.sniper = function (e, t) {
  const fl = e.flash > 0, f = GF.idle, rows = f[0], cols = f[1].map(r => r.replace(/v/g, 'm'));
  spr(rows, cols, e.x - 1.5, e.y - 3, e.face, e.stun > 0 ? .5 : 1, fl);
  const cx = e.x + e.face * .6, cy = e.y - 2.1, tele = e.tele > 0;
  const a = tele ? vang(e.ax - cx, e.ay - cy) : (e.face > 0 ? 0 : PI);
  for (let i = 1; i <= 3; i++) wgl(gunGlyph(a), cx + Math.cos(a) * i * 1.05 - .5 - (e.rec || 0) * Math.cos(a) * 2, cy + Math.sin(a) * i * .52 - .5 - (e.rec || 0) * Math.sin(a), fl ? '#fff' : (i === 3 ? '#ff2fb9' : '#d0d8ff'));
  if (tele) {   // laser sight, fading in; flashes white just before the shot
    const L2 = Math.hypot(e.ax - cx, (e.ay - cy) * 2), n = Math.min(70, Math.ceil(L2 / 1.1)), k = 1 - e.tele / 1.2, hot = e.tele < .38;
    for (let i = 3; i < n; i += 1) { const u = i / n; wgl('·', cx + (e.ax - cx) * u - .5, cy + (e.ay - cy) * u - .5, hot ? '#ffffff' : '#ff3b4d', hot ? .95 : .25 + k * .5); }
    wgl('◎', e.ax - .5, e.ay - .5, hot ? '#ffffff' : '#ff3b4d', .5 + .4 * Math.sin(t * 30)); wgl(TXT_WARN, e.x - .5, e.y - 4.6, '#ff3b4d');
  }
  glow(e.x, e.y - 2, 4, '#ff2fb9', tele ? .4 : .08);
};

/* ---------- mech / titan ---------- */
const MECH_R = ['  ▄██▄  ', ' ▟████▙ ', '▟█▀██▀█▙', '█▐████▌█', '▜█▙▄▄▟█▛', ' ▐█▌▐█▌ ', ' ▟█▙▟█▙ '];
const MECH_R2 = ['  ▄██▄  ', ' ▟████▙ ', '▟█▀██▀█▙', '█▐████▌█', '▜█▙▄▄▟█▛', ' ▐█▌▐█▌ ', '▟█▙  ▟█▙'];
const MECH_C = ['  RrrR  ', ' RrrrrR ', 'RrykkyrR', 'RGrRRrGR', 'RrGGGGrR', ' GRGGRG ', ' GRGGRG '];
AIK.mech = function (e, dt, dxp, dyp, dist) {
  const p = S.P, L = S.L, K = e.scale || 1, sp = K > 1 ? 6 : 8.5; e.cool = Math.max(0, (e.cool || 0) - dt);
  e.vy = Math.min(PH.maxFall, e.vy + PH.grav * dt);
  const chase = e.see || dist < 55;
  if (e.st === 0) {   // walk
    const want = chase ? sign(dxp) * (Math.abs(dxp) > 6 ? sp : 0) : (e.dirP || (e.dirP = Math.random() < .5 ? -1 : 1)) * sp * .4;
    e.vx = lerp(e.vx, want, Math.min(1, 3 * dt)); if (Math.abs(e.vx) > 1) e.face = sign(e.vx); else if (chase) e.face = sign(dxp) || e.face;
    moveEnt(e, dt);
    if (e.ground) { const ax = e.x + sign(e.vx || e.face) * (e.w / 2 + 1.5); if (!solidAt(ax, e.y + .5)) { e.vx = 0; if (!chase) e.dirP = -(e.dirP || 1); } if (e.hitL || e.hitR) { if (!chase) e.dirP = -(e.dirP || 1); } }
    if (Math.abs(e.vx) > 2) { e.gait = (e.gait || 0) + Math.abs(e.vx) * dt * .25; if (e.ground && Math.floor(e.gait) !== e.gstep) { e.gstep = Math.floor(e.gait); if (onScr(e.x, e.y, 20)) { sfx('step', .8); shake(.12 * K); } } }
    if (chase && e.cool <= 0) {
      e.fire -= dt / EASY.fireSlow;
      if (e.fire <= 0) {
        e.cyc = (e.cyc || 0) + 1;
        if (Math.abs(dxp) < 22 * K && Math.abs(dyp) < 8 * K && e.cyc % 2 === 1) { e.st = 1; e.tele = .65; e.vx = 0; sfx('warn', .7); }
        else if (K > 1 && e.cyc % 4 === 0) { e.st = 4; e.tele = .6; e.vx = 0; sfx('warn', .7); }
        else { e.st = 3; e.tele = .5; e.vx = 0; e.burst = K > 1 ? 5 : 3; e.bt = 0; sfx('warn', .6); }
        e.fire = rr(1.3, 2.2);
      }
    }
  } else if (e.st === 1) {   // stomp: crouch, leap, slam
    e.vx = 0; e.tele -= dt; moveEnt(e, dt);
    if (e.tele <= 0) { e.st = 2; e.vy = K > 1 ? -30 : -27; e.ground = false; e.vx = sign(dxp) * 8; sfx('stomp', .6); }
  } else if (e.st === 2) {
    moveEnt(e, dt); e.vx *= Math.exp(-.8 * dt);
    if (e.ground && e.vy >= 0) {
      sfx('stomp'); shake(.9 * K); ring(e.x, e.y, 12 * K, .5, PAL[C.amber], ['═', '─']); for (let i = 0; i < 14; i++) pt(e.x + rr(-e.w / 2, e.w / 2), e.y - .2, rr(-18, 18), rr(-14, -3), rr(.3, .7), ['▒', '░', '▪', '·'], PAL[C.greyD], { g: 40 });
      for (const dir of [-1, 1]) S.waves.push({ x: e.x + dir * (e.w / 2 + 1), y: e.y, dir, spd: 30 + K * 3, life: .75 + K * .25, dmg: 18 });
      if (K > 1) for (const dir of [-1, 1]) S.waves.push({ x: e.x + dir * (e.w / 2 + 6), y: e.y, dir, spd: 22, life: .8, dmg: 18 });
      e.st = 0; e.cool = .9;
    }
  } else if (e.st === 3) {   // aimed cannon burst
    e.vx = 0; moveEnt(e, dt); e.face = sign(dxp) || e.face;
    if (e.tele > 0) e.tele -= dt;
    else if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = .17; e.burst--; const mx = e.x + e.face * (e.w / 2 - .5), my = e.y - e.h * .72, a = vang(p.x - mx, p.y - 1.6 - my) + rr(-.05, .05); ebullet(mx, my, a, 33, 10, { big: 1 }); sfx('ebullet', .6); } }
    else { e.st = 0; e.cool = .7; }
  } else if (e.st === 4) {   // three homing rockets (titan only)
    e.vx = 0; moveEnt(e, dt); e.tele -= dt;
    if (e.tele <= 0) { for (let i = 0; i < 3; i++) { const mx = e.x + (i - 1) * 4, my = e.y - e.h * .92; ebullet(mx, my, -PI / 2 + (i - 1) * .5, 20, 14, { big: 1, hom: 1, life: 3.8, hp: 2 }); } sfx('rocket', .7); e.st = 0; e.cool = 1; }
  }
  if (e.y > L.deathY) { e.hp = 0; killEnemy(e); }
};
FOE_DRAW.mech = function (e, t) {
  const fl = e.flash > 0, K = e.scale || 1, step = Math.floor(e.gait || 0) % 2, crouch = e.st === 1 && e.tele > 0, tele = e.tele > 0 && e.st !== 0;
  const rows = step ? MECH_R2 : MECH_R, x0 = e.x - 4 * K, y0 = e.y - 7 * K + (crouch ? K : 0);
  const vis = tele && Math.floor(t * 20) % 2 ? 'w' : 'y', cols = MECH_C.map(r => r.replace(/y/g, vis));
  sprK(rows, cols, x0, y0, e.face, e.stun > 0 ? .5 : 1, fl, K);
  const mx = e.x + e.face * (e.w / 2 - .5), my = e.y - e.h * .72;
  wgl('▬', mx - .5 + e.face * 1, my - .5, fl ? '#fff' : '#ff7a3a'); if (K > 1) wgl('▬', mx - .5 + e.face * 2, my - .5, fl ? '#fff' : '#ffb347');
  glow(e.x, e.y - e.h * .6, 8 * K, '#ff3b4d', tele ? .5 : .16);
  if (tele) wgl(TXT_WARN, e.x - .5, e.y - e.h - 1.6, '#ff3b4d');
  bossBar(e, K > 1 ? 24 : 12, e.h + 1.4 + (K > 1 ? 1 : 0), '#ff3b4d');
  if (e.name) txtPx(e.name, Math.round(e.x * CW - CXp - e.name.length * CW / 2), Math.round((e.y - e.h - 3.6) * CH - CYp), '#ff3b4d', .9);
};

/* ---------- orb (satellite) ---------- */
AIK.orb = function (e, dt, dxp, dyp, dist) {
  const p = S.P, L = S.L; e.rot = (e.rot || 0) + dt * 2.6;
  if (e.owner && !e.owner.dead) {   // circling a boss
    e.ang += dt * (e.owner.orbSpd || .9); const R = e.owner.orbR || 14;
    e.x = e.owner.x + Math.cos(e.ang) * R * 1.6; e.y = e.owner.y - (e.owner.h || 10) * .5 + Math.sin(e.ang) * R * .72 + 2;
  } else {   // free: hover and snipe
    const tx = e.see ? p.x + Math.sin(e.t * .8 + e.seed) * 16 : e.home.x + Math.sin(e.t * .5 + e.seed) * 8, ty = e.see ? p.y - 10 + Math.sin(e.t * 1.1 + e.seed) * 3 : e.home.y + Math.sin(e.t * .7 + e.seed) * 2;
    e.vx = lerp(e.vx, clamp((tx - e.x) * 1.2, -14, 14), Math.min(1, 2 * dt)); e.vy = lerp(e.vy, clamp((ty - e.y) * 1.2, -10, 10), Math.min(1, 2 * dt));
    const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt; if (!collides(e, nx, ny)) { e.x = nx; e.y = ny; }
  }
  if (e.see || e.owner) {
    e.fire -= dt / EASY.fireSlow;
    if (e.fire <= 0 && e.tele <= 0) { e.tele = .5; sfx('warn', .4); }
    if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { e.fire = rr(1.8, 3); for (let i = -1; i <= 1; i++) { const a = vang(p.x - e.x, p.y - 1.6 - (e.y - 2)) + i * .22; ebullet(e.x, e.y - 2, a, 26, 8); } sfx('ebullet', .5); } }
  }
};
FOE_DRAW.orb = function (e, t) {
  const fl = e.flash > 0, cx = e.x, cy = e.y - 2, hot = e.tele > 0, col = fl ? '#fff' : e.elite ? '#ff2fb9' : '#19f0ff';
  const R = ['  ▄▄▄▄  ', ' ▟████▙ ', '▐██◙◙██▌', ' ▜████▛ ', '  ▀▀▀▀  '];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) { const ch = R[j][i]; if (ch === ' ') continue; wgl(ch, cx - 4 + i, cy - 2.5 + j, ch === '◙' ? (hot ? '#ffffff' : '#ff3b4d') : (j === 2 ? '#6a78c0' : '#3d4676'), 1); }
  for (let k = 0; k < 3; k++) { const a = e.rot + k * TAU / 3; wgl('▪', cx + Math.cos(a) * 3.6 - .5, cy + Math.sin(a) * 1.8 - .5, col); }
  glow(cx, cy, 6, col, hot ? .5 : .16); if (hot) wgl(TXT_WARN, cx - .5, cy - 4, '#ff3b4d');
};

/* ---------- koloss ---------- */
const KOL_R = ['    ▗▄▄▄▄▖    ', '   ▟██████▙   ', '  ▐█▀▀██▀▀█▌  ', ' ▄██▌◙██◙▐██▄ ', '▐████▄▄▄▄████▌', '▐█▌▐██████▌▐█▌', ' ▀▌ ▜████▛ ▐▀ ', '    ▐█▌▐█▌    ', '   ▗██▌▐██▖   ', '   ▐██▌▐██▌   ', '  ▟███▌▐███▙  ', ' ▀▀▀▀  ▀▀▀▀▀  '];
const KOL_C = KOL_R.map((r, j) => r.split('').map((c, i) => c === ' ' ? ' ' : c === '◙' ? 'r' : (j === 2 && c === '▀') ? 'y' : c === '█' ? ((i + j) % 3 === 0 ? 'g' : 'G') : 'g').join(''));
for (const r of KOL_R) if (r.length !== 14) console.error('koloss width', r.length, r);
AIK.koloss = function (e, dt, dxp, dyp, dist) {
  const p = S.P, L = S.L; e.cool = Math.max(0, (e.cool || 0) - dt); e.vy = Math.min(PH.maxFall, e.vy + PH.grav * dt);
  const chase = e.see || dist < 70;
  if (e.st === 0) {
    const want = chase ? sign(dxp) * (Math.abs(dxp) > 9 ? 5 : 0) : 0; e.vx = lerp(e.vx, want, Math.min(1, 2 * dt)); if (Math.abs(e.vx) > .8) e.face = sign(e.vx); else if (chase) e.face = sign(dxp) || e.face;
    moveEnt(e, dt); if (e.ground && !solidAt(e.x + sign(e.vx || 0) * (e.w / 2 + 1.5), e.y + .5)) e.vx = 0;
    if (Math.abs(e.vx) > 1) { e.gait = (e.gait || 0) + Math.abs(e.vx) * dt * .2; if (e.ground && Math.floor(e.gait) !== e.gstep) { e.gstep = Math.floor(e.gait); sfx('stomp', .45); shake(.25); } }
    if (chase && e.cool <= 0) { e.fire -= dt / EASY.fireSlow; if (e.fire <= 0) { e.cyc = (e.cyc || 0) + 1; const m = e.cyc % 3; e.st = m === 1 ? 1 : m === 2 ? 3 : 4; e.tele = .75; e.vx = 0; e.burst = 7; e.bt = 0; e.fire = rr(1.2, 1.9); sfx('warn', .8); } }
  } else if (e.st === 1) { e.vx = 0; e.tele -= dt; moveEnt(e, dt); if (e.tele <= 0) { e.st = 2; e.vy = -33; e.ground = false; e.vx = sign(dxp) * 9; sfx('stomp', .7); } }
  else if (e.st === 2) {
    moveEnt(e, dt); e.vx *= Math.exp(-.7 * dt);
    if (e.ground && e.vy >= 0) { sfx('bigboom', .6); shake(1.2); ring(e.x, e.y, 20, .6, PAL[C.amber], ['═', '─']); for (const dir of [-1, 1]) for (let k = 0; k < 2; k++) S.waves.push({ x: e.x + dir * (8 + k * 8), y: e.y, dir, spd: 26 + k * 8, life: 1.1, dmg: 20 }); e.st = 0; e.cool = 1; }
  } else if (e.st === 3) {   // cannon fan
    e.vx = 0; moveEnt(e, dt); e.face = sign(dxp) || e.face; if (e.tele > 0) e.tele -= dt;
    else if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = .13; e.burst--; const mx = e.x + e.face * 5, my = e.y - 8.4, a = vang(p.x - mx, p.y - 1.6 - my) + (e.burst - 3) * .09; ebullet(mx, my, a, 33, 10, { big: 1 }); sfx('ebullet', .6); } }
    else { e.st = 0; e.cool = .8; }
  } else if (e.st === 4) {   // shoulder rockets
    e.vx = 0; moveEnt(e, dt); e.tele -= dt;
    if (e.tele <= 0) { for (let i = 0; i < 4; i++) ebullet(e.x + (i - 1.5) * 3.4, e.y - 12.6, -PI / 2 + (i - 1.5) * .42, 20, 14, { big: 1, hom: 1, life: 3.8, hp: 2 }); sfx('rocket', .8); e.st = 0; e.cool = 1.1; }
  }
  if (e.y > L.deathY) { e.hp = 0; killEnemy(e); }
};
FOE_DRAW.koloss = function (e, t) {
  const fl = e.flash > 0, step = Math.floor(e.gait || 0) % 2, crouch = e.st === 1 && e.tele > 0, tele = e.tele > 0 && e.st !== 0;
  const x0 = e.x - 7, y0 = e.y - 12 + (crouch ? 1 : 0), cols = KOL_C.map(r => r.replace(/y/g, tele && Math.floor(t * 20) % 2 ? 'w' : 'y'));
  const rows = KOL_R;
  spr(rows, cols, x0, y0, e.face, e.stun > 0 ? .5 : 1, fl);
  const mx = e.x + e.face * 5.2, my = e.y - 8.4; wgl('▬', mx - .5, my - .5, fl ? '#fff' : '#ff7a3a'); wgl('▬', mx + e.face - .5, my - .5, fl ? '#fff' : '#ffb347');
  glow(e.x, e.y - 7, 14, '#ff3b4d', tele ? .5 : .18); if (tele) wgl(TXT_WARN, e.x - .5, e.y - 14.4, '#ff3b4d');
  bossBar(e, 28, 14.2, '#ff3b4d');
};

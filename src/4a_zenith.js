/* =========================================================================
   Endboss :: ZENITH
   Das Gehirn der Orbitalstation. Ein Schild aus kreisenden Orbs schützt den Kern: erst alle Orbs
   abschießen, dann liegt der Kern neun Sekunden frei. Phase 2 bringt Laser-Säulen, Phase 3 lässt
   die Schwerkraft schwanken und schickt Lenkraketen.
   ========================================================================= */
BOSSHP.zenith = 210;
BOSS_TITLE.zenith = ['Z E N I T H', 'Z E N I T H   //   D A S   G E H I R N   D E R   S T A T I O N'];
const ZEN_WINDOW = 9;

function zenOrbs(e, n) {
  for (let i = 0; i < n; i++) {
    const o = spawnEnemy({ k: 'orb', x: e.x, y: e.y - 5, owner: e, ang: i / n * TAU, hp: 5, maxhp: 5, always: true, range: 999 });
    if (o) { o.fire = 1.2 + i * .4; ring(o.x, o.y - 2, 5, .4, PAL[C.cyan]); }
  }
}
function zenAlive(e) { let n = 0; for (const o of S.en) if (o.k === 'orb' && !o.dead && o.owner === e) n++; return n; }

AIBOSS.zenith = function (e, dt, dxp, dyp, dist) {
  const B = e.bounds, p = S.P, L = S.L; e.rot += dt;
  const frac = e.hp / e.maxhp, ph = frac > .66 ? 1 : frac > .33 ? 2 : 3;
  if (e.intro > 0) { e.intro -= dt; e.noHit = true; e.y = lerp(e.y, e.cy, Math.min(1, 2 * dt)); if (e.intro <= 0) { e.orbSpd = .9; e.orbR = 13; zenOrbs(e, 4); e.noHit = true; e.fire = 2.2; } return; }
  if (ph !== e.ph) {
    e.ph = ph; e.open = 0; e.laserT = 0; e.beams = []; e.fire = 2.6; e.volley = 0;
    for (const o of S.en) if (o.k === 'orb' && o.owner === e && !o.dead) { o.dead = true; boom(o.x, o.y - 2, 1); }
    e.orbSpd = ph === 2 ? 1.25 : 1.6; e.orbR = 13; zenOrbs(e, ph + 3); e.noHit = true;
    banner('ZENITH // PHASE ' + ph, ph === 2 ? 'LASER-SÄULEN AKTIV' : 'SCHWERKRAFT SCHWANKT', C.red); shake(1.2); ring(e.x, e.y - 5, 30, 1, PAL[C.red]); sfx('bigboom', .8); glitchAmt = 1.2; S.flash = .4; S.flashCol = '#ffffff';
  }
  /* the shield: down while every orb is gone, then it comes back */
  const orbs = zenAlive(e);
  if (e.open > 0) { e.open -= dt; e.noHit = false; if (e.open <= 0) { e.open = 0; e.noHit = true; zenOrbs(e, ph + 3); banner('SCHILD AKTIV', 'NEUE ORBS', C.cyan); sfx('boot', .8); } }
  else if (orbs === 0) { e.open = ZEN_WINDOW; e.noHit = false; banner('KERN OFFEN', 'JETZT ZUSCHLAGEN', C.mint); sfx('heal'); shake(.6); }
  else e.noHit = true;
  /* the hover path */
  const spd = ph === 1 ? .5 : ph === 2 ? .7 : .9;
  const tx = e.cx + Math.sin(e.t * spd) * (B.w * .26), ty = e.cy + Math.sin(e.t * spd * 1.7) * 2.2;
  e.vx = (tx - e.x) * 3; e.vy = (ty - e.y) * 3; e.x += e.vx * dt; e.y += e.vy * dt;
  e.fire -= dt / EASY.fireSlow; const cx = e.x, cy = e.y - 5;
  /* laser columns */
  if (e.beams) for (const b of e.beams) {
    b.t += dt;
    if (b.t > b.tele && b.t < b.tele + b.dur) { if (!b.on) { b.on = true; sfx('laser', .8); shake(.6); } if (!p.dead && Math.abs(p.x - b.x) < 2.1) hurtPlayer(20, b.x, p.y); if (Math.random() < .7) pt(b.x + rr(-1.5, 1.5), B.floor - .2, rr(-8, 8), rr(-26, -6), rr(.2, .5), ['*', '+', '·'], PAL[C.cyan], { g: 30 }); }
  }
  if (e.beams) e.beams = e.beams.filter(b => b.t < b.tele + b.dur);
  if (e.fire <= 0) {
    const seq = ph === 1 ? ['aim', 'ring', 'aim'] : ph === 2 ? ['aim', 'beams', 'ring', 'beams'] : ['seek', 'beams', 'ring', 'aim', 'seek'];
    const a = seq[(e.atk = (e.atk || 0) + 1) % seq.length];
    if (a === 'aim') { e.volley = ph === 1 ? 5 : 7; e.vt = 0; e.fire = 2.3; sfx('warn'); }
    else if (a === 'ring') { const n = ph === 3 ? 28 : 20, off = Math.random() * TAU; for (let i = 0; i < n; i++) ebullet(cx, cy, off + i / n * TAU, ph === 3 ? 20 : 16, 9, { big: 1 }); sfx('scatter'); shake(.4); ring(cx, cy, 8, .4, PAL[C.cyan]); e.fire = 2.2; }
    else if (a === 'beams') { const n = ph === 2 ? 3 : 4; e.beams = e.beams || []; for (let i = 0; i < n; i++) e.beams.push({ x: B.x0 + 8 + ((i + Math.random() * .8) / n) * (B.w - 16), t: 0, tele: 1.1, dur: .8, on: false }); e.beams.push({ x: p.x, t: 0, tele: 1.1, dur: .8, on: false }); sfx('warn'); sfx('warn'); e.fire = 3; }
    else if (a === 'seek') { for (let i = 0; i < 3; i++) ebullet(cx + (i - 1) * 6, cy + 3, PI / 2 + (i - 1) * .55, 16, 12, { big: 1, hom: 1, life: 4.2, hp: 2 }); sfx('rocket', .8); e.fire = 2.4; }
  }
  if (e.volley > 0) { e.vt -= dt; if (e.vt <= 0) { e.vt = ph === 3 ? .1 : .14; e.volley--; const ang = vang(p.x - cx, p.y - 1.6 - cy) + rr(-.07, .07); ebullet(cx, cy, ang, 30, 10, { big: 1 }); sfx('ebullet', .6); } }
  /* phase 3: gravity wobbles between floaty and heavy */
  if (ph === 3) L.gmul = (L.gbase || .45) * (1 + .75 * Math.sin(S.t * .85));
};
BOSS_DRAW.zenith = function (e, t) {
  const cx = e.x, cy = e.y - 5, fl = e.flash > 0, open = e.open > 0, p = S.P, B = e.bounds;
  /* shield */
  if (e.noHit && e.intro <= 0) for (let k = 0; k < 44; k++) { const a = k / 44 * TAU + t * .3; wgl(k % 2 ? '░' : '▒', cx + Math.cos(a) * 17 - .5, cy + Math.sin(a) * 7 - .5, '#19f0ff', .25 + .2 * Math.sin(t * 4 + k)); }
  /* ring */
  const rot = (e.rot || 0) * (open ? .4 : .9);
  for (let k = 0; k < 20; k++) { const a = rot + k / 20 * TAU, rx = Math.cos(a) * 15, ry = Math.sin(a) * 5.2; wgl(k % 5 === 0 ? '◆' : '■', cx + rx - .5, cy + ry * .9 - .5 + Math.sin(a) * .3, fl ? '#fff' : open ? '#ffb347' : k % 5 === 0 ? '#ff2fb9' : '#7a88d0', 1); }
  /* core */
  for (let j = -4; j <= 4; j++) for (let i = -8; i <= 8; i++) {
    const d = Math.hypot(i / 7.6, j / 3.9); if (d > 1) continue;
    const ch = d > .86 ? '▒' : d > .6 ? '▓' : '█';
    const col = fl ? '#ffffff' : open ? (Math.floor(t * 9) % 2 ? '#ff7a3a' : '#ffb347') : d > .86 ? '#1f4fd0' : d > .55 ? '#3a56c8' : '#7f94ff';
    wgl(ch, cx + i - .5, cy + j - .5, col, 1);
  }
  /* the eye follows Sam */
  const ex = clamp((p.x - cx) / 14, -1, 1) * 2.4, ey = clamp(((p.y - 1.5) - cy) / 14, -1, 1) * 1.1;
  for (let i = -3; i <= 3; i++) wgl(Math.abs(i) === 3 ? '◖' : '█', cx + i - .5, cy - .5, fl ? '#fff' : '#05060f', 1);
  wgl('◉', cx + ex - .5, cy + ey - .5, open ? '#ffffff' : '#ff3b4d', 1); wgl('●', cx + ex - 1.5, cy + ey - .5, open ? '#ff3b4d' : '#8e1c2b', .9); wgl('●', cx + ex + .5, cy + ey - .5, open ? '#ff3b4d' : '#8e1c2b', .9);
  glow(cx, cy, 20, open ? '#ffb347' : '#19f0ff', open ? .3 : .13);
  /* laser columns */
  if (e.beams && B) for (const b of e.beams) {
    const on = b.t > b.tele, top = cy + 5, h = B.floor - top;
    for (let y = 0; y < h; y++) {
      if (on) { wgl('█', b.x - 1.5, top + y, '#ffffff', .85); wgl('█', b.x - .5, top + y, '#19f0ff', .95); wgl('█', b.x + .5, top + y, '#ffffff', .85); }
      else if (y % 2 === 0) wgl('¦', b.x - .5, top + y, '#ff3b4d', .5 + .3 * Math.sin(t * 20));
    }
    if (on) glow(b.x, top + h * .5, 10, '#19f0ff', .35); else wgl(TXT_WARN, b.x - .5, B.floor - 2, '#ff3b4d');
  }
};

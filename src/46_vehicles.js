/* =========================================================================
   FAHRZEUGE :: Hubschrauber, Wagen und Gleiter (für Sam), Kampfhubschrauber und Raser (Feinde)
   V steigt ein und aus. Maus / J = Bordkanone, Rechtsklick / K = Rakete, SHIFT = Turbo.
   Solange Sam fährt, wird sein Körper (x, y, vx, vy, w, h) jeden Schritt auf das Fahrzeug gelegt.
   So funktionieren Kamera, Feinde, Pickups, Checkpoints, Zonen und Ausgänge unverändert.
   ========================================================================= */
const VEH = {
  heli:  { name: 'HUBSCHRAUBER', w: 9, h: 3.8, hp: 120, speed: 31, boost: 50 },
  car:   { name: 'FLUCHTWAGEN',  w: 9, h: 3.2, hp: 140, speed: 34, boost: 54 },
  hover: { name: 'GLEITER',      w: 9, h: 3.2, hp: 130, speed: 40, boost: 62 },
};
S.veh = []; S.rkt = []; S.near = null; S.vseen = {};
ENEMY.gunship = { w: 9, h: 3.8, hp: 18, hook: true, score: 400 };
ENEMY.raider = { w: 9, h: 3.2, hp: 12, hook: true, score: 250 };
const VROCKET_CD = 1.1;

function spawnVeh(def) {
  const d = VEH[def.k]; if (!d) return null;
  const v = Object.assign({
    x: 0, y: 0, vx: 0, vy: 0, w: d.w, h: d.h, face: 1, hp: d.hp, maxhp: d.hp, ground: false, hitL: false, hitR: false, hitU: false, mv: null,
    driver: false, dead: false, flash: 0, inv: 0, nitro: 1, boosting: false, fireCd: 0, rktCd: 0, rot: rr(0, 9), spin: .15, wheel: 0, t: rr(0, 5),
    coyote: 0, jbuf: 0, cut: false, sndT: 0, side: 1, aim: 0, step: def.k !== 'heli', bounds: null, lean: 0, smoke: 0,
  }, def);
  v.home = { x: def.x, y: def.y, face: def.face || 1 }; v.face = def.face || 1; S.veh.push(v); return v;
}
function resetVehicles() {
  S.veh.length = 0; S.rkt.length = 0; S.near = null;
  if (S.L && S.L.vehs) for (const d of S.L.vehs) spawnVeh(d);
}
const vehName = v => VEH[v.k].name;

/* ---------- boarding ---------- */
function vehHint(v) {
  if (S.vseen[v.k]) return; S.vseen[v.k] = true;
  if (v.k === 'heli') say('ECHO', TX('Hubschrauber! A und D fliegen, W und S steigen und sinken. Maus zielt die Bordkanone, Linksklick feuert, Rechtsklick schießt Raketen, SHIFT gibt Turbo. V steigt aus.',
    'Hubschrauber! Linker Stick fliegt, rechter Stick zielt und feuert die Bordkanone. RAKETE schießt, TURBO gibt Schub, RAUS steigt aus.'), 7.5);
  else if (v.k === 'car') say('ECHO', TX('Fluchtwagen! A und D geben Gas und bremsen, LEERTASTE springt, SHIFT gibt Turbo. Fahr die Fußtruppen um, spring über Lücken und Sperren. V steigt aus.',
    'Fluchtwagen! Linker Stick gibt Gas und bremst, nach oben springt er. TURBO gibt Schub, RAKETE und rechter Stick feuern. RAUS steigt aus.'), 7.5);
  else say('ECHO', TX('Gleiter! Fährt wie ein Wagen, schwebt aber und springt höher. Maus zielt, Linksklick feuert, Rechtsklick schießt Raketen. V steigt aus.',
    'Gleiter! Fährt wie ein Wagen, schwebt aber und springt höher. Rechter Stick zielt und feuert, RAKETE schießt, RAUS steigt aus.'), 7.5);
}
function boardVeh(v) {
  const p = S.P; if (p.veh || v.dead || v.driver || p.dead) return;
  KP.KeyV = false; detachHook(true); stopFly(p, true);
  p.veh = v; v.driver = true; p.flip = 0; p.dashT = 0; p.vx = p.vy = 0; p.w = v.w; p.h = v.h; p.inv = 0; p.fly = false; p.trail.length = 0;
  v.face = p.face || 1; v.rktCd = Math.max(v.rktCd, .4);
  sfx('board'); ring(v.x, v.y - v.h / 2, 8, .5, PAL[C.cyan]); ring(v.x, v.y - v.h / 2, 12, .7, PAL[C.mag], ['.', '·']);
  for (let i = 0; i < 12; i++) pt(v.x + rr(-4, 4), v.y - rr(0, v.h), rr(-8, 8), rr(-14, -2), rr(.3, .7), ['*', '+', '·'], PAL[C.cyan], { drag: 2 });
  banner(vehName(v), TX('V = AUSSTEIGEN', 'RAUS = AUSSTEIGEN'), C.cyan); vehHint(v);
}
function placePlayerNear(v) {
  /* a standing spot on real ground close to the vehicle; if there is none (open sky), Sam bails out above it with the flight pack lit */
  const p = S.P, side = v.face || 1; p.w = 1.6; p.h = 2.9; let best = null, bs = 1e9;
  for (const o of [0, side * 6, -side * 6, side * 9, -side * 9, side * 13, -side * 13, side * 17, -side * 17]) {
    const x = v.x + o;
    for (let y = Math.floor(v.y - v.h - 1); y < v.y + 14; y++) if (!collides(p, x, y) && collides(p, x, y + 1)) { const sc = Math.abs(o) + Math.abs(y - v.y) * 1.5; if (sc < bs) { bs = sc; best = { x, y }; } break; }
  }
  if (best) { p.x = best.x; p.y = best.y; p.air = false; return true; }
  p.x = v.x; p.y = v.y - v.h - 1; p.air = true; return false;
}
function exitVeh(v) {
  const p = S.P; if (!p.veh) return;
  KP.KeyV = false; p.veh = null; v.driver = false; v.boosting = false; const ok = placePlayerNear(v);
  p.vx = clamp(v.vx * .3, -9, 9); p.vy = ok ? 0 : Math.min(v.vy, 0) - 6; p.ground = false; p.inv = Math.max(p.inv, .5); p.hitT = 0;
  if (!ok && p.fuel > .06) startFly(p);
  sfx('board', .7); ring(p.x, p.y - 1.4, 6, .35, PAL[C.cyan]);
}
function healVeh(v, k) {
  v.hp = Math.min(v.maxhp, v.hp + v.maxhp * (k || .4)); sfx('heal'); ring(v.x, v.y - v.h / 2, 9, .6, PAL[C.mint]);
  for (let i = 0; i < 14; i++) pt(v.x + rr(-4, 4), v.y - rr(0, v.h + 1), 0, rr(-14, -4), rr(.4, .9), ['+'], PAL[C.mint], {});
}

/* ---------- damage ---------- */
function hurtVeh(v, dmg, fromX, fromY) {
  if (v.dead || v.inv > 0) return false;
  v.hp -= dmg * .62; v.inv = .35; v.flash = .12;
  v.vx += (sign(v.x - fromX) || -v.face) * 5;
  shake(.5); glitchAmt = Math.max(glitchAmt, .6); S.flash = Math.max(S.flash, .12); S.flashCol = '#ff3b4d'; sfx('hurt', .8); sfx('hit', .8);
  sparks(v.x + rr(-3, 3), v.y - rr(.5, v.h), 10, sign(v.x - fromX), -.4, PAL[C.yel], 34);
  if (v.hp <= 0) destroyVeh(v);
  return true;
}
function destroyVeh(v, silent) {
  if (v.dead) return; v.dead = true; v.hp = 0; v.flash = 0; v.boosting = false; const cx = v.x, cy = v.y - v.h / 2;
  if (!silent) { boom(cx, cy, 2.4); boom(cx + rr(-3, 3), cy, 1.4); sfx('bigboom'); shake(1.1); S.freeze = .08; for (let i = 0; i < 20; i++) pt(cx + rr(-4, 4), cy + rr(-1, 1), rr(-24, 24), rr(-26, -4), rr(.7, 1.6), ['▪', '▒', '#', '%'], PAL[pick([C.greyD, C.amber, C.red])], { g: 40, bounce: .35, col: true }); }
  const p = S.P;
  if (p.veh === v) {
    p.veh = null; v.driver = false; const ok = placePlayerNear(v); p.vx = rr(-6, 6); p.vy = ok ? -16 : -22; p.ground = false; p.inv = 2; p.hitT = 0; p.fuel = Math.max(p.fuel, .7); if (!ok) startFly(p);
    if (!silent) { banner('FAHRZEUG ZERSTÖRT', 'DU BIST RAUS, SAM  //  NÄCHSTES MAL BESSER PARKEN', C.red); }
  }
  v.vx *= .3; if (v.k !== 'heli') v.vy = -12; else v.vy = -4;
}
function vehIn(x, y, v) { return Math.abs(x - v.x) < v.w / 2 + .5 && y > v.y - v.h - .5 && y < v.y + .5; }

/* ---------- weapons ---------- */
function vehAim(v) {
  const mx = v.x + v.face * 1.2, my = v.y - v.h * .55; let ax, ay;
  if (MOUSE.moved > 0) { ax = MOUSE.x + S.cam.x - mx; ay = MOUSE.y + S.cam.y - my; } else { ax = v.face * 10; ay = v.k === 'heli' ? 3 : -1.5; }
  const d = Math.hypot(ax, ay) || 1, a = vang(ax, ay);
  return { x: ax / d, y: ay / d, a, cx: Math.cos(a), cy: Math.sin(a) * .5, d, wx: mx + ax, wy: my + ay, mx, my };
}
function vehGun(v, a) {
  v.fireCd = v.k === 'heli' ? .075 : .1; v.side = -v.side;
  const off = v.k === 'heli' ? v.side * .45 : 0, mx = a.mx + a.cx * 2.4, my = a.my + a.cy * 2.4 + off * .5, ang = a.a + rr(-.02, .02);
  S.bul.push({ x: mx, y: my, vx: Math.cos(ang) * 92, vy: Math.sin(ang) * 92 * .5, life: .8, dmg: 1, col: PAL[v.k === 'heli' ? C.amber : C.cyan], a: ang, pierce: 0, hit: [] });
  sfx('shoot', .55); pt(mx, my, a.cx * 4, a.cy * 4, .08, ['*'], PAL[C.yel], {});
  if (v.k === 'heli') pt(a.mx - a.cx * .5, a.my - 1, -a.x * rr(2, 5) + rr(-1, 1), rr(-6, -2), .8, [',', '▪'], PAL[C.amber], { g: 60, bounce: .3, col: true });
}
function vehRocket(v, a) {
  v.rktCd = VROCKET_CD; const sp = 26, ang = a.a;
  S.rkt.push({ x: a.mx + a.cx * 2, y: a.my + a.cy * 2 + .6, vx: Math.cos(ang) * sp + v.vx * .5, vy: Math.sin(ang) * sp * .5 + v.vy * .3, a: ang, life: 2.4, t: 0, dmg: 8 });
  sfx('rocket'); shake(.25); for (let i = 0; i < 8; i++) pt(a.mx, a.my + .5, -a.x * rr(4, 14) + rr(-3, 3), rr(-4, 6), rr(.2, .5), ['░', '▒', '·'], PAL[C.greyD], { drag: 3 });
  if (v.k === 'heli') v.vy -= 3; else v.vx -= a.x * 4;
}
function rocketBoom(r) {
  boom(r.x, r.y, 1.5); sfx('boom'); sfx('rocketHit', .7); shake(.55); const R = 6.5;
  for (const e of S.en) {
    if (e.dead || e.noHit) continue;
    const dx = e.x - r.x, dy = (e.y - e.h / 2) - r.y, d = Math.hypot(dx, dy * 2);
    if (d < R + Math.max(e.w, e.h) * .4) damageEnemy(e, e.k === 'boss' ? 5 : r.dmg, sign(dx) || 1, -.5, false);
  }
  for (const b of S.ebul) if (Math.hypot(b.x - r.x, (b.y - r.y) * 2) < R) b.life = 0;
}
function updRockets(dt) {
  for (const r of S.rkt) {
    r.t += dt; r.life -= dt;
    /* gentle homing: steer toward the enemy nearest to the flight line */
    let best = null, bs = 1e9; const ca = Math.atan2(r.vy * 2, r.vx);
    for (const e of S.en) {
      if (e.dead || e.noHit) continue; const dx = e.x - r.x, dy = (e.y - e.h / 2) - r.y, d = Math.hypot(dx, dy * 2); if (d > 60 || d < 1) continue;
      let da = Math.atan2(dy * 2, dx) - ca; da = ((da + PI * 3) % TAU) - PI; if (Math.abs(da) > .55) continue;
      if (d + Math.abs(da) * 20 < bs) { bs = d + Math.abs(da) * 20; best = { da, e }; }
    }
    if (best && r.t > .18) { const s = Math.hypot(r.vx, r.vy * 2), na = ca + clamp(best.da, -2.8 * dt, 2.8 * dt); r.vx = Math.cos(na) * s; r.vy = Math.sin(na) * s * .5; }
    const sp = Math.hypot(r.vx, r.vy * 2), tsp = Math.min(70, 26 + r.t * 90); if (sp > 1) { const k = tsp / sp; r.vx *= k; r.vy *= k; }
    r.a = Math.atan2(r.vy * 2, r.vx);
    let hit = false;
    for (let s = 0; s < 3 && !hit; s++) {
      r.x += r.vx * dt / 3; r.y += r.vy * dt / 3;
      if (solidAt(r.x, r.y)) hit = true;
      else for (const e of S.en) if (!e.dead && !e.noHit && Math.abs(r.x - e.x) < e.w / 2 + .8 && r.y > e.y - e.h - .8 && r.y < e.y + .8) { hit = true; break; }
    }
    if (Math.random() < .9) pt(r.x - r.vx * .02, r.y - r.vy * .02, rr(-2, 2), rr(-2, 2), rr(.25, .5), ['░', '▒', '·', '*'], PAL[pick([C.amber, C.greyD, C.yel])], { drag: 2 });
    if (hit || r.life <= 0) { r.dead = true; rocketBoom(r); }
  }
  S.rkt = S.rkt.filter(r => !r.dead);
}

/* ---------- the ride ---------- */
function vehGroundDist(v, maxD) { const h = rayTile(v.x, v.y, 0, 1, maxD); return h ? h.d : maxD; }
function updRide(v, dt) {
  const p = S.P, L = S.L, d = VEH[v.k];
  const left = KEY.KeyA || KEY.ArrowLeft, right = KEY.KeyD || KEY.ArrowRight, up = KEY.KeyW || KEY.ArrowUp || KEY.Space, down = KEY.KeyS || KEY.ArrowDown;
  const dir = (right ? 1 : 0) - (left ? 1 : 0), jumpP = pressed('Space') || pressed('KeyW') || pressed('ArrowUp'), boostHeld = KEY.ShiftLeft || KEY.ShiftRight || KEY.KeyL;
  v.fireCd = Math.max(0, v.fireCd - dt); v.rktCd = Math.max(0, v.rktCd - dt); v.inv = Math.max(0, v.inv - dt); v.flash = Math.max(0, v.flash - dt); v.t += dt;
  const a = vehAim(v); v.aim = a.a; p.aim = a;
  /* turbo */
  const want = boostHeld && v.nitro > .03 && (dir || Math.abs(v.vx) > 6 || v.k === 'heli');
  if (want) v.nitro = Math.max(0, v.nitro - dt * (v.k === 'heli' ? .42 : .5)); else v.nitro = Math.min(1, v.nitro + dt * .2);
  if (want && !v.boosting) sfx('dash', .8); v.boosting = want;
  const maxV = want ? d.boost : d.speed, pvx = v.vx;
  if (v.k === 'heli') {
    const dirY = (down ? 1 : 0) - (up ? 1 : 0), k = Math.min(1, 2.7 * dt);
    const tvx = dir * maxV + (L.wind || 0) * .55, tvy = dirY < 0 ? -21 : dirY > 0 ? 25 : Math.sin(v.t * 2.4) * 1.2;
    v.vx += (tvx - v.vx) * k; v.vy += (tvy - v.vy) * Math.min(1, 3.4 * dt);
    if (v.ground && !dir && dirY >= 0) v.vx *= Math.exp(-6 * dt);
    if (Math.abs(v.vx) > 3) v.face = sign(v.vx); else if (dir) v.face = dir;
    v.spin = Math.min(1, v.spin + dt * 2);
  } else {
    const hover = v.k === 'hover', acc = v.ground ? 88 : 34;
    if (dir) {
      if (sign(v.vx) !== dir && v.vx !== 0) v.vx += dir * acc * 2.4 * dt;
      else if (Math.abs(v.vx) < maxV) { v.vx += dir * acc * dt; if (Math.abs(v.vx) > maxV) v.vx = dir * maxV; }
      else if (v.ground) v.vx -= sign(v.vx) * 46 * dt;
      v.face = dir;
    } else if (v.ground) { v.vx *= Math.exp(-(down ? 5 : 1.7) * dt); if (Math.abs(v.vx) < .5) v.vx = 0; }
    else v.vx *= Math.exp(-.12 * dt);
    if (down && v.ground) v.vx *= Math.exp(-4 * dt);
    v.vy = Math.min(PH.maxFall, v.vy + (hover ? 64 : 84) * dt);
    if (v.ground) v.coyote = .1; else v.coyote = Math.max(0, v.coyote - dt);
    if (jumpP) v.jbuf = .15; else v.jbuf = Math.max(0, v.jbuf - dt);
    if (v.jbuf > 0 && (v.ground || v.coyote > 0)) { v.vy = hover ? -35 : -30; v.jbuf = 0; v.coyote = 0; v.ground = false; v.cut = false; sfx('jump', .8); for (let i = 0; i < 8; i++) pt(v.x + rr(-4, 4), v.y, rr(-10, 10), rr(-4, 0), rr(.2, .5), ['·', '░'], PAL[C.grey], { drag: 3 }); }
    if (!up && v.vy < -14 && !v.cut) { v.vy *= .6; v.cut = true; } if (v.ground) v.cut = false;
    if (Math.abs(v.vx) > 1) v.wheel += v.vx * dt * .5;
    if (v.ground && Math.abs(v.vx) > 6 && Math.random() < dt * 40) pt(v.x - v.face * 4.5, v.y - .1, -v.face * rr(2, 9), rr(-4, -.5), rr(.2, .5), ['░', '·', '.'], PAL[C.greyD], { drag: 3 });
    v.spin = 1;
  }
  /* weapons */
  const fireHeld = MOUSE.l || KEY.KeyJ;
  if (fireHeld && v.fireCd <= 0) vehGun(v, a);
  if ((pressed('KeyK') || pressed('KeyE') || MOUSE.rp) && v.rktCd <= 0) vehRocket(v, a);
  /* move */
  if (v.hp > 0) moveEnt(v, dt, false);
  if (v.justLanded && !v.dead) { v.lastVy = v.lastVy || 0; }
  if ((v.hitL || v.hitR) && Math.abs(pvx) > 25 && v.k !== 'heli') { hurtVeh(v, 5 + (Math.abs(pvx) - 25) * .5, v.x + (v.hitR ? 1 : -1) * 5, v.y); shake(.6); sfx('stomp', .6); v.vx = -sign(pvx) * 6; }
  else if ((v.hitL || v.hitR) && Math.abs(pvx) > 18 && v.k === 'heli') { hurtVeh(v, 4, v.x + (v.hitR ? 1 : -1) * 5, v.y); }
  if (v.k === 'heli' && v.hitU && v.vy < -10) hurtVeh(v, 3, v.x, v.y - 5);
  /* ramming */
  if (v.k !== 'heli' && Math.abs(v.vx) > 18) {
    for (const e of S.en) {
      if (e.dead || e.k === 'boss' || e.noHit || e.k === 'gunship') continue;
      if (Math.abs(e.x - v.x) < (e.w + v.w) / 2 - .6 && e.y > v.y - v.h && e.y - e.h < v.y - .4 && S.t - (e.rammed || -9) > .35) {
        e.rammed = S.t; damageEnemy(e, e.k === 'warden' ? 5 : 4, sign(v.vx), -.4, false); v.vx *= .88; shake(.45); sparks(e.x, e.y - 1.2, 14, sign(v.vx), -.5, PAL[C.yel], 38); sfx('stomp', .5);
      }
    }
  }
  /* electrified water and sparks hurt a car, too */
  if (v.k !== 'heli' && v.ground) { const tx = Math.floor(v.x), ty = Math.floor(v.y - .3); for (let i = -3; i <= 3; i += 3) if (L.tt(tx + i, ty) === T.HAZ) { if (hurtVeh(v, 12, v.x, v.y + 1)) { v.vy = -22; sfx('zap'); } break; } }
  /* vent updraft carries a helicopter, too */
  if (v.k === 'heli') { const tx = Math.floor(v.x), ty = Math.floor(v.y - v.h / 2); if (L.tt(tx, ty) === T.VENT) v.vy = Math.max(-34, v.vy - 150 * dt); }
  /* limits */
  const B = v.bounds;
  if (B) {
    if (B.x0 !== undefined && v.x - v.w / 2 < B.x0) { v.x = B.x0 + v.w / 2; v.vx = Math.max(0, v.vx); }
    if (B.x1 !== undefined && v.x + v.w / 2 > B.x1) { v.x = B.x1 - v.w / 2; v.vx = Math.min(0, v.vx); }
    if (B.y0 !== undefined && v.y - v.h < B.y0) { v.y = B.y0 + v.h; v.vy = Math.max(0, v.vy); }
    if (B.y1 !== undefined && v.y > B.y1) { v.y = B.y1; v.vy = Math.min(0, v.vy); }
  }
  if (B && B.block) for (const r of B.block) {   // no-fly rectangles (e.g. the boss arena entrance)
    const ox = Math.min(v.x + v.w / 2, r.x1) - Math.max(v.x - v.w / 2, r.x0), oy = Math.min(v.y, r.y1) - Math.max(v.y - v.h, r.y0);
    if (ox > 0 && oy > 0) { if (ox < oy) { if (v.x < (r.x0 + r.x1) / 2) { v.x -= ox; v.vx = Math.min(0, v.vx); } else { v.x += ox; v.vx = Math.max(0, v.vx); } } else { if (v.y - v.h / 2 < (r.y0 + r.y1) / 2) { v.y -= oy; v.vy = Math.min(0, v.vy); } else { v.y += oy; v.vy = Math.max(0, v.vy); } } }
  }
  if (v.x < v.w / 2) { v.x = v.w / 2; v.vx = Math.max(0, v.vx); } if (v.x > L.W - v.w / 2) { v.x = L.W - v.w / 2; v.vx = Math.min(0, v.vx); }
  if (v.y - v.h < 2) { v.y = 2 + v.h; v.vy = Math.max(0, v.vy); }
  if (v.y > L.deathY && !v.dead) { v.hp = 0; destroyVeh(v, true); S.P.hp = 0; killPlayer(); return; }
  /* effects */
  if (v.boosting) for (let i = 0; i < 2; i++) pt(v.x - v.face * rr(4, 6), v.y - rr(.4, v.h * .8), -v.face * rr(14, 34), rr(-3, 3), rr(.15, .35), ['═', '─', '▪', '·'], PAL[pick([C.cyan, C.mag, C.white])], { drag: 2.5 });
  if (v.k === 'heli' && v.spin > .5) { const gd = vehGroundDist(v, 8); if (gd < 7 && Math.random() < dt * 60) pt(v.x + rr(-4, 4), v.y + gd - .2, rr(-1, 1) * (30 - gd * 2) , rr(-5, -.5), rr(.25, .6), ['░', '·', '▒', '.'], PAL[C.greyD], { drag: 3 }); }
  v.sndT -= dt; if (v.sndT <= 0) { v.sndT = v.k === 'heli' ? .085 : .12; sfx(v.k === 'heli' ? 'rotor' : 'engine', clamp(.35 + Math.abs(v.vx) / 60, .35, .9)); }
  /* the driver's body follows the vehicle */
  p.x = v.x; p.y = v.y; p.vx = v.vx; p.vy = v.vy; p.ground = v.ground; p.face = v.face; p.w = v.w; p.h = v.h; p.inv = 0;
  p.hitT = 0; p.fuel = Math.min(1, p.fuel + dt * .5); p.hp = Math.min(100, p.hp + dt * 4);
  /* leaving */
  if (pressed('KeyV')) exitVeh(v);
}

/* ---------- parked and wrecked vehicles ---------- */
function updParked(v, dt) {
  v.t += dt; v.flash = Math.max(0, v.flash - dt); v.inv = Math.max(0, v.inv - dt);
  if (v.k === 'heli') {
    v.vx *= Math.exp(-2.2 * dt); v.vy += ((v.dead ? 36 : 7) - v.vy) * Math.min(1, 1.6 * dt);
    v.spin = v.dead ? Math.max(0, v.spin - dt * .6) : v.ground ? Math.max(.12, v.spin - dt * .5) : 1;
  } else { v.vx *= Math.exp(-3 * dt); v.vy = Math.min(PH.maxFall, v.vy + 84 * dt); if (v.ground && Math.abs(v.vx) < .3) v.vx = 0; }
  if (Math.abs(v.vx) > .4 || !v.ground || v.vy > 1) moveEnt(v, dt, false);
  if (v.y > S.L.deathY) { v.dead = true; v.x = -999; v.y = -999; v.vx = v.vy = 0; return; }
  if (v.dead && onScr(v.x, v.y - v.h / 2, 12)) { if (Math.random() < dt * 14) pt(v.x + rr(-3, 3), v.y - rr(.5, v.h), rr(-2, 2), rr(-14, -6), rr(.7, 1.5), ['░', '▒', '▓', '·'], PAL[C.greyD], { g: -4, drag: .8 }); if (Math.random() < dt * 9) pt(v.x + rr(-3, 3), v.y - rr(.5, v.h), rr(-2, 2), rr(-9, -3), rr(.3, .6), ['*', '+', '^'], PAL[pick([C.amber, C.red, C.yel])], { g: -10 }); }
  if (v.k === 'heli' && !v.dead && v.spin > .5 && onScr(v.x, v.y, 10)) { const gd = vehGroundDist(v, 8); if (gd < 7 && Math.random() < dt * 50) pt(v.x + rr(-4, 4), v.y + gd - .2, rr(-1, 1) * (30 - gd * 2), rr(-5, -.5), rr(.25, .6), ['░', '·', '▒', '.'], PAL[C.greyD], { drag: 3 }); }
}

function updVehicles(dt) {
  const p = S.P; S.near = null; if (!p) return;
  if (S.mode !== 'play' && S.mode !== 'boss') return;
  for (const v of S.veh) {
    if (v.dead && !v.driver) { updParked(v, dt); continue; }
    if (v.driver && p.veh === v) { if (!p.dead) updRide(v, dt); } else updParked(v, dt);
    /* smoke and flames from a damaged ride */
    const f = v.hp / v.maxhp;
    if (!v.dead && f < .4 && onScr(v.x, v.y - v.h / 2, 12)) {
      if (Math.random() < dt * (f < .2 ? 26 : 12)) pt(v.x - v.face * rr(1, 3), v.y - v.h * rr(.4, .9), rr(-2, 2), rr(-10, -4), rr(.5, 1.1), ['░', '▒', '·'], PAL[C.greyD], { g: -4, drag: .8 });
      if (f < .2 && Math.random() < dt * 14) pt(v.x - v.face * rr(1, 3), v.y - v.h * rr(.4, .9), rr(-2, 2), rr(-8, -3), rr(.25, .5), ['*', '+'], PAL[pick([C.amber, C.red])], { g: -8 });
    }
  }
  updRockets(dt);
  if (p.dead || p.veh) return;
  let best = null, bd = 1e9;
  for (const v of S.veh) {
    if (v.dead || v.driver) continue;
    const dx = Math.abs(p.x - v.x), ok = dx < v.w / 2 + 3 && p.y > v.y - v.h - 3 && p.y - p.h < v.y + 1.5;
    if (ok && dx < bd) { bd = dx; best = v; }
  }
  S.near = best;
  if (best && pressed('KeyV')) boardVeh(best);
}

/* =========================================================================
   enemy vehicles
   ========================================================================= */
function aiGunship(e, dt, dxp, dyp, dist) {
  const p = S.P, L = S.L, side = (e.seed % 2 > 1 ? 1 : -1), see = e.see;
  const tx = see ? p.x + side * (19 + (e.seed % 7)) + Math.sin(e.t * .7 + e.seed) * 7 : e.home.x + Math.sin(e.t * .35 + e.seed) * 16;
  let ty = see ? (p.y - 1.5) - 9 + Math.sin(e.t * 1.1 + e.seed) * 2.5 : e.home.y + Math.sin(e.t * .9 + e.seed) * 2; ty = clamp(ty, 14, L.deathY - 12);
  const ax = clamp((tx - e.x) * 1.2 - e.vx * 1.5, -26, 26), ay = clamp((ty - e.y) * 1.6 - e.vy * 2, -24, 24);
  e.vx = clamp(e.vx + ax * dt, -17, 17); e.vy = clamp(e.vy + ay * dt, -11, 11);
  const nx = e.x + e.vx * dt; if (collides(e, nx, e.y)) e.vx *= -.4; else e.x = nx;
  const ny = e.y + e.vy * dt; if (collides(e, e.x, ny)) e.vy *= -.4; else e.y = ny;
  e.face = sign(dxp) || e.face; e.rot = (e.rot || 0) + dt * 30;
  if (see) {
    e.fire -= dt / EASY.fireSlow;
    if (e.fire <= 0 && e.tele <= 0 && e.burst <= 0) { e.tele = .55; e.cyc = (e.cyc || 0) + 1; sfx('warn', .6); }
    if (e.tele > 0) {
      e.tele -= dt;
      if (e.tele <= 0) {
        e.fire = rr(1.4, 2.2);
        if (e.cyc % 3 === 0) { const a = vang(p.x - e.x, p.y - 1.6 - (e.y - 1.5)); ebullet(e.x + e.face * 3, e.y - .8, a, 21, 16, { big: 1, hom: 1, life: 3.4 }); sfx('rocket', .6); pt(e.x + e.face * 3, e.y - .8, 0, 0, .15, ['*'], PAL[C.red], {}); }
        else { e.burst = 4; e.bt = 0; }
      }
    }
    if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = .11; e.burst--; const a = vang(p.x - e.x, p.y - 1.6 - (e.y - 1.5)) + rr(-.06, .06); ebullet(e.x + e.face * 3.5, e.y - 1.2, a, 34, 9); sfx('ebullet', .5); } }
  }
  if (e.y > L.deathY) e.dead = true;
}
function aiRaider(e, dt, dxp, dyp, dist) {
  const L = S.L, p = S.P; e.vy = Math.min(PH.maxFall, e.vy + PH.grav * dt);
  const chase = e.see || dist < 60; e.cool = Math.max(0, (e.cool || 0) - dt);
  const want = chase ? sign(dxp) * (Math.abs(dxp) > 5 ? 26 : 16) : (e.dirP || (e.dirP = Math.random() < .5 ? -1 : 1)) * 8;
  e.vx = lerp(e.vx, want, Math.min(1, 2.4 * dt)); if (Math.abs(e.vx) > 2) e.face = sign(e.vx);
  if (e.see && e.burst <= 0 && Math.abs(dyp) < 9 && Math.abs(dxp) < 42) {
    e.fire -= dt / EASY.fireSlow; if (e.fire <= 0 && e.tele <= 0) { e.tele = .4; sfx('warn', .5); }
    if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { e.burst = 3; e.bt = 0; e.fire = rr(1.6, 2.4); } }
  }
  if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = .14; e.burst--; const a = vang(p.x - e.x, p.y - 1.6 - (e.y - 1.6)) + rr(-.05, .05); ebullet(e.x + e.face * 4.6, e.y - 1.6, a, 32, 9); sfx('ebullet', .5); } }
  const pvx = e.vx; moveEnt(e, dt);
  if (e.ground) {
    const dirx = sign(e.vx || e.face), aheadX = e.x + dirx * (e.w / 2 + 2.5), wall = (e.hitL || e.hitR);
    const pit = !solidAt(aheadX, e.y + .5) && L.tt(Math.floor(aheadX), Math.floor(e.y + .5)) !== T.ONE;
    if ((wall || pit) && Math.abs(pvx) > 5) { e.vy = -31; e.vx = pvx; e.ground = false; }
    else if (pit && !chase) { e.dirP = -dirx; e.vx = 0; }
  }
  if (e.y > L.deathY) { e.dead = true; if (e.arena) e.arena.alive = Math.max(0, e.arena.alive - 1); }
}

/* =========================================================================
   drawing
   ========================================================================= */
const CAR_R = ['  ▗▄▄▄▄▖ ', '▟█▌   ▐█▙', ' ●▀▀▀▀▀● '], CAR_C = ['qqqVVVVqq', 'rqqkkkqqa', 'qGmmmmmGq'];
const HOV_R = ['  ▗▄▄▄▄▖ ', '▟█▌   ▐█▙', ' ▝▀▀▀▀▀▘ '], HOV_C = ['ccwwwwwcc', 'rccccccca', 'ccmmmmmcc'];
const RAI_R = ['  ▲▄▄▄▄▲ ', '▟█▌   ▐█▙', ' ●▀▀▀▀▀● '], RAI_C = ['RRRrrrRRR', 'rrRrrrRra', 'rGRRRRRGr'];
const HELI_R = ['▗▄▄▄▄▄▄▟██▙▖', '  ▝▀▀▀▀▜██▛▘', '   ═╧════╧═ '], HELI_C = ['gggggggqkkqm', 'GGGGGGGqkkqm', 'kkkgkkkkgkkk'];
const GS_R = HELI_R, GS_C = ['RRRRRRRrkkra', 'RRRRRRRrkkra', 'kkkgkkkkgkkk'];
for (const r of [CAR_R, CAR_C, HOV_R, HOV_C, RAI_R, RAI_C]) for (const x of r) if (x.length !== 9) console.error('sprite width', x.length, x);
for (const r of [HELI_R, HELI_C, GS_C]) for (const x of r) if (x.length !== 12) console.error('sprite width', x.length, x);
/* Sam's head in the cockpit: dark backing, the head, a cyan glass tint on top */
function cockpit(cx, cy, w, h, who, t) {   // who: 0 empty, 1 Sam, 2 enemy pilot
  const px = Math.round((cx - w / 2) * CW - CXp), py = Math.round(cy * CH - CYp), pw = Math.round(w * CW), ph = Math.round(h * CH);
  rectPx(px, py, pw, ph, who === 2 ? '#2a0a14' : '#10163a', .95);
  if (who === 1) { const u = Math.max(1, Math.round(CH * .08)); drawSamGrid(SAM_HEAD, Math.round(px + (pw - 13 * u) / 2), Math.round(py + ph - 10 * u - 1), u, 1); }
  else if (who === 2) { wgl('▪', cx - .5 - .6, cy + h * .4, '#ffb347', .9); wgl('▪', cx - .5 + .6, cy + h * .4, '#ffb347', .9); }
  rectPx(px, py, pw, ph, who === 2 ? '#ff3b4d' : '#19f0ff', who === 0 ? .1 : .16); gl('╱', px + pw - CW, py, '#ffffff', .3);
}

function drawBeam(px, py, len, wd, col, a) {
  g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, py, 0, py + len); gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; lastFill = '';
  g.beginPath(); g.moveTo(px - CW * .5, py); g.lineTo(px + CW * .5, py); g.lineTo(px + wd / 2, py + len); g.lineTo(px - wd / 2, py + len); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over';
}
function drawRotor(x, y, face, spin, t, rot, col, len) {
  /* x: centre of the blades, y: row, len: half-length in cells */
  const f = Math.floor(rot) % 2;
  for (let i = -len; i <= len; i++) {
    const ch = spin > .55 ? (f ? '═' : '─') : spin > .2 ? '╌' : (i < 0 ? '╲' : '╱'), a = spin > .55 ? (.55 + .4 * (1 - Math.abs(i) / (len + 1))) : .8;
    wgl(Math.abs(i) < 1 && spin > .2 ? '╤' : ch, x + i - .5, y, col, a);
  }
  if (spin > .55) glow(x, y + .4, len + 1, col, .1);
}
function drawGunGlyph(cx, cy, a, fl, col) {
  const gg = gunGlyph(a); wgl(gg, cx + Math.cos(a) * 1 - .5, cy + Math.sin(a) * .5 - .5, fl ? '#fff' : '#d0d8ff'); wgl(gg, cx + Math.cos(a) * 2 - .5, cy + Math.sin(a) * 1 - .5, fl ? '#fff' : col);
}
function drawVeh(v, t) {
  const fl = v.flash > .02, dead = v.dead, al = dead ? .85 : (v.inv > 0 && Math.floor(t * 24) % 2 ? .6 : 1), cy = v.y - v.h / 2;
  const dcol = r => dead ? r.map(s => s.replace(/[^ ]/g, 'G')) : r;
  if (v.k === 'heli') {
    const x0 = v.x - 6, y0 = v.y - 4, lean = clamp(v.vx / 50, -1, 1);
    if (!dead && v.driver) { const gd = vehGroundDist(v, 40); drawBeam(Math.round((v.x + v.face * 5) * CW - CXp), Math.round((v.y - 1.2) * CH - CYp), Math.min(gd, 30) * CH, 7 * CW + gd * CW * .2, '#cfe6ff', .22); }
    spr(dead ? HELI_R : HELI_R, dcol(HELI_C), x0, y0 + 1, v.face, al, fl);
    drawRotor(v.x - v.face * .2, y0, v.face, v.spin, t, v.rot += v.spin * .6, dead ? '#3d4676' : '#b9d8ff', 6);
    wgl(Math.floor(t * 30) % 2 && v.spin > .5 ? '┊' : '╎', v.x - v.face * 5.9 - .5, y0 + .1, '#b9d8ff', v.spin > .5 ? .8 : .3);
    if (!dead && v.driver) { drawGunGlyph(v.x + v.face * 2, v.y - 1.1, v.aim, fl, '#ffb347'); if (v.spin > .5) { glow(v.x, cy, 8, '#19f0ff', .1); } }
    if (!dead && !v.driver && v.spin < .3) { /* parked: tiny beacon */ wgl('·', v.x - .5, y0 + .1, '#ff3b4d', .4 + .4 * Math.sin(t * 3)); }
    if (!dead) wgl('▪', v.x - v.face * 6.1 - .5, y0 + 1.4, Math.floor(t * 2) % 2 ? '#ff3b4d' : '#3a1020', .9);
    if (!dead) cockpit(v.x + v.face * 3, v.y - 3, 2, 2, v.driver ? 1 : 0, t);
  } else {
    const rows = v.k === 'hover' ? HOV_R : CAR_R, cols = v.k === 'hover' ? HOV_C : CAR_C, x0 = v.x - 4.5, y0 = v.y - 3, bob = v.k === 'hover' && !dead ? Math.sin(t * 5 + v.t) * .15 : 0;
    spr(rows, dcol(cols), x0, y0 + bob - (v.k === 'hover' && !dead ? .35 : 0), v.face, al, fl);
    if (!dead) cockpit(v.x, y0 + 1 + bob - (v.k === 'hover' ? .35 : 0), 3, 1, v.driver ? 1 : 0, t);
    if (v.k === 'car' && !dead) { const wf = Math.floor(v.wheel) % 2 ? '+' : 'x'; wgl(wf, x0 + 1 - .5, y0 + 2, '#eaf6ff', .85); wgl(wf, x0 + 7 - .5, y0 + 2, '#eaf6ff', .85); }
    if (!dead) {
      glow(v.x, v.y - .6, 8, v.k === 'hover' ? '#19f0ff' : '#ff2fb9', v.boosting ? .5 : .2);
      if (v.k === 'hover') for (let i = 0; i < 7; i++) wgl('▔', x0 + 1 + i - .5, v.y - .1 + bob - .35, '#19f0ff', .5 + .3 * Math.sin(t * 9 + i));
      wgl('▬', v.x + v.face * 4.5 - .5, v.y - 1.8, '#ffe45e', .9); glow(v.x + v.face * 6, v.y - 1.8, 8, '#ffe45e', .1);
      if (v.driver) drawGunGlyph(v.x - v.face * .2, v.y - 3.2, v.aim, fl, '#19f0ff');
    }
  }
  if (!dead && v.hp / v.maxhp < .4) glow(v.x, cy, 6, '#ff7a3a', .12 + .1 * Math.sin(t * 20));
  if (dead) glow(v.x, cy, 7, '#ff7a3a', .1 + .06 * Math.sin(t * 12));
  if (S.near === v && !v.driver && !dead) {
    const s = TX('[V] EINSTEIGEN', 'EINSTEIGEN'), px = Math.round(v.x * CW - CXp - s.length * CW / 2), py = Math.round((v.y - v.h - 4.2 + Math.sin(t * 5) * .25) * CH - CYp);
    rectPx(px - CW, py - 2, (s.length + 2) * CW, CH + 4, '#05060f', .6); txtPx(s, px, py, '#ffe45e'); wgl('▼', v.x - .5, v.y - v.h - 3, '#ffe45e', .9);
  }
}
function drawRocket(r, t) {
  if (!onScr(r.x, r.y, 4)) return; const gg = gunGlyph(r.a), ch = gg === '▬' ? '►' : gg;
  wgl(Math.cos(r.a) >= 0 ? (Math.abs(Math.sin(r.a)) < .38 ? '►' : ch) : (Math.abs(Math.sin(r.a)) < .38 ? '◄' : ch), r.x - .5, r.y - .5, '#ffffff'); glow(r.x, r.y, 5, '#ffb347', .5);
  wgl('·', r.x - r.vx * .03 - .5, r.y - r.vy * .03 - .5, '#ffb347', .8);
}
function drawVehicles(t) {
  for (const v of S.veh) if (onScr(v.x, v.y - v.h / 2, 18)) { halo(v.x, v.y - v.h / 2, 8, .5); drawVeh(v, t); }
  for (const r of S.rkt) drawRocket(r, t);
}
function drawEnemyVeh(e, t) {
  const fl = e.flash > 0, tele = e.tele > 0, hp = e.hp / e.maxhp;
  if (e.k === 'gunship') {
    const x0 = e.x - 6, y0 = e.y - 4;
    spr(GS_R, GS_C, x0, y0 + 1, e.face, 1, fl); cockpit(e.x + e.face * 3, e.y - 3, 2, 2, 2, t); drawRotor(e.x - e.face * .2, y0, e.face, 1, t, e.rot || 0, fl ? '#fff' : '#ff8a9a', 6);
    wgl(Math.floor(t * 30) % 2 ? '┊' : '╎', e.x - e.face * 5.9 - .5, y0 + .1, '#ff8a9a', .8);
    const a = vang(S.P.x - e.x, S.P.y - 1.6 - (e.y - 1.5)); drawGunGlyph(e.x + e.face * 2, e.y - 1, a, fl, '#ff3b4d');
    glow(e.x, e.y - 2, 8, '#ff3b4d', tele ? .5 : .14); if (tele) wgl(TXT_WARN, e.x - .5, e.y - 6, '#ff3b4d');
    const bw = 12, n = Math.round(bw * hp); txtPx('▐' + '█'.repeat(n) + '░'.repeat(bw - n) + '▌', Math.round((e.x - bw / 2 - 1) * CW - CXp), Math.round((e.y - 7) * CH - CYp), '#ff3b4d', .9);
  } else if (e.k === 'raider') {
    const x0 = e.x - 4.5, y0 = e.y - 3; spr(RAI_R, RAI_C, x0, y0, e.face, e.stun > 0 ? .5 : 1, fl); cockpit(e.x, y0 + 1, 3, 1, 2, t);
    const wf = Math.floor(e.x * .6) % 2 ? '+' : 'x'; wgl(wf, x0 + 1 - .5, y0 + 2, '#ffd0d8', .85); wgl(wf, x0 + 7 - .5, y0 + 2, '#ffd0d8', .85);
    wgl('▬', e.x + e.face * 4.5 - .5, e.y - 1.6, tele || e.burst > 0 ? '#ffffff' : '#ff7a3a'); glow(e.x, e.y - 1, 7, '#ff3b4d', tele ? .5 : .14);
    if (tele) wgl(TXT_WARN, e.x - .5, e.y - 5, '#ff3b4d');
    if (hp < 1) { const bw = 8, n = Math.round(bw * hp); txtPx('▐' + '█'.repeat(n) + '░'.repeat(bw - n) + '▌', Math.round((e.x - bw / 2 - 1) * CW - CXp), Math.round((e.y - 5) * CH - CYp), '#ff3b4d', .8); }
  }
}

/* ---------- ambient traffic ("flyer" decor) ---------- */
function drawFlyer(d, t) {
  const span = d.x1 - d.x0 + 24, u = (((t * d.sp + (d.ph || 0) * span) * (d.dir || 1)) % span + span) % span, x = d.dir < 0 ? d.x1 + 12 - u : d.x0 - 12 + u, y = d.y;
  if (!onScr(x, y, 14)) return; const al = d.dim === undefined ? .55 : d.dim, face = d.dir < 0 ? -1 : 1;
  if (d.kind === 'heli') {
    const c1 = d.col || 'g';
    spr(['▗▄▄▄▄▟█▙▖', '  ▀▀▀▜█▛ '], [c1.repeat(7) + 'cc', '  ' + c1.repeat(4) + 'cc '], x - 4.5, y, face, al);
    for (let i = -4; i <= 4; i++) wgl(Math.floor(t * 28 + (d.ph || 0) * 9) % 2 ? '═' : '─', x + i - .5, y - 1, '#8a96c4', al * .8);
    wgl('·', x - face * 4.4, y - .2, Math.floor(t * 2 + (d.ph || 0) * 5) % 2 ? '#ff3b4d' : '#3a1020', .9); glow(x + face * 3, y + .6, 5, '#cfe6ff', .08);
  } else if (d.kind === 'car') {
    const cols = d.col || '#ff2fb9';
    wgl('▟', x - 2.5, y, '#5a66a8', al); wgl('█', x - 1.5, y, '#6a76b8', al); wgl('█', x - .5, y, '#6a76b8', al); wgl('▙', x + .5, y, '#5a66a8', al);
    wgl('▔', x - 2, y + 1, cols, al); wgl('▔', x - 1, y + 1, cols, al); wgl('▔', x, y + 1, cols, al); wgl('▔', x + 1, y + 1, cols, al);
    wgl('▪', x + face * 2 - .5, y, '#ffe45e', .9); wgl('▪', x - face * 2.5, y, '#ff3b4d', .9); glow(x, y + 1, 5, cols, .18);
    if (face > 0) for (let i = 1; i < 5; i++) wgl('·', x - 3 - i, y + .2, cols, .4 * (1 - i / 5)); else for (let i = 1; i < 5; i++) wgl('·', x + 3 + i, y + .2, cols, .4 * (1 - i / 5));
  } else if (d.kind === 'ground') {
    spr(CAR_R, CAR_C, x - 4.5, y - 3, face, al * .8); glow(x, y - .5, 6, '#ff2fb9', .12);
  }
}

/* ---------- cockpit HUD: replaces Sam's vitals while he rides ---------- */
function drawVehHud(p, t) {
  const v = p.veh, f = clamp(v.hp / v.maxhp, 0, 1), col = f > .55 ? '#5dffb0' : f > .28 ? '#ffb347' : '#ff3b4d', blink = f < .28 && Math.floor(S.t * 6) % 2;
  const X = c => Math.round(c * CW), Y = r => Math.round(r * CH);
  panel(2, 1, 41, 6, '#19f0ff', vehName(v));
  { const bu = Math.max(2, Math.floor(CH * .25)); drawSamBadge(Math.round(3.4 * CW), Math.round(2 * CH + (4 * CH - 12 * bu) / 2), bu, S.t); }
  txtPx('HÜLLE', X(11), Y(2), '#8a96c4'); const bw = 17, fill = Math.round(bw * f);
  for (let i = 0; i < bw; i++) gl(i < fill ? '█' : '░', X(17 + i), Y(2), i < fill ? (blink ? '#ffffff' : col) : '#3d4676');
  txtPx(String(Math.max(0, Math.round(f * 100))).padStart(3, ' '), X(35), Y(2), col);
  txtPx('TURBO', X(11), Y(3), '#8a96c4'); for (let i = 0; i < 6; i++) gl('▰', X(17 + i), Y(3), i < v.nitro * 6 ? (v.boosting ? '#ffffff' : '#19f0ff') : '#2a3470');
  txtPx('◊ ' + String(S.chips).padStart(3, '0'), X(24), Y(3), '#ffe45e'); txtPx('GEGNER ' + String(S.kills).padStart(2, '0'), X(31), Y(3), '#8a96c4');
  const rk = 1 - v.rktCd / VROCKET_CD; txtPx('RAKETE', X(11), Y(4), '#8a96c4'); for (let i = 0; i < 8; i++) gl('▰', X(18 + i), Y(4), i < rk * 8 ? '#ffb347' : '#2a3470');
  txtPx(v.rktCd <= 0 ? TX('RECHTSKLICK', 'RAKETE-KNOPF') : 'LÄDT...', X(28), Y(4), v.rktCd <= 0 ? '#5dffb0' : '#8a96c4');
  txtPx(TX('[V] AUSSTEIGEN', 'RAUS = AUSSTEIGEN'), X(11), Y(5), '#5dffb0');
}

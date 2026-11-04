/* =========================================================================
   simulation: world state, player, grapple, weapons, enemies, boss
   ========================================================================= */
const S = {
  L: null, P: null, t: 0, parts: [], rings: [], bul: [], ebul: [], en: [], pks: [], bolts: [], waves: [],
  cam: { x: 0, y: 0, shake: 0, sx: 0, sy: 0, lock: null }, freeze: 0, slow: 1, flash: 0, flashCol: '#fff',
  respawn: null, comms: [], commT: 0, banner: null, score: 0, chips: 0, kills: 0, stageT: 0, deaths: 0, boss: null, mode: 'play', hudT: 0, lightning: 0, lbolt: null,
};
const PH = { grav: 95, maxFall: 72, run: 25, accG: 240, accA: 150, fric: 230, jump: 33, hook: 54 };
/* friendlier tuning (Super Sam is a kid's game): enemies hit softer and shoot slower, Sam heals up, jumps forgive */
const EASY = { dmg: .55, ebulSpd: .82, fireSlow: 1.4, inv: 1.5, bossHp: 170, regenDelay: 4, regen: 3.5, hpDrop: 1.9, heal: 40, coyote: .15, jbuf: .19, dashCd: .4 };
/* flight: Sam can fly from the very start; the fuel meter drains while flying and refills on the ground */
const FLY = { speed: 24, up: 19, down: 23, acc: 7, time: 6.5, regenG: .8, regenA: .1 };

/* ---------- helpers ---------- */
function say(who, text, dur) { S.comms.push({ who, text, dur: dur || Math.max(3.2, text.length * .055), t: 0 }); }
function banner(text, sub, col) { S.banner = { text, sub: sub || '', t: 0, col: col || C.cyan }; }
function shake(a) { S.cam.shake = Math.min(1.6, Math.max(S.cam.shake, a)); }
function pt(x, y, vx, vy, life, chs, col, o) {
  if (S.parts.length > 2400) return;
  const p = { x, y, vx, vy, life, max: life, chs: Array.isArray(chs) ? chs : [chs], col, g: 0, drag: 0, hit: false, glow: 0 };
  if (o) for (const k in o) p[k] = o[k]; S.parts.push(p);
}
function ring(x, y, maxR, dur, col, chs) { S.rings.push({ x, y, r: 0, maxR, t: 0, dur, col, chs: chs || ['·', 'o', '○'] }); }
function boom(x, y, size, col) {
  size = size || 1; col = col || PAL[C.amber];
  for (let i = 0; i < 18 * size; i++) { const a = rr(0, TAU), s = rr(6, 38) * size; pt(x, y, Math.cos(a) * s, Math.sin(a) * s * .6, rr(.3, .8), ['@', '#', '*', '+', '·'], pick([col, PAL[C.yel], PAL[C.white], PAL[C.red]]), { drag: 3, g: 14 }); }
  for (let i = 0; i < 10 * size; i++) pt(x + rr(-1, 1) * size, y + rr(-1, 1) * size, rr(-6, 6), rr(-12, -2), rr(.6, 1.4), ['▒', '░', '·'], PAL[C.greyD], { drag: 1.6, g: -4 });
  ring(x, y, 7 * size, .45, col); if (size > 1.2) ring(x, y, 12 * size, .7, PAL[C.white], ['.', '·']);
  shake(.35 * size); S.flash = Math.max(S.flash, .1 * size); S.flashCol = '#ffd9a0';
}
function sparks(x, y, n, dirx, diry, col, spd) {
  for (let i = 0; i < n; i++) { const a = Math.atan2(diry, dirx) + rr(-.9, .9), s = rr(.4, 1) * (spd || 30); pt(x, y, Math.cos(a) * s, Math.sin(a) * s, rr(.15, .4), ['·', '*', '+', '.'], col || PAL[C.yel], { g: 40, drag: 1.5 }); }
}
function solidAt(x, y) { return S.L.solid(Math.floor(x), Math.floor(y)); }
function los(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d / .6);
  for (let i = 1; i < n; i++) { const t = i / n; if (solidAt(x0 + dx * t, y0 + dy * t)) return false; }
  return true;
}
/* DDA ray against solid tiles; returns {d,x,y} or null */
function rayTile(ox, oy, dx, dy, maxD) {
  const L = S.L; let tx = Math.floor(ox), ty = Math.floor(oy);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const tdx = dx === 0 ? 1e9 : Math.abs(1 / dx), tdy = dy === 0 ? 1e9 : Math.abs(1 / dy);
  let mx = dx === 0 ? 1e9 : ((dx > 0 ? tx + 1 - ox : ox - tx) * tdx), my = dy === 0 ? 1e9 : ((dy > 0 ? ty + 1 - oy : oy - ty) * tdy), d = 0;
  for (let i = 0; i < 200; i++) {
    if (mx < my) { d = mx; mx += tdx; tx += sx; } else { d = my; my += tdy; ty += sy; }
    if (d > maxD) return null;
    const t = L.tt(tx, ty); if (t === T.SOL) return { d, x: ox + dx * d, y: oy + dy * d, tx, ty };
    if (ty > L.H + 4 || ty < -4) return null;
  }
  return null;
}

/* ---------- generic box mover (center x, feet y) ---------- */
function collides(o, x, y) {
  const L = S.L, x0 = Math.floor(x - o.w / 2), x1 = Math.floor(x + o.w / 2 - 1e-4), y0 = Math.floor(y - o.h), y1 = Math.floor(y - 1e-4);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (L.solid(tx, ty)) return true;
  return false;
}
function moveEnt(o, dt, drop) {
  const L = S.L; o.hitL = o.hitR = o.hitU = false; const wasG = o.ground; o.ground = false;
  if (o.mv) { if (Math.abs(o.mv.dx) < 6) { o.x += o.mv.dx; o.y += o.mv.dy; } }
  let dx = o.vx * dt, n = Math.max(1, Math.ceil(Math.abs(dx) / .4)); const sx = dx / n;
  for (let i = 0; i < n; i++) {
    o.x += sx;
    if (collides(o, o.x, o.y)) {
      let ok = false;
      if (o.step !== false) for (let up = .25; up <= 1.05; up += .2) if (!collides(o, o.x, o.y - up)) { o.y -= up; ok = true; break; }
      if (!ok) {
        if (sx > 0) { o.x = Math.floor(o.x + o.w / 2) - o.w / 2 - .0001; o.hitR = true; } else { o.x = Math.floor(o.x - o.w / 2) + 1 + o.w / 2 + .0001; o.hitL = true; }
        o.vx = 0; break;
      }
    }
  }
  const dy = o.vy * dt; n = Math.max(1, Math.ceil(Math.abs(dy) / .4)); const sy = dy / n; let landedMv = null;
  for (let i = 0; i < n; i++) {
    const oldY = o.y; o.y += sy;
    if (sy > 0) {
      if (collides(o, o.x, o.y)) { o.y = Math.floor(o.y); o.vy = 0; o.ground = true; break; }
      if (!drop) {
        const ty = Math.floor(o.y - 1e-4);
        if (oldY <= ty + .001 && o.y > ty) { const x0 = Math.floor(o.x - o.w / 2 + .15), x1 = Math.floor(o.x + o.w / 2 - .15); let hit = false; for (let tx = x0; tx <= x1; tx++) if (L.tt(tx, ty) === T.ONE) hit = true; if (hit) { o.y = ty; o.vy = 0; o.ground = true; break; } }
        for (const m of L.movers) { if (o.x + o.w / 2 > m.x + .2 && o.x - o.w / 2 < m.x + m.w - .2 && oldY <= m.y + .35 && o.y >= m.y - .02 && o.y - m.y < 1.2) { o.y = m.y; o.vy = 0; o.ground = true; landedMv = m; break; } }
        if (o.ground) break;
      }
    } else if (sy < 0) {
      if (collides(o, o.x, o.y)) { o.y = Math.floor(o.y - o.h) + 1 + o.h + .0001; o.vy = 0; o.hitU = true; break; }
    }
  }
  o.mv = landedMv;
  if (o.ground && !wasG) o.justLanded = true; else o.justLanded = false;
}

/* =========================================================================
   player
   ========================================================================= */
function newPlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, w: 1.6, h: 2.9, face: 1, ground: false, mv: null, coyote: 0, jbuf: 0, wall: 0, wallT: 0, wallLock: 0, dashT: 0, dashCd: 0, dashDir: 1, airDash: false,
    hp: 100, inv: 0, hurtT: 0, dead: false, deadT: 0, fireCd: 0, wpn: 0, wpns: [true, false, false], aim: { x: 1, y: 0, a: 0, d: 0, cx: 1, cy: 0 }, run: 0, landT: 0, jumpCut: false, drop: 0, flashT: 0, spawnT: 0, muzzle: 0, recoil: 0, step: false,
    hook: { st: 0, x: 0, y: 0, ax: 0, ay: 0, tx: 0, ty: 0, len: 0, tgt: null, dist: 0, dx: 0, dy: 0, rt: 0, pull: 0 }, trail: [], lastGround: { x, y }, lean: 0, swing: 0,
    fly: false, fuel: 1, hitT: 99, flyHint: 0,
  };
}
const HOOK_MIN = 3.2;   // shortest rope; keeps Sam's head clear of the anchor now that the shoulder pivot sits lower
const chest = p => ({ x: p.x, y: p.y - 1.3 });   // Super Sam's shoulder (aim, hook and muzzle origin)
const vang = (dx, dy) => Math.atan2(dy * 2, dx);   // visual (pixel-space) angle for a cell-space delta
function aimWorld() {
  const p = S.P, c = chest(p);
  let ax, ay;
  if (MOUSE.moved > 0) { ax = MOUSE.x + S.cam.x - c.x; ay = MOUSE.y + S.cam.y - c.y; }
  else { ax = p.face * 6; ay = -2; }
  const d = Math.hypot(ax, ay) || 1, a = vang(ax, ay);
  return { x: ax / d, y: ay / d, a, cx: Math.cos(a), cy: Math.sin(a) * .5, d, wx: c.x + ax, wy: c.y + ay };
}

function hurtPlayer(dmg, fromX, fromY) {
  const p = S.P; if (p.dead || p.inv > 0 || p.dashT > 0 || S.mode !== 'play') return false;
  p.hp -= dmg * EASY.dmg; p.inv = EASY.inv; p.hurtT = .35; p.hitT = 0; const dir = sign(p.x - fromX) || -p.face;
  p.vx = dir * 16; p.vy = Math.min(p.vy, -15); p.dashT = 0;
  if (p.hook.st === 2) detachHook(true);
  shake(.7); glitchAmt = 1; S.flash = .25; S.flashCol = '#ff3b4d'; S.freeze = .06; sfx('hurt');
  for (let i = 0; i < 14; i++) pt(p.x, p.y - 1.5, rr(-18, 18), rr(-22, 4), rr(.3, .7), ['*', '+', '#', '%'], PAL[pick([C.red, C.mag, C.amber])], { g: 40, drag: 1 });
  if (p.hp <= 0) killPlayer();
  return true;
}
function killPlayer() {
  const p = S.P; if (p.dead) return; p.dead = true; p.deadT = 0; p.hp = 0; S.deaths++; detachHook(true); sfx('die');
  S.slow = .25; glitchAmt = 1.2; shake(1.2);
  for (let i = 0; i < 46; i++) pt(p.x + rr(-1, 1), p.y - rr(.2, 2.8), rr(-10, 10), rr(-26, -4), rr(.8, 2), ['0', '1', '#', '$', '%', '▒', '░', '▪'], PAL[pick([C.cyan, C.mag, C.white, C.vio])], { g: -6, drag: .8, glow: 1 });
  ring(p.x, p.y - 1.5, 14, .9, PAL[C.cyan]); ring(p.x, p.y - 1.5, 22, 1.3, PAL[C.mag], ['.', '·']);
}
function respawnPlayer() {
  const r = S.respawn || S.L.start; const w = S.P.wpns, wp = S.P.wpn;
  const np = newPlayer(r.x, r.y); np.wpns = w; np.wpn = wp; np.spawnT = 1.1; np.inv = 2; S.P = np; S.slow = 1; S.cam.lock && 0;
  S.cam.x = clamp(r.x - COLS / 2, 0, Math.max(0, S.L.W - COLS)); S.cam.y = clamp(r.y - ROWS * .6, 0, Math.max(0, S.L.H - ROWS));
  ring(r.x, r.y - 1.5, 10, .8, PAL[C.cyan]); sfx('boot', .7); glitchAmt = .8;
}

function startFly(p) {
  p.fly = true; p.ground = false; p.mv = null; p.vy = Math.min(p.vy, -9); p.wall = 0; p.wallT = 0; if (p.hook.st) detachHook(true);
  sfx('dash', .8); ring(p.x, p.y - 1.4, 7, .4, PAL[C.cyan]); for (let i = 0; i < 12; i++) pt(p.x + rr(-1, 1), p.y - rr(.2, 2.6), rr(-14, 14), rr(-4, 12), rr(.25, .6), ['*', '·', '+', '░'], PAL[pick([C.cyan, C.white, C.mag])], { drag: 2 });
}
function stopFly(p, silent) { if (!p.fly) return; p.fly = false; if (!silent) sfx('release', .7); }
function detachHook(silent) {
  const h = S.P.hook; if (h.st === 0 || h.st === 3) return;
  if (h.st === 2 && !silent) sfx('release');
  h.st = 3; h.rt = 0; h.tgt = null; h.sx = h.x; h.sy = h.y;
}
function fireHook() {
  const p = S.P, h = p.hook, c = chest(p), aim = aimWorld();
  if (h.st === 1 || h.st === 2) return;
  let tx = c.x + aim.x * PH.hook, ty = c.y + aim.y * PH.hook, dist = PH.hook, tgt = null, miss = true;
  const hit = rayTile(c.x, c.y, aim.x, aim.y, PH.hook);
  if (hit) { tx = hit.x; ty = hit.y; dist = hit.d; miss = false; }
  for (const e of S.en) {
    if (e.dead || !e.hook || e.noHit) continue;
    const ex = e.x, ey = e.y - e.h / 2, r = Math.max(e.w, e.h) * .55 + 1.1;
    const vx = ex - c.x, vy = ey - c.y, pr = vx * aim.x + vy * aim.y; if (pr < 0 || pr > dist) continue;
    const dd = Math.abs(vx * aim.y - vy * aim.x); if (dd < r) { dist = Math.max(0, pr - r * .4); tx = c.x + aim.x * dist; ty = c.y + aim.y * dist; tgt = e; miss = false; }
  }
  h.st = 1; h.x = c.x; h.y = c.y; h.tx = tx; h.ty = ty; h.dx = aim.x; h.dy = aim.y; h.dist = dist; h.trav = 0; h.miss = miss; h.tgt = tgt;
  sfx('hook'); p.muzzle = .08;
}
function hookStrike(e) {
  const p = S.P; detachHook(true);
  p.vx = sign(e.x - p.x) * 8; p.vy = -27; p.airDash = false; p.dashCd = 0; p.inv = Math.max(p.inv, .5);
  const dmg = e.k === 'warden' ? 7 : e.k === 'boss' ? 9 : 99; damageEnemy(e, dmg, sign(e.x - p.x), -.3, true);
  sparks(e.x, e.y - e.h / 2, 24, 0, -1, PAL[C.mint], 46); ring(e.x, e.y - e.h / 2, 9, .4, PAL[C.mint]); S.freeze = .08; shake(.5); sfx('hit'); sfx('boom', .5);
}

function updPlayer(dt) {
  const p = S.P, L = S.L, h = p.hook; if (!p || S.mode !== 'play' && S.mode !== 'boss') return;
  if (p.dead) { p.deadT += dt / (S.slow || 1); if (p.deadT > 1.5) { respawnPlayer(); } return; }
  const left = KEY.KeyA || KEY.ArrowLeft, right = KEY.KeyD || KEY.ArrowRight, up = KEY.KeyW || KEY.ArrowUp || KEY.Space, down = KEY.KeyS || KEY.ArrowDown;
  const jumpP = pressed('Space') || pressed('KeyW') || pressed('ArrowUp'), dashP = pressed('ShiftLeft') || pressed('ShiftRight') || pressed('KeyL');
  const dir = (right ? 1 : 0) - (left ? 1 : 0);
  p.spawnT = Math.max(0, p.spawnT - dt); p.inv = Math.max(0, p.inv - dt); p.hurtT = Math.max(0, p.hurtT - dt); p.fireCd = Math.max(0, p.fireCd - dt); p.dashCd = Math.max(0, p.dashCd - dt);
  p.muzzle = Math.max(0, p.muzzle - dt); p.landT = Math.max(0, p.landT - dt); p.wallLock = Math.max(0, p.wallLock - dt); p.recoil = Math.max(0, p.recoil - dt * 6);
  const aim = aimWorld(); p.aim = aim;
  if (jumpP) p.jbuf = EASY.jbuf; else p.jbuf = Math.max(0, p.jbuf - dt);
  if (p.ground) { p.coyote = EASY.coyote; p.airDash = false; p.lastGround.x = p.x; p.lastGround.y = p.y; } else p.coyote = Math.max(0, p.coyote - dt);
  p.wallT = Math.max(0, p.wallT - dt);
  if (!(KEY.Space || KEY.KeyW || KEY.ArrowUp) && p.vy < -12 && !p.jumpCut && h.st !== 2 && !p.fly) { p.vy *= .5; p.jumpCut = true; }
  if (p.ground) p.jumpCut = false;
  // facing: toward aim when aiming, else movement
  const aimFresh = MOUSE.moved > 0;
  if (aimFresh && p.wallT <= 0) p.face = aim.x >= 0 ? 1 : -1; else if (dir) p.face = dir;
  // weapon select
  for (let i = 0; i < 3; i++) if (pressed('Digit' + (i + 1)) && p.wpns[i]) { p.wpn = i; sfx('select'); }
  if (pressed('KeyQ') || MOUSE.wheel) { const s = MOUSE.wheel ? MOUSE.wheel : 1; let n = p.wpn; for (let k = 0; k < 3; k++) { n = (n + (s > 0 ? 1 : 2)) % 3; if (p.wpns[n]) { p.wpn = n; sfx('select'); break; } } }

  /* ---- flight (F toggles) + regen ---- */
  p.hitT += dt;
  if (p.hp < 100 && p.hitT > EASY.regenDelay) p.hp = Math.min(100, p.hp + EASY.regen * dt);
  if (pressed('KeyF') && p.spawnT <= .3) { if (p.fly) stopFly(p); else if (p.fuel > .06) startFly(p); else sfx('select', .5); }
  /* ---- grapple input ---- */
  const hookHeld = MOUSE.r || KEY.KeyK || KEY.KeyE, hookP = MOUSE.rp || pressed('KeyK') || pressed('KeyE');
  if (hookP && p.fly) stopFly(p, true);
  if (hookP && h.st === 0) fireHook(); else if (hookP && h.st === 3) { h.st = 0; fireHook(); }
  if (!hookHeld && (h.st === 1 || h.st === 2)) detachHook();
  if (h.st === 2 && jumpP) { detachHook(); p.vy = Math.max(-36, Math.min(p.vy, 0) - 15); p.jbuf = 0; sfx('djump'); p.jumpCut = true; ring(p.x, p.y - 1, 5, .3, PAL[C.cyan]); }

  /* ---- dash ---- */
  if (dashP && p.dashCd <= 0 && (!p.airDash || p.ground || p.fly) && p.dashT <= 0) {
    p.dashT = .17; p.dashCd = EASY.dashCd; p.dashDir = dir || p.face; p.airDash = !p.ground; sfx('dash'); p.inv = Math.max(p.inv, .2); p.face = p.dashDir;
    if (h.st === 2) detachHook(true);
    for (let i = 0; i < 10; i++) pt(p.x, p.y - rr(.3, 2.6), -p.dashDir * rr(4, 20), rr(-3, 3), rr(.2, .5), ['─', '═', '-', '·'], PAL[C.cyan], { drag: 3 });
  }
  const run = PH.run;
  if (p.dashT > 0) {
    p.dashT -= dt; p.vx = p.dashDir * 62; p.vy = 0;
    if (p.dashT <= 0) { p.vx = p.dashDir * 30; }
    if ((p.trail.length === 0 || S.t - p.trail[p.trail.length - 1].t > .018)) p.trail.push({ x: p.x, y: p.y, f: p.face, t: S.t });
  } else if (p.fly) {
    const climb = KEY.KeyW || KEY.ArrowUp || KEY.Space, dirY = (down ? 1 : 0) - (climb ? 1 : 0);
    const k = Math.min(1, FLY.acc * dt), ty = dirY < 0 ? -FLY.up : dirY > 0 ? FLY.down : Math.sin(S.t * 2.6) * 1.4;
    p.vx += (dir * FLY.speed - p.vx) * k; p.vy += (ty - p.vy) * k; p.jumpCut = false; p.coyote = 0; p.airDash = false;
    p.fuel = Math.max(0, p.fuel - dt / FLY.time * (dir || dirY ? 1 : .5));
    if (Math.random() < 90 * dt / 60 * 1.1) pt(p.x - p.face * rr(1.5, 3.2), p.y - rr(.5, 2.3), -p.face * rr(10, 26), rr(-2, 2), rr(.18, .4), ['─', '═', '-', '·'], PAL[C.cyan], { drag: 2.5 });
    if (h.st === 2) p.fly = false;
  } else {
    /* horizontal */
    if (p.wallLock <= 0) {
      const acc = p.ground ? PH.accG : PH.accA;
      if (dir) {
        if (Math.abs(p.vx) <= run || sign(p.vx) !== dir) { p.vx += dir * acc * (sign(p.vx) !== dir && p.vx !== 0 ? 1.7 : 1) * dt; if (sign(p.vx) === dir && Math.abs(p.vx) > run) p.vx = dir * run; }
        else if (p.ground) p.vx -= sign(p.vx) * 60 * dt;
      } else { if (p.ground) { const f = PH.fric * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - sign(p.vx) * f; } else if (h.st !== 2) p.vx -= p.vx * Math.min(1, .55 * dt); }
      if (!p.ground && Math.abs(p.vx) > run && !dir) p.vx -= p.vx * Math.min(1, .3 * dt);
    }
    /* gravity */
    let g = PH.grav;
    if (Math.abs(p.vy) < 7 && (KEY.Space || KEY.KeyW || KEY.ArrowUp) && p.vy < 0) g *= .62;
    if (p.vy > 0) g *= 1.12;
    p.vy = Math.min(PH.maxFall, p.vy + g * dt);
    if (L.wind && !p.ground) p.vx += (L.wind * (.6 + .4 * Math.sin(S.t * .7 + p.y * .05))) * dt;
    /* wall slide / jump */
    if (!p.ground && (p.hitL || p.hitR) && dir === (p.hitR ? 1 : -1) || (p.wall && p.wallT > 0)) { }
    if (!p.ground && (p.hitL || p.hitR)) { p.wall = p.hitR ? 1 : -1; p.wallT = .12; }
    const sliding = !p.ground && p.wall && p.wallT > 0 && p.vy > 0 && dir === p.wall;
    if (sliding) {
      p.vy = Math.min(p.vy, 9);
      if (Math.random() < .5) pt(p.x + p.wall * .8, p.y - rr(.5, 2.4), -p.wall * rr(1, 6), rr(-4, 8), rr(.2, .45), ['·', '*', '.'], PAL[C.amber], { g: 30 });
      if (Math.random() < .04) sfx('step', .6);
    }
    /* jump */
    if (p.jbuf > 0) {
      if (p.ground || p.coyote > 0) { p.vy = -PH.jump; p.jbuf = 0; p.coyote = 0; p.ground = false; p.mv = null; sfx('jump'); p.jumpCut = false; p.landT = 0; p.stretch = .12; for (let i = 0; i < 6; i++) pt(p.x + rr(-1, 1), p.y, rr(-8, 8), rr(-3, 0), rr(.2, .5), ['·', '.', '░'], PAL[C.grey], { drag: 3 }); }
      else if (p.wall && p.wallT > 0 && h.st !== 2) { p.vy = -PH.jump * .96; p.vx = -p.wall * 21; p.wallLock = .17; p.face = -p.wall; p.jbuf = 0; p.wallT = 0; p.jumpCut = false; sfx('djump'); sparks(p.x + p.wall * .8, p.y - 1.5, 10, -p.wall, 0, PAL[C.cyan], 26); p.wall = 0; }
    }
    /* grapple physics */
    if (h.st === 2) {
      const c = chest(p); let ax = h.ax, ay = h.ay;
      if (h.tgt) { ax = h.tgt.x; ay = h.tgt.y - h.tgt.h / 2; h.ax = ax; h.ay = ay; h.len = Math.max(0, h.len - 58 * dt); }
      let dx = c.x - ax, dy = c.y - ay, d = Math.hypot(dx, dy) || 1;
      if (KEY.KeyW || KEY.ArrowUp) h.len = Math.max(HOOK_MIN, h.len - 24 * dt); if (KEY.KeyS || KEY.ArrowDown) h.len = Math.min(PH.hook + 4, h.len + 18 * dt);
      if (!h.tgt && h.len > d) h.len = Math.max(HOOK_MIN, lerp(h.len, d, Math.min(1, 6 * dt)));
      if (d > h.len) {
        const nx = dx / d, ny = dy / d; const k = d - h.len;
        p.x -= nx * k; p.y -= ny * k;
        const vn = p.vx * nx + p.vy * ny; if (vn > 0) { p.vx -= nx * vn; p.vy -= ny * vn; }
      }
      if (!p.ground && dir) p.vx += dir * 62 * dt;
      const sp = Math.hypot(p.vx, p.vy); if (sp > 84) { p.vx *= 84 / sp; p.vy *= 84 / sp; }
      p.vx -= p.vx * .06 * dt; p.airDash = false;
      p.swing = Math.atan2(c.x - ax, ay - c.y);
      if (h.tgt) { if (Math.hypot(dx, dy) < 3.4 || h.len < 3) { hookStrike(h.tgt); } }
    } else p.swing = lerp(p.swing, 0, Math.min(1, 10 * dt));
  }
  /* shooting */
  const fireHeld = MOUSE.l || KEY.KeyJ;
  if (fireHeld && p.fireCd <= 0 && p.spawnT <= 0.6) shootWeapon();
  /* move */
  const dropPress = down && (pressed('Space') || pressed('KeyW') || pressed('ArrowUp') || pressed('KeyS') || pressed('ArrowDown'));
  if (down && jumpP) { p.drop = .22; p.jbuf = 0; p.vy = Math.max(p.vy, 4); }
  p.drop = Math.max(0, p.drop - dt);
  const was = p.ground; const pvy = p.vy;
  p.wall = (p.hitL || p.hitR) ? p.wall : p.wall;
  moveEnt(p, dt, p.drop > 0);
  if (p.ground) { p.wall = 0; p.wallT = 0; }
  if (p.fly) { if (p.ground && !(KEY.KeyW || KEY.ArrowUp || KEY.Space)) stopFly(p); else if (p.fuel <= 0) { stopFly(p); p.flyHint = 1.2; sfx('hurt', .25); } }
  else p.fuel = Math.min(1, p.fuel + dt * (p.ground ? FLY.regenG : FLY.regenA));
  p.flyHint = Math.max(0, p.flyHint - dt);
  if (p.justLanded) {
    if (pvy > 22) { p.landT = .14; sfx('land'); for (let i = 0; i < Math.min(14, pvy / 4); i++) pt(p.x + rr(-1, 1), p.y - .1, rr(-12, 12), rr(-5, -.5), rr(.25, .6), ['░', '▒', '·', '.'], PAL[C.grey], { drag: 3, g: 10 }); }
    if (pvy > 52) { shake(.35 + (pvy - 52) / 60); }
  }
  /* footsteps/dust */
  if (p.ground && Math.abs(p.vx) > 8) { p.run += Math.abs(p.vx) * dt * 0.34 * (sign(p.vx) === p.face ? 1 : -1); const st = Math.floor(p.run) % 2; if (st !== p.step) { p.step = st; if (Math.random() < .55) pt(p.x - p.face * .6, p.y - .1, -sign(p.vx) * rr(2, 8), rr(-3, -.5), rr(.2, .45), ['·', '.', '░'], PAL[C.greyD], { drag: 3 }); if (Math.random() < .35) sfx('step'); } }
  if (p.hook.st === 2) p.trailTick = 0;
  /* hazards */
  const x0 = Math.floor(p.x - p.w / 2), x1 = Math.floor(p.x + p.w / 2), y0 = Math.floor(p.y - p.h + .3), y1 = Math.floor(p.y - .05);
  let onVent = false;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const t = L.tt(tx, ty); if (t === T.HAZ) { if (hurtPlayer(14, p.x, p.y + 1)) { p.vy = -26; sfx('zap'); } } else if (t === T.VENT) onVent = true; }
  if (onVent) { p.vy = Math.max(-38, p.vy - 210 * dt); if (Math.random() < .3) sfx('vent', .3); p.jumpCut = true; p.airDash = false; }
  if (p.y > L.deathY && !p.dead) { p.hp = 0; killPlayer(); }
  if (p.x < 1) { p.x = 1; p.vx = Math.max(0, p.vx); } if (p.x > L.W - 1) { p.x = L.W - 1; p.vx = Math.min(0, p.vx); }
  if (p.y < 3) { p.y = 3; p.vy = Math.max(0, p.vy); }
  /* trail decay */
  while (p.trail.length && S.t - p.trail[0].t > .22) p.trail.shift();
  if (pressed('KeyR') && !p.dead) { killPlayer(); }
}

const WEAPONS = [
  { name: 'PULSE', cd: .1, spd: 88, life: .85, col: 'cyan' },
  { name: 'SCATTER', cd: .6, spd: 74, life: .32, col: 'amber' },
  { name: 'RAIL', cd: .95, spd: 0, life: 0, col: 'mag' },
];
function shootWeapon() {
  const p = S.P, w = WEAPONS[p.wpn], c = chest(p), a = p.aim; p.fireCd = w.cd;
  const tipR = samTipR(a.a) / 3, mx = c.x + a.cx * tipR, my = c.y + a.cy * tipR;   // barrel tip of Sam's pixel blaster
  p.muzzle = .07; p.recoil = 1;
  if (p.wpn === 0) {
    const ang = a.a + rr(-.015, .015); S.bul.push({ x: mx, y: my, vx: Math.cos(ang) * w.spd, vy: Math.sin(ang) * w.spd * .5, life: w.life, dmg: 1, col: PAL[C.cyan], a: ang, pierce: 0, hit: [] });
    sfx('shoot'); if (!p.ground) { p.vx -= a.x * .6; }
    const sh = c.x + (a.x > 0 ? -.5 : .5);
    pt(sh, c.y - .3, -a.x * rr(2, 5) + rr(-1, 1), rr(-14, -8), 1.1, [',', '▪', ','], PAL[C.amber], { g: 60, bounce: .35, col: true });
  } else if (p.wpn === 1) {
    for (let i = 0; i < 7; i++) { const ang = a.a + (i - 3) * .075 + rr(-.02, .02), sp = w.spd * rr(.85, 1.1); S.bul.push({ x: mx, y: my, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * .5, life: w.life * rr(.8, 1.1), dmg: 1, col: PAL[C.amber], a: ang, pierce: 0, hit: [] }); }
    sfx('scatter'); shake(.25); p.vx -= a.x * 11; if (!p.ground) p.vy -= a.y * 6;
    for (let i = 0; i < 12; i++) pt(mx, my, a.x * rr(10, 40) + rr(-8, 8), a.y * rr(10, 40) + rr(-8, 8), rr(.1, .3), ['*', '+', '·'], PAL[C.yel], { drag: 5 });
    pt(c.x, c.y - .3, -a.x * 4, -12, 1.2, ['▮', '▪'], PAL[C.red], { g: 60, bounce: .3, col: true });
  } else {
    /* rail: instant ray piercing enemies */
    const hit = rayTile(mx, my, a.x, a.y, 120), maxD = hit ? hit.d : 120; const hits = [];
    for (const e of S.en) { if (e.dead || e.noHit) continue; const ex = e.x, ey = e.y - e.h / 2, vx = ex - mx, vy = ey - my, pr = vx * a.x + vy * a.y; if (pr < 0 || pr > maxD) continue; const dd = Math.abs(vx * a.y - vy * a.x); if (dd < Math.max(e.w, e.h) * .5 + .8) hits.push(e); }
    for (const e of hits) damageEnemy(e, 5, a.x, a.y);
    const ex2 = mx + a.x * maxD, ey2 = my + a.y * maxD;
    S.bolts.push({ kind: 'rail', x0: mx, y0: my, x1: ex2, y1: ey2, t: 0, dur: .38, col: PAL[C.mag] });
    if (hit) { sparks(ex2, ey2, 22, -a.x, -a.y, PAL[C.mag], 44); ring(ex2, ey2, 5, .35, PAL[C.mag]); }
    sfx('rail'); shake(.6); p.vx -= a.x * 18; if (!p.ground) p.vy -= a.y * 8; S.flash = .1; S.flashCol = '#ff9ae8';
    for (let i = 0; i < 16; i++) pt(mx, my, a.x * rr(10, 60) + rr(-10, 10), a.y * rr(10, 60) + rr(-10, 10), rr(.2, .5), ['═', '─', '·'], PAL[C.mag], { drag: 4 });
  }
}

/* =========================================================================
   enemies
   ========================================================================= */
const ENEMY = {
  drone: { w: 3.4, h: 2, hp: 2, hook: true, score: 100 },
  turret: { w: 3, h: 2, hp: 5, hook: false, score: 150 },
  grunt: { w: 1.8, h: 2.9, hp: 3, hook: true, score: 150 },
  warden: { w: 5, h: 5, hp: 26, hook: true, score: 600 },
  seeker: { w: 1.8, h: 1.8, hp: 1, hook: true, score: 80 },
  boss: { w: 22, h: 10, hp: EASY.bossHp, hook: true, score: 5000 },
};
function spawnEnemy(sp) {
  const d = ENEMY[sp.k]; if (!d) return null;
  const e = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, w: d.w, h: d.h, hp: d.hp, maxhp: d.hp, hook: d.hook, flash: 0, t: rr(0, 5), seed: Math.random() * 100, face: -1, state: 0, st: 0, dead: false, fire: rr(.5, 1.6), tele: 0, burst: 0, home: null, ground: false, active: false, hitT: 0, score: d.score }, sp);
  e.home = { x: e.x, y: e.y }; if (sp.k === 'drone' || sp.k === 'seeker') e.y = e.y; S.en.push(e); return e;
}
function damageEnemy(e, dmg, dx, dy, strike) {
  if (e.dead || e.inv > 0) return; e.hp -= dmg; e.flash = .09; e.hitT = .2;
  if (e.k !== 'turret' && e.k !== 'boss') { e.vx += dx * (e.k === 'warden' ? 1 : 5); }
  if (e.k === 'warden' && dmg >= 5) { e.stun = .9; }
  sparks(e.x, e.y - e.h / 2, 5, dx, dy, PAL[C.white], 30); sfx('hit', .8);
  if (e.k === 'boss') { S.bossHit = (S.bossHit || 0) + 1; }
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true; S.kills++; S.score += e.score;
  const cx = e.x, cy = e.y - e.h / 2;
  if (e.k === 'boss') { bossDie(e); return; }
  boom(cx, cy, e.k === 'warden' ? 2.2 : e.k === 'turret' ? 1.2 : 1); sfx(e.k === 'warden' ? 'bigboom' : 'boom'); S.freeze = e.k === 'warden' ? .12 : .045;
  if (e.k === 'seeker') blast(cx, cy, 4, 0);
  const letters = '01#$%&@'.split(''); for (let i = 0; i < 6; i++) pt(cx, cy, rr(-20, 20), rr(-20, 4), rr(.6, 1.2), letters, PAL[C.red], { g: 40, bounce: .4, col: true });
  if (Math.random() < (e.k === 'grunt' ? .25 : e.k === 'warden' ? 1 : .12) * EASY.hpDrop) S.pks.push({ k: 'hp', x: cx, y: cy, t: 0, vy: -10, drop: true });
  for (let i = 0; i < (e.k === 'warden' ? 8 : 2); i++) S.pks.push({ k: 'chip', x: cx + rr(-1, 1), y: cy, t: 0, vy: rr(-22, -8), vx: rr(-10, 10), drop: true });
  if (e.arena) { e.arena.alive = Math.max(0, e.arena.alive - 1); }
}
function blast(x, y, r, dmgP) {
  const p = S.P; if (dmgP && !p.dead && Math.hypot(p.x - x, p.y - 1.4 - y) < r) hurtPlayer(dmgP, x, y);
}
function ebullet(x, y, ang, spd, dmg, o) { spd *= EASY.ebulSpd; S.ebul.push(Object.assign({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd * .5, life: 5, dmg: dmg || 10, a: ang }, o || {})); }

function updEnemies(dt) {
  const p = S.P, L = S.L;
  for (const e of S.en) {
    if (e.dead) continue;
    e.t += dt; e.flash = Math.max(0, e.flash - dt); e.hitT = Math.max(0, e.hitT - dt);
    const dxp = p.x - e.x, dyp = (p.y - 1.5) - (e.y - e.h / 2), dist = Math.hypot(dxp, dyp);
    e.active = dist < 95 || e.k === 'boss';
    if (!e.active) continue;
    if (e.stun > 0) { e.stun -= dt; e.vx *= .9; if (e.k === 'warden') { e.vy += PH.grav * dt; moveEnt(e, dt); continue; } }
    e.lostT = (e.lostT || 0) - dt; if (e.lostT <= 0) { e.lostT = .18 + Math.random() * .1; e.see = !p.dead && dist < (e.range || 56) && los(e.x, e.y - e.h * .6, p.x, p.y - 1.5); }
    switch (e.k) {
      case 'drone': aiDrone(e, dt, dxp, dyp, dist); break;
      case 'turret': aiTurret(e, dt, dxp, dyp, dist); break;
      case 'grunt': aiGrunt(e, dt, dxp, dyp, dist); break;
      case 'warden': aiWarden(e, dt, dxp, dyp, dist); break;
      case 'seeker': aiSeeker(e, dt, dxp, dyp, dist); break;
      case 'boss': aiBoss(e, dt, dxp, dyp, dist); break;
    }
    /* touch damage */
    if (!p.dead && e.k !== 'boss' && e.k !== 'turret' && Math.abs(dxp) < e.w / 2 + p.w / 2 - .2 && p.y > e.y - e.h && p.y - p.h < e.y && e.k !== 'drone') hurtPlayer(e.k === 'warden' ? 22 : 12, e.x, e.y);
  }
  S.en = S.en.filter(e => !e.dead);
}
function aiDrone(e, dt, dxp, dyp, dist) {
  const tx = e.see ? p_tx(e) : e.home.x + Math.sin(e.t * .5 + e.seed) * 9, ty = e.see ? S.P.y - 11 + Math.sin(e.t * 1.2 + e.seed) * 2.2 : e.home.y + Math.sin(e.t * 1.1 + e.seed) * 1.6;
  const ax = clamp((tx - e.x) * 1.4 - e.vx * 1.6, -30, 30), ay = clamp((ty - e.y) * 1.8 - e.vy * 2.2, -30, 30);
  e.vx += ax * dt; e.vy += ay * dt; e.vx = clamp(e.vx, -14, 14); e.vy = clamp(e.vy, -10, 10);
  let nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
  if (solidAt(nx, e.y - e.h / 2)) { e.vx *= -.4; nx = e.x; } if (solidAt(e.x, ny - e.h / 2) || solidAt(e.x, ny)) { e.vy *= -.4; ny = e.y; }
  e.x = nx; e.y = ny; if (Math.abs(dxp) > 2) e.face = sign(dxp);
  if (e.see) {
    e.fire -= dt / EASY.fireSlow;
    if (e.fire <= 0 && e.tele <= 0) { e.tele = .42; sfx('warn', .6); }
    if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { const a = vang(S.P.x - e.x, S.P.y - 1.6 - (e.y - 1)); const n = e.elite ? 3 : 1; for (let i = 0; i < n; i++) ebullet(e.x, e.y - .5, a + (i - (n - 1) / 2) * .16, 30, 10); sfx('ebullet', .6); e.fire = rr(1.5, 2.3); pt(e.x, e.y - .5, 0, 0, .12, ['*'], PAL[C.red], {}); } }
  }
}
function p_tx(e) { const p = S.P; const side = (e.seed % 2 > 1 ? 1 : -1); return p.x + side * 22; }
function aiTurret(e, dt, dxp, dyp, dist) {
  const c = e.dir === 'down' ? { x: e.x, y: e.y + .4 } : { x: e.x, y: e.y - 1.6 };
  e.aimA = e.see ? vang(S.P.x - c.x, S.P.y - 1.6 - c.y) : (e.aimA === undefined ? -PI / 2 : e.aimA + Math.sin(e.t) * dt * .6);
  if (e.see) {
    e.fire -= dt / EASY.fireSlow;
    if (e.fire <= 0 && e.tele <= 0 && e.burst <= 0) { e.tele = .5; sfx('warn', .5); }
    if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { e.burst = 3; e.bt = 0; e.fire = 2.3; } }
    if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = .13; e.burst--; ebullet(c.x + Math.cos(e.aimA) * 2, c.y + Math.sin(e.aimA) * 1, e.aimA + rr(-.04, .04), 34, 10); sfx('ebullet', .6); } }
  }
}
function aiGrunt(e, dt, dxp, dyp, dist) {
  const L = S.L; const sp = 7.5;
  e.vy = Math.min(PH.maxFall, e.vy + PH.grav * dt);
  const patrol = !e.see || e.burst > 0;
  if (e.see) { e.face = sign(dxp) || e.face; }
  if (e.see && e.burst <= 0) {
    // keep distance 18-30
    const want = Math.abs(dxp) < 14 ? -sign(dxp) : Math.abs(dxp) > 30 ? sign(dxp) : 0; e.vx = lerp(e.vx, want * sp * .8, Math.min(1, 6 * dt));
    e.fire -= dt / EASY.fireSlow; if (e.fire <= 0 && e.tele <= 0) { e.tele = .4; sfx('warn', .5); }
    if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { e.burst = 3; e.bt = 0; e.fire = rr(1.4, 2.0); } }
  } else if (!e.see) { e.vx = lerp(e.vx, (e.dirP || (e.dirP = Math.random() < .5 ? -1 : 1)) * sp * .55, Math.min(1, 4 * dt)); e.face = e.dirP; }
  if (e.burst > 0) { e.vx *= .8; e.bt -= dt; if (e.bt <= 0) { e.bt = .15; e.burst--; const a = vang(S.P.x - e.x, S.P.y - 1.6 - (e.y - 2)) + rr(-.05, .05); ebullet(e.x + e.face * 1.2, e.y - 2, a, 32, 9); sfx('ebullet', .5); pt(e.x + e.face * 1.4, e.y - 2, 0, 0, .1, ['*'], PAL[C.amber], {}); } }
  const before = e.x; moveEnt(e, dt);
  // ledge / wall turn
  const aheadX = e.x + sign(e.vx || e.face) * (e.w / 2 + .8);
  if ((e.hitL || e.hitR) || (e.ground && !solidAt(aheadX, e.y + .5) && L.tt(Math.floor(aheadX), Math.floor(e.y + .5)) !== T.ONE)) { if (!e.see) e.dirP = -(e.dirP || 1); e.vx = 0; e.x = before; }
  if (e.y > L.deathY) e.dead = true;
}
function aiWarden(e, dt, dxp, dyp, dist) {
  e.vy = Math.min(PH.maxFall, e.vy + PH.grav * dt);
  if (e.stun > 0) return;
  e.face = sign(dxp) || e.face; e.fire -= dt / EASY.fireSlow;
  if (e.state === 0) { // advance
    const want = Math.abs(dxp) > 16 ? sign(dxp) : Math.abs(dxp) < 9 ? -sign(dxp) : 0; e.vx = lerp(e.vx, want * 7, Math.min(1, 4 * dt));
    if (e.fire <= 0 && e.see) { e.state = Math.random() < .45 ? 2 : 1; e.tele = .7; e.fire = 0; sfx('warn'); }
  } else if (e.state === 1) { // cannon volley
    e.vx *= .85; e.tele -= dt;
    if (e.tele <= 0) { const a0 = vang(S.P.x - e.x, S.P.y - 1.6 - (e.y - 3.5)); for (let i = -2; i <= 2; i++) ebullet(e.x + e.face * 2.5, e.y - 3.5, a0 + i * .13, 30, 12, { big: 1 }); sfx('scatter', .8); shake(.3); e.state = 0; e.fire = rr(1.6, 2.4); }
  } else if (e.state === 2) { // leap + stomp
    e.tele -= dt; e.vx *= .8;
    if (e.tele <= 0 && e.ground) { e.vy = -40; e.vx = clamp(dxp * .95, -26, 26); e.state = 3; }
  } else if (e.state === 3) {
    if (e.ground && e.t > 0.2 && e.vy >= 0) { sfx('stomp'); shake(.9); ring(e.x, e.y, 12, .5, PAL[C.amber], ['═', '─']); for (const dir of [-1, 1]) S.waves.push({ x: e.x + dir * 3, y: e.y, dir, spd: 30, life: .9, dmg: 18 }); e.state = 0; e.fire = rr(1.8, 2.6); e.vx = 0; for (let i = 0; i < 20; i++) pt(e.x + rr(-3, 3), e.y, rr(-20, 20), rr(-14, -2), rr(.3, .7), ['░', '▒', '·', '#'], PAL[C.grey], { g: 40, drag: 2 }); }
  }
  moveEnt(e, dt);
}
function aiSeeker(e, dt, dxp, dyp, dist) {
  if (!e.see && dist > 40) return;
  const a = Math.atan2(dyp, dxp), sp = 17; e.vx = lerp(e.vx, Math.cos(a) * sp, Math.min(1, 2.2 * dt)); e.vy = lerp(e.vy, Math.sin(a) * sp, Math.min(1, 2.2 * dt));
  const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt; if (!solidAt(nx, ny - .9)) { e.x = nx; e.y = ny; } else { e.vx *= -.5; e.vy *= -.5; }
  if (Math.random() < .5) pt(e.x - e.vx * .05, e.y - .9, 0, 0, .35, ['·', '*'], PAL[C.red], {});
  if (!S.P.dead && dist < 2.6) { e.hp = 0; blast(e.x, e.y - .9, 5, 16); e.dead = true; boom(e.x, e.y - .9, 1.2); sfx('boom'); S.kills++; if (e.arena) e.arena.alive = Math.max(0, e.arena.alive - 1); }
}

/* =========================================================================
   boss : ARCHON
   ========================================================================= */
function spawnBoss(x, y, arena) {
  const e = spawnEnemy({ k: 'boss', x, y }); e.arena = null; e.ph = 1; e.atk = 0; e.fire = 2.4; e.cx = x; e.cy = y; e.laser = null; e.intro = 2.6; e.rot = 0; e.noHit = false; e.bounds = arena; S.boss = e; return e;
}
function aiBoss(e, dt, dxp, dyp, dist) {
  const B = e.bounds, p = S.P; e.rot += dt;
  const frac = e.hp / e.maxhp; const ph = frac > .66 ? 1 : frac > .33 ? 2 : 3;
  if (ph !== e.ph) { e.ph = ph; e.fire = 2.5; e.tele = 0; e.laser = null; banner('ARCHON // PHASE ' + ph, ph === 2 ? 'LASER ARRAY ONLINE' : 'CORE EXPOSED. OVERCLOCKING.', C.red); shake(1.2); ring(e.x, e.y - 5, 30, 1, PAL[C.red]); sfx('bigboom', .8); glitchAmt = 1.2; S.flash = .4; S.flashCol = '#ff3b4d'; if (ph === 3) { S.phase3 = true; } }
  if (e.intro > 0) { e.intro -= dt; e.noHit = true; e.y = lerp(e.y, e.cy, Math.min(1, 2 * dt)); if (e.intro <= 0) e.noHit = false; return; }
  // hover path
  const spd = ph === 1 ? .55 : ph === 2 ? .75 : 1.0;
  const tx = e.cx + Math.sin(e.t * spd) * (B.w * .3), ty = e.cy + Math.sin(e.t * spd * 1.7) * 2.5 + (e.laser ? -2 : 0);
  e.vx = (tx - e.x) * 3; e.vy = (ty - e.y) * 3; e.x += e.vx * dt; e.y += e.vy * dt;
  e.fire -= dt / EASY.fireSlow;
  const cx = e.x, cy = e.y - 5;
  if (e.laser) {
    const L = e.laser; L.t += dt;
    if (L.t < L.tele) { L.x = lerp(L.x, p.x, Math.min(1, 1.6 * dt)); if (Math.floor(L.t * 12) % 2 === 0 && Math.random() < .3) sfx('blip'); }
    else if (L.t < L.tele + L.dur) { if (!L.on) { L.on = true; sfx('laser'); shake(.8); } L.x += L.dir * 26 * dt; if (!p.dead && Math.abs(p.x - L.x) < 2.2 && p.y > cy) hurtPlayer(22, L.x, p.y); if (Math.random() < .6) pt(L.x + rr(-1.5, 1.5), B.floor - .2, rr(-8, 8), rr(-24, -6), rr(.2, .5), ['*', '+', '·'], PAL[C.red], { g: 30 }); }
    else { e.laser = null; e.fire = ph === 3 ? 1.1 : 1.6; }
    return;
  }
  if (e.fire <= 0) {
    const pick3 = ph === 1 ? ['aim', 'ring', 'drones'] : ph === 2 ? ['aim', 'ring', 'laser', 'seek'] : ['ring', 'laser', 'aim', 'seek', 'ring'];
    const a = pick3[e.atk++ % pick3.length];
    if (a === 'aim') { e.volley = ph === 1 ? 5 : 7; e.vt = 0; e.fire = 2.2; e.volleyType = 'aim'; sfx('warn'); }
    else if (a === 'ring') { const n = ph === 3 ? 30 : 22, off = Math.random() * TAU; for (let i = 0; i < n; i++) ebullet(cx, cy, off + i / n * TAU, ph === 3 ? 22 : 17, 9, { big: 1 }); sfx('scatter'); shake(.4); ring(cx, cy, 8, .4, PAL[C.red]); e.fire = ph === 3 ? 1.5 : 2.2; }
    else if (a === 'drones') { for (let i = 0; i < 2; i++) { const d = spawnEnemy({ k: 'drone', x: e.x + (i ? 18 : -18), y: e.y - 4, elite: true }); if (d) { ring(d.x, d.y, 5, .4, PAL[C.mag]); } } sfx('warn'); e.fire = 3.2; }
    else if (a === 'seek') { for (let i = 0; i < (ph === 3 ? 3 : 2); i++) { const d = spawnEnemy({ k: 'seeker', x: e.x + (i - 1) * 8, y: e.y - 3 }); if (d) ring(d.x, d.y, 4, .3, PAL[C.red]); } sfx('warn'); e.fire = 2.8; }
    else if (a === 'laser') { e.laser = { x: p.x, t: 0, tele: ph === 3 ? .8 : 1.1, dur: 1.1, dir: p.x < e.x ? 1 : -1, on: false }; sfx('warn'); sfx('warn'); }
  }
  if (e.volley > 0) { e.vt -= dt; if (e.vt <= 0) { e.vt = ph === 3 ? .09 : .13; e.volley--; const a = vang(p.x - cx, p.y - 1.6 - cy) + rr(-.07, .07); ebullet(cx, cy, a, 32, 10, { big: 1 }); sfx('ebullet', .6); } }
  if (ph === 3) {
    const z = S.zap || (S.zap = { t: 2, seg: -1, ph: 0 }); z.t -= dt;
    if (z.ph === 0 && z.t <= 0) { z.seg = ri(0, 3); z.ph = 1; z.t = 1.2; sfx('warn'); }
    else if (z.ph === 1 && z.t <= 0) { z.ph = 2; z.t = 1.1; sfx('zap'); shake(.4); }
    else if (z.ph === 2) { const sx0 = B.x0 + z.seg * (B.w / 4); if (!p.dead && p.ground && p.x > sx0 && p.x < sx0 + B.w / 4 && p.y > B.floor - 1) hurtPlayer(18, p.x, p.y + 1); if (z.t <= 0) { z.ph = 0; z.t = 2.0; } }
  }
}
function bossDie(e) {
  S.mode = 'bossdie'; S.bossDeadT = 0; S.boss = null; S.slow = .3; detachHook(true);
  S.en.forEach(o => { if (o !== e && !o.dead) { o.dead = true; boom(o.x, o.y - 1, 1); } }); S.ebul.length = 0; sfx('bigboom'); musStop();
  S.bossBody = { x: e.x, y: e.y };
}

/* =========================================================================
   bullets, waves, particles, pickups, doors, movers, zones
   ========================================================================= */
function updBullets(dt) {
  const p = S.P, L = S.L;
  for (const b of S.bul) {
    const steps = 2; for (let s = 0; s < steps; s++) {
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
      if (solidAt(b.x, b.y)) { b.life = 0; sparks(b.x, b.y, 5, -b.vx, -b.vy, b.col, 24); pt(b.x, b.y, 0, 0, .15, ['*'], b.col, {}); if (Math.random() < .3) sfx('step', .4); break; }
      for (const e of S.en) {
        if (e.dead || e.noHit) continue;
        if (Math.abs(b.x - e.x) < e.w / 2 + .3 && b.y > e.y - e.h - .3 && b.y < e.y + .3 && !b.hit.includes(e)) {
          b.hit.push(e); damageEnemy(e, b.dmg, sign(b.vx), -.2); if (b.pierce-- <= 0) { b.life = 0; } break;
        }
      }
      if (b.life <= 0) break;
    }
    b.life -= dt;
    if (b.life > 0 && Math.random() < .5) pt(b.x - b.vx * .012, b.y - b.vy * .012, 0, 0, .13, ['·', '.'], b.col, {});
  }
  S.bul = S.bul.filter(b => b.life > 0);
  for (const b of S.ebul) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (solidAt(b.x, b.y)) { b.life = 0; sparks(b.x, b.y, 3, -b.vx, -b.vy, PAL[C.red], 20); continue; }
    if (!p.dead && Math.abs(b.x - p.x) < p.w / 2 + .5 && b.y > p.y - p.h - .2 && b.y < p.y + .2) { if (hurtPlayer(b.dmg, b.x - b.vx * .1, b.y)) b.life = 0; }
    if (Math.random() < .35) pt(b.x, b.y, 0, 0, .2, ['·'], PAL[C.red], {});
  }
  S.ebul = S.ebul.filter(b => b.life > 0);
  for (const w of S.waves) {
    w.x += w.dir * w.spd * dt; w.life -= dt;
    if (solidAt(w.x, w.y - .5)) { w.life = 0; continue; }
    pt(w.x, w.y - rr(0, 1.2), 0, rr(-8, -2), .3, ['▒', '░', '▪'], PAL[C.amber], { g: 10 });
    if (!p.dead && Math.abs(p.x - w.x) < 1.4 && p.y > w.y - 1.2 && p.y - p.h < w.y) hurtPlayer(w.dmg, w.x, w.y);
  }
  S.waves = S.waves.filter(w => w.life > 0);
  for (const b of S.bolts) b.t += dt; S.bolts = S.bolts.filter(b => b.t < b.dur);
}
function updParts(dt) {
  const L = S.L;
  for (const q of S.parts) {
    q.life -= dt; if (q.life <= 0) continue;
    q.vy += q.g * dt; if (q.drag) { const k = Math.exp(-q.drag * dt); q.vx *= k; q.vy *= k; }
    let nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
    if (q.col) { if (solidAt(nx, ny)) { if (q.bounce) { if (solidAt(q.x, ny)) { q.vy *= -q.bounce; ny = q.y; } if (solidAt(nx, q.y)) { q.vx *= -q.bounce; nx = q.x; } q.vx *= .8; } else q.life = 0; } }
    q.x = nx; q.y = ny;
  }
  S.parts = S.parts.filter(q => q.life > 0);
  for (const r of S.rings) { r.t += dt; r.r = r.maxR * smooth(Math.min(1, r.t / r.dur)); } S.rings = S.rings.filter(r => r.t < r.dur);
}
function updPickups(dt) {
  const p = S.P;
  for (const k of S.pks) {
    k.t += dt;
    if (k.drop) { k.vy += 40 * dt; k.vx = (k.vx || 0) * .96; const nx = k.x + k.vx * dt, ny = k.y + k.vy * dt; if (solidAt(nx, ny + .6)) { k.vy *= -.4; k.vx *= .7; if (Math.abs(k.vy) < 3) { k.drop = false; k.vy = 0; } } else { k.x = nx; k.y = ny; } if (k.t > 4) k.drop = false; }
    if (p.dead) continue;
    const dx = p.x - k.x, dy = (p.y - 1.5) - k.y, d = Math.hypot(dx, dy);
    if (k.k === 'chip' && d < 6 && !k.drop || k.k === 'chip' && d < 3 && k.t > .5) { k.x += dx * 8 * dt; k.y += dy * 8 * dt; }
    if (d < 2.2) {
      if (k.k === 'hp') { if (p.hp >= 100) continue; p.hp = Math.min(100, p.hp + EASY.heal); sfx('heal'); ring(p.x, p.y - 1.5, 6, .5, PAL[C.mint]); for (let i = 0; i < 10; i++) pt(p.x + rr(-1, 1), p.y - rr(0, 3), 0, rr(-14, -4), rr(.4, .9), ['+'], PAL[C.mint], {}); k.got = true; }
      else if (k.k === 'chip') { S.chips++; S.score += 25; sfx('chip'); k.got = true; sparks(k.x, k.y, 4, 0, -1, PAL[C.yel], 20); }
      else if (k.k === 'w_scatter') { p.wpns[1] = true; p.wpn = 1; sfx('pick'); k.got = true; banner('SCATTER-9 ACQUIRED', 'KEY 2  //  SHORT RANGE, HEAVY IMPACT', C.amber); say('ECHO', 'Scatter rounds. Close range, wide spread. The recoil will launch you. Use that.'); ring(p.x, p.y - 1.5, 12, .7, PAL[C.amber]); }
      else if (k.k === 'w_rail') { p.wpns[2] = true; p.wpn = 2; sfx('pick'); k.got = true; banner('RAILCASTER ACQUIRED', 'KEY 3  //  PIERCES EVERYTHING IN LINE', C.mag); say('ECHO', 'Railcaster. One shot, straight through armor and anything behind it.'); ring(p.x, p.y - 1.5, 12, .7, PAL[C.mag]); }
    }
  }
  S.pks = S.pks.filter(k => !k.got);
  for (const c of S.L.cps) {
    if (!c.on && !p.dead && Math.abs(p.x - c.x) < 3 && Math.abs(p.y - c.y) < 5) {
      c.on = true; S.respawn = { x: c.x, y: c.y }; p.hp = 100; sfx('cp'); banner(c.label, 'SIGNAL SYNCED // INTEGRITY RESTORED', C.mint); ring(c.x, c.y - 1, 14, .9, PAL[C.mint]); ring(c.x, c.y - 1, 8, .6, PAL[C.white]);
      for (let i = 0; i < 24; i++) pt(c.x + rr(-2, 2), c.y - rr(0, 3), rr(-4, 4), rr(-20, -6), rr(.6, 1.4), ['0', '1', '+'], PAL[C.mint], { g: -4 });
    }
  }
}
function updDoors(dt) {
  const p = S.P, L = S.L;
  for (const d of L.doors) {
    if (d.mode === 'auto') {
      const near = Math.abs(p.x - (d.x + 1)) < 7 && p.y > d.y && p.y - 1 < d.y + d.h + 2;
      d.target = near && !p.dead ? 1 : 0;
    }
    const old = d.open;
    if (d.open < d.target) d.open = Math.min(d.target, d.open + dt * 2.2); else if (d.open > d.target) {
      // don't close on the player
      const rows = Math.ceil(d.h * (1 - Math.max(0, d.open - dt * 3.2)));
      const blocked = !p.dead && p.x + p.w / 2 > d.x && p.x - p.w / 2 < d.x + d.w && p.y > d.y && p.y - p.h < d.y + rows;
      if (!blocked) d.open = Math.max(d.target, d.open - dt * (d.mode === 'auto' ? 2.2 : 3.2));
    }
    if (old !== d.open) {
      doorTiles(L, d);
      if (old < 1 && d.open >= 1) { sfx('dooropen', .6); } if (old > 0 && d.open <= 0) { sfx('door'); shake(.5); for (let i = 0; i < 10; i++) pt(d.x + 1, d.y + d.h - .2, rr(-12, 12), rr(-12, -2), rr(.3, .6), ['·', '*'], PAL[C.amber], { g: 30 }); }
    }
  }
}
function laserState(l, t) { const c = (t + l.ph) % l.per; if (c < l.per - l.on - l.tele) return 0; if (c < l.per - l.on) return 1; return 2; }
function updHazards(dt) {
  const p = S.P, L = S.L, t = S.t;
  for (const l of L.lasers) {
    const st = laserState(l, t); if (st !== l.st) { if (st === 1 && onScr(l.x, (l.y0 + l.y1) / 2, 60)) sfx('warn', .35); if (st === 2 && onScr(l.x, (l.y0 + l.y1) / 2, 60)) sfx('laser', .5); l.st = st; }
    if (st === 2 && !p.dead) {
      let hit; if (l.h) hit = p.y > l.y0 - 0.2 && p.y - p.h < l.y0 + .8 && p.x + p.w / 2 > l.x && p.x - p.w / 2 < l.y1; else hit = Math.abs(p.x - l.x) < p.w / 2 + .6 && p.y > l.y0 && p.y - p.h < l.y1;
      if (hit) hurtPlayer(18, l.x, p.y);
    }
  }
  for (const b of L.blades) {
    b.x = b.cx + Math.sin(t * b.sp + b.ph) * b.ax; b.y = b.cy + Math.cos(t * b.sp * 1.3 + b.ph) * b.ay;
    if (!p.dead && Math.abs(p.x - b.x) < b.r + p.w / 2 && Math.abs((p.y - 1.5) - b.y) < b.r * .55 + 1.5) hurtPlayer(20, b.x, b.y);
  }
}
function updMovers(dt) {
  const L = S.L, t = S.t;
  for (const m of L.movers) {
    const ox = m.x, oy = m.y;
    if (m.kind === 'car') { const span = m.x1 - m.x0 + m.w; m.x = m.x0 - m.w + ((t * m.spd + m.off) % span + span) % span; }
    else if (m.kind === 'elev') { const ph = (t * m.spd + m.off) % (2 * (1 + m.pause)); const u = ph < 1 ? ph : ph < 1 + m.pause ? 1 : ph < 2 + m.pause ? 1 - (ph - 1 - m.pause) : 0; m.y = lerp(m.y0, m.y1, smooth(clamp(u, 0, 1))); }
    else if (m.kind === 'pad') { m.x = m.cx + Math.sin(t * m.f + m.off) * m.amp; m.y = (m.cy !== undefined ? m.cy + Math.sin(t * m.f * .7 + m.off) * (m.ampy || 0) : m.y); }
    m.dx = m.x - ox; m.dy = m.y - oy; if (Math.abs(m.dx) > 6) m.dx = 0;
  }
}
function updZones(dt) {
  const p = S.P, L = S.L; if (p.dead) return;
  for (const z of L.zones) {
    if (z.done && z.once) continue;
    if (p.x > z.x && p.x < z.x + z.w && p.y > z.y && p.y - 1 < z.y + z.h) {
      if (z.once) z.done = true;
      if (z.say) say(z.say[0], z.say[1]);
      if (z.fn) z.fn(z);
      if (z.exit) { stageClear(); z.done = true; }
    }
  }
  // arenas
  for (const a of L.arenas) {
    if (a.state === 0 && p.x > a.x + 3 && p.x < a.x + a.w - 3 && p.y > a.y && p.y < a.y + a.h + 1) { a.state = 1; a.wave = 0; a.t = .8; a.alive = 0; a.doors.forEach(id => L.doors[id].target = 0); banner(a.title || 'LOCKDOWN', 'ELIMINATE ALL HOSTILES', C.red); sfx('warn'); sfx('warn'); MUS.inten = 1; shake(.4); }
    else if (a.state === 1) {
      if (a.alive <= 0) { a.t -= dt; if (a.t <= 0) { if (a.wave >= a.waves.length) { a.state = 2; a.doors.forEach(id => L.doors[id].target = 1); banner('AREA SECURED', 'DOORS UNLOCKED', C.mint); MUS.inten = 0; S.pks.push({ k: 'hp', x: a.x + a.w / 2, y: a.y + a.h - 3, t: 0 }); sfx('heal'); } else { const w = a.waves[a.wave++]; a.t = 99; for (const sp of w) { const e = spawnEnemy(Object.assign({}, sp[3] || {}, { k: sp[0], x: sp[1], y: sp[2], arena: a, range: 90 })); if (e) { a.alive++; ring(e.x, e.y - e.h / 2, 6, .5, PAL[C.mag]); for (let i = 0; i < 10; i++) pt(e.x + rr(-1, 1), e.y - rr(0, e.h), rr(-6, 6), rr(-16, -2), rr(.4, .8), ['0', '1', '#'], PAL[C.mag], {}); } } sfx('boot', .6); glitchAmt = .6; } } }
      else a.t = .9;
    }
  }
}

/* =========================================================================
   camera
   ========================================================================= */
function updCam(dt, snap) {
  const p = S.P, L = S.L, c = S.cam; let tx, ty;
  if (c.lock) { const lk = c.lock; tx = lk.x - COLS / 2; ty = lk.y - ROWS / 2; if (lk.x0 !== undefined && lk.x1 - lk.x0 > COLS) tx = clamp(p.x - COLS / 2, lk.x0, lk.x1 - COLS); }   // wide arenas: follow the player inside the walls
  else {
    const aim = p.aim || { x: 0, y: 0, d: 0 }; const lookX = clamp(p.vx * .22, -12, 12) + clamp(aim.x * Math.min(aim.d, 40) * .12, -9, 9), lookY = clamp(aim.y * Math.min(aim.d, 40) * .1, -4, 4);
    tx = p.x + lookX - COLS / 2; ty = p.y - 1.5 + lookY - ROWS * .52 + (p.ground ? 0 : clamp(p.vy * .06, -2, 3));
  }
  const bb = L.camBox; const minX = bb ? bb.x0 : 0, maxX = bb ? bb.x1 - COLS : L.W - COLS, minY = bb ? bb.y0 : 0, maxY = bb ? bb.y1 - ROWS : L.H - ROWS;
  tx = clamp(tx, minX, Math.max(minX, maxX)); ty = clamp(ty, minY, Math.max(minY, maxY));
  if (snap) { c.x = tx; c.y = ty; } else { c.x += (tx - c.x) * (1 - Math.exp(-6 * dt)); c.y += (ty - c.y) * (1 - Math.exp(-(p.ground ? 4.5 : 3.2) * dt)); }
  c.shake = Math.max(0, c.shake - dt * 2.4); const s = c.shake * c.shake;
  c.sx = (Math.random() - .5) * 2 * s * 1.6; c.sy = (Math.random() - .5) * 2 * s * .9;
}

/* =========================================================================
   world loop
   ========================================================================= */
function updWorld(dt) {
  S.t += dt; S.stageT += dt;
  const L = S.L;
  updMovers(dt);
  updPlayer(dt);
  // hook flight / retract
  const p = S.P, h = p.hook;
  if (h.st === 1) {
    const sp = 270 * dt; h.trav += sp; const c = chest(p); h.x = c.x + h.dx * Math.min(h.trav, h.dist); h.y = c.y + h.dy * Math.min(h.trav, h.dist);
    if (h.tgt && !h.tgt.dead) { /* track */ }
    if (h.trav >= h.dist) {
      if (h.miss) { h.st = 3; h.rt = 0; h.sx = h.x; h.sy = h.y; }
      else { h.st = 2; h.ax = h.tgt ? h.tgt.x : h.tx; h.ay = h.tgt ? h.tgt.y - h.tgt.h / 2 : h.ty; const c2 = chest(p); h.len = Math.max(HOOK_MIN, Math.hypot(c2.x - h.ax, c2.y - h.ay)); p.airDash = false; sfx('attach'); sparks(h.ax, h.ay, 12, -h.dx, -h.dy, PAL[C.cyan], 32); ring(h.ax, h.ay, 4, .3, PAL[C.cyan]); S.freeze = .02; if (h.tgt) { h.len = Math.max(h.len, 4); } }
    }
  } else if (h.st === 3) { h.rt += dt * 9; if (h.rt >= 1) h.st = 0; }
  if (p.dead && h.st) { h.st = 0; }
  updHazards(dt); updDoors(dt); updEnemies(dt); updBullets(dt); updPickups(dt); updZones(dt); updParts(dt);
  updDecorFx(dt);
  // sky lightning
  if (L.th.lightning) { S.lightningT = (S.lightningT === undefined ? rr(3, 8) : S.lightningT) - dt; if (S.lightningT <= 0) { S.lightningT = rr(4, 11); S.lightning = 1; S.lbolt = makeBolt(); setTimeout(() => sfx('thunder', .8), rr(200, 900)); } }
  S.lightning = Math.max(0, S.lightning - dt * 2.4);
  S.flash = Math.max(0, S.flash - dt * 2.4);
  S.commT += 0; if (S.comms.length) { const c = S.comms[0]; c.t += dt; if (c.t > c.dur) S.comms.shift(); }
  if (S.banner) { S.banner.t += dt; if (S.banner.t > 3.4) S.banner = null; }
  glitchAmt = Math.max(0, glitchAmt - dt * 2.2);
  MUS.inten = lerp(MUS.inten, MUS.inten_t || (S.boss ? 1 : 0), Math.min(1, dt));
}
function makeBolt() {
  const pts = []; let x = Math.random(), y = 0; const segs = ri(14, 22);
  for (let i = 0; i < segs; i++) { pts.push([x, y]); x += rr(-.04, .04); y += .5 / segs * rr(.7, 1.3); }
  const branches = []; for (let i = 3; i < segs - 2; i += ri(3, 5)) { const b = []; let bx = pts[i][0], by = pts[i][1]; for (let k = 0; k < 6; k++) { b.push([bx, by]); bx += rr(-.025, .05) * (i % 2 ? 1 : -1) * 2; by += .018; } branches.push(b); }
  return { pts, branches };
}

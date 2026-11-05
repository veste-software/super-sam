/* =========================================================================
   touch controls + fullscreen
   left thumb : floating move stick (up = jump / climb, down = drop through)
   right thumb: floating aim stick (aims and fires)
   buttons bottom right: SPRUNG, DASH, HAKEN (toggle, finds its own anchor), FLUG (toggle)
   ========================================================================= */
TC.coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); TC.on = TC.coarse;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => !!((window.matchMedia && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) || navigator.standalone === true);
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const fsCan = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
const portraitNow = () => TC.coarse && innerHeight > innerWidth * 1.08;

function toggleFS() {
  try {
    if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen; if (!rq) return;
    const pr = rq.call(el, { navigationUI: 'hide' });
    const lock = () => { try { if (TC.coarse && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } };
    if (pr && pr.then) pr.then(lock, () => { }); else lock();
  } catch (e) { }
}
function measureSafe() {
  const el = document.getElementById('safe'); if (!el) return;
  const cs = getComputedStyle(el); TC.safe = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}
resizeHooks.push(measureSafe);
addEventListener('fullscreenchange', () => resize()); addEventListener('webkitfullscreenchange', () => resize());
addEventListener('orientationchange', () => setTimeout(resize, 120));

/* ---------- layout (device px) ---------- */
function touchLayout() {
  const u = clamp(Math.min(W, H) * .085, 34, 64); TC.u = u;
  const sl = TC.safe.l * DPR, sr = TC.safe.r * DPR, sb = TC.safe.b * DPR, st = TC.safe.t * DPR;
  const play = G.scene === 'play' || G.scene === 'clearing';
  const jx = W - sr - 1.7 * u, jy = H - sb - 1.8 * u;
  const B = {};
  const vehOn = !!(S.P && S.P.veh) || (S.near && S.near.v);
  if (play) {
    B.jump = { x: jx, y: jy, r: 1.15 * u, label: 'SPRUNG' };
    B.dash = { x: jx - 2.6 * u, y: jy + .4 * u, r: .88 * u, label: 'DASH' };
    B.hook = { x: jx - 2.2 * u, y: jy - 2.15 * u, r: .88 * u, label: 'HAKEN' };
    B.fly = { x: jx + .05 * u, y: jy - 2.7 * u, r: .88 * u, label: 'FLUG' };
    if (S.P && S.P.wpns && (S.P.wpns[1] || S.P.wpns[2])) B.wpn = { x: W - sr - 1.5 * u, y: Math.max(CH * 6.4, H * .3), r: .72 * u, label: 'WAFFE' };
    if (vehOn) B.veh = { x: jx - 4.3 * u, y: jy - .3 * u, r: .95 * u, label: S.P && S.P.veh ? 'AUSSTEIGEN' : 'EINSTEIGEN' };
    const cy = CH * 8.8, cx = sl + 1.1 * u;
    B.pause = { x: cx, y: cy, r: .7 * u, label: 'II' };
    B.fs = { x: cx + 1.75 * u, y: cy, r: .7 * u, label: fsEl() ? '><' : '<>', off: !fsCan() };
    B.mute = { x: cx + 3.5 * u, y: cy, r: .7 * u, label: AU.muted ? 'x)' : '))' };
  } else {
    B.fs = { x: W - sr - 1.1 * u, y: st + 1.1 * u, r: .7 * u, label: fsEl() ? '><' : '<>', off: !fsCan() };
    B.mute = { x: W - sr - 2.9 * u, y: st + 1.1 * u, r: .7 * u, label: AU.muted ? 'x)' : '))' };
  }
  TC.btn = B;
}
const tcPos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
function tcHitBtn(px, py) {
  let best = null, bd = 1e9;
  for (const k in TC.btn) { const b = TC.btn[k]; if (b.off) continue; const d = Math.hypot(px - b.x, py - b.y); if (d <= b.r * 1.2 && d < bd) { bd = d; best = k; } }
  return best;
}
function stickUpd(s, px, py, R) {
  s.x = px; s.y = py; let dx = px - s.ox, dy = py - s.oy; const d = Math.hypot(dx, dy);
  if (d > R) { s.ox += dx / d * (d - R); s.oy += dy / d * (d - R); dx = px - s.ox; dy = py - s.oy; }
  const dd = Math.min(R, d); s.mag = dd / R; s.vx = dx / R; s.vy = dy / R; s.nx = d > 1e-3 ? dx / d : 0; s.ny = d > 1e-3 ? dy / d : 0;
}

/* ---------- menus by tap ---------- */
function tcMenu(px, py) {
  const sc = G.scene;
  const b = tcHitBtn(px, py); if (b === 'fs' || b === 'mute') return b;
  if (sc === 'title') {
    const h = G.titleHit;
    if (h && px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) {
      const f = (px - h.x) / h.w;
      if (f < .26) { G.sel = (G.sel + STAGES.length - 1) % STAGES.length; sfx('select'); return null; }
      if (f > .74) { G.sel = (G.sel + 1) % STAGES.length; sfx('select'); return null; }
    }
    MOUSE.lp = true; return null;
  }
  if (sc === 'pause') {
    const r = G.pauseRect, rows = G.pauseRows || [];
    for (let i = 0; i < rows.length; i++) if (py >= rows[i][0] && py <= rows[i][1] && (!r || (px >= r.x && px <= r.x + r.w))) { G.pauseSel = i; sfx('pick'); doPauseItem(i); return null; }
    if (r && (px < r.x || px > r.x + r.w || py < r.y || py > r.y + r.h)) G.scene = 'play';
    return null;
  }
  MOUSE.lp = true; return null;
}
function tcBtnDown(k) {
  const b = TC.btn[k]; if (b) b.down = true;
  if (k === 'jump') TC.jumpHeld = true;
  else if (k === 'dash') KP.ShiftLeft = true;
  else if (k === 'fly') KP.KeyF = true;
  else if (k === 'hook') TC.hookReq = true;
  else if (k === 'wpn') KP.KeyQ = true;
  else if (k === 'pause') KP.KeyP = true;
  else if (k === 'veh') KP.KeyV = true;
}
function tcBtnUp(k) {
  const b = TC.btn[k]; if (b) b.down = false;
  if (k === 'jump') TC.jumpHeld = false;
  else if (k === 'fs') toggleFS();
  else if (k === 'mute') { auMute(!AU.muted); }
}

/* ---------- pointer events (touch / pen only; the mouse keeps its own handlers) ---------- */
cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  TC.lastT = performance.now(); TC.on = true; MOUSE.touch = true; e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (x) { }
  activateAudio();
  const [px, py] = tcPos(e); touchLayout();
  if (G.scene !== 'play') { const k = tcMenu(px, py); TC.ptrs.set(e.pointerId, k ? { kind: 'btn', b: k } : { kind: 'menu' }); return; }
  const b = tcHitBtn(px, py);
  if (b) { TC.ptrs.set(e.pointerId, { kind: 'btn', b }); tcBtnDown(b); return; }
  if (px < W * .46) { if (!TC.mv) { TC.mv = { id: e.pointerId, ox: px, oy: py, x: px, y: py, vx: 0, vy: 0, nx: 0, ny: 0, mag: 0 }; TC.ptrs.set(e.pointerId, { kind: 'mv' }); } }
  else if (!TC.aim) { TC.aim = { id: e.pointerId, ox: px, oy: py, x: px, y: py, vx: 0, vy: 0, nx: 0, ny: 0, mag: 0 }; TC.ptrs.set(e.pointerId, { kind: 'aim' }); }
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { if (TC.on && !TC.coarse && performance.now() - TC.lastT > 800) TC.on = false; return; }
  const k = TC.ptrs.get(e.pointerId); if (!k) return; e.preventDefault();
  const [px, py] = tcPos(e);
  if (k.kind === 'mv' && TC.mv) stickUpd(TC.mv, px, py, TC.u * 1.4);
  else if (k.kind === 'aim' && TC.aim) stickUpd(TC.aim, px, py, TC.u * 1.4);
});
function tcUp(e) {
  if (e.pointerType === 'mouse') return;
  const k = TC.ptrs.get(e.pointerId); TC.ptrs.delete(e.pointerId); TC.lastT = performance.now();
  if (k) {
    if (k.kind === 'btn') tcBtnUp(k.b);
    else if (k.kind === 'mv') TC.mv = null;
    else if (k.kind === 'aim') { TC.aim = null; TC.aimAge = 0; }
  }
  if (e.type === 'pointerup') activateAudio();   // iOS only unlocks audio on touchend
  if (e.type === 'pointerup' && !TC.fsDone) {   // first finger lift is a user gesture: go fullscreen by itself
    TC.fsDone = true;
    if (TC.coarse && !fsEl() && !isStandalone() && fsCan()) toggleFS();
  }
}
cv.addEventListener('pointerup', tcUp); cv.addEventListener('pointercancel', tcUp);
addEventListener('contextmenu', e => { if (TC.on) e.preventDefault(); });
{ const fsb = document.getElementById('fsb'); if (fsb) { if (!fsCan()) fsb.style.display = 'none'; fsb.addEventListener('click', e => { toggleFS(); try { cv.focus(); } catch (x) { } e.stopPropagation(); }); fsb.addEventListener('mousedown', e => e.stopPropagation()); } }

/* ---------- per-frame: sticks and toggles become key state ---------- */
function tkey(code, down) {
  if (down) { if (!TC.keys[code]) { TC.keys[code] = true; if (!KEY[code]) KP[code] = true; KEY[code] = true; } }
  else if (TC.keys[code]) { TC.keys[code] = false; KEY[code] = false; }
}
function touchApply(dt) {
  if (!TC.on) return;
  const p = S.P, playing = G.scene === 'play' || G.scene === 'clearing';
  if (!playing || !p) {
    for (const k in TC.keys) tkey(k, false);
    TC.hookHold = false; TC.hookSeen = false; TC.hookReq = false; TC.jumpHeld = false; if (TC.firing) { MOUSE.l = false; TC.firing = false; }
    return;
  }
  const m = TC.mv, mx = m ? m.vx : 0, my = m ? m.vy : 0;
  tkey('KeyA', mx < -.28); tkey('KeyD', mx > .28); tkey('KeyW', my < -.5); tkey('KeyS', my > .5);
  tkey('Space', TC.jumpHeld);
  // grapple: tap to throw (own anchor search unless the aim stick is in use), tap again to let go
  const h = p.hook;
  if (TC.hookReq) {
    TC.hookReq = false;
    if (h.st === 1 || h.st === 2) { TC.hookHold = false; TC.hookSeen = false; }
    else { TC.hookHold = true; TC.hookSeen = false; TC.hookAuto = !(TC.aim || TC.aimAge < .9); KP.KeyE = true; }
  }
  if (TC.hookHold) { if (h.st === 1 || h.st === 2) TC.hookSeen = true; else if (TC.hookSeen || p.dead) { TC.hookHold = false; TC.hookSeen = false; } }
  KEY.KeyE = TC.hookHold;
  // aim stick: aims, and fires while held; the direction stays latched for a moment
  const a = TC.aim;
  if (a && a.mag > .2) { TC.aimDX = a.nx; TC.aimDY = a.ny; TC.aimAge = 0; if (!TC.firing) { TC.firing = true; } MOUSE.l = true; }
  else { if (TC.firing) { MOUSE.l = false; TC.firing = false; } if (!a) TC.aimAge += dt; }
  if (TC.aimAge < .9 || (a && a.mag > .2)) {
    const c = chest(p);
    MOUSE.x = c.x - S.cam.x + TC.aimDX * 14; MOUSE.y = c.y - S.cam.y + TC.aimDY * 7; MOUSE.moved = performance.now() / 1000; TC.latched = true;
  } else if (TC.latched) { MOUSE.moved = -99; TC.latched = false; }
}

/* ---------- drawing ---------- */
function tcRing(x, y, r, col, a, fillA) {
  g.globalAlpha = a * (fillA || .45); g.fillStyle = '#05060f'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = Math.max(2, DPR * 1.7); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.globalAlpha = 1; lastFill = '';
}
function tcLabel(s, x, y, col, a) { txtPx(s, Math.round(x - s.length * CW / 2), Math.round(y - CH / 2), col, a); }
function drawTouch(t) {
  if (!TC.on) return; touchLayout();
  const u = TC.u, p = S.P, play = G.scene === 'play' || G.scene === 'clearing';
  if (play && p) {
    const sl = TC.safe.l * DPR, sb = TC.safe.b * DPR;
    // sticks (rest hints when idle)
    const m = TC.mv, a = TC.aim, R = u * 1.4;
    const mx0 = m ? m.ox : sl + 3 * u, my0 = m ? m.oy : H - sb - 2.4 * u;
    tcRing(mx0, my0, R, '#19f0ff', m ? .55 : .2, .25);
    if (m) { const l = Math.hypot(m.vx, m.vy), k = l > 1 ? 1 / l : 1; tcRing(mx0 + m.vx * R * k, my0 + m.vy * R * k, u * .62, '#19f0ff', .8, .6); } else tcLabel('LAUFEN', mx0, my0, '#19f0ff', .35);
    const ax0 = a ? a.ox : W * .6, ay0 = a ? a.oy : H - sb - 2.4 * u;
    tcRing(ax0, ay0, R, '#ff2fb9', a ? .55 : .2, .25);
    if (a) { const l = Math.hypot(a.vx, a.vy), k = l > 1 ? 1 : l; tcRing(ax0 + a.nx * R * k, ay0 + a.ny * R * k, u * .62, '#ff2fb9', .85, .6); } else tcLabel('ZIELEN', ax0, ay0, '#ff2fb9', .35);
  }
  for (const k in TC.btn) {
    const b = TC.btn[k]; if (b.off) continue;
    let col = '#19f0ff', al = .5, lab = b.label;
    if (k === 'hook') { const on = p && p.hook && (p.hook.st === 1 || p.hook.st === 2); col = on ? '#5dffb0' : '#19f0ff'; al = on ? .85 : .55; }
    else if (k === 'fly') { col = p && p.fly ? '#ffe45e' : (p && p.fuel < .2 ? '#ff3b4d' : '#19f0ff'); al = p && p.fly ? .85 : .55; }
    else if (k === 'dash') { al = p && p.dashCd > 0 ? .25 : .55; }
    else if (k === 'jump') { col = '#5dffb0'; al = .6; }
    else if (k === 'wpn') { col = '#ffb347'; if (p) lab = (p.wpn + 1) + ':' + WEAPONS[p.wpn].name; }
    else if (k === 'veh') { col = '#ffe45e'; al = .8 + Math.sin(t * 8) * .15; }
    if (b.down) al = Math.min(1, al + .35);
    tcRing(b.x, b.y, b.r, col, al, .5);
    if (k === 'fly' && p) { g.globalAlpha = .9; g.strokeStyle = p.fly ? '#ffe45e' : '#19f0ff'; g.lineWidth = Math.max(3, DPR * 3); g.beginPath(); g.arc(b.x, b.y, b.r + 5 * DPR, -Math.PI / 2, -Math.PI / 2 + TAU * p.fuel); g.stroke(); g.globalAlpha = 1; lastFill = ''; }
    tcLabel(lab, b.x, b.y, col, Math.min(1, al + .3));
  }
}
function drawRotate(t) {
  rectPx(0, 0, W, H, '#02030a', .96);
  const cy = Math.round(ROWS / 2), w = Math.sin(t * 3) * 2;
  txtC('BITTE DAS GERÄT', COLS / 2, cy - 2, '#eaf6ff'); txtC('QUER HALTEN', COLS / 2, cy - .6, '#eaf6ff');
  txtC('╔════════╗', COLS / 2 + w, cy + 1.6, '#19f0ff'); txtC('║ ◄    ► ║', COLS / 2 + w, cy + 2.6, '#19f0ff'); txtC('╚════════╝', COLS / 2 + w, cy + 3.6, '#19f0ff');
}

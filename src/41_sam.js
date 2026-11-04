/* =========================================================================
   SUPER SAM  ::  Samuel Aumann, drawn as a colour pixel-art superhero
   Sprite grid is 13 x 18 pixels (overlay pixels may poke out left/right).
   One pixel = 1/3 cell wide x 1/6 cell tall = square on screen.
   From the reference photo: a big round ball of curly dark hair, warm brown skin,
   a happy smile, a green top, and the thumbs-up. Added: mask, cape, gold emblem.
   ========================================================================= */
const SAMC = {
  H: '#2b180f', h: '#4d2e1c', j: '#7a4a2b',   // curly hair: shade, base, glint
  S: '#9d6540', d: '#74452c', B: '#1e0f09',   // skin, skin shade, brows
  e: '#120806', x: '#ffffff',                 // eyes: iris, glint
  l: '#4a1514',                               // smile line
  G: '#74a592', g: '#5b8b78', f: '#436c5d',   // green suit: light, mid, shade
  Y: '#ffd83d',                               // emblem, belt
  W: '#eef5ff', z: '#aab6e0', c: '#19f0ff',   // gloves + boots, glove shade, glowing sole
  K: '#ff2fb9', k: '#ff8fdc', M: '#a8197a',   // cape: base, light, shade
  V: '#3b40b8', v: '#8189ff', N: '#232775',   // mask: base, light edge, shade
};
const SAMW = 13, SAMCX = SAMW / 2;
const SAM_HEAD = [
  '...hjHhHjh...',
  '..hHjhHhjHh..',
  '.hHjhHhHjhHj.',
  'hjHhHjhHhHjhH',
  'hHhHSSSSSSjhH',
  'hHhVVVVVVVVhH',
  'hHhVxeVVxeVhH',
  'hHhVeeVVeeVhH',
  '.hHSlSSdSSlSh',
  '..hSSlllllSSh',
];
const SAM_TORSO = [
  '.gfGGGGYYGfg.',
  '.gfGGGYYGGfg.',
  '.gfGGGGYYGfg.',
  '.WfYYYWYYYfW.',
];
const SAM_LEGS = {};
for (const [k, v] of Object.entries({
  idle:  ['..PPPPPPP..', '..PP..PP...', '..WWW.WWW..', '..ccc.ccc..'],
  r0:    ['..PPPPPPP..', '.PP....PP..', '.WWW...WWW.', '.ccc...ccc.'],
  r1:    ['..PPPPPPP..', '...PP.PP...', '...WW.WWW..', '......ccc..'],
  r2:    ['..PPPPPPP..', '..PP....PP.', '.WWW....WWW', '.ccc....ccc'],
  r3:    ['..PPPPPPP..', '...PP.PP...', '..WWW.WW...', '..ccc......'],
  up:    ['..PPPPPPP..', '..PPPPPP...', '.WWW.WWW...', '...........'],
  fall:  ['..PPPPPPP..', '.PP....PP..', '.WW....WWW.', '.cc....ccc.'],
  slide: ['..PPPPPPP..', '...PP.PP...', '...WW.WWW..', '...cc.ccc..'],
  dash:  ['..PPPPPPP..', 'PPP....PP..', 'WWW.....WW.', 'ccc.....cc.'],
})) SAM_LEGS[k] = v.map(r => ('.' + r + '.').replace(/P/g, 'g'));   // 11 -> 13 wide, tights in suit colour
const SAM_POSE_DX = { dash: [2, 1, -2] };  // head / torso / legs pixel shift (lean into the dash)
// thumbs-up overlay (back arm raised beside the head, white glove); [col,row,colour] in unmirrored sprite space
const SAM_THUMB = [[-1, 5, 'W'], [-1, 6, 'W'], [-1, 7, 'W'], [-2, 8, 'z'], [-1, 8, 'W'], [0, 8, 'W'], [-2, 9, 'W'], [-1, 9, 'W'], [0, 9, 'W'], [-2, 10, 'z'], [-1, 10, 'z'], [0, 10, 'W'],
  [0, 11, 'g'], [1, 11, 'g'], [1, 12, 'g']];
const samCache = new Map();
function samRows(pose, blink, wink) {
  const key = pose + (blink ? 'b' : '') + (wink ? 'w' : ''); let r = samCache.get(key); if (r) return r;
  const head = SAM_HEAD.slice();
  if (blink || wink) {      // eye shut: the mask closes over it, leaving a dark lash line
    const cols = blink ? [4, 8] : [8];
    for (const c of cols) { head[6] = head[6].slice(0, c) + 'VV' + head[6].slice(c + 2); }
  }
  r = [head, SAM_TORSO, SAM_LEGS[pose]]; samCache.set(key, r); return r;
}
/* draw one pixel block in sprite space; col/row may be fractional */
function samDot(bx, by, ux, uy, face, col, row, w, h, colour, al, mw) {
  const c0 = face > 0 ? col : (mw || SAMW) - 1 - col - (w - 1);
  const x0 = bx + Math.round(c0 * ux), x1 = bx + Math.round((c0 + w) * ux), y0 = by + Math.round(row * uy), y1 = by + Math.round((row + h) * uy);
  rectPx(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0), colour, al);
}
const samMode = (c, mode) => mode === 1 ? '#ffffff' : mode === 2 ? '#19f0ff' : c;
function samCape(bx, by, ux, uy, face, al, mode, vx, vy, t, dash, ax, ay, mw) {
  ax = ax === undefined ? .6 : ax; ay = ay === undefined ? 10.2 : ay;
  const f = dash ? 1 : clamp((Math.abs(vx) - 2) / 9, 0, 1), up = clamp(vy, 0, 18) * .035 - clamp(-vy, 0, 14) * .02;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), w = Math.sin(t * 15 - i * .95) * (.25 + .65 * f) * (.25 + u);
    const x = ax - i * (f * 1.25 + .09), y = ay + i * (lerp(.95, -.04, f) - up) + w * (f > .2 ? 1 : .6) + (f < .2 ? Math.sin(t * 6 - i * .8) * .25 * u : 0);
    const bw = Math.round(lerp(4.2, 2.4, f) - u * .5), bh = Math.round(lerp(1.7, 3.8, f) - u * 1.1 + .3);
    const cc = i < 1 ? SAMC.k : i > n - 3 ? SAMC.M : SAMC.K;
    samDot(bx, by, ux, uy, face, Math.round(x), Math.round(y), bw, Math.max(1, bh), samMode(cc, mode), al, mw);
    if (i > 0 && i < n - 2) samDot(bx, by, ux, uy, face, Math.round(x), Math.round(y), bw, 1, samMode(SAMC.k, mode), (al === undefined ? 1 : al) * .55, mw);
  }
}
/* ---- gun arm: a pixel arm + blaster that routes around Sam's big head ---- */
const SAM_SH = [SAMCX, 10.2];   // shoulder anchor in sprite pixels (== chest() in the sim)
function samBodyHit(x, y) {
  const hx = (x - SAMCX) / 6.8, hy = (y - 4.9) / 5.4; if (hx * hx + hy * hy <= 1) return true;
  if (y >= 10 && y <= 14 && x >= 1.5 && x <= 11.5) return true;
  return y > 14 && y <= 18 && x >= 3 && x <= 9.5;
}
/* flying pose: head at the front (right), body trailing behind it, fist out ahead */
function samFlyHit(x, y) {
  const hx = (x - 17.5) / 6.8, hy = (y - 4.9) / 5.4; if (hx * hx + hy * hy <= 1) return true;
  if (y >= 6 && y <= 10.5 && x >= 7.5 && x <= 14) return true;
  if (y >= 8 && y <= 12 && x >= 0 && x <= 9) return true;
  return y >= 8 && y <= 12 && x >= 13 && x <= 28;
}
const SAM_CTX_STAND = { sx: SAMCX, sy: 10.2, hit: samBodyHit, w: SAMW }, SAM_CTX_FLY = { sx: 14, sy: 6.9, hit: samFlyHit, w: 28 };
function samArmR(ang, ctx, face) { ctx = ctx || SAM_CTX_STAND; const c = (face || 1) > 0 ? Math.cos(ang) : -Math.cos(ang), s = Math.sin(ang); let last = 0; for (let r = 0; r < 28; r += .5) if (ctx.hit(ctx.sx + c * r, ctx.sy + s * r)) last = r; return last; }
const samTipR = ang => { const p = S.P; return samArmR(ang, p && p.fly ? SAM_CTX_FLY : SAM_CTX_STAND, p && p.face) + 8; };   // barrel tip, in sprite pixels from the shoulder
const SAM_WCOL = ['#19f0ff', '#ffb347', '#ff2fb9'];
function samArm(p, bx, by, u, bob, al, mode, part, ctx, face) {
  ctx = ctx || SAM_CTX_STAND; const a = p.aim.a, c = Math.cos(a), s = Math.sin(a), R = samArmR(a, ctx, face), rec = (p.recoil || 0) * 1.6;
  const ax = bx + (face > 0 || face === undefined ? ctx.sx : ctx.w - ctx.sx) * u, ay = by + (ctx.sy + bob) * u, wc = SAM_WCOL[p.wpn] || SAM_WCOL[0];
  const blob = (r, col, sz) => { const w = Math.max(2, Math.round(sz * u)); rectPx(Math.round(ax + c * r * u - w / 2), Math.round(ay + s * r * u - w / 2), w, w, samMode(col, mode), al); };
  if (part === 0) { for (let r = 1; r <= R + .5; r += .5) blob(r, SAMC.g, 2); return; }
  for (let r = R + .5; r <= R + 1.5; r += .5) blob(r - rec, SAMC.W, 2);                     // glove
  const th = p.wpn === 1 ? 2.8 : 2;
  for (let r = R + 1.5; r <= R + 8; r += .5) blob(r - rec, r < R + 5 ? '#c9d3f5' : wc, th);   // blaster
  if (p.muzzle > 0) { const r = R + 9.5; blob(r, '#ffffff', 3.2); const wx = (ax + c * r * u + CXp) / CW, wy = (ay + s * r * u + CYp) / CH; glow(wx, wy, 6, wc, .55); }
}
/* ---- the Superman pose ---- */
const SAMFW = 28, SAMFH = 12, samFlyCache = new Map();
function samFlyRows(blink, wink, flutter) {
  const key = (blink ? 'b' : '') + (wink ? 'w' : '') + flutter; let r = samFlyCache.get(key); if (r) return r;
  const g = Array.from({ length: SAMFH }, () => Array(SAMFW).fill('.'));
  const put = (x, y, c) => { if (x >= 0 && x < SAMFW && y >= 0 && y < SAMFH) g[y][x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
  rect(4, 8, 5, 2, 'g'); rect(0, 8, 4, 1, 'W'); rect(0, 9, 4, 1, 'c');                         // upper leg + boot
  const fy = flutter ? 1 : 0; rect(5, 10 - fy, 4, 2, 'g'); rect(1, 10 - fy, 4, 1, 'W'); rect(1, 11 - fy, 4, 1, 'c');   // kicking leg
  rect(8, 6, 6, 4, 'G'); rect(8, 9, 6, 1, 'f'); for (let y = 6; y < 10; y++) put(9, y, 'Y');   // torso, belt
  rect(13, 10, 12, 2, 'g'); rect(24, 8, 4, 4, 'W'); rect(24, 11, 4, 1, 'z'); put(27, 8, 'z');      // arm out front (under the chin), glove ahead of the face
  const head = samRows('idle', blink, wink)[0];
  for (let j = 0; j < head.length; j++) for (let i = 0; i < SAMW; i++) if (head[j][i] !== '.') put(11 + i, j, head[j][i]);
  samFlyCache.set(key, g.map(r => r.join(''))); return samFlyCache.get(key);
}
function samDrawFly(p, x, y, face, al, mode, tint, withGun, blink, wink) {
  const ux = CW / 3, uy = CH / 6, A = al === undefined ? 1 : al, rows = samFlyRows(blink, wink, (Math.floor(S.t * 9) & 1) ? 1 : 0);
  const bx = Math.round(x * CW - CXp - SAMFW / 2 * ux), by = Math.round(y * CH - CYp - 14.7 * uy);
  const headDy = clamp(Math.round(p.vy / 8), -2, 2);          // nose up when climbing, down when diving
  if (!tint) samCape(bx, by, ux, uy, face, A, mode, 20, p.vy, S.t, true, 10.5, 7 + headDy * .5, SAMFW);
  if (withGun) samArm(p, bx, by, ux, 0, al, mode, 0, SAM_CTX_FLY, face);
  for (let j = 0; j < SAMFH; j++) {
    const row = rows[j];
    for (let i = 0; i < SAMFW; i++) {
      const ch = row[i]; if (ch === '.') continue;
      const dy = i >= 14 ? headDy : i >= 8 ? Math.round(headDy / 2) : -headDy, ii = face > 0 ? i : SAMFW - 1 - i;
      const x0 = bx + Math.round(ii * ux), x1 = bx + Math.round((ii + 1) * ux), y0 = by + Math.round((j + dy) * uy), y1 = by + Math.round((j + dy + 1) * uy);
      rectPx(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0), samMode(SAMC[ch], mode), al);
    }
  }
  if (withGun) samArm(p, bx, by, ux, 0, al, mode, 1, SAM_CTX_FLY, face);
}
let samLastT = 0;
function drawPlayerBody(p, x, y, face, al, flash, tint, withGun) {
  const spd = Math.abs(p.vx), mode = tint ? 2 : flash ? 1 : 0;
  let pose;
  if (p.fly) pose = 'fly'; else if (p.dashT > 0 || tint) pose = 'dash'; else if (p.hook.st === 2 && !p.ground) pose = 'up';
  else if (!p.ground) pose = (p.wall && p.wallT > 0 && p.vy > 0) ? 'slide' : (p.vy < -3 ? 'up' : 'fall');
  else if (spd > 5) pose = ['r0', 'r1', 'r2', 'r3'][((Math.floor(Math.abs(p.run)) % 4) + 4) % 4]; else pose = 'idle';
  // idle clock -> thumbs-up + wink
  if (!tint) { const dt = clamp(S.t - samLastT, 0, .1); samLastT = S.t; if (p.ground && spd < 1 && p.muzzle <= 0 && !p.dead) p.idleT = (p.idleT || 0) + dt; else p.idleT = 0; }
  const ph = (p.idleT || 0) - 2.2, thumb = !tint && pose === 'idle' && ph > 0 && (ph % 6) < 2.0, wink = thumb && (ph % 6) > .35;
  const blink = !tint && ((S.t % 3.4) < .11);
  if (pose === 'fly') { samDrawFly(p, x, y, face, al, mode, tint, withGun, blink, wink); return; }
  const rows = samRows(pose, blink && !wink, wink);
  const ux = CW / 3, uy = CH / 6;
  let bob = 0; if (p.ground && spd > 5) bob = (Math.floor(Math.abs(p.run)) % 2) ? 0 : 1; if (p.landT > 0) bob += Math.round(1.6 * p.landT / .14); if (thumb) bob += (Math.sin(S.t * 5) > .6) ? 1 : 0;
  let lean = 0; if (p.hook.st === 2 && !p.ground) lean = clamp(Math.sin(p.swing) * .9, -.9, .9);
  const dx = SAM_POSE_DX[pose] || [0, 0, 0], lx = Math.round(lean * 2.2);
  const bx = Math.round(x * CW - CXp - SAMCX * ux), by = Math.round(y * CH - CYp - 18 * uy);
  const A = al === undefined ? 1 : al;
  if (!tint) samCape(bx, by, ux, uy, face, A, mode, p.vx, p.vy, S.t, p.dashT > 0);
  if (withGun) samArm(p, bx, by, ux, bob * .6, al, mode, 0, SAM_CTX_STAND, face);
  const offs = [(dx[0]) * face + lx * face, (dx[1]) * face + Math.round(lx * .5) * face, (dx[2]) * face - Math.round(lx * .8) * face];
  const rowStart = [0, 10, 14];
  for (let s = 0; s < 3; s++) {
    const blk = rows[s];
    for (let j = 0; j < blk.length; j++) {
      const row = blk[j], py = by + Math.round((rowStart[s] + j + bob * (s < 2 ? 1 : 0)) * uy), ph1 = Math.max(1, Math.round((rowStart[s] + j + 1 + bob * (s < 2 ? 1 : 0)) * uy) - Math.round((rowStart[s] + j + bob * (s < 2 ? 1 : 0)) * uy));
      for (let i = 0; i < SAMW; i++) {
        const ch = row[i]; if (ch === '.') continue;
        const ii = face > 0 ? i : SAMW - 1 - i, x0 = bx + Math.round(ii * ux) + offs[s], x1 = bx + Math.round((ii + 1) * ux) + offs[s];
        rectPx(x0, py, Math.max(1, x1 - x0), ph1, samMode(SAMC[ch], mode), al);
      }
    }
  }
  if (thumb) for (const o of SAM_THUMB) samDot(bx + offs[0], by + Math.round(bob * uy), ux, uy, face, o[0], o[1], 1, 1, samMode(SAMC[o[2]], mode), al);
  if (withGun) samArm(p, bx, by, ux, bob * .6, al, mode, 1, SAM_CTX_STAND, face);
}

/* ---------- portrait helpers (HUD badge, title, ending) ---------- */
Object.assign(SAMC, { s: '#b57a4f', w: '#efe6e0', q: '#80403a' });
const SAM_BUST = [
  '..............................',
  '.........HHhhhhhHHH...........',
  '.......hhHHhHHhhhhjhH.........',
  '......HhhhhhHHhHHhhhhj........',
  '.....HHhHHhhHhjhHhHHHhh.......',
  '....hhjhhhhHHHhHhjhhhhHH......',
  '....HHhhHhjhhhhHHhHHhhhh......',
  '...hHhhHHHHHhjhhhhHHhHHhh.....',
  '...HHhhhhhHHHHHHhhhhhHHhH.....',
  '..hHHhHHhhhhjhHHhHHhhHhjhH....',
  '..hhVjhHhHHHhHhjhHHhHHHhVh....',
  '..HHhVVhjhSSSSSSSSSjhhVVWW....',
  '..hhhHHHvvvvvvvvvvvvvhjhWW....',
  '..HhjVVVVwxeewVVwxeewVVVWWW...',
  '..HhVVVVVweeewVVweeewVVVWWW...',
  '..hhVVVVVVeeeVVVVeeeVVVVWWW...',
  '...hhNNNNNNNNNNNNNNNNNNHWW....',
  '...HHSSSSSSsSSSSSSSdddHhWWWWz.',
  '...hHdSSSSSSSssSSSSdddHWzzzzzz',
  '....hdSSSsSsSssSSSSdddHWWWWWzz',
  '.....dSSSSsSddddSSSdddhWzzzzzz',
  '.....SSSSdsSSSSSSSSddH.WWWWWzz',
  '.......hSSlSSSSSSSldd..Wzzzzzz',
  '.........sslSSSSSlSd....WWWWzz',
  '..........SSlllllSS....YYYYYYg',
  '......fffgdddqqqddfggg..GGGGgg',
  '....KffGGYddddddddYfgggGGGGGgg',
  '..MMffGGGYYdYYYYdYYfgGgGGGGGgg',
  '.MMMffGGGGYYYffYYYGGfggGGGGGgg',
  'MMMffGGGGGYfYYYffYGGGfgGGGGGgg',
  'MMMffGGGGGYYYffffYGGGfgGGGGGgg',
  'MMffGGGGGYYfYYYffYYGGGfGGGGGgg',
  'MMffGGGGGYYfffYYfYYGGGfGGGGGgg',
  'MfffgGGGGGYfYYYffYGGGGGGGGGGgg'
];
const samGridCache = new Map();
/* pre-render a pixel grid (array of strings) to a canvas, one cell = u device px */
function samGridCv(rows, u) {
  const key = rows.length + ':' + rows[0] + ':' + u; let cv = samGridCache.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = rows[0].length * u; cv.height = rows.length * u; const x = cv.getContext('2d');
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = SAMC[rows[j][i]]; if (!c) continue; x.fillStyle = c; x.fillRect(i * u, j * u, u, u); }
  samGridCache.set(key, cv); return cv;
}
function drawSamGrid(rows, px, py, u, al) { g.globalAlpha = al === undefined ? 1 : al; g.drawImage(samGridCv(rows, u), Math.round(px), Math.round(py)); g.globalAlpha = 1; }

const samBustCache = new Map();
/* the portrait with its bottom edge dissolving into the scene */
function samBustCv(u) {
  let cv = samBustCache.get(u); if (cv) return cv;
  const src = samGridCv(SAM_BUST, u); cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const x = cv.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'destination-out';
  const gr = x.createLinearGradient(0, cv.height * .72, 0, cv.height); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = gr; x.fillRect(0, cv.height * .72, cv.width, cv.height * .28);
  samBustCache.set(u, cv); return cv;
}
/* the big portrait: floats, glows, hologram scanlines, a twinkle on the grin */
function drawSamBust(px, py, u, t, a) {
  if (a === undefined) a = 1; if (a <= 0) return;
  const rows = SAM_BUST, w = rows[0].length * u, h = rows.length * u, bob = Math.sin(t * 1.7) * u * .35; py += bob;
  // soft coloured glow behind
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = .55 * a; const gc = glowSprite('#6a3dff'); g.drawImage(gc, px - w * .35, py - h * .25, w * 1.7, h * 1.5);
  g.globalAlpha = .28 * a; g.drawImage(glowSprite('#19f0ff'), px - w * .1, py + h * .1, w * 1.2, h * 1.0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.globalAlpha = a; g.drawImage(samBustCv(u), Math.round(px), Math.round(py)); g.globalAlpha = 1;
  // hologram scanlines
  const step = Math.max(2, Math.round(u * .5)); for (let y = 0; y < h; y += step * 2) rectPx(Math.round(px), Math.round(py + y), w, step, '#02030a', .22 * a);
  const sweep = ((t * .35) % 1.4) * h * 1.3 - h * .15; if (sweep > 0 && sweep < h) { g.globalCompositeOperation = 'lighter'; rectPx(Math.round(px), Math.round(py + sweep), w, Math.max(2, Math.round(u * .6)), '#19f0ff', .12 * a); g.globalCompositeOperation = 'source-over'; }
  // twinkle on the teeth
  const tw = (t * .9) % 3; if (tw < .5) { const k = Math.sin(tw / .5 * PI), cx = px + 10.5 * u, cy = py + 14.5 * u, r = u * (1.2 + 3 * k);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = k * a; rectPx(Math.round(cx - r), Math.round(cy - u * .25), Math.round(r * 2), Math.max(1, Math.round(u * .5)), '#ffffff'); rectPx(Math.round(cx - u * .25), Math.round(cy - r), Math.max(1, Math.round(u * .5)), Math.round(r * 2), '#ffffff'); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
}
/* HUD badge: the in-game head + shoulders */
function drawSamBadge(px, py, u, t) {
  const blink = (t % 3.4) < .11, r = samRows('idle', blink, false), rows = r[0].concat(r[1].slice(0, 2));
  drawSamGrid(rows, px, py, u, 1);
}

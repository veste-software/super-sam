/* =========================================================================
   STAGE 3 :: MERIDIAN TOWER (interior)
   ========================================================================= */
function windowBand(L, x0, x1, y0, y1, step) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x < x1; x++) { const m = (x - x0) % step === 0; L.bset(x, y, m ? '│' : (y === y0 ? '─' : 0), C.cyanDD, 0); }
}
function pillar(L, x, y0, y1) { for (let y = y0; y <= y1; y++) { L.bset(x, y, '▐', C.greyDD, C.i2); L.bset(x + 1, y, '█', C.greyDD, C.i2); L.bset(x + 2, y, '▌', C.greyDD, C.i2); } }
function buildStage3() {
  const th = THEMES.tower, R = RNG(303), Hh = 152, L = new Level(3, 800, Hh, th); L.deathY = Hh - 4; L.camRef = 84;
  L.intro = { title: 'MERIDIAN TURM', sub: 'KONZERNKERN // EBENEN 01-88 // SICHERHEIT: MAXIMUM', lines: [] };
  const Y1 = 118, Y2 = 50;
  L.mass(0, 0, 800, ST.INT);
  /* ---- lobby ---- */
  carveRoom(L, 4, 92, 108, 26, 3); windowBand(L, 10, 106, 94, 108, 9);
  L.start = { x: 10, y: Y1 };
  L.hint(4, 10, 108, 12, 'ECHO', 'Du bist im Meridian-Turm. Zuerst die Lobby. Geschütztürme in der Decke, keine Freunde am Empfang.');
  for (const x of [26, 62, 98]) pillar(L, x, 93, 117);
  solid(L, 44, Y1 - 2, ['▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀', '█▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒█'], C.greyD);
  L.dec('holo', 46, 102, { kind: 'globe', w: 14, h: 7, col: '#19f0ff', col2: '#5dffb0', label: 'MERIDIAN' });
  L.plat(12, 108, 12, '▔', C.cyan); L.plat(84, 108, 14, '▔', C.cyan);
  for (const x of [20, 53, 80]) L.dec('lamp', x, 92, { w: 12, len: 26, col: '#bff6ff' });
  L.en('turret', 32, 94, { dir: 'down' }); L.en('turret', 76, 94, { dir: 'down' });
  L.en('grunt', 40, Y1); L.en('grunt', 70, Y1); L.en('drone', 56, 99); L.pk('hp', 38, Y1 - 3);
  L.laser(94, 93, Y1, 3.6, 1.2, 0); L.laser(101, 93, Y1, 3.6, 1.2, 1.8);
  L.hint(82, 10, 108, 12, 'ECHO', 'Laserraster voraus. Warte, bis die Strahlen ausgehen, dann dash hindurch. Sie kündigen sich vor dem Schuss an.');
  chips(L, 14, 105, 24, 105, 4, 0);
  L.clear(112, 108, 2, 10); const dLob = L.door(112, 108, 10, { mode: 'auto' }); L.cp(108, Y1, 'KONTROLLPUNKT 01');
  /* ---- server farm ---- */
  carveRoom(L, 114, 96, 148, 22, 5);
  for (let x = 118; x < 260; x += 6) { if (x > 144 && x < 196) continue; rack(L, x, 108, 7); }
  for (let x = 120; x < 260; x += 24) L.dec('lamp', x, 96, { w: 10, len: 22, col: '#19f0ff' });
  L.clear(150, Y1, 42, 34); for (let y = Y1; y < Hh; y++) for (let x = 150; x < 192; x++) { const deep = y > 138; L.bset(x, y, deep && (x + y) % 3 === 0 ? '≈' : 0, C.cyan, deep ? C.g1 : C.i0, deep ? AN.FLICK : 0); }
  L.mv({ kind: 'pad', x: 154, y: Y1, cx: 163, cy: Y1, w: 9, h: 1, amp: 8, f: .95, off: 0, dx: 0, dy: 0 });
  L.mv({ kind: 'pad', x: 170, y: Y1 - 4, cx: 179, cy: Y1 - 4, w: 9, h: 1, amp: 8, f: .95, off: PI, dx: 0, dy: 0 });
  L.hint(136, 10, 108, 12, 'ECHO', 'Kühlmittelgrube. Nimm die Schwebeplattformen oder häng dich an die Decke und schwing hinüber.');
  L.plat(124, 108, 14, '▔', C.cyan); L.plat(200, 108, 16, '▔', C.cyan); L.plat(232, 108, 14, '▔', C.cyan);
  L.laser(210, Y1 - 2, 226, 3.4, 1.2, 0, { h: true }); L.laser(236, Y1 - 2, 252, 3.4, 1.2, 1.7, { h: true }); L.laser(130, 97, Y1, 3.8, 1.2, 1);
  L.en('grunt', 128, Y1); L.en('grunt', 204, Y1); L.en('grunt', 244, Y1); L.en('turret', 140, 98, { dir: 'down' }); L.en('turret', 206, 98, { dir: 'down' }); L.en('turret', 240, 98, { dir: 'down' });
  L.en('drone', 170, 100, { elite: true }); L.en('drone', 222, 102); L.pk('hp', 228, Y1 - 2); L.pk('hp', 126, 106);
  L.cp(120, Y1, 'KONTROLLPUNKT 02'); L.cp(238, Y1, 'KONTROLLPUNKT 03');
  chips(L, 150, 112, 192, 112, 9, 4);
  /* ---- security hub (arena) ---- */
  carveRoom(L, 264, 90, 82, 28, 7); L.clear(262, 108, 2, 10); L.clear(346, 108, 2, 10);
  const dA = L.door(262, 108, 10, { mode: 'arena', open: 1, target: 1 }), dB = L.door(346, 108, 10, { mode: 'arena', open: 0, target: 0 });
  L.plat(272, 108, 12, '▔', C.mag); L.plat(326, 108, 12, '▔', C.mag); L.plat(298, 100, 16, '▔', C.mag);
  L.dec('holo', 292, 92, { kind: 'eye', w: 24, h: 9, col: '#ff3b4d' });
  for (let x = 274; x < 340; x += 22) L.dec('lamp', x, 90, { w: 11, len: 28, col: '#ff3b4d' });
  L.dec('sign', 286, 112, { text: 'SICHERHEITSZENTRALE 04', col: '#ff3b4d', flick: true, front: true });
  arena(L, 264, 90, 82, 28, [dA, dB], [
    [['grunt', 276, Y1], ['grunt', 332, Y1], ['turret', 300, Y1], ['drone', 296, 98]],
    [['drone', 280, 96, { elite: true }], ['drone', 330, 96, { elite: true }], ['grunt', 290, Y1], ['grunt', 322, Y1]],
    [['warden', 322, Y1], ['grunt', 280, Y1], ['drone', 300, 96]],
  ], 'SICHERHEITSZENTRALE');
  /* ---- elevator shaft ---- */
  L.clear(348, 46, 32, 72);
  for (let y = 46; y < 118; y++) for (let x = 348; x < 380; x++) L.bset(x, y, 0, 0, (x + (y >> 3)) % 7 === 0 ? C.i1 : C.i0);
  for (let y = 46; y < 118; y++) { L.bset(348, y, '▌', C.greyDD, C.i0); L.bset(379, y, '▐', C.greyDD, C.i0); if (y % 12 === 0) for (let x = 349; x < 379; x++) L.bset(x, y, x % 4 ? '─' : '┼', C.greyDD, C.i0); }
  for (const x of [356, 372]) for (let y = 46; y < 118; y++) L.bset(x, y, y % 6 === 0 ? '╫' : '║', C.greyDD, C.i0);
  L.clear(350, Y1, 29, 4);   // sunk pit under the lift so the car (not the floor) is what you stand on
  L.mv({ kind: 'elev', x: 350, y: Y1, w: 11, h: 1, y0: Y1, y1: 84, spd: .2, off: 0, pause: .8, cableTop: 40, dx: 0, dy: 0 });
  L.mv({ kind: 'elev', x: 367, y: 84, w: 11, h: 1, y0: 84, y1: Y2, spd: .2, off: 1.8, pause: .8, cableTop: 40, dx: 0, dy: 0 });
  L.mass(348, 66, 12, ST.METAL, 68); L.mass(368, 96, 12, ST.METAL, 98);
  L.plat(348, 104, 4, '▔', C.cyan); L.plat(376, 90, 4, '▔', C.cyan); L.plat(348, 76, 4, '▔', C.cyan);
  L.laser(349, 100, 378, 4.6, 1.3, 0, { h: true }); L.laser(368, 70, 378, 5, 1.2, 2.2, { h: true });
  L.dec('sign', 350, 112, { text: 'AUFZUG B', col: '#ffb347', flick: true, front: true });
  L.hint(344, 8, 108, 12, 'ECHO', 'Serviceaufzug. Zwei Kabinen, ein Schacht. Fahr mit der ersten, spring zur zweiten und achte auf die Querstrahlen.');
  L.en('drone', 360, 96, { elite: true }); L.en('drone', 358, 70, { elite: true }); L.en('drone', 372, 58);
  L.cp(348, Y1, 'KONTROLLPUNKT 04'); L.pk('hp', 376, Y1 + 2);
  /* ---- executive floor ---- */
  L.clear(380, 42, 2, 8); carveRoom(L, 382, 24, 396, 26, 9); windowBand(L, 390, 630, 26, 46, 12); windowBand(L, 690, 770, 26, 46, 12);
  for (let y = 26; y < 47; y++) for (let x = 560; x < 600; x++) L.bset(x, y, ((x - 560) % 10 === 0) ? '│' : 0, C.greyDD, C.i1);
  L.dec('holo', 563, 28, { kind: 'eye', w: 34, h: 16, col: '#ff2fb9' });
  L.dec('sign', 568, 46, { text: 'ARCHON  SIEHT  ALLES', col: '#ff2fb9', flick: true, front: true });
  for (const x of [420, 470, 520]) { solid(L, x, Y2 - 2, ['▀▀▀▀▀▀▀▀▀▀', '█▒▒▒▒▒▒▒▒█'], C.greyD); }
  for (let x = 400; x < 770; x += 40) L.dec('lamp', x, 24, { w: 13, len: 26, col: '#bff6ff' });
  L.hint(386, 10, 42, 10, 'ECHO', 'Chefetage. Archon steuert von hier das ganze Netz. Der Kern liegt am Ende dieser Halle, hinauf durch die Spitze.');
  L.en('turret', 430, 26, { dir: 'down' }); L.en('turret', 482, 26, { dir: 'down' }); L.en('turret', 540, 26, { dir: 'down' });
  L.en('grunt', 436, Y2); L.en('grunt', 474, Y2); L.en('grunt', 524, Y2); L.en('drone', 452, 36, { elite: true }); L.en('drone', 500, 34); L.pk('hp', 410, Y2 - 2); L.pk('hp', 540, Y2 - 2);
  L.laser(590, 27, Y2, 3.2, 1.3, 0); L.laser(612, 27, Y2, 3.2, 1.3, 1.6); L.pk('w_rail', 601, Y2 - 1.5);
  L.hint(572, 10, 42, 10, 'ECHO', 'Zwischen diesen Strahlen liegt etwas. Dash hindurch. Es lohnt sich.');
  L.cp(392, Y2, 'KONTROLLPUNKT 05'); L.cp(626, Y2, 'KONTROLLPUNKT 06');
  L.mass(636, 24, 2, ST.INT, 40); L.mass(722, 24, 2, ST.INT, 40);
  const dC = L.door(636, 40, 10, { mode: 'arena', open: 1, target: 1 }), dD = L.door(722, 40, 10, { mode: 'arena', open: 0, target: 0 });
  for (let x = 644; x < 716; x += 20) L.dec('lamp', x, 24, { w: 10, len: 26, col: '#ff3b4d' });
  L.plat(650, 42, 12, '▔', C.mag); L.plat(698, 42, 12, '▔', C.mag);
  arena(L, 638, 24, 84, 26, [dC, dD], [
    [['grunt', 650, Y2], ['grunt', 708, Y2], ['grunt', 680, Y2], ['drone', 660, 34, { elite: true }], ['drone', 700, 34, { elite: true }]],
    [['seeker', 660, 40], ['seeker', 680, 38], ['seeker', 700, 40], ['turret', 646, Y2], ['turret', 714, Y2]],
    [['warden', 700, Y2], ['drone', 664, 34, { elite: true }], ['seeker', 680, 38]],
  ], 'CHEFLOUNGE');
  L.dec('sign', 740, 44, { text: 'KERN  ZUGANG', col: '#ff3b4d', flick: false, frame: true, front: true });
  L.zone(764, 40, 8, 12, { exit: true });
  L.camBox = { x0: 0, x1: 780, y0: 0, y1: Hh };
  finalizeLevel(L);
  return L;
}

/* =========================================================================
   STAGE 4 :: THE SPIRE  (+ ARCHON)
   ========================================================================= */
function buildStage4() {
  const th = THEMES.spire, R = RNG(404), Hh = 280, L = new Level(4, 250, Hh, th); L.deathY = Hh + 8; L.camRef = 198; L.wind = -9;
  L.intro = { title: 'DIE SPITZE', sub: 'MERIDIAN-GIPFEL // HÖHE 2,4 KM // STURMFRONT 3', lines: [] };
  const hull = (x, y, w, t) => L.mass(x, y, w, ST.HULL, y + (t || 2));
  const strut = (x, y, h) => { for (let yy = y; yy < y + h; yy++) { L.bset(x, yy, yy % 4 === 0 ? '╫' : '║', C.greyDD); L.bset(x + 1, yy, yy % 4 === 0 ? '╫' : '║', C.greyDD); } };
  const stage = (x, y, w, t) => { hull(x, y, w, t || 2); strut(x + 2, y + (t || 2), 6); strut(x + w - 4, y + (t || 2), 6); L.dec('beacon', x + .5, y - .5, { col: '#ff3b4d' }); };
  /* launch deck */
  hull(70, 252, 80, 4); strut(76, 256, 24); strut(142, 256, 24); L.start = { x: 90, y: 252 };
  L.cp(96, 252, 'KONTROLLPUNKT 01');
  L.hint(72, 10, 244, 10, 'ECHO', 'Das ist die Spitze. Archon wohnt an der Krone. Alles dazwischen will, dass du fällst.');
  L.hint(120, 10, 244, 10, 'ECHO', 'Der Wind drückt dich nach Westen. Nutz ihn. Dash durch die Klingen; im Dash kannst du nicht getroffen werden.');
  /* A : switchbacks */
  const ay = []; for (let i = 0; i < 8; i++) ay.push(247 - 4.5 * i | 0);
  ay.forEach((y, i) => { const x = i % 2 ? 108 : 92; stage(x, y, 12); });
  [2, 4, 6].forEach(i => L.blade(106, ay[i] - 2.4, 18, 0, 1.7 + i * .12, i, 2.3));
  L.en('drone', 100, 232, { elite: false }); L.en('drone', 112, 222);
  chips(L, 96, 244, 112, 239, 4, 3);
  /* B : shaft */
  hull(70, 214, 28, 3); stage(96, 214, 22, 3);
  L.mass(96, 168, 6, ST.HULL, 210); L.mass(110, 168, 6, ST.HULL, 214);
  L.dec('lamp', 106, 168, { w: 8, len: 46, col: '#ff3b4d' });
  [[206, 1], [198, 0], [190, 1], [182, 0], [174, 1]].forEach(([y, r]) => { L.plat(r ? 106 : 102, y, 4, '▔', r ? C.cyan : C.mag); for (let i = 0; i < 4; i++) L.set((r ? 106 : 102) + i, y + 1, undefined, '▀', r ? C.cyanDD : C.magDD); });
  L.hint(80, 10, 206, 8, 'ECHO', 'Enger Schacht. Spring von den Wänden ab oder nimm die Absätze. Da drin jagt etwas.');
  L.en('seeker', 106, 196); L.en('seeker', 106, 180);
  hull(110, 168, 24, 2); L.cp(124, 168, 'KONTROLLPUNKT 02');
  /* C : gondolas */
  const gy = [[164, 'p', 0], [159, 'R'], [154, 'p', PI], [149, 'L'], [144, 'p', 0], [139, 'R'], [134, 'p', PI], [129, 'L']];
  gy.forEach(([y, k, off]) => {
    if (k === 'p') L.mv({ kind: 'pad', x: 142, y, cx: 151, cy: y, w: 9, h: 1, amp: 9, f: .85, off: off, dx: 0, dy: 0 });
    else if (k === 'R') stage(166, y, 14, 2); else stage(118, y, 14, 2);
  });
  L.cp(172, 139, 'KONTROLLPUNKT 03'); L.en('drone', 150, 150, { elite: true }); L.en('drone', 150, 130); L.en('seeker', 150, 140);
  L.hint(112, 12, 158, 12, 'ECHO', 'Wartungsgondeln. Sie bewegen sich ständig. Du auch.');
  for (let y of [147, 137]) L.pk('chip', 151, y);
  hangSign(L, 151, 118, 6, hasGlyph('光') ? '光' : 'LUX', '#ff3b4d', 100);
  /* D : storm scaffold */
  const pl = [[108, 124], [91, 119], [74, 114], [57, 109], [74, 104], [91, 99], [108, 94], [125, 89], [108, 84], [91, 79], [74, 74], [62, 69]];
  pl.forEach(([cx, y], i) => stage(cx - 5, y, 10, 2));
  L.cp(57 - 2, 109, 'KONTROLLPUNKT 04'); L.pk('hp', 62, 107); L.pk('hp', 80, 72);
  L.en('turret', 91, 119); L.en('turret', 125, 89); L.en('grunt', 76, 104); L.en('drone', 70, 98, { elite: true }); L.en('drone', 100, 78, { elite: true }); L.en('seeker', 90, 90); L.en('seeker', 70, 80);
  L.blade(100, 97, 14, 0, 1.9, 0, 2.3); L.blade(84, 77, 12, 0, 2.1, 2, 2.3);
  L.hint(50, 12, 100, 10, 'ECHO', 'Fast da. Die Kronentür ist über dir. Archon weiß, dass du kommst, also rechne mit einem Empfang.');
  stage(67, 64, 10, 2);
  /* boss arena */
  hull(82, 59, 130, 6); strut(100, 65, 40); strut(190, 65, 40);
  L.mass(88, 20, 6, ST.HULL, 51); L.mass(210, 20, 6, ST.HULL, 59); L.mass(88, 51, 6, ST.HULL, 59); L.clear(88, 51, 6, 8);
  const door = L.door(88, 51, 8, { mode: 'arena', open: 1, target: 1 });
  for (const [a, b] of [[100, 110], [121, 131], [173, 183], [194, 204]]) { L.plat(a, 54, b - a, '▔', C.cyan); for (let i = a; i < b; i++) L.set(i, 55, undefined, '▀', C.cyanDD); }
  L.plat(136, 49, 32, '▔', C.mag); for (let i = 136; i < 168; i++) L.set(i, 50, undefined, '▀', C.magDD);
  hangSign(L, 122, 38, 6, hasGlyph('光') ? '光' : 'LUX', '#19f0ff', 6); hangSign(L, 184, 38, 6, hasGlyph('光') ? '光' : 'LUX', '#19f0ff', 6);
  L.dec('lamp', 100, 21, { w: 10, len: 38, col: '#ff3b4d' }); L.dec('lamp', 204, 21, { w: 10, len: 38, col: '#ff3b4d' });
  L.zone(96, 30, 6, 30, {
    once: true, fn() {
      door.target = 0; S.cam.lock = { x: 152, y: 46.5, x0: 92, x1: 212 }; L.camBox = null; S.respawn = { x: 102, y: 59 }; MUS.inten_t = 1; musPlay('boss');
      setTimeout(() => { if (S.L === L && !S.boss) { spawnBoss(152, 44, { x0: 94, w: 116, floor: 59 }); banner('ARCHON', 'WÄCHTER DER SPITZE', C.red); sfx('bigboom', .7); shake(1); glitchAmt = 1; } }, 900);
      say('ECHO', 'Das ist der Kern. Alles davon. Zerschlag das Auge, Sam. Häng dich dran, wenn du kannst, verletz es, wenn nicht.');
    }
  });
  L.camBox = { x0: 0, x1: 250, y0: 0, y1: Hh };
  L.bossArena = { x0: 94, x1: 210, floor: 59 };
  finalizeLevel(L);
  return L;
}

/* =========================================================================
   STAGE 2 :: NEON BAZAAR
   ========================================================================= */
function facades(L, R, x0, x1, yBase, hmin, hmax) {
  const bgs = [C.f0, C.f1, C.f2, C.f3, C.f4], wins = [C.wamb, C.wcy, C.wmg, C.wwh, C.wgr], accs = [[C.cyanD, C.cyan], [C.magD, C.mag], [C.amberD, C.amber]];
  let x = x0;
  while (x < x1) {
    const w = Math.min(R.i(14, 24), x1 - x); if (w < 8) break; const top = yBase - R.i(hmin, hmax), bg = R.pick(bgs), ac = R.pick(accs);
    for (let yy = top; yy < yBase; yy++) for (let xx = x; xx < x + w; xx++) L.bset(xx, yy, 0, 0, bg);
    for (let xx = x; xx < x + w; xx++) L.bset(xx, top, '▀', ac[0], bg);
    for (let yy = top + 1; yy < yBase; yy++) { L.bset(x, yy, '▌', C.greyDD, bg); L.bset(x + w - 1, yy, '▐', C.greyDD, bg); }
    for (let wy = top + 3; wy < yBase - 13; wy += 4) for (let wx = x + 2; wx < x + w - 4; wx += 6) {
      const lit = hash2(wx, wy) < .55, wc = wins[(hash2(wy, wx) * wins.length) | 0];
      for (let a = 0; a < 2; a++) for (let b = 0; b < 4; b++) L.bset(wx + b, wy + a, lit ? (hash2(wx + b, wy + a) < .1 ? '░' : 0) : '▒', lit ? C.greyD : C.greyDD, lit ? wc : bg, (lit && hash2(wx, wy) < .12) ? AN.FLICK : 0);
      for (let b = -1; b < 5; b++) L.bset(wx + b, wy + 2, '▔', C.greyDD, bg);
    }
    const sTop = yBase - 9; for (let yy = sTop; yy < yBase; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) L.bset(xx, yy, 0, 0, C.f0);
    const glass = [C.wamb, C.wcy, C.wmg][R.i(0, 2)], gw = Math.max(5, w - 9);
    for (let yy = sTop + 3; yy < yBase; yy++) for (let xx = x + 2; xx < x + 2 + gw; xx++) L.bset(xx, yy, yy === sTop + 3 ? '▀' : 0, C.greyD, glass);
    for (let yy = sTop + 4; yy < yBase; yy++) { L.bset(x + 2 + gw + 1, yy, '█', C.greyDD, C.f0); L.bset(x + 2 + gw + 2, yy, '▐', C.greyD, C.f0); }
    for (let xx = x + 1; xx < x + w - 1; xx++) L.bset(xx, sTop + 1, (xx & 1) ? '▄' : '▀', ac[0], C.f0);
    if (R() < .8) { const col = R.pick(NEON); L.dec('sign', x + 2, sTop - 1, { text: signText(R), col, flick: R() < .5, frame: false }); }
    if (R() < .45) { const col = R.pick(NEON); L.dec('sign', x + w - 3, top + 2, { text: R.pick(hasGlyph('酒') && hasGlyph('夢') ? ['HOTEL', 'BAR', '24H', '酒', '夢'] : ['HOTEL', 'BAR', '24H', 'SAKE']), col: col, vert: true, flick: R() < .5 }); }
    x += w;
  }
}
function awning(L, x, y, w, col) {
  L.plat(x, y, w, '▀', col); for (let i = 0; i < w; i++) L.set(x + i, y + 1, undefined, i % 2 ? '▒' : '░', col === C.mag ? C.magD : col === C.cyan ? C.cyanD : C.amberD);
  for (let i = 2; i < w - 1; i += 4) L.set(x + i, y + 2, undefined, '◙', C.amber, 0, AN.PULSE);
}
function slab(L, x, top, w, legs) { L.mass(x, top, w, ST.BRICK, top + 8); if (legs !== false) for (let lx = x + 3; lx < x + w - 2; lx += 11) lattice(L, lx, top + 8, 90, C.greyDD); }
function walkers(L, R, x0, x1, n, y) { for (let i = 0; i < n; i++) L.dec('npc', R.r(x0, x1), y, { kind: 'walker', x0, x1, dir: R() < .5 ? -1 : 1, col: R.pick(NEON), umb: R() < .7, ph: R() * 4, sp: R.r(1.2, 3) }); }

function buildStage2() {
  const th = THEMES.bazaar, R = RNG(202), Hh = 112, S0 = 84, L = new Level(2, 1080, Hh, th); L.deathY = Hh + 12; L.camRef = 64;
  L.intro = { title: 'NEON BASAR', sub: 'KOWLOON-TÜRME // UNTERER MARKT // 03:31 UHR', lines: [] };
  L.mass(0, S0, 300, ST.ASPH); L.mass(524, S0, 556, ST.ASPH);
  L.wet = { y: S0, x0: 0, x1: 300, h: 13, a: .34 };
  facades(L, R, 0, 300, S0, 30, 40); facades(L, R, 524, 760, S0, 28, 40);
  L.start = { x: 8, y: S0 };
  /* --- street --- */
  L.hint(2, 10, 76, 10, 'ECHO', 'Unterer Markt. Billige Nudeln, noch billigere Treue. Gangs betreiben diese Stände, und die Kabel über dir stehen unter Strom.');
  solid(L, 28, S0 - 3, ['▄▄▄▄', '█▒▒█', '█◙◙█'], C.mintD, { c: { '◙': C.amber } }); L.dec('steam', 29.5, S0 - 3, { rate: 8 }); L.dec('steam', 31, S0 - 3, { rate: 6 });
  solid(L, 46, S0 - 4, ['▛▀▜', '█◙█', '█▒█', '▙▄▟'], C.greyD, { c: { '◙': C.cyan, '▒': C.cyanDD }, a: { '◙': AN.PULSE } });
  solid(L, 68, S0 - 2, ['▛▀▀▀▀▜', '█▒▒▒▒█'], C.mintD); solid(L, 90, S0 - 3, ['▛▀▀▀▜', '█▒▒▒█', '█▒▒▒█'], C.rust);
  walkers(L, R, 14, 98, 5, S0);
  L.en('grunt', 62, S0); L.en('grunt', 82, S0); L.en('drone', 40, 68); L.pk('hp', 54, S0 - 2);
  chips(L, 100, S0 - 2, 112, S0 - 2, 5, 0);
  cable(L, 2, 56, 40, 60, 3); cable(L, 40, 60, 78, 55, 3); cable(L, 78, 55, 120, 61, 3.5); cable(L, 120, 61, 160, 56, 3); cable(L, 160, 56, 210, 60, 4); cable(L, 210, 60, 258, 56, 3.5);
  L.dec('holo', 118, 36, { kind: 'ad', w: 40, h: 3, col: '#ff2fb9', col2: '#ffe45e', text: '   KAIJU-COLA  ///  KOSTE DIE SPANNUNG  ///  NUDELN 3 CREDITS  ///  ' });
  L.cp(104, S0, 'KONTROLLPUNKT 01');
  /* --- market --- */
  L.haz(124, S0 - 1, 11); L.dec('spark', 129, S0 - 2, { rate: 1.3 }); awning(L, 124, S0 - 5, 13, C.mag); awning(L, 140, S0 - 10, 12, C.cyan);
  solid(L, 150, S0 - 2, ['▛▀▀▀▀▜', '█▒▒▒▒█'], C.rust); solid(L, 162, S0 - 4, ['▛▀▀▀▀▜', '█◙▒▒◙█', '█▒▒▒▒█', '▙▄▄▄▄▟'], C.greyD, { c: { '◙': C.amber } });
  L.haz(178, S0 - 1, 13); L.dec('spark', 184, S0 - 2, { rate: 1.1 }); awning(L, 175, S0 - 5, 8, C.cyan); awning(L, 186, S0 - 10, 8, C.amber);
  solid(L, 197, S0 - 12, ['▀▀▀▀▀▀▀▀▀▀▀▀▀▀', '█▒▒▒▒▒▒▒▒▒▒▒▒█'], C.greyD); L.en('turret', 204, S0 - 12); L.dec('beacon', 198, S0 - 13, { col: '#ff3b4d' });
  L.haz(216, S0 - 1, 12); L.dec('spark', 222, S0 - 2, { rate: 1.2 });
  L.en('grunt', 118, S0); L.en('grunt', 156, S0); L.en('grunt', 170, S0); L.en('drone', 146, 66); L.en('drone', 200, 62, { elite: true }); L.en('grunt', 236, S0);
  walkers(L, R, 106, 226, 7, S0);
  chips(L, 124, S0 - 7, 137, S0 - 7, 5, 2); chips(L, 140, S0 - 12, 152, S0 - 12, 4, 2); chips(L, 175, S0 - 7, 195, S0 - 12, 6, 3);
  L.hint(120, 8, 74, 12, 'ECHO', 'Diese Pfützen sind stromführende Leitungen. Spring drüber oder nimm die Markisen.');
  L.cp(240, S0, 'KONTROLLPUNKT 02');
  /* --- fire escape --- */
  L.mass(300, 45, 44, ST.BRICK); L.dec('sign', 304, 70, { text: 'AUSGANG  >>>  DACH', col: '#ffb347', flick: true, front: true });
  const ys = [79, 74, 69, 64, 59, 54, 49];
  ys.forEach((y, i) => {
    const right = i % 2 === 0, x = right ? 287 : 268, w = right ? 13 : 14;
    L.plat(x, y, w, '▔', C.amber); for (let k = 0; k < w; k++) L.set(x + k, y + 1, undefined, k % 2 ? '╥' : '┬', C.amberD);
    if (i < ys.length - 1) for (let k = 1; k <= 4; k++) L.set(right ? 284 : 284, y - k + 1, undefined, '╪', C.amberD);
  });
  for (const y of [73, 63, 53]) for (let x = 262; x < 300; x++) if (x % 4 === 0) L.set(x, y, undefined, '│', C.greyDD);
  L.hint(262, 8, 74, 12, 'ECHO', 'Sackgasse. Die Feuertreppe führt nach oben, die Blechhütten beginnen auf dem Dach.');
  L.en('drone', 276, 72); L.en('turret', 276, 64); L.en('grunt', 292, 69); L.en('grunt', 291, 59); L.en('drone', 280, 50, { elite: true });
  L.cp(312, 45, 'KONTROLLPUNKT 03'); L.pk('hp', 292, 77); L.pk('hp', 324, 43);
  PROPS.antenna(L, 340, 45); PROPS.ac(L, 318, 45); PROPS.billboard(L, 326, 45, R);
  /* --- shanty slabs --- */
  let X = 353;
  const S1 = { x0: X, w: 28, top: 47 }; slab(L, S1.x0, 47, 28); cable(L, 342, 38, 356, 40, 2); X += 28;
  solid(L, S1.x0 + 8, 47 - 3, ['▛▀▀▀▀▀▀▀▀▜', '█ RIPPER █', '▙▄▄▄▄▄▄▄▄▟'], C.magD, { c: { 'R': C.mag, 'I': C.mag, 'P': C.mag, 'E': C.mag, ' ': C.mag } });
  L.pk('w_scatter', S1.x0 + 13, 47 - 4.5); L.dec('sign', S1.x0 + 5, 47 - 8, { text: 'RIPPER-DOC 24H', col: '#ff2fb9', frame: true, flick: true }); L.pk('hp', S1.x0 + 22, 45);
  L.hint(S1.x0 - 6, 8, 38, 12, 'ECHO', 'Der Stand da ist ein Ripperdoc vom Schwarzmarkt. Etwas Schweres liegt auf dem Tresen. Nimm es.');
  X += 10; const S2 = { x0: X, w: 24, top: 44 }; slab(L, X, 44, 24); X += 24; decorRoof(L, R, S2.x0, 24, 44, { dens: .5 }); L.en('grunt', S2.x0 + 14, 44); L.en('grunt', S2.x0 + 8, 44); L.en('drone', S2.x0 + 16, 30);
  cable(L, S1.x0 + 26, 40, S2.x0 + 2, 37, 2);
  chips(L, S1.x0 + 26, 44, S2.x0 + 3, 41, 5, 4);
  const cx0 = X; const chain = [14, 32, 50]; chain.forEach((c, i) => hangSign(L, cx0 + c, 32, 6, hasGlyph('灯') ? '灯' : 'LAMPE', NEON[(i + 1) % 5], 8));
  L.hint(cx0 - 12, 10, 36, 10, 'ECHO', 'Papierlaternen. Die halten. Einhaken, schwingen, loslassen, wiederholen.');
  for (let i = 0; i < 2; i++) chips(L, cx0 + chain[i] + 4, 42, cx0 + chain[i + 1] - 4, 42, 3, 5);
  L.en('drone', cx0 + 24, 28, { elite: true });
  X = cx0 + 62; const S3 = { x0: X, w: 34, top: 46 }; slab(L, X, 46, 34); X += 34; decorRoof(L, R, S3.x0, 34, 46, { dens: .5 }); L.cp(S3.x0 + 4, 46, 'KONTROLLPUNKT 04');
  L.en('turret', S3.x0 + 22, 46); L.en('grunt', S3.x0 + 14, 46); L.pk('hp', S3.x0 + 28, 44);
  L.hint(S3.x0 + 20, 10, 38, 12, 'ECHO', 'Spring vom Ende und lass dich in die Unterführung fallen. Ziel auf die Straße, nicht auf die Lücke.');
  /* --- underpass --- */
  const U0 = 548, U1 = 660;
  L.mass(U0, 36, U1 - U0, ST.METAL, 71); L.dec('sign', U0 + 2, 32, { text: 'KANAL 9 // WARTUNG', col: '#ffb347', frame: true, flick: true });
  for (let y = 71; y < S0; y++) for (let x = U0; x < U1; x++) L.bset(x, y, 0, 0, C.i0);
  for (let x = U0; x < U1; x++) { L.bset(x, 72, '═', C.greyD, C.i0); L.bset(x, 74, '═', C.greyDD, C.i0); if (x % 12 === 0) { for (let y = 72; y < 76; y++) L.bset(x, y, '║', C.greyD, C.i0); L.bset(x, 72, '╬', C.grey, C.i0); } }
  for (let x = U0 + 5; x < U1; x += 16) for (let y = 76; y < S0; y++) L.bset(x, y, y % 4 === 0 ? '┼' : '│', C.greyDD, C.i0);
  for (let x = U0 + 8; x < U1 - 8; x += 18) L.dec('lamp', x, 71, { w: 11, len: 13, col: x % 36 < 18 ? '#ffb347' : '#19f0ff' });
  L.hint(U0 - 6, 8, 76, 10, 'ECHO', 'Kanal neun. Wachposten an der Decke, stromführendes Wasser am Boden. Am anderen Ende gibt es eine Sicherheitsgrube.');
  for (const [px, pw] of [[556, 13], [578, 12], [600, 11]]) { L.haz(px, S0 - 1, pw); L.dec('spark', px + pw / 2, S0 - 2, { rate: 1.4 }); L.plat(px - 1, S0 - 7, pw + 2, '▔', C.cyan); chips(L, px, S0 - 8, px + pw, S0 - 8, 4, 2); }
  L.en('turret', 566, 73, { dir: 'down' }); L.en('turret', 588, 73, { dir: 'down' }); L.en('turret', 610, 73, { dir: 'down' });
  L.en('grunt', 574, S0); L.en('drone', 596, 76); L.dec('steam', 585, S0 - 1, { rate: 10 }); L.dec('steam', 570, S0 - 1, { rate: 7 }); L.cp(552, S0, 'KONTROLLPUNKT 05');
  L.pk('hp', 618, S0 - 2);
  const D1 = L.door(622, 71, 13, { mode: 'arena', open: 1, target: 1 }), D2 = L.door(U1 - 2, 71, 13, { mode: 'arena', open: 0, target: 0 });
  for (let x = 626; x < U1 - 4; x += 12) L.dec('lamp', x, 71, { w: 9, len: 13, col: '#ff3b4d' });
  arena(L, 624, 71, 34, 14, [D1, D2], [
    [['grunt', 640, S0], ['grunt', 650, S0], ['drone', 640, 76], ['drone', 650, 74]],
    [['turret', 634, S0], ['grunt', 648, S0], ['drone', 640, 74, { elite: true }]],
    [['warden', 648, S0], ['grunt', 634, S0]],
  ], 'DIE GRUBE');
  /* ---- FLUCHTWAGEN: the vehicle section. A parked car, a long street, an overpass with turrets, barricades, two gaps, raiders and gunships.
         A workshop at the far end holds a checkpoint, repairs and a spare car, so the whole street never has to be driven twice. ---- */
  facades(L, RNG(808), 760, 1080, S0, 28, 40);
  const pit = (x, w) => { L.clear(x, S0, w, Hh - S0); L.bfill(x, S0, w, Hh - S0, 0, 0, C.blk); for (let i = 0; i < w; i++) { L.bset(x + i, S0, i % 2 ? '▚' : '▞', C.amber, C.blk); } L.bset(x - 1, S0 - 1, '▮', C.amber); L.bset(x + w, S0 - 1, '▮', C.amber); };
  const barrier = (x, rows, col) => solid(L, x, S0 - rows.length, rows, col);
  L.cp(670, S0, 'KONTROLLPUNKT 06');
  L.veh('car', 690, S0, { face: 1, bounds: { x0: 662, x1: 1064 } });
  L.dec('sign', 674, S0 - 14, { text: 'FLUCHTWAGEN  //  TANK VOLL', col: '#ffe45e', frame: true, flick: true }); L.dec('beacon', 685.5, S0 - .6, { col: '#ffe45e' }); L.dec('beacon', 694.5, S0 - .6, { col: '#ffe45e' });
  L.hint(662, 14, S0 - 9, 12, 'ECHO', TX('Dein Fluchtwagen, Sam! Steig ein mit V. A und D geben Gas, LEERTASTE springt, SHIFT ist Turbo. Fahr die Fußtruppen um und spring über Sperren und Lücken.', 'Dein Fluchtwagen, Sam! Tipp auf REIN. Linker Stick gibt Gas, hoch springt, TURBO gibt Schub. Fahr die Fußtruppen um und spring über Sperren und Lücken.'));
  L.en('grunt', 738, S0); L.en('grunt', 754, S0); L.en('grunt', 772, S0); L.pk('hp', 742, S0 - 2);
  L.mass(800, S0 - 11, 36, ST.METAL, S0 - 9); lattice(L, 802, S0 - 9, S0 - 1, C.greyDD); lattice(L, 832, S0 - 9, S0 - 1, C.greyDD);
  L.dec('sign', 808, S0 - 14, { text: 'FUSSGÄNGERBRÜCKE', col: '#ff2fb9', flick: true, frame: true });
  L.en('turret', 812, S0 - 7, { dir: 'down' }); L.en('turret', 826, S0 - 7, { dir: 'down' }); L.en('grunt', 810, S0 - 11); L.en('grunt', 826, S0 - 11);
  L.en('raider', 856, S0); L.en('raider', 876, S0);
  barrier(894, ['▛▀▜▛▀▜', '▙▄▟▙▄▟'], C.rust); L.dec('sign', 892, S0 - 8, { text: 'SPERRE', col: '#ff3b4d', flick: true });
  barrier(918, ['▛▀▀▀▜', '█▒▒▒█', '█▒▒▒█'], C.rustD);
  L.pk('hp', 908, S0 - 2); chips(L, 700, S0 - 2, 790, S0 - 2, 10, 0); chips(L, 840, S0 - 2, 888, S0 - 2, 8, 0);
  pit(940, 12); L.dec('sign', 924, S0 - 12, { text: 'BRÜCKE GESPERRT', col: '#ffb347', flick: true, frame: true });
  chips(L, 934, S0 - 4, 958, S0 - 4, 7, 6);
  L.en('gunship', 972, 64); L.en('raider', 968, S0); L.en('raider', 984, S0); L.pk('hp', 962, S0 - 2);
  pit(1004, 18); L.dec('sign', 986, S0 - 12, { text: 'TURBO  NÖTIG', col: '#19f0ff', flick: true, frame: true });
  chips(L, 998, S0 - 4, 1030, S0 - 4, 9, 8);
  L.cp(1036, S0, 'KONTROLLPUNKT 07'); L.veh('car', 1048, S0, { face: 1, bounds: { x0: 662, x1: 1064 } });
  L.dec('sign', 1030, S0 - 14, { text: 'WERKSTATT  //  ERSATZWAGEN', col: '#5dffb0', frame: true, flick: false }); L.pk('hp', 1040, S0 - 2); L.pk('hp', 1056, S0 - 2);
  L.en('turret', 1022, S0); L.en('raider', 1030, S0); L.en('gunship', 1042, 66, { hp: 26, maxhp: 26 });
  L.dec('sign', 1058, S0 - 12, { text: 'LASTENAUFZUG', col: '#19f0ff', flick: false, frame: true });
  L.zone(1056, S0 - 8, 8, 12, { exit: true });
  solid(L, 1066, S0 - 12, ['▛▀▀▀▀▀▀▀▀▀▀▀▀▜', '█            █', '█            █', '█            █', '█            █', '█            █', '█            █', '█            █', '█            █', '█            █', '█            █', '▙▄▄▄▄▄▄▄▄▄▄▄▄▟'], C.greyD);
  for (let i = 0; i < 8; i++) L.dec('flyer', 0, S0 - 20 - (i * 5) % 16, { kind: 'car', x0: 0, x1: 300, sp: 8 + (i % 4) * 3, dir: i % 2 ? 1 : -1, ph: i / 8, col: NEON[i % NEON.length] });
  for (let i = 0; i < 12; i++) L.dec('flyer', 0, S0 - 20 - (i * 5) % 18, { kind: 'car', x0: 524, x1: 1080, sp: 8 + (i % 4) * 3, dir: i % 2 ? 1 : -1, ph: i / 12, col: NEON[i % NEON.length] });
  L.dec('flyer', 0, S0 - 34, { kind: 'heli', x0: 524, x1: 1080, sp: 6, dir: -1, ph: .2, dim: .4 }); L.dec('flyer', 0, S0 - 30, { kind: 'heli', x0: 0, x1: 300, sp: 5, dir: 1, ph: .5, dim: .4 });
  L.camBox = { x0: 0, x1: 1080, y0: 0, y1: Hh };
  finalizeLevel(L);
  return L;
}

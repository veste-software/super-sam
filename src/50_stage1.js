/* =========================================================================
   shared level builders + STAGE 1 :: RAINLINE
   ========================================================================= */
const SIGNPOOL = ['NEURAL LACE', 'KAIJU-COLA', 'OMNI-NOODLE', 'HOTEL 9', 'MERIDIAN', 'SAKE-BAR', 'CHROM 24H', 'VOID CLUB', 'SYNTH-FLEISCH', 'GHOST SHELL'];
const SIGNKANA = ['ネオン街', '電脳', '酒場', '夜市', '麺屋', '薬局', '危険', '未来都市'];
function signText(R) { const k = hasGlyph('ネ') && hasGlyph('電'); return k && R() < .45 ? R.pick(SIGNKANA) : R.pick(SIGNPOOL); }
const NEON = ['#19f0ff', '#ff2fb9', '#ffb347', '#9d5cff', '#5dffb0'];

function lattice(L, x, y0, y1, col) { for (let y = y0; y <= y1; y++) { L.bset(x, y, '║', col); L.bset(x + 1, y, '║', col); if ((y - y0) % 4 === 0) { L.bset(x, y, '╬', col); L.bset(x + 1, y, '╬', col); } } }
function chips(L, x0, y0, x1, y1, n, arc) { for (let i = 0; i < n; i++) { const u = n === 1 ? .5 : i / (n - 1); L.pk('chip', x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - Math.sin(u * PI) * (arc || 0)); } }
function cable(L, x1, y1, x2, y2, sag, col) { L.dec('cable', x1, y1, { x2, y2, sag: sag === undefined ? 2.5 : sag, col: col || '#3a4690' }); }
function solid(L, x, y, rows, col, extra) { L.stamp(x, y, rows, Object.assign({ s: rows.join(''), d: col }, extra || {})); }

const PROPS = {
  ac(L, x, top) { solid(L, x, top - 2, ['▀▀▀▀▀▀▀▀', '█(◙)(◙)█'], C.greyD, { c: { '(': C.grey, ')': C.grey, '◙': C.cyanD }, a: { '◙': AN.BLINK } }); return 8; },
  crates(L, x, top) { solid(L, x, top - 2, ['▛▀▜▛▀▜', '▙▄▟▙▄▟'], C.rust); if (hash2(x, top) < .5) solid(L, x + 1, top - 4, ['▛▀▜', '▙▄▟'], C.rustD); return 6; },
  vent(L, x, top) { solid(L, x, top - 3, ['▀▀', '██', '██'], C.greyD); L.dec('steam', x + 1, top - 3, { rate: 9 }); return 3; },
  tower(L, x, top) { solid(L, x, top - 7, [' ▀▀▀▀▀▀ ', '▟██████▙', '▐█▓▓▓▓█▌', '▝▀▀▀▀▀▀▘'], C.greyD, { c: { '▓': C.greyDD } }); L.stamp(x, top - 3, ['║    ║', '║    ║', '╫    ╫'].map(r => ' ' + r + ' '), { d: C.greyD }); return 9; },   // 3 rows of clearance: the player (2.9) walks underneath
  antenna(L, x, top) { L.stamp(x, top - 9, ['●', '│', '┼', '│', '┼', '│', '│', '│', '│'], { d: C.greyD, c: { '●': C.red }, a: { '●': AN.BLINK } }); L.dec('beacon', x + .5, top - 8.5, { col: '#ff3b4d' }); return 2; },
  dish(L, x, top) { L.stamp(x, top - 3, ['╲ ╱', ' ◙ ', ' ║ '], { d: C.grey, c: { '◙': C.cyanD } }); return 4; },
  hut(L, x, top) { solid(L, x, top - 4, ['▀▀▀▀▀▀▀▀▀', '█▒▒▒▒▒▒▒█', '█▒╔══╗▒▒█', '█▒║░░║▒▒█'], C.greyD, { c: { '░': C.cyanDD, '╔': C.cyanD, '═': C.cyanD, '╗': C.cyanD, '║': C.cyanD, '▒': C.greyDD } }); L.dec('beacon', x + 8, top - 4.6, { col: '#ffb347' }); return 10; },
  billboard(L, x, top, R) { const txt = signText(R || RNG(x)), n = txt.length + (txt.charCodeAt(0) >= 0x2E80 ? txt.length : 0); const col = NEON[Math.floor(hash2(x, top) * NEON.length)]; lattice(L, x + 1, top - 9, top - 1, C.greyDD); L.dec('sign', x + 4, top - 9, { text: txt, col, frame: true, flick: hash2(x, 7) < .5 }); return n + 8; },
};
function decorRoof(L, R, x0, w, top, o) {
  o = o || {}; const padL = o.padL === undefined ? 7 : o.padL, padR = o.padR === undefined ? 8 : o.padR, skip = o.skip || [], dens = o.dens || 1; let x = x0 + padL;
  const bad = (a, b) => skip.some(s => !(b < x0 + s[0] || a > x0 + s[1]));
  const names = ['ac', 'ac', 'crates', 'vent', 'tower', 'antenna', 'dish', 'hut', 'billboard', 'crates', 'antenna'];
  while (x < x0 + w - padR - 6) {
    if (R() > .35 * dens + .15) { x += R.i(4, 9); continue; }
    const nm = R.pick(names); const need = { ac: 8, crates: 6, vent: 3, tower: 9, antenna: 2, dish: 4, hut: 10, billboard: 20 }[nm];
    if (x + need > x0 + w - padR || bad(x, x + need) || (nm === 'tower' && w < 28) || (nm === 'hut' && w < 30) || (nm === 'billboard' && w < 34)) { x += R.i(2, 5); continue; }
    const used = PROPS[nm](L, x, top, R); x += used + R.i(3, 8);
  }
}
function gantry(L, x0, x1, y, mastXs, roofTop) {
  L.mass(x0, y, x1 - x0, ST.METAL, y + 2);
  for (let x = x0; x < x1; x++) { L.set(x, y + 2, undefined, x % 2 ? '╲' : '╱', C.cyanD); if (x % 9 === 4) { L.set(x, y + 3, undefined, '▼', C.amber, 0, AN.BLINK); } }
  for (const mx of mastXs) lattice(L, mx, y + 2, roofTop - 1, C.greyD);
}
function hangSign(L, cx, y, w, text, col, cableTop) {
  const x0 = Math.round(cx - w / 2); L.mass(x0, y, w, ST.METAL, y + 3);
  for (let i = 0; i < w; i++) { const hs = i === 0 || i === w - 1; L.set(x0 + i, y, T.SOL, '▀', col, C.ink, AN.PULSE, CUSTOM | ST.METAL); L.set(x0 + i, y + 1, T.SOL, hs ? '║' : 0, col, C.ink, 0, CUSTOM | ST.METAL); L.set(x0 + i, y + 2, T.SOL, '▄', col, C.ink, 0, CUSTOM | ST.METAL); }
  L.dec('sign', x0 + Math.max(1, Math.floor((w - (text.length + (text.charCodeAt(0) >= 0x2E80 ? text.length : 0))) / 2)), y + 1, { text, col, flick: true, front: true });
  for (let yy = cableTop; yy < y; yy++) { L.bset(x0 + 1, yy, '│', C.greyD); L.bset(x0 + w - 2, yy, '│', C.greyD); }
}
function arena(L, x, y, w, h, doors, waves, title) { L.arenas.push({ x, y, w, h, doors: doors.map(d => d.id), waves, title, state: 0, wave: 0, t: 0, alive: 0 }); }
function carveRoom(L, x, y, w, h, seed, variant) {
  L.clear(x, y, w, h); const R = RNG(seed);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const pan = ((xx - x) / 11 | 0) % 2; L.bset(xx, yy, 0, 0, pan ? C.i1 : C.i2, 0); }
  for (let xx = x; xx < x + w; xx += 11) for (let yy = y; yy < y + h; yy++) L.bset(xx, yy, '│', C.greyDD, (((xx - x) / 11 | 0) % 2) ? C.i1 : C.i2);
  for (let xx = x; xx < x + w; xx++) { L.bset(xx, y + h - 3, '─', C.greyDD, ((((xx - x) / 11) | 0) % 2) ? C.i1 : C.i2); }
  for (let k = 0; k < Math.floor(w / 14); k++) { const mx = x + 4 + k * 14 + R.i(0, 4), my = y + 2 + R.i(0, Math.max(0, h - 7)); if (hash2(k, seed) < .6) monitor(L, mx, my); }
}
function monitor(L, x, y) { L.stamp(x, y, ['┌────┐', '│####│', '│####│', '└────┘'], { back: true, d: C.greyD, c: { '#': C.cyanD }, a: { '#': AN.DATA } }); }
function rack(L, x, y, h) { const rows = ['┌──┐']; for (let i = 0; i < h; i++) rows.push('│▪▪│'); rows.push('└──┘'); L.stamp(x, y, rows, { back: true, d: C.greyD, c: { '▪': C.mint }, a: { '▪': AN.BLINKF } }); }

/* =========================================================================
   STAGE 1
   ========================================================================= */
function buildStage1() {
  const th = THEMES.rain, R = RNG(101), Hh = 126, L = new Level(1, 1300, Hh, th); L.deathY = 114; L.camRef = 54;
  L.intro = { title: 'RAINLINE', sub: 'SPRAWL-BEZIRK 7 // 02:47 UHR // REGEN 94%', lines: ['ECHO: Meridian bezahlt die ganze Skyline, Sam. Hol sie dir zurück, Dach für Dach.', TX('ECHO: Und du kannst FLIEGEN, Super Sam! Drück F zum Abheben, lenke mit A D W S. Der Tank füllt sich, wenn du landest.', 'ECHO: Und du kannst FLIEGEN, Super Sam! Tipp auf FLUG zum Abheben, lenke mit dem linken Stick. Der Tank füllt sich, wenn du landest.')] };
  let X = 0; const roof = (w, top, sty) => { const x0 = X; L.mass(x0, top, w, sty || ST.ROOF); X += w; return { x0, x1: x0 + w, top, w }; }, gap = g => { X += g; };
  const link = (a, b, sag) => { if (b.x0 - a.x1 <= 16) cable(L, a.x1 - 2, a.top - 7, b.x0 + 2, b.top - 7, sag === undefined ? 3 : sag); };
  const arrows = (r) => L.dec('sign', r.x1 - 8, r.top - 5, { text: '>>>', col: '#ffb347', flick: false });

  /* A : start */
  const A = roof(60, 70); L.start = { x: 10, y: 70 };
  decorRoof(L, R, A.x0, A.w, A.top, { skip: [[0, 18]], dens: .9 });
  L.dec('sign', 22, 58, { text: 'RAINLINE', col: '#19f0ff', frame: true, flick: false });
  L.hint(A.x0 + 3, 8, 62, 10, 'ECHO', TX('Sam, du bist live über dem Sprawl. A und D zum Laufen, LEERTASTE zum Springen. Halt sie gedrückt für mehr Höhe.', 'Sam, du bist live über dem Sprawl. Linker Stick zum Laufen, Stick hoch oder SPRUNG zum Springen. Halt ihn für mehr Höhe.'));
  L.hint(A.x0 + 32, 8, 62, 10, 'ECHO', TX('Die Maus zielt. Linksklick feuert. Rechtsklick wirft das Greifseil. Halte die Taste, um dich festzuhalten.', 'Der rechte Stick zielt und feuert. HAKEN wirft das Greifseil. Tipp noch einmal, um loszulassen.'));
  L.hint(A.x0 + 50, 6, 62, 10, 'ECHO', 'Lücke voraus. Anlauf und Sprung. Schau nicht nach unten.');
  arrows(A);
  gap(8); const B = roof(30, 70); link(A, B);
  L.en('drone', B.x0 + 20, 57); decorRoof(L, R, B.x0, B.w, B.top, { dens: .6 });
  L.hint(B.x0, 8, 62, 10, 'ECHO', TX('Konzerndrohne voraus. Ziel mit der Maus, Linksklick schießt sie ab.', 'Konzerndrohne voraus. Ziel mit dem rechten Stick, er schießt von selbst.'));
  chips(L, A.x1 - 3, 66, B.x0 + 4, 66, 6, 6);
  gap(10); const C1 = roof(26, 66); link(B, C1);
  L.en('grunt', C1.x0 + 16, 66); L.pk('hp', C1.x0 + 8, 64); decorRoof(L, R, C1.x0, C1.w, C1.top, { dens: .5, padL: 10 });
  L.hint(C1.x0, 6, 58, 10, 'ECHO', 'Bewaffnete Patrouille. Die schießen zurück. Bleib in Bewegung, weich aus und schieß.');
  chips(L, B.x1 - 3, 66, C1.x0 + 4, 62, 5, 6);
  gap(22); const D = roof(32, 70); L.cp(D.x0 + 5, 70, 'KONTROLLPUNKT 01');
  L.hint(C1.x1 - 14, 12, 58, 12, 'ECHO', TX('Zu breit für einen sauberen Sprung. Spring und drück in der Luft SHIFT, um hinüberzudashen.', 'Zu breit für einen sauberen Sprung. Spring und tipp in der Luft DASH, um hinüberzudashen.'));
  chips(L, C1.x1 - 2, 62, D.x0 + 3, 66, 7, 5); arrows(C1);
  L.en('drone', D.x0 - 10, 56, { home: { x: D.x0 - 10, y: 56 } });
  decorRoof(L, R, D.x0, D.w, D.top, { dens: .7, padL: 12 });
  /* gantry gap */
  gap(38); const E = roof(36, 68);
  gantry(L, D.x1 - 5, E.x0 + 5, D.top - 17, [D.x1 - 9, E.x0 + 8], D.top);
  L.hint(D.x1 - 22, 16, 60, 12, 'ECHO', TX('Schiene über dir. Ziel auf den Träger, halte Rechtsklick für das Seil und schwing. Mit einem Sprung lässt du mit Schwung los.', 'Schiene über dir. Tipp HAKEN, das Seil sucht sich den Träger. Schwing, mit einem Sprung lässt du mit Schwung los.'));
  chips(L, D.x1 + 1, D.top - 8, E.x0 + 3, E.top - 10, 8, 8);
  decorRoof(L, R, E.x0, E.w, E.top, { dens: .6, padL: 10 }); L.en('grunt', E.x0 + 22, 68);
  /* tower shaft */
  const T1 = { x0: X, w: 16 }; L.mass(X, 33, 16, ST.GLASS); L.clear(X, 62, 16, 6); L.bfill(X, 62, 16, 6, 0, 0, C.blk);
  for (let i = 0; i < 16; i++) L.bset(X + i, 62, i % 4 === 0 ? '▀' : '▄', C.cyanDD, C.blk); L.bset(X + 1, 62, '▛', C.cyanD, C.blk);
  for (let j = 62; j < 68; j++) { L.bset(X + 8, j, '░', C.cyanDD, C.blk); }
  L.dec('sign', X + 3, 60, { text: 'TREPPE 1. OG', col: '#ffb347', flick: true, front: true });
  X += 16; const sx = X; L.mass(sx, 68, 8, ST.METAL);
  const T2 = { x0: sx + 8, w: 26 }; L.mass(T2.x0, 33, 26, ST.GLASS);
  for (const y of [63, 53, 43]) { L.plat(sx + 5, y, 3, '▔', C.cyan); for (let i = 0; i < 3; i++) L.set(sx + 5 + i, y + 1, undefined, '▀', C.cyanDD); }
  for (const y of [58, 48, 38]) { L.plat(sx, y, 3, '▔', C.mag); for (let i = 0; i < 3; i++) L.set(sx + i, y + 1, undefined, '▀', C.magDD); }
  L.dec('lamp', sx + 4, 34, { w: 7, len: 34, col: '#19f0ff' }); L.dec('steam', sx + 4, 67, { rate: 6 });
  L.hint(sx - 14, 10, 60, 12, 'ECHO', 'Turmschacht. Klettere über die Absätze oder spring von den Wänden ab: Sprung drücken, während du rutschst.');
  L.en('drone', sx + 4, 50, { home: { x: sx + 4, y: 50 } });
  X = T2.x0 + 26; const T2r = { x0: T2.x0, x1: X, top: 33, w: 26 }; L.cp(T2.x0 + 8, 33, 'KONTROLLPUNKT 02'); L.en('turret', T2.x0 + 20, 33);
  PROPS.antenna(L, T2.x0 + 3, 33); PROPS.billboard(L, T2.x0 + 12, 33, R); L.pk('hp', T2.x0 + 14, 31);
  /* descent */
  gap(10); const R1 = roof(24, 40); link(T2r, R1); decorRoof(L, R, R1.x0, R1.w, 40, { dens: .6 }); L.en('drone', R1.x0 + 12, 28);
  gap(12); const R2 = roof(26, 48); link(R1, R2); decorRoof(L, R, R2.x0, R2.w, 48, { dens: .6 }); L.en('grunt', R2.x0 + 14, 48); L.en('drone', R2.x0 + 18, 34);
  chips(L, R1.x1 - 2, 38, R2.x0 + 3, 46, 5, 4);
  gap(11); const R3 = roof(26, 56); link(R2, R3); decorRoof(L, R, R3.x0, R3.w, 56, { dens: .6 }); L.en('turret', R3.x0 + 16, 56); L.en('grunt', R3.x0 + 8, 56);
  chips(L, R2.x1 - 2, 46, R3.x0 + 3, 54, 5, 4);
  gap(12); const R4 = roof(34, 62); link(R3, R4); L.cp(R4.x0 + 6, 62, 'KONTROLLPUNKT 03'); L.pk('hp', R4.x0 + 12, 60); decorRoof(L, R, R4.x0, R4.w - 14, 62, { dens: .5, padR: 4 });
  chips(L, R3.x1 - 2, 54, R4.x0 + 3, 60, 5, 4);
  /* train */
  const tx0 = R4.x1, tx1 = tx0 + 90; const J = { x0: tx1, x1: tx1 + 36, top: 60, w: 36 };
  L.clear(R4.x1 - 14, 64, 14, 5); L.bfill(R4.x1 - 14, 64, 14, 5, 0, 0, C.blk);
  X = tx1; L.mass(tx1, 60, 36, ST.ROOF); X = tx1 + 36; L.clear(tx1, 64, 14, 5); L.bfill(tx1, 64, 14, 5, 0, 0, C.blk);
  for (let i = 0; i < 5; i++) { L.bset(R4.x1 - 1, 64 + i, '▐', C.amberD, C.blk); L.bset(tx1, 64 + i, '▌', C.amberD, C.blk); }
  for (let x = R4.x1 - 14; x < tx1 + 14; x++) { L.bset(x, 68, '═', C.greyD, x < tx0 || x >= tx1 ? C.blk : 0); if (x % 3 === 0 && x >= tx0 && x < tx1) L.bset(x, 69, '╤', C.greyDD); }
  for (let x = tx0 + 6; x < tx1; x += 18) for (let y = 70; y < 100; y++) L.bset(x, y, y % 5 === 0 ? '╫' : '║', C.greyDD);
  for (let i = 0; i < 4; i++) L.mv({ kind: 'car', i, x: tx0, y: 64, w: 26, h: 4, x0: tx0, x1: tx1, spd: 14, off: i * 29, dx: 0, dy: 0 });
  L.dec('holo', tx0 + 27, 24, { kind: 'donut', w: 36, h: 18, col: '#ff2fb9', col2: '#ffb347', label: 'GLAZED(TM) NEURAL FUEL' });
  L.dec('beacon', R4.x1 - 2, 61, { col: '#ffb347' }); L.dec('beacon', tx1 + 2, 59, { col: '#ffb347' });
  L.en('drone', tx0 + 30, 49, { home: { x: tx0 + 30, y: 49 } }); L.en('drone', tx0 + 74, 47, { home: { x: tx0 + 74, y: 47 }, elite: true });
  L.hint(R4.x1 - 22, 14, 54, 12, 'ECHO', 'Maglev-Fracht. Sie fährt im Kreis. Lass dich auf einen Wagen fallen, fahr hinüber und achte auf die Lücken zwischen den Wagen.');
  chips(L, tx0 + 4, 61, tx1 - 4, 61, 10, 0);
  L.cp(J.x0 + 22, 60, 'KONTROLLPUNKT 04'); L.en('turret', J.x0 + 30, 60); decorRoof(L, R, J.x0 + 14, 22, 60, { dens: .4, padL: 3, padR: 2 });
  /* sign chain */
  const jEnd = J.x1; const centers = [13, 35, 57, 79]; const cap = jEnd + 92;
  centers.forEach((c, i) => hangSign(L, jEnd + c, 47, 10, ['VOID', 'NEURO', 'HOTEL', '夢'][i] && hasGlyph('夢') ? ['VOID', 'NEURO', 'HOTEL', '夢'][i] : ['VOID', 'NEURO', 'HOTEL', 'KAIJU'][i], NEON[i % NEON.length], 10));
  L.dec('holo', jEnd + 30, 6, { kind: 'globe', w: 30, h: 15, col: '#19f0ff', col2: '#5dffb0', label: 'MERIDIAN GLOBAL' });
  L.hint(jEnd - 18, 14, 52, 10, 'ECHO', 'Hängende Schilder. Häng dich an eins, schwing, lass mit einem Sprung los, greif das nächste. Behalte dein Tempo.');
  L.en('drone', jEnd + 46, 40, { home: { x: jEnd + 46, y: 40 }, elite: true });
  for (let i = 0; i < centers.length - 1; i++) chips(L, jEnd + centers[i] + 4, 56, jEnd + centers[i + 1] - 4, 54, 3, 6);
  X = cap; const Lr = roof(40, 58); decorRoof(L, R, Lr.x0, Lr.w, 58, { dens: .6, padL: 8, padR: 12 }); L.en('grunt', Lr.x0 + 14, 58); L.en('grunt', Lr.x0 + 24, 58);
  /* vent climb */
  const M1 = roof(30, 40); L.vent(Lr.x1 - 7, 34, 4, 24); L.dec('sign', Lr.x1 - 9, 52, { text: 'AUFWIND', col: '#5dffb0', flick: true, front: true });
  L.hint(Lr.x1 - 30, 12, 50, 10, 'ECHO', 'Abgas-Aufwind. Tritt hinein, lass dich hochtragen und steuere aufs Dach.');
  for (let i = 0; i < 4; i++) L.set(Lr.x1 - 7 + i, 58, undefined, '▒', C.greyD);
  decorRoof(L, R, M1.x0, M1.w, 40, { dens: .4, padL: 8 }); L.en('turret', M1.x0 + 16, 40); L.en('drone', M1.x0 + 22, 28);
  gap(12); const M2 = roof(26, 44); link(M1, M2); decorRoof(L, R, M2.x0, M2.w, 44, { dens: .5 }); L.en('grunt', M2.x0 + 12, 44); L.en('grunt', M2.x0 + 18, 44); L.en('drone', M2.x0 + 12, 30, { elite: true });
  chips(L, M1.x1 - 2, 38, M2.x0 + 3, 42, 5, 5);
  gap(10); const M3 = roof(24, 40); link(M2, M3); L.cp(M3.x0 + 8, 40, 'KONTROLLPUNKT 05'); L.pk('hp', M3.x0 + 3, 38);
  chips(L, M2.x1 - 2, 42, M3.x0 + 3, 38, 5, 5);
  /* HELI-RAID: the vehicle section. A parked helicopter, a slalom between towers and hanging pylons, gunships overhead.
     The heli is back in its bay after every respawn, so there is no checkpoint inside the section. */
  const HR = M3.x1, hang = (cx, w, y0, y1) => { L.mass(cx, y0, w, ST.METAL, y1); for (let y = 0; y < y0; y++) { L.bset(cx + 1, y, y % 4 === 0 ? '╫' : '║', C.greyD); L.bset(cx + w - 2, y, y % 4 === 0 ? '╫' : '║', C.greyD); } L.dec('beacon', cx + w / 2, y1 + 1.4, { col: '#ff3b4d' }); L.dec('beacon', cx + .5, y1 + .5, { col: '#ffb347' }); };
  const pylon = (cx, w, y0, y1) => { L.mass(cx, y0, w, ST.METAL, y1); L.dec('beacon', cx + w / 2, y0 - .4, { col: '#ff3b4d' }); L.dec('beacon', cx + w / 2, y1 + 1.4, { col: '#ff3b4d' }); };
  const heli1 = L.veh('heli', M3.x0 + 17, 40, { face: 1, bounds: { x0: M3.x0 - 4, x1: 99999, y0: 4, y1: 94 } });
  L.dec('sign', M3.x0 + 2, 31, { text: 'HELIPORT', col: '#ffe45e', frame: true, flick: true }); L.dec('beacon', M3.x0 + 12.5, 39.4, { col: '#ffe45e' }); L.dec('beacon', M3.x0 + 21.5, 39.4, { col: '#ffe45e' });
  L.hint(M3.x0 + 1, 12, 30, 12, 'ECHO', TX('Ein Hubschrauber der Konzernflotte! Steig ein mit V und flieg über die Skyline. Die Gegner da draußen sind schwer bewaffnet.', 'Ein Hubschrauber der Konzernflotte! Tipp auf REIN und flieg über die Skyline. Die Gegner da draußen sind schwer bewaffnet.'));
  L.en('gunship', HR + 34, 32);
  X = HR + 46; const Ta = roof(18, 52); L.pk('hp', Ta.x0 + 9, 50); L.en('turret', Ta.x0 + 14, 52); L.dec('beacon', Ta.x0 + 1, 51, { col: '#ffb347' });
  hang(HR + 78, 5, 4, 37); L.en('drone', HR + 94, 42, { elite: true });
  X = HR + 104; const Tb = roof(20, 46); L.en('turret', Tb.x0 + 4, 46); L.en('turret', Tb.x0 + 16, 46); L.pk('hp', Tb.x0 + 10, 44);
  pylon(HR + 138, 4, 28, 60); L.en('gunship', HR + 152, 36);
  hang(HR + 168, 5, 4, 38);
  X = HR + 178; const Tc = roof(22, 50); L.en('turret', Tc.x0 + 4, 50); L.en('turret', Tc.x0 + 17, 50); L.pk('hp', Tc.x0 + 11, 48);
  pylon(HR + 216, 4, 26, 58); L.en('gunship', HR + 230, 30, { hp: 26, maxhp: 26 }); L.en('gunship', HR + 244, 40, { hp: 26, maxhp: 26 });
  chips(L, HR + 6, 40, HR + 40, 38, 8, 4); chips(L, HR + 62, 44, HR + 100, 43, 8, 3); chips(L, HR + 126, 44, HR + 160, 22, 8, 5); chips(L, HR + 146, 66, HR + 164, 66, 5, 0);
  chips(L, HR + 186, 44, HR + 214, 44, 7, 2); chips(L, HR + 224, 22, HR + 250, 44, 8, 3);
  for (let i = 0; i < 9; i++) L.dec('flyer', 0, 14 + (i * 7) % 26, { kind: 'car', x0: HR, x1: HR + 300, sp: 9 + (i % 4) * 3, dir: i % 2 ? 1 : -1, ph: i / 9, col: NEON[i % NEON.length] });
  for (let i = 0; i < 3; i++) L.dec('flyer', 0, 10 + i * 9, { kind: 'heli', x0: HR, x1: HR + 300, sp: 5 + i, dir: i % 2 ? 1 : -1, ph: i * .31, dim: .32 });
  X = HR + 262; const Lp = roof(34, 40); L.cp(Lp.x0 + 8, 40, 'KONTROLLPUNKT 06'); L.pk('hp', Lp.x0 + 22, 38); heli1.bounds.x1 = Lp.x1 - 3;
  L.dec('sign', Lp.x0 + 4, 31, { text: 'LANDEPLATTFORM  >>>  SKYBRIDGE', col: '#19f0ff', frame: true, flick: false });
  L.hint(Lp.x0 - 6, 14, 30, 12, 'ECHO', TX('Landeplattform. Steig mit V aus, die Skybridge geht zu Fuß weiter. Der Hubschrauber wartet nicht auf dich.', 'Landeplattform. Tipp auf RAUS, die Skybridge geht zu Fuß weiter. Der Hubschrauber wartet nicht auf dich.'));
  /* skybridge: glass tube */
  const bx0 = X, bl = 44; L.mass(bx0, 40, bl, ST.GLASS, 43); L.mass(bx0, 31, bl, ST.GLASS, 33); X += bl;
  for (let x = bx0; x < bx0 + bl; x += 6) for (let y = 33; y < 40; y++) L.bset(x, y, '│', C.cyanDD);
  L.en('turret', bx0 + 14, 35, { dir: 'down' }); L.en('turret', bx0 + 30, 35, { dir: 'down' }); L.en('drone', bx0 + 22, 38);
  L.hint(bx0 - 4, 8, 32, 10, 'ECHO', 'Skybridge zum Anbau der Spitze. Die Lobby ist eine Todesfalle. Räum sie Raum für Raum leer.');
  /* annex w/ arena */
  const ex0 = X; L.mass(ex0, 22, 84, ST.HULL);
  L.clear(ex0, 34, 2, 6); L.clear(ex0 + 2, 29, 66, 11); L.clear(ex0 + 68, 34, 2, 6); L.clear(ex0 + 70, 34, 10, 6);
  carveRoom(L, ex0 + 2, 29, 66, 11, 7, 'hall'); for (let xx = ex0 + 70; xx < ex0 + 80; xx++) for (let yy = 34; yy < 40; yy++) L.bset(xx, yy, 0, 0, C.i1);
  for (let xx = ex0 + 2; xx < ex0 + 68; xx++) for (let yy = 30; yy < 33; yy++) L.bset(xx, yy, ((xx - ex0) % 11 === 0) ? '│' : 0, ((xx - ex0) % 11 === 0) ? C.cyanD : 0, 0);
  for (let xx = ex0; xx < ex0 + 2; xx++) for (let yy = 34; yy < 40; yy++) L.bset(xx, yy, 0, 0, C.i1);
  const d1 = L.door(ex0, 34, 6, { mode: 'arena', open: 1, target: 1 }); doorTiles(L, d1); const d2 = L.door(ex0 + 68, 34, 6, { mode: 'arena', open: 0, target: 0 });
  for (let x = ex0 + 8; x < ex0 + 62; x += 14) L.dec('lamp', x, 29, { w: 9, len: 11, col: '#ff3b4d' });
  L.dec('sign', ex0 + 28, 31, { text: 'MERIDIAN  //  SPERRBEREICH', col: '#ff3b4d', flick: false });
  arena(L, ex0 + 2, 29, 66, 11, [d1, d2], [
    [['grunt', ex0 + 10, 40], ['grunt', ex0 + 56, 40], ['drone', ex0 + 34, 33]],
    [['warden', ex0 + 52, 40]],
    [['drone', ex0 + 14, 32, { elite: true }], ['drone', ex0 + 54, 32, { elite: true }], ['grunt', ex0 + 8, 40], ['grunt', ex0 + 58, 40]],
  ], 'ABRIEGELUNG');
  L.dec('sign', ex0 + 72, 36, { text: 'AUFZUG', col: '#19f0ff', flick: true, front: true });
  L.zone(ex0 + 76, 30, 4, 12, { exit: true });
  L.camBox = { x0: 0, x1: ex0 + 82, y0: 0, y1: Hh };
  L.endX = ex0 + 80;
  finalizeLevel(L);
  return L;
}

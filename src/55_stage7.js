/* =========================================================================
   SEKTOR 7 :: ARCADE ORBIT
   Die Wartehalle am Orbitallift ist ein Spielautomat geworden. Vier Spiele, vier Räume:
   Jump'n'Run, Pong über dem Abgrund, ein Pac-Man-Gang voller Geister und zuletzt SPACE INVADERS
   mit Laserkanone, Bunkern, UFO und Mutterschiff.
   ========================================================================= */
function buildStage7() {
  const th = THEMES.arcade, R = RNG(707), Hh = 90, S0 = 70, W = 330, L = new Level(7, W, Hh, th);
  L.deathY = Hh + 8; L.camRef = 53;
  L.intro = {
    title: 'ARCADE ORBIT', sub: 'WARTEHALLE // DER LIFT FÄHRT NUR MIT MÜNZEN // 00:20 UHR',
    lines: ['ECHO: Der Lift steht, Sam. ZENIT hat die Wartehalle in einen Spielautomaten verwandelt. Wer weiter will, muss gewinnen.',
      'ECHO: Vier Spiele, vier Räume. Keine Münze, keine Gnade. Und im letzten Raum musst du dich in eine Kanone setzen.']
  };
  const floor = [[0, 96], [110, 122], [172, W]];
  for (const [a, b] of floor) L.mass(a, S0, b - a, ST.ROOF, Hh);
  L.mass(0, 30, 6, ST.METAL, S0); L.mass(W - 4, 30, 4, ST.METAL, S0);
  /* the screen behind everything: dark grid, scanlines, big pixel stars */
  L.bfillFn(0, 20, W, 50, (x, y) => { if ((x % 8 === 0 && y % 4 === 0)) return ['·', C.i2, 0, 0]; if (hash2(x, y) > .993) return ['✦', C.mintD, 0, AN.BLINK]; return null; });
  const cabinet = (x, y, col) => L.stamp(x, y - 8, ['  ▗▄▄▄▖  ', ' ▟█████▙ ', ' █▒▒▒▒▒█ ', ' █▒◉ ◉▒█ ', ' █▒▒▒▒▒█ ', ' ▜█▄▄▄█▛ ', '  █ ◎ █  ', '  █▄▄▄█  '], { back: true, d: C.greyD, c: { '◉': col, '▒': C.cyanDD, '◎': C.amber }, a: { '◉': AN.PULSE } });
  const E = (k, x, dy, o) => L.en(k, x, S0 + (dy || 0), o);
  /* ---- A :: INSERT COIN ---- */
  L.start = { x: 10, y: S0 };
  L.dec('sign', 8, 46, { text: 'ARCADE ORBIT', col: '#5dffb0', flick: true, frame: true });
  L.dec('sign', 24, 58, { text: 'INSERT COIN', col: '#ffe45e', flick: true, front: true });
  cabinet(34, S0, '#5dffb0'); cabinet(46, S0, '#ff2fb9'); cabinet(76, S0, '#19f0ff');
  L.hint(2, 18, S0 - 12, 14, 'ECHO', TX('Spiel eins: Jump n Run. Pixelhüpfer springen dich an, hol dir die Münzen. A und D laufen, LEERTASTE springt, ein zweiter Druck in der Luft gibt den Doppelsprung.', 'Spiel eins: Jump n Run. Pixelhüpfer springen dich an, hol dir die Münzen. Der Doppelsprung hilft bei jeder Lücke.'));
  E('pixel', 38); E('pixel', 52); E('drone', 44, -14); L.pk('hp', 26, S0 - 2); chips(L, 16, S0 - 3, 56, S0 - 3, 10, 0); L.cp(30, S0, 'KONTROLLPUNKT 01');
  /* ---- B :: stairs and the first pit ---- */
  const heights = [1, 2, 3, 4, 3, 2, 1];
  heights.forEach((h, i) => { L.mass(60 + i * 4, S0 - h, 4, ST.ROOF, S0); });
  L.plat(62, S0 - 8, 5, '▀', C.yel); L.plat(74, S0 - 11, 5, '▀', C.yel); chips(L, 58, S0 - 6, 90, S0 - 4, 12, 3);
  for (const x of [62, 74]) L.dec('sign', x + 1, S0 - (x === 62 ? 10 : 13), { text: '?', col: '#ffe45e', flick: true });
  E('pixel', 70); E('pixel', 84); E('ghost', 90, -8); E('pixel', 92);
  L.dec('sign', 98, 80, { text: 'GAME OVER', col: '#ff3b4d', flick: true, front: true });
  L.mv({ kind: 'pad', x: 96, y: S0 - 1, cx: 100, cy: S0 - 1, w: 6, h: 1, amp: 2, f: 1.1, off: 0, dx: 0, dy: 0 });
  L.mv({ kind: 'pad', x: 104, y: S0 - 1, cx: 106, cy: S0 - 3, w: 6, h: 1, amp: 2, f: 1.1, off: 2, ampy: 2, dx: 0, dy: 0 });
  /* ---- C :: PONG over a long pit ---- */
  L.dec('sign', 126, 40, { text: 'P O N G', col: '#19f0ff', flick: true, frame: true });
  for (let i = 0; i < 4; i++) L.mv({ kind: 'pad', x: 125 + i * 14, y: S0 - 5, cx: 127 + i * 14, cy: S0 - 5, w: 6, h: 1, amp: 0, ampy: 4, f: 1.5, off: i * 1.7, dx: 0, dy: 0 });
  L.blade(147, 60, 22, 5, 1.8, 0, 2.2); L.blade(147, 56, 20, 3, 1.3, 2.4, 1.6);
  chips(L, 126, S0 - 9, 168, S0 - 9, 12, 4); E('drone', 140, -18, { elite: true }); E('drone', 160, -20, { elite: true });
  L.dec('sign', 142, 80, { text: 'GAME OVER', col: '#ff3b4d', flick: true, front: true });
  L.cp(176, S0, 'KONTROLLPUNKT 02');
  /* ---- D :: the Pac-Man corridor: pellets, ghosts, power pills ---- */
  L.mass(182, S0 - 12, 48, ST.METAL, S0 - 10);
  for (const x of [188, 202, 216]) L.mass(x, S0 - 2, 4, ST.METAL, S0);
  for (let x = 184; x < 228; x += 2) L.pk('chip', x + .5, S0 - 3);
  L.pk('hp', 190, S0 - 3); L.pk('hp', 222, S0 - 3);
  L.dec('sign', 190, S0 - 18, { text: 'P A C - G A N G', col: '#ffe45e', flick: true, frame: true });
  E('ghost', 192, -5); E('ghost', 204, -6); E('ghost', 214, -5); E('ghost', 224, -6); E('pixel', 198); E('pixel', 210);
  L.hint(180, 10, S0 - 12, 14, 'ECHO', 'Pac-Gang. Die Geister gleiten durch Wände, rennen bringt nichts. Schieß sie ab und friss die Punkte.');
  /* ---- E :: SPACE INVADERS ---- */
  const AX0 = 244, AX1 = 310, FY = S0;
  L.dec('sign', 234, 50, { text: 'SPACE INVADERS', col: '#ff2fb9', flick: true, frame: true });
  L.cp(234, S0, 'KONTROLLPUNKT 03');
  L.mass(238, 0, 80, ST.METAL, 36);                        // the machine's roof, all the way up so nobody flies over it
  const dL = L.door(240, 36, 34, { mode: 'inv', open: 1, target: 1 }), dR = L.door(312, 36, 34, { mode: 'inv', open: 0, target: 0 });
  const bunkers = [[250, 61, 10, 4], [266, 61, 10, 4], [282, 61, 10, 4], [298, 61, 10, 4]];
  for (const [x, y, w, h] of bunkers) { L.brkRect(x, y, w, h, ST.METAL); L.clear(x + 3, y + 2, 4, 2); L.clear(x, y, 1, 1); L.clear(x + w - 1, y, 1, 1); }
  L.bfill(AX0 - 2, 36, AX1 - AX0 + 4, 34, 0, 0, C.ink);
  L.bfillFn(AX0 - 2, 36, AX1 - AX0 + 4, 34, (x, y) => (y % 3 === 0 ? ['─', C.i1, C.ink, 0] : hash2(x, y) > .992 ? ['·', C.mintD, C.ink, AN.BLINK] : null));
  for (let x = AX0; x < AX1; x++) L.bset(x, FY - 1, '▁', C.mintD);
  L.dec('sign', 262, 38, { text: 'SCORE  000000      HI-SCORE  999999', col: '#5dffb0', flick: false, front: false });
  L.inv = { x0: AX0, x1: AX1, fy: FY, cx: (AX0 + AX1) / 2, trig: { x: AX0 + 1, y: S0 - 14, w: 8, h: 15 }, doors: [dL, dR], bunkers: bunkers.map(([x, y, w, h]) => ({ x, y, w, h })), respawn: { x: 234, y: S0 }, after: { x: 318, y: S0 } };
  L.pk('hp', 244, S0 - 3);
  /* ---- the way out ---- */
  L.cp(318, S0, 'KONTROLLPUNKT 04');
  cabinet(322, S0, '#ffe45e');
  L.dec('sign', 316, 56, { text: 'WARP ► ZENIT', col: '#5dffb0', flick: true, frame: true });
  L.zone(318, S0 - 6, 8, 6, { exit: true });
  L.camBox = { x0: 0, x1: W, y0: 0, y1: Hh };
  finalizeLevel(L);
  return L;
}

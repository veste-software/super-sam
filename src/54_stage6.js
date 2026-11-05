/* =========================================================================
   SEKTOR 6 :: KRONOS-TURM
   Ein senkrechter Aufstieg durch einen 300 Meter hohen Glasturm: Lobby, Büroetagen, Serverraum
   (Brecher-Mechs), Aufzugschacht, die Außenfassade im Wind und das Dach mit dem Fassadenwächter.
   Neu: Scharfschützen (roter Laser, ausweichen!) und der Mech.
   ========================================================================= */
function buildStage6() {
  const th = THEMES.glass, R = RNG(606), Hh = 340, W = 200, L = new Level(6, W, Hh, th);
  L.deathY = Hh + 12; L.camRef = 266;
  L.intro = {
    title: 'KRONOS-TURM', sub: 'EBENE 0 BIS 300 // DER WEG ZUM ORBITALLIFT // 23:40 UHR',
    lines: ['ECHO: Das ist der Kronos-Turm, Sam. Ganz oben wartet der Orbitallift. Dazwischen liegen dreihundert Meter Glas und Konzernsicherheit.',
      'ECHO: Achtung, Scharfschützen. Ein roter Laserpunkt heißt: gleich schießt er auf die Stelle, wo du gerade stehst. Beweg dich.']
  };
  const TL = 44, TR = 156, TOP = 76, CEIL = 150, F = [320, 302, 284, 266, 248, 230, 204, 186, 168];
  /* the street, the glass skin, the solid crown block above the top office floor */
  L.mass(0, 320, W, ST.ASPH);
  facades(L, R, 0, 40, 320, 36, 56); facades(L, R, 160, 200, 320, 36, 56);
  L.mass(40, TOP, 4, ST.GLASS, 320); L.mass(156, TOP, 4, ST.GLASS, 320);
  L.clear(40, 310, 4, 10);                // the entrance gate
  L.mass(TL, TOP, TR - TL, ST.GLASS, CEIL);
  /* back wall of the offices: panels, pillars, lit windows */
  L.bfillFn(TL, CEIL, TR - TL, 320 - CEIL, (x, y) => { const pan = (((x - TL) / 14) | 0) % 2; return [(x - TL) % 14 === 0 ? '│' : 0, C.greyDD, pan ? C.i1 : C.i2, 0]; });
  for (let y = CEIL + 4; y < 316; y += 18) for (let x = TL + 4; x < TR - 6; x += 14) if (hash2(x, y) < .5) { for (let a = 0; a < 2; a++) for (let b = 0; b < 6; b++) L.bset(x + b, y + a, a === 0 ? '▀' : 0, C.cyanDD, hash2(x + b, y) < .3 ? C.g1 : C.g0); }
  /* climb: one-way steps zigzag up through a slab hole */
  const climb = (xa, yBelow, yTop) => { const dist = yBelow - (yTop + 3), n = Math.ceil(dist / 5.2); for (let k = 0; k < n; k++) { const y = yBelow - Math.round((k + 1) * dist / n), x = xa + (k % 2) * 8; L.plat(x, y, 8, '▔', C.cyan); for (let j = 0; j < 8; j++) L.set(x + j, y + 1, undefined, '░', C.cyanDD); } };
  const slab = (i, hx0) => { L.mass(TL, F[i], TR - TL, ST.INT, F[i] + 2); L.clear(hx0, F[i], 16, 2); climb(hx0, F[i - 1], F[i]); L.dec('sign', hx0 + 1, F[i] - 4, { text: hx0 < 100 ? '▲ AUFSTIEG' : 'AUFSTIEG ▲', col: '#19f0ff', flick: true }); };
  for (let i = 1; i <= 6; i++) slab(i, i % 2 === 1 ? 48 : 136);
  /* office furniture: desks and server racks as background art */
  const deskArt = (x, y) => L.stamp(x, y - 2, ['▛▀▀▀▀▜', '█◙▒▒◙█'], { back: true, d: C.greyD, c: { '◙': C.cyanD, '▒': C.cyanDD }, a: { '◙': AN.DATA } });
  const rackR = (x, y) => L.stamp(x, y - 6, ['┌──┐', '│▪▪│', '│▪▪│', '│▪▪│', '│▪▪│', '└──┘'], { back: true, d: C.greyD, c: { '▪': C.mint }, a: { '▪': AN.BLINKF } });
  for (let i = 0; i < 5; i++) { const y = F[i]; for (let x = 70 + (i % 2) * 5; x < 130; x += 18 + (i * 7) % 6) deskArt(x, y); L.dec('beacon', 46, y - 14, { col: '#19f0ff' }); }
  const E = (i, spec) => spec.forEach(([k, x, dy, o]) => L.en(k, x, F[i] + (dy || 0), o));

  /* ---- street and lobby ---- */
  L.start = { x: 8, y: 320 };
  L.dec('sign', 6, 296, { text: 'KRONOS', col: '#19f0ff', flick: true, frame: true, front: true });
  L.hint(2, 14, 306, 14, 'ECHO', TX('Das Eingangstor steht offen. Rein, und dann immer nach oben: springen, Doppelsprung, an den Stufen entlang. A und D laufen, LEERTASTE springt.', 'Das Eingangstor steht offen. Rein, und dann immer nach oben: springen, Doppelsprung, an den Stufen entlang.'));
  L.en('grunt', 20, 320); L.en('grunt', 30, 320); L.en('drone', 24, 304); L.pk('hp', 34, 318);
  L.dec('sign', 80, 308, { text: 'LOBBY', col: '#ffe45e', flick: true });
  L.en('grunt', 76, 320); L.en('grunt', 108, 320); L.en('drone', 92, 304); L.en('sniper', 150, 320); L.en('turret', 128, 320);
  chips(L, 50, 318, 120, 318, 8, 0); L.cp(52, 320, 'KONTROLLPUNKT 01');
  /* ---- offices 1 to 4 ---- */
  E(1, [['grunt', 84], ['grunt', 112], ['drone', 98, -12], ['sniper', 148], ['turret', 130]]);
  L.pk('hp', 80, F[1] - 2); chips(L, 70, F[1] - 2, 128, F[1] - 2, 7, 0);
  E(2, [['sniper', 56], ['turret', 76], ['grunt', 100], ['drone', 116, -12, { elite: true }], ['seeker', 128, -8]]);
  chips(L, 70, F[2] - 2, 130, F[2] - 2, 7, 0); L.cp(60, F[2], 'KONTROLLPUNKT 02');
  E(3, [['warden', 100], ['sniper', 148], ['drone', 70, -12], ['grunt', 124]]);
  L.hint(50, 14, F[3] - 12, 14, 'ECHO', 'Ein Wärter, Sam. Der zerschlägt, was er berührt. Schieß aus der Entfernung oder spring drüber.');
  L.pk('hp', 64, F[3] - 2); chips(L, 70, F[3] - 2, 130, F[3] - 2, 7, 0);
  E(4, [['mech', 100], ['drone', 66, -12, { elite: true }], ['drone', 128, -12, { elite: true }], ['sniper', 56]]);
  L.hint(132, 14, F[4] - 12, 14, 'ECHO', TX('Ein Mech. Der Brecher stampft Schockwellen über den Boden, also spring im richtigen Moment. Greif ihn mit dem Haken an, das reißt ihn auf.', 'Ein Mech. Der Brecher stampft Schockwellen über den Boden, also spring im richtigen Moment. Greif ihn mit HAKEN an, das reißt ihn auf.'));
  L.pk('hp', 126, F[4] - 2); chips(L, 70, F[4] - 2, 126, F[4] - 2, 7, 0); L.cp(138, F[4], 'KONTROLLPUNKT 03');
  /* ---- the server room: floor 5 up to slab 6 ---- */
  for (let x = 54; x < 124; x += 12) { rackR(x, F[5]); rackR(x, F[5] - 6); }
  L.dec('sign', 74, F[5] - 22, { text: 'SERVERRAUM 04', col: '#ff3b4d', flick: true, front: true, frame: true });
  const dS = L.door(126, 206, 24, { mode: 'arena', open: 1, target: 1 });
  arena(L, 46, 206, 80, 25, [dS], [
    [['sniper', 118, F[5]], ['sniper', 54, F[5]], ['grunt', 82, F[5]], ['grunt', 100, F[5]]],
    [['mech', 90, F[5]], ['drone', 62, 214, { elite: true }], ['drone', 112, 214, { elite: true }]],
    [['mech', 62, F[5]], ['mech', 112, F[5]], ['seeker', 82, 214], ['seeker', 92, 212], ['seeker', 102, 214]],
  ], 'SERVERRAUM');
  L.pk('hp', 142, F[5] - 2); L.cp(132, F[5], 'KONTROLLPUNKT 04');
  /* ---- floors 6 to 8: two chained lifts ---- */
  L.mass(TL, F[7], TR - TL, ST.INT, F[7] + 2); L.mass(TL, F[8], TR - TL, ST.INT, F[8] + 2);
  L.clear(93, F[6], 12, 2); L.clear(93, F[7], 23, 2); L.clear(105, F[8], 12, 2);
  L.mv({ kind: 'elev', x: 93, y: F[6], w: 11, h: 1, y0: F[6], y1: F[7], spd: .24, off: 0, pause: .9, cableTop: F[7] + 2, dx: 0, dy: 0 });
  L.mv({ kind: 'elev', x: 105, y: F[7], w: 11, h: 1, y0: F[7], y1: F[8], spd: .24, off: 1.9, pause: .9, cableTop: CEIL, dx: 0, dy: 0 });
  L.dec('sign', 88, F[6] - 14, { text: 'AUFZUG ▲', col: '#19f0ff', flick: true, front: true, frame: true });
  L.dec('sign', 120, F[7] - 14, { text: 'AUFZUG ▲', col: '#19f0ff', flick: true, front: true, frame: true });
  E(6, [['drone', 66, -12, { elite: true }], ['sniper', 56], ['turret', 76], ['grunt', 124]]);
  chips(L, 56, F[6] - 2, 90, F[6] - 2, 5, 0);
  L.laser(120, F[7] - 1, 150, 3.4, 1.2, 0, { h: true });
  E(7, [['drone', 70, -12, { elite: true }], ['sniper', 150], ['turret', 56]]);
  E(8, [['sniper', 148], ['mech', 64], ['drone', 130, -10]]);
  L.pk('hp', 60, F[7] - 2); L.pk('hp', 130, F[8] - 2); chips(L, 50, F[7] - 2, 88, F[7] - 2, 5, 0); L.cp(124, F[8], 'KONTROLLPUNKT 05');
  /* ---- out onto the facade: balconies, wind, snipers ---- */
  L.clear(156, F[8] - 12, 4, 12); L.dec('sign', 146, F[8] - 15, { text: 'FASSADE ►', col: '#ffb347', flick: true, front: true });
  L.mass(160, F[8], 12, ST.METAL, F[8] + 3);
  const ledges = [[176, 163, 12], [190, 158, 9], [178, 153, 12], [164, 148, 10], [176, 143, 10], [188, 138, 10], [176, 133, 9], [164, 128, 10], [178, 123, 10], [190, 118, 8], [178, 113, 10], [166, 108, 10], [180, 103, 10], [168, 98, 10], [182, 93, 9], [170, 88, 10], [176, 83, 9], [162, 79, 8]];
  for (const [x, y, w] of ledges) { L.plat(x, y, w, '▔', C.amber); for (let k = 0; k < w; k++) L.set(x + k, y + 1, undefined, k % 2 ? '╥' : '┬', C.amberD); }
  L.mv({ kind: 'pad', x: 164, y: 118, cx: 172, cy: 118, w: 8, h: 1, amp: 7, f: .9, off: 0, dx: 0, dy: 0 });
  L.en('sniper', 192, 158); L.en('sniper', 168, 148); L.en('sniper', 184, 123); L.en('drone', 186, 140); L.en('drone', 172, 110, { elite: true }); L.en('gunship', 182, 126); L.en('gunship', 178, 96); L.en('seeker', 188, 108);
  L.pk('hp', 180, 152); L.pk('hp', 168, 107); chips(L, 164, 160, 178, 82, 14, 6);
  L.hint(160, 12, F[8] - 12, 14, 'ECHO', 'Draußen, Sam. Die Fassade hat keine Treppen, nur Simse. Spring von Sims zu Sims, der Doppelsprung rettet dich, und Scharfschützen sitzen im Weg.');
  L.cp(164, 168, 'KONTROLLPUNKT 06');
  /* ---- the crown: roof garden, the Fassadenwächter, the orbital lift ---- */
  L.mass(TL, TOP, 112, ST.METAL, TOP + 3);
  for (const x of [66, 128]) { lattice(L, x, TOP - 22, TOP - 1, C.greyD); L.dec('beacon', x + .5, TOP - 22.5, { col: '#ff3b4d' }); }
  PROPS.dish(L, 94, TOP); PROPS.antenna(L, 142, TOP); PROPS.antenna(L, 52, TOP); L.dec('steam', 112, TOP - 1, { rate: 9 }); L.dec('steam', 78, TOP - 1, { rate: 8 });
  L.mass(TL, 36, 112, ST.GLASS, 40); L.mass(40, 36, 4, ST.GLASS, TOP);          // a glass canopy: the roof arena can't be flown over
  const dR = L.door(150, 40, 36, { mode: 'arena', open: 1, target: 1 }), dL = L.door(58, 40, 36, { mode: 'arena', open: 1, target: 1 });
  arena(L, 58, 40, 94, 37, [dR, dL], [
    [['drone', 90, 56, { elite: true }], ['drone', 110, 52, { elite: true }], ['drone', 128, 58, { elite: true }], ['sniper', 72, TOP], ['sniper', 140, TOP]],
    [['mech', 100, TOP], ['seeker', 80, 60], ['seeker', 118, 58], ['sniper', 72, TOP]],
    [['mech', 104, TOP, { scale: 2, hp: 100, maxhp: 100, w: 16, h: 14, name: 'FASSADENWÄCHTER' }], ['sniper', 68, TOP], ['sniper', 144, TOP]],
  ], 'DAS DACH');
  L.hint(158, 8, 60, 20, 'ECHO', 'Das Dach. Der Fassadenwächter bewacht den Lift. Er ist groß, aber langsam. Bleib in Bewegung.');
  L.dec('sign', 46, TOP - 12, { text: 'ORBITALLIFT', col: '#5dffb0', flick: true, frame: true, front: true });
  L.stamp(44, TOP - 6, ['▛▀▀▀▀▜', '█    █', '█ ◙◙ █', '█ ◙◙ █', '█    █', '█    █'], { back: true, d: C.mintD, c: { '◙': C.mint }, a: { '◙': AN.PULSE } });
  L.zone(45, TOP - 6, 5, 6, { exit: true });
  L.pk('hp', 150, 70);
  L.camBox = { x0: 0, x1: W, y0: 0, y1: Hh };
  finalizeLevel(L);
  return L;
}

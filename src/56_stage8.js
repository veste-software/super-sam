/* =========================================================================
   SEKTOR 8 :: ZENIT
   Die Orbitalstation, 400 Kilometer über der Erde, Schwerkraft nur 45 Prozent. Andockbucht,
   Solarfeld (Gleiter!), Reaktorring mit Auftriebsschacht, der Koloss als Torwächter und zuletzt der
   Kern: ZENITH, das Gehirn der Station. Danach ist das Signal verstummt.
   ========================================================================= */
function buildStage8() {
  const th = THEMES.orbit, R = RNG(808), Hh = 110, W = 470, F = 80, L = new Level(8, W, Hh, th);
  L.deathY = Hh + 10; L.camRef = 62; L.gmul = .45; L.gbase = .45;
  L.intro = {
    title: 'ZENIT', sub: 'ORBITALSTATION // 400 KM HÖHE // SCHWERKRAFT 45 PROZENT // 02:40 UHR',
    lines: ['ECHO: Das ist ZENIT, Sam. Hier laufen alle Signale zusammen, auch Archons. Dahinter sitzt etwas, das größer ist als er.',
      'ECHO: Die Schwerkraft ist schwach. Du springst hoch und weit, aber du bremst auch schlecht. Nimm den Gleiter, wenn du willst.']
  };
  const hull = (x, y, w, t) => { L.mass(x, y, w, ST.HULL, y + (t || 3)); };
  const strut = (x, y, h) => { for (let yy = y; yy < y + h; yy++) { L.bset(x, yy, yy % 4 === 0 ? '╫' : '║', C.greyDD); L.bset(x + 1, yy, yy % 4 === 0 ? '╫' : '║', C.greyDD); } };
  const pod = (x, y, w, t) => { hull(x, y, w, t || 4); strut(x + 2, y + (t || 4), 8); strut(x + w - 4, y + (t || 4), 8); L.dec('beacon', x + .5, y - .5, { col: '#19f0ff' }); L.dec('beacon', x + w - .5, y - .5, { col: '#ff3b4d' }); };
  const panel = (x, y, w, h) => L.bfillFn(x, y, w, h, (xx, yy, i, j) => [(i % 6 === 0 || j % 4 === 0) ? '┼' : 0, C.cyanDD, ((i / 6 | 0) + (j / 4 | 0)) % 2 ? C.i1 : C.i2, 0]);
  const E = (k, x, y, o) => L.en(k, x, y, o);

  /* ---- 1 :: the docking bay ---- */
  hull(0, F, 74, 8); L.mass(0, F - 34, 4, ST.HULL, F); L.mass(0, F - 38, 74, ST.HULL, F - 34);
  L.bfill(4, F - 34, 70, 34, 0, 0, C.hull0);
  for (let x = 8; x < 70; x += 14) L.bfillFn(x, F - 28, 8, 14, (xx, yy, i, j) => [(i === 0 || j === 0 || i === 7 || j === 13) ? '▒' : 0, C.hullL, (j > 2 && j < 12 && i > 0 && i < 7) ? C.b2 : C.hull1, 0]);
  L.dec('sign', 10, F - 30, { text: 'ZENIT // DECK 1', col: '#19f0ff', flick: true, frame: true });
  L.start = { x: 12, y: F }; L.cp(12, F, 'KONTROLLPUNKT 01');
  L.hint(4, 24, F - 12, 14, 'ECHO', TX('Schwerkraft 45 Prozent. Dein Sprung trägt dich dreimal so weit wie sonst. Der Gleiter da vorn schwebt über das Solarfeld, V steigt ein.', 'Schwerkraft 45 Prozent. Dein Sprung trägt dich weit. Der Gleiter da vorn schwebt über das Solarfeld, REIN steigt ein.'));
  L.veh('hover', 40, F, { face: 1 });
  E('orb', 52, F - 14); E('drone', 30, F - 12); E('grunt', 60, F); L.pk('hp', 26, F - 2); chips(L, 16, F - 4, 68, F - 20, 12, 8);
  /* ---- 2 :: the solar field: pods across the void ---- */
  panel(94, 26, 22, 24); panel(128, 32, 22, 24); panel(160, 28, 22, 24); strut(104, 50, 18); strut(138, 56, 12); strut(170, 52, 16);
  pod(86, F, 14); pod(116, F - 8, 12); pod(142, F - 16, 14); pod(172, F - 8, 18);
  L.mv({ kind: 'pad', x: 104, y: F - 3, cx: 108, cy: F - 4, w: 7, h: 1, amp: 5, f: 1.0, off: 0, dx: 0, dy: 0 });
  L.mv({ kind: 'pad', x: 129, y: F - 12, cx: 133, cy: F - 12, w: 7, h: 1, amp: 5, f: .95, off: 2, dx: 0, dy: 0 });
  L.mv({ kind: 'pad', x: 158, y: F - 12, cx: 162, cy: F - 12, w: 7, h: 1, amp: 5, f: 1.05, off: 4, dx: 0, dy: 0 });
  E('orb', 96, F - 16); E('orb', 126, F - 24); E('orb', 150, F - 30); E('seeker', 108, F - 14); E('seeker', 136, F - 24); E('seeker', 160, F - 22); E('drone', 120, F - 22, { elite: true }); E('drone', 166, F - 24, { elite: true });
  L.pk('hp', 120, F - 10); L.pk('hp', 146, F - 18); chips(L, 90, F - 3, 190, F - 11, 22, 14); L.cp(146, F - 16, 'KONTROLLPUNKT 02');
  L.hint(86, 14, F - 14, 16, 'ECHO', 'Das Solarfeld. Die Orbs sind Wachsatelliten und schießen Dreierfächer. Zerstör sie oder spring aus der Linie.');
  /* ---- 3 :: the reactor ring, with a lift shaft ---- */
  const RF = F - 8;
  hull(190, RF, 66, 6); L.mass(190, RF - 38, 4, ST.HULL, RF - 14); L.mass(190, RF - 42, 66, ST.HULL, RF - 38);
  L.bfill(194, RF - 38, 62, 38, 0, 0, C.hull0); panel(194, RF - 36, 62, 36);
  L.plat(198, RF - 14, 16, '▔', C.cyan); L.plat(232, RF - 14, 16, '▔', C.cyan); L.plat(204, RF - 28, 14, '▔', C.mag); L.plat(228, RF - 28, 14, '▔', C.mag);
  L.vent(216, RF - 36, 8, 36);
  L.dec('sign', 200, RF - 36, { text: 'REAKTORRING', col: '#ffb347', flick: true, frame: true });
  L.laser(198, RF - 36, RF - 1, 3.6, 1.2, 0); L.laser(246, RF - 36, RF - 1, 3.6, 1.2, 1.8);
  L.blade(222, RF - 20, 12, 0, 1.8, 0, 2.2);
  E('mech', 206, RF); E('mech', 240, RF); E('orb', 210, RF - 22); E('orb', 236, RF - 30); E('seeker', 222, RF - 30); L.pk('hp', 224, RF - 2); L.cp(194, RF, 'KONTROLLPUNKT 03');
  chips(L, 200, RF - 3, 250, RF - 3, 8, 0); chips(L, 202, RF - 16, 246, RF - 16, 8, 0); chips(L, 206, RF - 30, 240, RF - 30, 8, 0);
  L.hint(196, 14, RF - 12, 14, 'ECHO', 'Der Reaktorring. Hinten an der Wand siehst du die Lüftungsschächte. Der Schacht in der Mitte trägt dich hoch, wenn du hineinspringst.');
  /* ---- 4 :: the gatekeeper ---- */
  const KY = RF;
  hull(256, KY, 76, 6); L.mass(256, 0, 214, ST.HULL, KY - 32);   // one solid block above the gatekeeper hall, the corridor and the core
  L.mass(256, KY - 36, 76, ST.HULL, KY - 32);
  L.bfill(260, KY - 32, 68, 32, 0, 0, C.hull0); panel(260, KY - 32, 68, 32);
  const dKl = L.door(258, KY - 32, 32, { mode: 'arena', open: 1, target: 1 }), dKr = L.door(328, KY - 32, 32, { mode: 'arena', open: 1, target: 1 });
  L.plat(272, KY - 12, 12, '▔', C.cyan); L.plat(304, KY - 12, 12, '▔', C.cyan); L.plat(288, KY - 22, 12, '▔', C.mag);
  L.dec('sign', 280, KY - 30, { text: 'TORWÄCHTER', col: '#ff3b4d', flick: true, frame: true, front: true });
  arena(L, 262, KY - 32, 62, 32, [dKl, dKr], [
    [['koloss', 300, KY], ['orb', 274, KY - 22], ['orb', 312, KY - 24]],
    [['mech', 276, KY], ['mech', 312, KY], ['orb', 292, KY - 26], ['seeker', 284, KY - 20], ['seeker', 300, KY - 22]],
  ], 'TORWÄCHTER');
  L.pk('hp', 292, KY - 2); L.cp(262, KY, 'KONTROLLPUNKT 04');
  /* ---- 5 :: the approach and the core ---- */
  hull(332, KY, 38, 6); L.mass(332, KY - 36, 38, ST.HULL, KY - 32);
  L.bfill(332, KY - 32, 38, 32, 0, 0, C.hull0); panel(332, KY - 32, 38, 32);
  L.dec('sign', 340, KY - 28, { text: 'KERNKAMMER ►', col: '#ff2fb9', flick: true, frame: true, front: true });
  L.veh('hover', 344, KY, { face: 1 }); L.cp(340, KY, 'KONTROLLPUNKT 05'); L.pk('hp', 352, KY - 2); L.pk('hp', 360, KY - 2);
  L.hint(334, 20, KY - 12, 14, 'ECHO', 'Hinter dieser Tür sitzt ZENITH. Seine Orbs bilden einen Schild. Erst alle Orbs zerstören, dann liegt der Kern frei. Und schieß schnell.');
  const AX0 = 376, AX1 = 462, CX = (AX0 + AX1) / 2;
  hull(370, KY, 100, 8); L.mass(370, KY - 40, 100, ST.HULL, KY - 36); L.mass(462, KY - 40, 8, ST.HULL, KY);
  L.bfill(370, KY - 36, 92, 36, 0, 0, C.hull0); panel(370, KY - 36, 92, 36);
  L.mass(370, KY - 36, 6, ST.HULL, KY - 14); L.clear(370, KY - 14, 6, 14);
  const door = L.door(370, KY - 14, 14, { mode: 'arena', open: 1, target: 1 });
  L.plat(384, KY - 8, 14, '▔', C.cyan); L.plat(440, KY - 8, 14, '▔', C.cyan);
  for (const x of [384, 440]) for (let i = 0; i < 14; i++) L.set(x + i, KY - 7, undefined, '▀', C.cyanDD);
  L.dec('sign', CX - 6, KY - 34, { text: 'Z E N I T H', col: '#ff3b4d', flick: true, frame: true });
  L.zone(AX0 - 2, KY - 32, 6, 33, {
    once: true, fn() {
      door.target = 0; S.cam.lock = { x: CX, y: KY - 12.5, x0: AX0 - 6, x1: AX1 + 4 }; L.camBox = null; S.respawn = { x: AX0 + 2, y: KY }; MUS.inten_t = 1; musPlay('boss2');
      setTimeout(() => { if (S.L === L && !S.boss) { const zb = spawnBoss(CX, KY - 15, { x0: AX0, w: AX1 - AX0, floor: KY }, 'zenith'); if (zb) zb.y = KY - 36; banner('ZENITH', 'DAS GEHIRN DER STATION', C.red); sfx('bigboom', .7); shake(1); glitchAmt = 1; } }, 900);
      say('ECHO', 'Das ist ZENITH, Sam. Zerstör seine Orbs, dann bricht der Schild. Und halt dich fest, wenn die Schwerkraft zu schwanken beginnt.', 6);
    }
  });
  L.camBox = { x0: 0, x1: W, y0: 0, y1: Hh };
  L.bossArena = { x0: AX0, x1: AX1, floor: KY };
  L.bossOff = ['ZENITH OFFLINE', 'DAS SIGNAL IST VERSTUMMT'];
  finalizeLevel(L);
  return L;
}

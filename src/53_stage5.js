/* =========================================================================
   SEKTOR 5 :: NEON GRAND PRIX
   Ein Rennen über den Orbital-Ring. Ein Rennwagen, drei Rivalen, Boost-Pads, Gruben, Sperren,
   ein Tunnel mit Geschütztürmen und ab der Mitte eine Dampfwalze, die dich jagt.
   ========================================================================= */
function buildStage5() {
  const th = THEMES.speed, R = RNG(505), Hh = 120, S0 = 90, W = 1560, L = new Level(5, W, Hh, th);
  L.deathY = Hh + 12; L.camRef = 70;
  L.intro = {
    title: 'NEON GRAND PRIX', sub: 'ORBITAL-RING // HAUPTPREIS: DIE LIFTKARTE // 22:00 UHR',
    lines: ['ECHO: Archon war nur ein Relais, Sam. Sein Signal läuft weiter, hinauf zu einer Station namens ZENITH.',
      'ECHO: Der Weg nach oben ist der Orbitallift im Kronos-Turm. Die Karte dafür ist der Hauptpreis dieses Rennens. Komm unter die ersten zwei.']
  };
  const road = [[4, 232], [250, 560], [584, 820], [838, 930], [936, 960], [966, 1060], [1084, 1200], [1218, 1520]];
  for (const [a, b] of road) L.mass(a, S0, b - a, ST.ASPH);
  L.mass(0, S0 - 40, 4, ST.METAL); L.mass(1520, S0 - 40, 40, ST.METAL);
  facades(L, R, 0, W, S0, 24, 38);
  L.start = { x: 66, y: S0 };
  const stairs = (x, n, w, up) => { for (let k = 0; k < n; k++) { const i = up ? k : n - 1 - k; L.mass(x + k * w, S0 - (i + 1), w, ST.ASPH); } };
  const pit = (x, w, label) => {
    L.bfill(x, S0, w, Hh - S0, 0, 0, C.blk); for (let i = 0; i < w; i++) L.bset(x + i, S0, i % 2 ? '▚' : '▞', C.amber, C.blk);
    L.bset(x - 1, S0 - 1, '▮', C.amber); L.bset(x + w, S0 - 1, '▮', C.amber);
    if (label) L.dec('sign', x - 6, S0 - 10, { text: label, col: '#ffb347', flick: true, frame: true });
  };
  const barrier = (x, h) => { L.rect(x, S0 - h, 2, h, ST.BRICK); L.dec('sign', x - 2, S0 - h - 3, { text: 'SPERRE', col: '#ff3b4d', flick: true }); };
  const pads = [], pad = x => { pads.push({ x, w: 12 }); L.dec('custom', x, S0 - 1, { w: 12, draw: drawBoostPad }); };
  /* --- start straight --- */
  L.dec('custom', 82, S0 - 22, { w: 18, y2: S0, col: '#ffe45e', text: 'START', draw: drawArch, vis: 40 });
  L.dec('custom', 20, S0 - 5, { w: 30, draw: drawCrowd }); L.dec('custom', 100, S0 - 5, { w: 24, draw: drawCrowd });
  L.dec('sign', 8, S0 - 22, { text: 'NEON GRAND PRIX', col: '#ff2fb9', flick: true, frame: true, front: false });
  L.hint(40, 40, S0 - 12, 14, 'ECHO', TX('Rennwagen, Sam! A und D geben Gas und bremsen, LEERTASTE springt, SHIFT ist Turbo. Die Pads auf der Straße schieben dich nach vorn. Aussteigen geht nicht, es ist ein Rennen.', 'Rennwagen, Sam! Linker Stick gibt Gas, nach oben springt der Wagen, TURBO schiebt. Die Pads auf der Straße schieben dich nach vorn. Aussteigen geht nicht, es ist ein Rennen.'));
  pad(150); pad(200);
  chips(L, 112, S0 - 3, 140, S0 - 3, 6, 0); chips(L, 160, S0 - 3, 196, S0 - 3, 6, 0);
  /* --- first pit, barricades --- */
  pit(232, 18, 'LÜCKE');
  chips(L, 228, S0 - 8, 254, S0 - 6, 6, 5);
  barrier(288, 2); barrier(322, 3);
  chips(L, 262, S0 - 3, 282, S0 - 3, 4, 0); chips(L, 296, S0 - 5, 316, S0 - 5, 4, 2); chips(L, 328, S0 - 3, 346, S0 - 3, 4, 0);
  L.en('drone', 300, S0 - 18); L.en('drone', 340, S0 - 22);
  /* --- the hill --- */
  stairs(350, 8, 3, true); L.mass(374, S0 - 8, 36, ST.ASPH); stairs(410, 8, 3, false);
  L.haz(384, S0 - 9, 6); L.dec('spark', 387, S0 - 10, { rate: 1.1 });
  L.dec('sign', 366, S0 - 18, { text: 'KUPPE', col: '#19f0ff', flick: true, frame: true });
  chips(L, 354, S0 - 12, 372, S0 - 18, 5, 3); chips(L, 392, S0 - 12, 414, S0 - 6, 5, 3);
  L.en('turret', 396, S0 - 22, { dir: 'down' }); L.mass(388, S0 - 24, 18, ST.METAL, S0 - 22); lattice(L, 389, S0 - 22, S0 - 9, C.greyDD); lattice(L, 403, S0 - 22, S0 - 9, C.greyDD);
  pad(440);
  /* --- electric field --- */
  L.haz(466, S0 - 1, 8); L.dec('spark', 470, S0 - 2, { rate: 1.3 }); L.haz(506, S0 - 1, 10); L.dec('spark', 511, S0 - 2, { rate: 1.2 });
  chips(L, 462, S0 - 8, 480, S0 - 8, 5, 3); chips(L, 502, S0 - 8, 522, S0 - 8, 6, 3);
  L.en('drone', 470, S0 - 16, { elite: true }); L.en('drone', 514, S0 - 18, { elite: true });
  /* --- the launch ramp --- */
  stairs(536, 8, 3, true); pit(560, 24, 'SPRUNGSCHANZE'); chips(L, 556, S0 - 14, 586, S0 - 8, 8, 8);
  /* --- grandstand + the steamroller wakes --- */
  pad(600); L.dec('custom', 590, S0 - 5, { w: 40, draw: drawCrowd }); L.dec('custom', 650, S0 - 5, { w: 20, draw: drawCrowd });
  L.dec('sign', 636, S0 - 20, { text: 'ACHTUNG // BAUARBEITEN', col: '#ff3b4d', flick: true, frame: true });
  L.zone(640, 10, S0 - 14, 16, { once: true, fn() { sfx('warn', .6); shake(.3); } });
  chips(L, 604, S0 - 3, 690, S0 - 3, 10, 0);
  /* --- tunnel --- */
  L.mass(700, S0 - 16, 120, ST.METAL, S0 - 10);
  for (let x = 700; x < 820; x += 4) { L.set(x, S0 - 10, undefined, '▼', C.amber, 0, AN.BLINK, undefined); L.bset(x, S0 - 9, '│', C.greyDD); }
  for (let x = 704; x < 820; x += 12) L.dec('lamp', x, S0 - 10, { w: 6, len: 9, col: '#ffb347' });
  L.dec('sign', 706, S0 - 8, { text: 'TUNNEL', col: '#ffb347', flick: true, front: true });
  pad(770); L.en('turret', 730, S0 - 10, { dir: 'down' }); L.en('turret', 762, S0 - 10, { dir: 'down' }); L.en('turret', 800, S0 - 10, { dir: 'down' });
  chips(L, 712, S0 - 3, 810, S0 - 3, 10, 0);
  pit(820, 18, 'LÜCKE');
  /* --- barricade, bridge of planks --- */
  barrier(870, 3); chips(L, 842, S0 - 5, 866, S0 - 7, 5, 3); chips(L, 878, S0 - 4, 922, S0 - 4, 6, 0);
  L.en('gunship', 880, S0 - 22);
  pit(930, 6); pit(960, 6); L.dec('sign', 926, S0 - 14, { text: 'BRÜCKE', col: '#19f0ff', flick: true, frame: true }); chips(L, 928, S0 - 6, 968, S0 - 6, 8, 4);
  L.en('drone', 946, S0 - 14, { elite: true }); L.en('drone', 998, S0 - 20);
  /* --- second launch --- */
  stairs(1036, 8, 3, true); pit(1060, 24, 'SPRUNGSCHANZE'); chips(L, 1056, S0 - 14, 1086, S0 - 8, 8, 8);
  L.en('gunship', 1100, S0 - 24);
  pad(1100); barrier(1150, 2); barrier(1180, 3);
  chips(L, 1120, S0 - 3, 1146, S0 - 3, 5, 0); chips(L, 1156, S0 - 5, 1176, S0 - 5, 4, 2); chips(L, 1186, S0 - 3, 1196, S0 - 3, 3, 0);
  pit(1200, 18, 'LETZTE LÜCKE');
  /* --- last stretch --- */
  L.haz(1250, S0 - 1, 10); L.dec('spark', 1255, S0 - 2, { rate: 1.3 }); L.haz(1282, S0 - 1, 8); L.dec('spark', 1286, S0 - 2, { rate: 1.1 });
  chips(L, 1246, S0 - 8, 1264, S0 - 8, 5, 3); chips(L, 1278, S0 - 8, 1294, S0 - 8, 5, 3);
  L.en('drone', 1262, S0 - 16, { elite: true }); L.en('drone', 1300, S0 - 20, { elite: true }); L.en('turret', 1340, S0 - 24, { dir: 'down' });
  L.mass(1332, S0 - 26, 18, ST.METAL, S0 - 24); lattice(L, 1333, S0 - 24, S0 - 1, C.greyDD); lattice(L, 1347, S0 - 24, S0 - 1, C.greyDD);
  pad(1330); pad(1390);
  L.dec('custom', 1400, S0 - 5, { w: 40, draw: drawCrowd }); L.dec('custom', 1480, S0 - 5, { w: 30, draw: drawCrowd });
  L.dec('custom', 1452, S0 - 22, { w: 18, y2: S0, col: '#5dffb0', text: 'ZIEL', draw: drawArch, vis: 40 });
  L.dec('sign', 1424, S0 - 28, { text: 'NEON GRAND PRIX // ZIEL', col: '#ffe45e', flick: true, frame: true });
  for (let x = 1458; x < 1472; x++) for (let k = 0; k < 2; k++) L.set(x, S0, undefined, ((x + k) & 1) ? '▚' : '▞', C.white);
  L.camBox = { x0: 0, x1: W, y0: 0, y1: Hh };
  L.race = {
    x0: 42, x1: 1460, y: S0, pads, walzeAt: 660, walzeGap: 74, walzeMax: 50, walzeAcc: 1.3,
    rivals: [{ x: 78, top: 39, team: 'r', name: 'VIPER' }, { x: 54, top: 37, team: 'a', name: 'KOMET' }, { x: 42, top: 35, team: 'n', name: 'ROCKY' }],
  };
  L.veh('racer', 66, S0, { face: 1, bounds: { x0: 6, x1: 1555 } });
  finalizeLevel(L);
  for (const [a, b] of road) for (let x = a; x < b; x++) { const i = S0 * W + x; if (L.t[i] === T.SOL && (x % 10) < 5 && L.ch[i] !== 0) { L.ch[i] = '▬'.charCodeAt(0); L.fg[i] = C.yel; } }
  return L;
}

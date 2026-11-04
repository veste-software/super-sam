# Super Sam

Ein Cyberpunk-Jump-and-Run mit Ballerei im ASCII-Stil, direkt im Browser. Vier Sektoren, ein Endgegner,
Sprünge über Hochhausdächer, ein Enterhaken und ein Held, der wie Superman fliegen kann.

**Spielen:** https://veste-software.github.io/super-sam/

## Steuerung

| Taste | Aktion |
| --- | --- |
| `A` `D` / Pfeiltasten | laufen |
| `Leertaste` / `W` | springen (an Wänden rutschen und abspringen) |
| `F` | fliegen (an/aus). Mit `A` `D` `W` `S` lenken. Der Tank füllt sich am Boden schnell wieder auf |
| `Shift` / `L` | Dash (währenddessen kannst du nicht getroffen werden) |
| Maus | zielen |
| Linksklick | schießen |
| Rechtsklick / `E` / `K` | Enterhaken: halten zum Schwingen, loslassen zum Abspringen. `W` / `S` ziehen das Seil ein und aus |
| `1` `2` `3` / `Q` / Mausrad | Waffe wechseln |
| `S` + Sprung | durch dünne Plattformen fallen |
| `R` | Neustart am letzten Kontrollpunkt |
| `P` / `Esc` | Pause. `M` schaltet den Ton aus |

Tastatur und Maus sind nötig.

## Bauen

Keine Abhängigkeiten, nur Node.js.

```sh
node build.js      # fügt src/*.js zu build/index.html zusammen
```

`build/index.html` ist eine einzige, eigenständige Seite (einzige externe Anfrage: die Schrift JetBrains Mono).
Der Branch `gh-pages` enthält genau diese Datei.

## Aufbau des Quellcodes

| Datei | Inhalt |
| --- | --- |
| `src/00_core.js` | Farbpalette, Glyphen-Renderer, Eingabe, Synthesizer-Ton und Musik |
| `src/10_level.js` | Level-Raster und Themen |
| `src/20_sim.js` | Physik, Enterhaken, Flug, Waffen, Gegner, Endgegner, Balancing (`EASY`, `FLY`) |
| `src/30_sky.js` | Skyline, Parallaxe, große Blockschrift |
| `src/40_render.js` | Welt, Gegner, Anzeige (HUD) |
| `src/41_sam.js` | Super Sam: Pixel-Art-Held, Flugpose, Porträt |
| `src/50_*.js`, `51_*.js`, `52_*.js` | die vier Sektoren |
| `src/60_main.js` | Titel, Intro, Abschluss- und Endbildschirm, Hauptschleife |

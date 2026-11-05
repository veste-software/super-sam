# Super Sam

Ein Cyberpunk-Jump-and-Run mit Ballerei im ASCII-Stil, direkt im Browser. Vier Sektoren, ein Endgegner,
Sprünge über Hochhausdächer, ein Enterhaken, Fahrzeuge zum Kapern und ein Held, der wie Superman fliegen kann.

**Spielen:** https://veste-software.github.io/super-sam/

## Steuerung

| Taste | Aktion |
| --- | --- |
| `A` `D` / Pfeiltasten | laufen |
| `Leertaste` / `W` | springen (an Wänden rutschen und abspringen). In der Luft noch einmal drücken: **Doppelsprung mit Salto**. Boden, Wand und Seil laden ihn wieder auf |
| `F` | fliegen (an/aus). Mit `A` `D` `W` `S` lenken. Der Tank füllt sich am Boden schnell wieder auf |
| `Shift` / `L` | Dash (währenddessen kannst du nicht getroffen werden) |
| Maus | zielen |
| Linksklick | schießen |
| Rechtsklick / `E` / `K` | Enterhaken: halten zum Schwingen, loslassen zum Abspringen. `W` / `S` ziehen das Seil ein und aus |
| `1` `2` `3` / `Q` / Mausrad | Waffe wechseln |
| `V` | Fahrzeug besteigen und wieder verlassen (siehe unten) |
| `S` + Sprung | durch dünne Plattformen fallen |
| `R` | Neustart am letzten Kontrollpunkt |
| `P` / `Esc` | Pause. `M` schaltet den Ton aus |

## Fahrzeuge

In jedem der vier Sektoren wartet ein eigener Fahrzeugabschnitt. Die Fahrzeuge sind ein Angebot, kein Zwang: Sam
kann dieselben Strecken auch zu Fuß oder fliegend schaffen.

| Sektor | Fahrzeug | Abschnitt |
| --- | --- | --- |
| 1 | Hubschrauber | Heliport über den Dächern: Türme, Kabelmasten und Kampfhubschrauber (Landedeck mit Kontrollpunkt am Ende) |
| 2 | Auto | Fluchtwagen auf der Straße: Barrikaden, Überführung, Gruben, Raider-Autos und eine Werkstatt mit Ersatzwagen |
| 3 | Hover-Wagen | Wartungshalle mit Stromschienen und Raidern. Am Ausgang ist der Durchgang zu eng, dort geht es zu Fuß weiter |
| 4 | Hubschrauber | letzter Hangar der Flotte und der Aufstieg durch den Sturm bis zum oberen Landedeck |

| Taste | Aktion im Fahrzeug |
| --- | --- |
| `V` | einsteigen (wenn der Hinweis erscheint) und aussteigen |
| `A` `D` | fahren, fliegen |
| `W` / `Leertaste` | Hubschrauber steigt, Auto und Hover-Wagen springen |
| `S` | Hubschrauber sinkt, Auto und Hover-Wagen bremsen |
| `Shift` / `L` | Turbo (halten, die Anzeige zeigt den Vorrat) |
| Maus / `J` | Bordkanone (zielt automatisch) |
| Rechtsklick / `K` / `E` | Rakete: zielsuchend, mit Flächenschaden, lädt 1,1 s nach |

Die Hülle hält mehr aus als Sam selbst. Wird das Fahrzeug zerstört, wirst du ausgeworfen. Autos überfahren Grunts,
Gegner-Kampfhubschrauber (`gunship`) und Raider-Autos (`raider`) schießen zurück, ihre Raketen kann man abschießen.

## Handy und Tablet

Das Spiel läuft auch auf dem Smartphone (im Querformat) und geht beim ersten Antippen von selbst in den
Vollbildmodus. Über den Knopf `<>` (oben links unter der Anzeige, auf dem Titelbild oben rechts) kannst du den
Vollbildmodus jederzeit ein- und ausschalten. Am Computer gibt es dafür unten rechts einen kleinen Knopf.

| Bedienelement | Aktion |
| --- | --- |
| Linker Stick (links auf dem Bildschirm) | laufen. Stick nach oben = springen (beim Fliegen: steigen), nach unten = fallen lassen |
| Rechter Stick (rechte Bildschirmhälfte) | zielen und dabei automatisch feuern |
| `SPRUNG` | springen. In der Luft noch einmal tippen: Doppelsprung mit Salto |
| `DASH` | Dash (währenddessen unverwundbar) |
| `HAKEN` | Enterhaken: antippen wirft ihn (er sucht sich selbst einen Ankerpunkt, oder du zielst vorher mit dem rechten Stick), noch einmal antippen lässt los |
| `FLUG` | fliegen an/aus (der Ring zeigt den Tank) |
| `WAFFE` | Waffe wechseln (erscheint, sobald du mehr als eine hast) |
| `REIN` | erscheint neben einem Fahrzeug: einsteigen |
| `HOCH` / `TURBO` / `RAKETE` / `RAUS` | im Fahrzeug: steigen bzw. springen, Turbo (halten), Rakete, aussteigen. Der rechte Stick bedient die Bordkanone |
| `II` | Pause |

Hält man das Handy hochkant, bittet das Spiel darum, es zu drehen. Auf dem iPhone gibt es keinen echten
Vollbildmodus im Browser: Teilen > "Zum Home-Bildschirm" legt das Spiel als App ab, dann startet es im Vollbild.

Am Computer sind Tastatur und Maus nötig.

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
| `src/45_touch.js` | Touch-Steuerung (Sticks, Knöpfe, Menüs per Tippen), Vollbild |
| `src/46_vehicles.js` | Fahrzeuge: Hubschrauber, Auto, Hover-Wagen, Bordwaffen, Raketen, Gegner-Fahrzeuge |
| `src/60_main.js` | Titel, Intro, Abschluss- und Endbildschirm, Hauptschleife |

# Super Sam

A cyberpunk ASCII-style run-and-gun platformer for the browser. Four sectors, a boss, rooftop jumps,
a grapple wire, and a hero who can fly like Superman.

**Play:** https://veste-software.github.io/super-sam/

## Controls

| Key | Action |
| --- | --- |
| `A` `D` / arrows | move |
| `Space` / `W` | jump (slide down walls, jump off them) |
| `F` | fly (toggle). `A` `D` `W` `S` steer. The fuel bar refills quickly on the ground |
| `Shift` / `L` | dash (you cannot be hit mid-dash) |
| Mouse | aim |
| Left click | shoot |
| Right click / `E` / `K` | grapple: hold to swing, release to let go. `W` / `S` reel the wire in and out |
| `1` `2` `3` / `Q` / wheel | switch weapon |
| `S` + jump | drop through thin platforms |
| `R` | give up and restart from the last checkpoint |
| `P` / `Esc` | pause. `M` mutes |

Keyboard and mouse are required.

## Build

No dependencies. Needs Node.js.

```sh
node build.js      # concatenates src/*.js into build/index.html
```

`build/index.html` is a single self-contained page (the only external request is the JetBrains Mono
web font). The `gh-pages` branch holds exactly that file.

## Source layout

| File | What it holds |
| --- | --- |
| `src/00_core.js` | palette, canvas glyph renderer, input, synth audio and music |
| `src/10_level.js` | level grid and themes |
| `src/20_sim.js` | physics, grapple, flight, weapons, enemies, boss, tuning (`EASY`, `FLY`) |
| `src/30_sky.js` | skyline, parallax, big block font |
| `src/40_render.js` | world rendering, enemies, HUD |
| `src/41_sam.js` | Super Sam: pixel-art hero, flight pose, portrait |
| `src/50_*.js`, `51_*.js`, `52_*.js` | the four sectors |
| `src/60_main.js` | title, intro, clear and ending screens, main loop |

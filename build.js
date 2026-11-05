const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'src');
const js = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
if (js.includes('</script')) throw new Error('script terminator in source');
const css = `
/* Layout: one full-viewport canvas with CSS scanline + vignette overlays. A deliberate single-theme neon-dark page. */
:root{--bg:#02030a;--ink:#eaf6ff;--scan:rgba(0,0,0,.16);--vig:rgba(0,0,6,.55);color-scheme:dark}
html,body{height:100%;margin:0;background:var(--bg);color:var(--ink);overflow:hidden;overscroll-behavior:none;touch-action:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
body{cursor:none;-webkit-user-select:none;user-select:none}
#ww{position:fixed;inset:0;background:var(--bg)}
#cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:none;outline:none}
#scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(0,0,0,0) 0,rgba(0,0,0,0) 2px,var(--scan) 3px,rgba(0,0,0,0) 4px);mix-blend-mode:multiply;opacity:.55}
#fsb{position:fixed;right:10px;bottom:10px;width:34px;height:34px;padding:6px;margin:0;border:1px solid rgba(25,240,255,.55);background:rgba(2,3,10,.55);color:#19f0ff;border-radius:4px;cursor:pointer;opacity:.4;z-index:5;transition:opacity .2s}
#fsb:hover,#fsb:focus-visible{opacity:1}
#fsb svg{display:block;width:100%;height:100%}
@media (pointer:coarse){#fsb{display:none}}
#safe{position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}
#vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 55%,var(--vig) 100%)}
`;
const body = `<div id="ww"><canvas id="cv" tabindex="0"></canvas><div id="scan"></div><div id="vig"></div></div><button id="fsb" type="button" title="Vollbild" aria-label="Vollbild"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/></svg></button><div id="safe"></div>`;
const font = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">`;
const title = 'Super Sam';
fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'build/artifact.html'), `<title>${title}</title>\n${font}\n<style>${css}</style>\n${body}\n<script>\n${js}\n</script>\n`);
fs.writeFileSync(path.join(__dirname, 'build/index.html'), `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><meta name="theme-color" content="#02030a"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black"><meta name="apple-mobile-web-app-title" content="Super Sam"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png"><title>${title}</title><meta name="description" content="Super Sam: ein Cyberpunk-ASCII-Jump-and-Run mit Ballerei. Flieg, schwing am Enterhaken und kämpf dich durch acht Sektoren."><meta name="robots" content="noindex,nofollow"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%2302030a'/%3E%3Cpath d='M9 1 3 9h4l-1 6 7-9H9z' fill='%23ffd83d'/%3E%3C/svg%3E">${font}<style>${css}</style></head><body>${body}<script>\n${js}\n</script></body></html>`);
// static files that sit next to index.html (icons, web app manifest)
const pub = path.join(__dirname, 'public');
if (fs.existsSync(pub)) for (const f of fs.readdirSync(pub)) fs.copyFileSync(path.join(pub, f), path.join(__dirname, 'build', f));
fs.writeFileSync(path.join(__dirname, 'build/manifest.webmanifest'), JSON.stringify({ name: 'Super Sam', short_name: 'Super Sam', lang: 'de', start_url: './', scope: './', display: 'fullscreen', orientation: 'landscape', background_color: '#02030a', theme_color: '#02030a', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }] }));
console.log('built', (js.length / 1024 | 0) + ' KB of JS');

/* =========================================================================
   Super Sam :: Bestenliste
   Ein kleiner Cloudflare Worker mit einer D1-Tabelle.
     GET  /scores?limit=50   die Bestenliste (offen lesbar, CORS *)
     POST /scores            Eintrag nach dem Durchspielen (nur von der Spielseite aus)
   Der Server kann nicht beweisen, dass ein Lauf ehrlich war. Er lehnt Unsinn ab (Wertebereiche,
   Namensfilter), begrenzt die Rate pro IP und speichert die IP nie, nur einen gesalzenen Hash.
   ========================================================================= */
const PAGES = 'https://veste-software.github.io';
const LIM = { score: 300000, timeMin: 300, timeMax: 86400, deaths: 999, kills: 1500, chips: 4000, list: 100, listDefault: 50, body: 1024 };
const RATE = { perIp10min: 3, perIpDay: 10, globalHour: 200, dupWindow: 3600 };
const BAD = ['fuck', 'fick', 'shit', 'scheiss', 'wichs', 'hurensohn', 'nutte', 'fotze', 'schlampe', 'nazi', 'hitler', 'siegheil', 'heilhitler', 'neger', 'nigger', 'nigga', 'vergewalt', 'pedo', 'bitch', 'cunt', 'arschloch'];

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });
const fail = (status, error, extra) => json({ ok: false, error }, status, extra);

function canon(s) {   // lower case, no accents, leet speak undone, only letters left
  return s.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss')
    .replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4]/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
}
function cleanName(raw) {
  if (typeof raw !== 'string') return null;
  const n = raw.normalize('NFC').replace(/\s+/g, ' ').trim(), len = [...n].length;
  if (len < 2 || len > 12) return null;
  if (!/^[\p{L}\p{N} _\-!]+$/u.test(n)) return null;
  if ((n.match(/[\p{L}\p{N}]/gu) || []).length < 2) return null;
  const c = canon(n); if (BAD.some(w => c.includes(w))) return 'bad';
  return n;
}
function readInt(v, lo, hi) { return Number.isInteger(v) && v >= lo && v <= hi ? v : null; }

async function ipHash(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + '|' + (env.SALT || '')));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}
const readCors = () => ({ 'access-control-allow-origin': '*' });
const writeCors = request => request.headers.get('origin') === PAGES ? { 'access-control-allow-origin': PAGES, vary: 'origin' } : {};

async function list(request, env) {
  const url = new URL(request.url), want = parseInt(url.searchParams.get('limit') || '', 10);
  const limit = Math.min(LIM.list, Number.isFinite(want) && want > 0 ? want : LIM.listDefault);
  const rows = await env.DB.prepare('SELECT name, score, time, deaths, at FROM scores ORDER BY score DESC, time ASC, id ASC LIMIT ?').bind(limit).all();
  const tot = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores').first();
  return json({ ok: true, total: tot ? tot.n : 0, scores: (rows.results || []).map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, time: r.time, deaths: r.deaths, at: r.at })) },
    200, { ...readCors(), 'cache-control': 'public, max-age=15' });
}

async function submit(request, env) {
  const cors = writeCors(request);
  if (!cors['access-control-allow-origin']) return fail(403, 'origin');
  if (Number(request.headers.get('content-length') || 0) > LIM.body) return fail(413, 'zu gross', cors);
  let b; try { const txt = await request.text(); if (txt.length > LIM.body) return fail(413, 'zu gross', cors); b = JSON.parse(txt); } catch (e) { return fail(400, 'json', cors); }
  if (!b || typeof b !== 'object') return fail(400, 'json', cors);
  const name = cleanName(b.name);
  if (name === 'bad') return fail(422, 'name_gesperrt', cors);
  if (!name) return fail(422, 'name', cors);
  const score = readInt(b.score, 0, LIM.score), time = readInt(b.time, LIM.timeMin, LIM.timeMax), deaths = readInt(b.deaths, 0, LIM.deaths),
    kills = readInt(b.kills, 0, LIM.kills), chips = readInt(b.chips, 0, LIM.chips), ver = readInt(b.v === undefined ? 1 : b.v, 1, 99);
  if ([score, time, deaths, kills, chips, ver].some(v => v === null)) return fail(422, 'werte', cors);
  if (score < chips * 30) return fail(422, 'werte', cors);   // every chip is worth 25 points plus a 10 point bonus, so this can never happen in a real run

  const now = Math.floor(Date.now() / 1000), h = await ipHash(request, env), db = env.DB;
  await db.prepare('DELETE FROM hits WHERE at < ?').bind(now - 86400).run();
  const a = await db.prepare('SELECT COUNT(*) AS n FROM hits WHERE h = ? AND at > ?').bind(h, now - 600).first();
  const d = await db.prepare('SELECT COUNT(*) AS n FROM hits WHERE h = ?').bind(h).first();
  const g = await db.prepare('SELECT COUNT(*) AS n FROM hits WHERE at > ?').bind(now - 3600).first();
  if (a.n >= RATE.perIp10min || d.n >= RATE.perIpDay || g.n >= RATE.globalHour) return fail(429, 'zu_oft', { ...cors, 'retry-after': '600' });

  const dup = await db.prepare('SELECT id FROM scores WHERE name = ? AND score = ? AND time = ? AND at > ?').bind(name, score, time, now - RATE.dupWindow).first();
  if (!dup) {
    await db.prepare('INSERT INTO hits (h, at) VALUES (?, ?)').bind(h, now).run();
    await db.prepare('INSERT INTO scores (name, score, time, deaths, kills, chips, ver, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(name, score, time, deaths, kills, chips, ver, now).run();
  }
  const r = await db.prepare('SELECT COUNT(*) + 1 AS rank FROM scores WHERE score > ? OR (score = ? AND time < ?)').bind(score, score, time).first();
  const tot = await db.prepare('SELECT COUNT(*) AS n FROM scores').first();
  return json({ ok: true, rank: r.rank, total: tot.n, name, dup: !!dup }, 200, { ...cors, 'cache-control': 'no-store' });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (request.method === 'OPTIONS') {
        const cors = writeCors(request);
        return new Response(null, { status: 204, headers: cors['access-control-allow-origin'] ? { ...cors, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } : {} });
      }
      if (path === '/') return json({ ok: true, name: 'super-sam-scores' }, 200, readCors());
      if (path === '/scores') {
        if (request.method === 'GET') return await list(request, env);
        if (request.method === 'POST') return await submit(request, env);
        return fail(405, 'methode', { allow: 'GET, POST, OPTIONS' });
      }
      return fail(404, 'nicht_gefunden');
    } catch (e) {
      return fail(500, 'serverfehler', request.method === 'POST' ? writeCors(request) : readCors());
    }
  },
};

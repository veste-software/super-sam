// node --test worker/test   (Node 22+, uses the built-in node:sqlite as a stand-in for D1)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../index.js';

const ORIGIN = 'https://veste-software.github.io';
function fakeD1() {
  const db = new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  return {
    prepare(sql) {
      const st = db.prepare(sql); let args = [];
      const q = { bind(...a) { args = a; return q; }, async first() { return st.get(...args) || null; }, async all() { return { results: st.all(...args) }; }, async run() { st.run(...args); return { success: true }; } };
      return q;
    }, raw: db,
  };
}
const good = (o = {}) => ({ name: 'SAM', score: 98765, time: 2400, deaths: 3, kills: 240, chips: 600, v: 2, ...o });
let ipN = 0;
const call = (env, method, path, body, headers = {}) => worker.fetch(new Request('https://x.test' + path, {
  method, headers: { 'cf-connecting-ip': headers.ip || '1.2.3.' + (++ipN), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
  body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
}), env);
const post = (env, body, headers = {}) => call(env, 'POST', '/scores', body, { origin: ORIGIN, ...headers });
const mk = () => ({ DB: fakeD1(), SALT: 'pepper' });

test('empty list, health and unknown routes', async () => {
  const env = mk();
  let r = await call(env, 'GET', '/scores'); assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, total: 0, scores: [] });
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  r = await call(env, 'GET', '/'); assert.equal((await r.json()).name, 'super-sam-scores');
  assert.equal((await call(env, 'GET', '/nope')).status, 404);
  assert.equal((await call(env, 'DELETE', '/scores')).status, 405);
});

test('a valid score is stored and ranked: score first, then the faster time', async () => {
  const env = mk();
  let r = await post(env, good({ name: 'ANNA', score: 50000 })); assert.equal(r.status, 200); assert.equal((await r.json()).rank, 1);
  r = await post(env, good({ name: 'BEN', score: 70000 })); assert.equal((await r.json()).rank, 1);
  r = await post(env, good({ name: 'CARA', score: 50000, time: 2000 })); assert.equal((await r.json()).rank, 2, 'same score but faster beats ANNA');
  r = await post(env, good({ name: 'DINO', score: 10000, chips: 100 })); const j = await r.json(); assert.equal(j.rank, 4); assert.equal(j.total, 4);
  const list = await (await call(env, 'GET', '/scores')).json();
  assert.deepEqual(list.scores.map(s => s.name), ['BEN', 'CARA', 'ANNA', 'DINO']);
  assert.deepEqual(list.scores.map(s => s.rank), [1, 2, 3, 4]);
  assert.equal(list.scores[0].kills, undefined, 'internal columns are not published');
  const two = await (await call(env, 'GET', '/scores?limit=2')).json(); assert.equal(two.scores.length, 2); assert.equal(two.total, 4);
});

test('names: trimmed, umlauts and digits fine, markup, short, long and bad words refused', async () => {
  const env = mk();
  const ok = async n => (await post(env, good({ name: n, score: 40000 + (ipN++) }), { ip: '9.9.9.' + ipN })).status;
  assert.equal(await ok('  Jörg   M  '), 200); assert.equal(await ok('ÄÖÜ ß 7'), 200); assert.equal(await ok('Sam-1!'), 200);
  for (const bad of ['A', '', '   ', '<b>hi</b>', 'a'.repeat(13), 'a;b', '!!', '😀😀', 'http://a.b']) {
    const r = await post(env, good({ name: bad }), { ip: '8.8.8.' + (++ipN) }); assert.equal(r.status, 422, JSON.stringify(bad));
  }
  for (const bad of ['FUCK', 'f u c k', 'Sch31ße', 'N4zi', 'HITLER', 'Hurensohn', 'sieg heil', 'p3d0']) {
    const r = await post(env, good({ name: bad }), { ip: '7.7.7.' + (++ipN) }); const j = await r.json();
    assert.equal(r.status, 422, bad); assert.equal(j.error, 'name_gesperrt', bad);
  }
  const l = await (await call(env, 'GET', '/scores')).json(); assert.ok(l.scores.some(s => s.name === 'Jörg M'), 'whitespace collapsed');
});

test('values: out of range, floats, strings and impossible chip counts are refused', async () => {
  const env = mk();
  const cases = [{ score: -1 }, { score: 300001 }, { score: 1.5 }, { score: '9999' }, { score: null }, { time: 299 }, { time: 86401 }, { deaths: -1 }, { deaths: 1000 }, { kills: 1501 }, { chips: 4001 },
    { chips: 600, score: 17999 }, { v: 0 }, { v: 'x' }];
  for (const c of cases) { const r = await post(env, good(c), { ip: '6.6.6.' + (++ipN) }); assert.equal(r.status, 422, JSON.stringify(c)); }
  const r = await post(env, (({ time, ...rest }) => rest)(good()), { ip: '5.5.5.5' }); assert.equal(r.status, 422, 'missing field');
  assert.equal((await post(env, good({ chips: 600, score: 18000 }), { ip: '5.5.5.6' })).status, 200, 'boundary: 30 points per chip');
});

test('origin, json and size checks', async () => {
  const env = mk();
  assert.equal((await call(env, 'POST', '/scores', good(), { ip: '4.4.4.1' })).status, 403, 'no origin (curl)');
  assert.equal((await call(env, 'POST', '/scores', good(), { ip: '4.4.4.2', origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(env, '{not json', { ip: '4.4.4.3' })).status, 400);
  assert.equal((await post(env, 'null', { ip: '4.4.4.4' })).status, 400);
  assert.equal((await post(env, JSON.stringify(good({ name: 'x'.repeat(2000) })), { ip: '4.4.4.5' })).status, 413);
  const n = (await (await call(env, 'GET', '/scores')).json()).total; assert.equal(n, 0, 'nothing was stored');
});

test('CORS: reading is open, writing only from the game page, preflight answers the same way', async () => {
  const env = mk();
  let r = await call(env, 'OPTIONS', '/scores', undefined, { origin: ORIGIN, 'access-control-request-method': 'POST' });
  assert.equal(r.status, 204); assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN); assert.match(r.headers.get('access-control-allow-methods'), /POST/);
  r = await call(env, 'OPTIONS', '/scores', undefined, { origin: 'https://evil.example' });
  assert.equal(r.status, 204); assert.equal(r.headers.get('access-control-allow-origin'), null);
  r = await post(env, good()); assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
});

test('rate limit: 3 per 10 minutes per address, other addresses are not affected, no raw IP is stored', async () => {
  const env = mk(), ip = '3.3.3.3';
  for (let i = 0; i < 3; i++) assert.equal((await post(env, good({ score: 30000 + i }), { ip })).status, 200);
  const r = await post(env, good({ score: 31000 }), { ip }); assert.equal(r.status, 429); assert.equal((await r.json()).error, 'zu_oft'); assert.ok(r.headers.get('retry-after'));
  assert.equal((await post(env, good({ score: 31001 }), { ip: '3.3.3.4' })).status, 200);
  const rows = env.DB.raw.prepare('SELECT h FROM hits').all(); assert.ok(rows.length >= 4);
  for (const x of rows) assert.ok(/^[0-9a-f]{16}$/.test(x.h) && !x.h.includes('3.3.3'), 'only a salted hash');
  env.DB.raw.prepare('UPDATE hits SET at = at - 601').run();   // ten minutes later the same address may submit again
  assert.equal((await post(env, good({ score: 31002 }), { ip })).status, 200);
});

test('daily and global limits, old hits are cleaned up', async () => {
  const env = mk(), now = Math.floor(Date.now() / 1000), ip = '2.2.2.2';
  const h = await (async () => { await post(env, good({ score: 20000 }), { ip }); return env.DB.raw.prepare('SELECT h FROM hits').get().h; })();
  const ins = env.DB.raw.prepare('INSERT INTO hits (h, at) VALUES (?, ?)');
  for (let i = 0; i < 9; i++) ins.run(h, now - 3000 - i);   // 10 in the last day, none in the last 10 minutes
  assert.equal((await post(env, good({ score: 20001 }), { ip })).status, 429, 'daily limit');
  env.DB.raw.prepare('DELETE FROM hits').run();
  for (let i = 0; i < 200; i++) ins.run('other' + i, now - 60);
  assert.equal((await post(env, good({ score: 20002 }), { ip: '2.2.2.9' })).status, 429, 'global limit per hour');
  env.DB.raw.prepare('DELETE FROM hits').run(); ins.run('ancient', now - 90000);
  assert.equal((await post(env, good({ score: 20003 }), { ip: '2.2.2.10' })).status, 200);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) n FROM hits WHERE h = 'ancient'").get().n, 0, 'hits older than 24 h are deleted');
});

test('the same entry sent twice (double click) is stored once and answers the same rank', async () => {
  const env = mk();
  const a = await (await post(env, good({ name: 'TWIN', score: 77777 }))).json(), b = await (await post(env, good({ name: 'TWIN', score: 77777 }))).json();
  assert.equal(a.rank, 1); assert.equal(b.rank, 1); assert.equal(a.dup, false); assert.equal(b.dup, true);
  assert.equal((await (await call(env, 'GET', '/scores')).json()).total, 1);
});

test('list is capped at 100 and the database error path answers JSON, not a stack trace', async () => {
  const env = mk(), ins = env.DB.raw.prepare('INSERT INTO scores (name, score, time, deaths, kills, chips, ver, at) VALUES (?,?,?,?,?,?,?,?)');
  for (let i = 0; i < 130; i++) ins.run('P' + i, 1000 + i, 600, 0, 0, 0, 1, 1);
  assert.equal((await (await call(env, 'GET', '/scores?limit=500')).json()).scores.length, 100);
  assert.equal((await (await call(env, 'GET', '/scores?limit=abc')).json()).scores.length, 50);
  const broken = { DB: { prepare() { throw new Error('boom'); } } };
  const r = await call(broken, 'GET', '/scores'); assert.equal(r.status, 500); assert.deepEqual(await r.json(), { ok: false, error: 'serverfehler' });
});

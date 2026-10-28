import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadEngine, loadEngineAsBrowser } from './load.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const FIRST_DAY = '2026-10-29';

function allPuzzles(engine, days) {
  const out = [];
  for (let n = 0; n < days; n++) {
    const key = new Date(Date.parse(FIRST_DAY + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
    out.push(engine.generatePuzzle(key));
  }
  return out;
}

test('engine evaluated as a browser script matches the Node (module) form for ~5 years of days', () => {
  const node = allPuzzles(loadEngine(), 1900);
  const page = allPuzzles(loadEngineAsBrowser(), 1900);
  assert.equal(JSON.stringify(page), JSON.stringify(node));
});

test('puzzle shape: size by weekday, connected figure, opening is a non-hit ping', () => {
  const e = loadEngine();
  for (const p of allPuzzles(e, 400)) {
    assert.equal(p.figure.length, p.size);
    assert.equal(p.size, e.SIZE_BY_WEEKDAY[p.weekday]);
    assert.equal(p.par, e.PAR_BY_WEEKDAY[p.weekday]);
    assert.ok(!p.figure.includes(p.opening));
    assert.equal(p.openingDistance, e.distanceTo(p.opening, p.figure));
    const seen = new Set([p.figure[0]]);
    const queue = [p.figure[0]];
    while (queue.length) for (const n of e.neighbors(queue.shift())) if (p.figure.includes(n) && !seen.has(n)) { seen.add(n); queue.push(n); }
    assert.equal(seen.size, p.size);
  }
});

test('engine constants are the final ones', () => {
  const e = loadEngine();
  assert.equal(e.MAX_MISSES, 8);
  assert.deepEqual(e.PAR_BY_WEEKDAY, [4, 2, 2, 3, 3, 3, 3]);
  assert.deepEqual(e.SIZE_BY_WEEKDAY, [8, 5, 5, 6, 6, 7, 7]);
});

test('public/sonar/engine.js is byte-identical to sonar-ref/engine.js (when that is around)', t => {
  const ref = path.join(root, 'sonar-ref/engine.js');
  if (!fs.existsSync(ref)) return t.skip('sonar-ref/engine.js not present');
  assert.equal(sha(path.join(root, 'public/sonar/engine.js')), sha(ref));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSonar } from './load.js';

const { sonar, engine } = loadSonar();
const { applyPing, newGame, verdict, shareText, computeStats, sanitizeStore, missesOf, hitsOf, puzzleNumber, mondayOf } = sonar;

// A hand-made puzzle so the expected numbers are easy to check:
//   figure = (3,3) (3,4) (3,5), cell index = row * 7 + col
const idx = (r, c) => r * 7 + c;
const puzzle = { size: 3, par: 2, figure: [idx(3, 3), idx(3, 4), idx(3, 5)], opening: idx(0, 0) };

test('a miss shows the distance to the nearest figure cell', () => {
  const g = newGame();
  assert.equal(applyPing(g, puzzle, idx(1, 3)), 2);
  assert.equal(applyPing(g, puzzle, idx(3, 1)), 2);
  assert.equal(missesOf(g), 2);
});

test('hits are free and uncovered cells stop counting for later pings', () => {
  const g = newGame();
  assert.equal(applyPing(g, puzzle, idx(3, 3)), 0);
  // (3,2) is now 2 away from the nearest undiscovered cell (3,4), not 1.
  assert.equal(applyPing(g, puzzle, idx(3, 2)), 2);
  assert.equal(missesOf(g), 1);
  assert.equal(hitsOf(g), 1);
});

test('numbers already shown are never recalculated', () => {
  const g = newGame();
  applyPing(g, puzzle, idx(3, 2)); // 1 away, nearest is (3,3)
  applyPing(g, puzzle, idx(3, 3));
  applyPing(g, puzzle, idx(3, 4));
  assert.deepEqual(g.pings.map(p => p.d), [1, 0, 0]);
});

test('uncovering the whole figure wins', () => {
  const g = newGame();
  puzzle.figure.forEach(c => applyPing(g, puzzle, c));
  assert.equal(g.status, 'won');
  assert.equal(missesOf(g), 0);
  assert.equal(applyPing(g, puzzle, idx(6, 6)), null);
});

test('the 8th miss ends the game, the 7th does not', () => {
  const g = newGame();
  const far = [idx(0, 1), idx(0, 2), idx(0, 3), idx(0, 4), idx(0, 5), idx(0, 6), idx(1, 0), idx(1, 1)];
  far.slice(0, 7).forEach(c => applyPing(g, puzzle, c));
  assert.equal(g.status, 'playing');
  applyPing(g, puzzle, far[7]);
  assert.equal(engine.MAX_MISSES, 8);
  assert.equal(g.status, 'lost');
  assert.equal(applyPing(g, puzzle, idx(3, 3)), null);
});

test('hits do not spend charges: a hit after seven misses still plays on', () => {
  const g = newGame();
  [idx(0, 1), idx(0, 2), idx(0, 3), idx(0, 4), idx(0, 5), idx(0, 6), idx(1, 0)].forEach(c => applyPing(g, puzzle, c));
  assert.equal(applyPing(g, puzzle, idx(3, 3)), 0);
  assert.equal(g.status, 'playing');
});

test('marked cells, repeat pings and the opening cell are refused', () => {
  const g = newGame();
  g.marks.push(idx(5, 5));
  assert.equal(applyPing(g, puzzle, idx(5, 5)), null);
  assert.equal(applyPing(g, puzzle, puzzle.opening), null);
  applyPing(g, puzzle, idx(1, 1));
  assert.equal(applyPing(g, puzzle, idx(1, 1)), null);
  assert.equal(g.pings.length, 1);
});

test('verdict labels', () => {
  assert.equal(verdict('won', 0, 3), 'Perfect echo');
  assert.equal(verdict('won', 1, 3), 'Perfect echo');
  assert.equal(verdict('won', 2, 3), 'Sharp ears');
  assert.equal(verdict('won', 3, 3), 'On par');
  assert.equal(verdict('won', 4, 3), 'Found it');
  assert.equal(verdict('won', 5, 3), 'Found it');
  assert.equal(verdict('won', 6, 3), 'Close call');
  assert.equal(verdict('won', 7, 3), 'Close call');
  assert.equal(verdict('lost', 8, 3), 'Lost signal');
});

test('share text format, with no positions', () => {
  const pings = [2, 1, 0, 0, 3, 1, 0, 0].map((d, i) => ({ cell: i, d }));
  const text = shareText({ number: 12, status: 'won', misses: 4, par: 3, hits: 4, size: 4, pings, streak: 5 });
  assert.equal(text, 'Sonar #12 · 4 misses (par 3) · 🔥5\n🟦🟨🟩🟩⬜🟨🟩🟩\nlittlemongestudios.com/sonar');
  assert.match(shareText({ number: 3, status: 'won', misses: 1, par: 2, hits: 1, size: 1, pings: [{ cell: 0, d: 0 }], streak: 1 }), /^Sonar #3 · 1 miss \(par 2\)/);
  const lost = shareText({ number: 7, status: 'lost', misses: 8, par: 3, hits: 2, size: 6, pings: [{ cell: 0, d: 4 }], streak: 0 });
  assert.equal(lost, 'Sonar #7 · Lost signal (2/6 found)\n⬜\nlittlemongestudios.com/sonar');
});

test('puzzle number counts from the launch date; weeks start on Monday', () => {
  assert.equal(sonar.LAUNCH, '2026-10-29');
  assert.equal(puzzleNumber(sonar.LAUNCH), 1);
  assert.equal(puzzleNumber(sonar.addDays(sonar.LAUNCH, 11)), 12);
  assert.equal(mondayOf('2026-11-01'), '2026-10-26'); // a Sunday
  assert.equal(mondayOf('2026-10-26'), '2026-10-26');
  assert.equal(mondayOf('2026-10-29'), '2026-10-26');
});

test('stats: played, win %, and miss distribution with losses at 8', () => {
  const won = misses => ({ status: 'won', marks: [], pings: Array.from({ length: misses }, (_, i) => ({ cell: i, d: 1 })).concat([{ cell: 40, d: 0 }]) });
  const days = {
    '2026-11-01': won(0),
    '2026-11-02': won(2),
    '2026-11-03': won(2),
    '2026-11-04': { status: 'lost', marks: [], pings: [] },
    '2026-11-05': { status: 'playing', marks: [], pings: [] },
  };
  const s = computeStats(days, '2026-11-05', 8);
  assert.equal(s.played, 4);
  assert.equal(s.wins, 3);
  assert.equal(s.winPct, 75);
  assert.deepEqual(s.dist, [1, 0, 2, 0, 0, 0, 0, 0, 1]);
});

test('a corrupted save is cleaned up instead of breaking the page', () => {
  const clean = sanitizeStore({
    days: {
      '2026-11-01': { status: 'won', marks: [3, 3, 999, 'x'], pings: [{ cell: 5, d: 0 }, { cell: 5, d: 2 }, { cell: -1, d: 1 }, null] },
      'garbage': { status: 'won', marks: [], pings: [] },
      '2026-11-02': { status: 'weird', marks: [], pings: [] },
      '2026-11-03': { status: 'playing', marks: 'no', pings: [] },
    },
  });
  assert.deepEqual(Object.keys(clean.days), ['2026-11-01']);
  assert.deepEqual(clean.days['2026-11-01'], { status: 'won', marks: [3], pings: [{ cell: 5, d: 0 }] });
  assert.deepEqual(sanitizeStore('nonsense'), { v: 1, days: {} });
  assert.deepEqual(sanitizeStore(null), { v: 1, days: {} });
});

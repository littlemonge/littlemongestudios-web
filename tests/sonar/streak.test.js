import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSonar } from './load.js';

const { sonar } = loadSonar();
const { computeStreak, addDays } = sonar;

const D0 = '2026-11-01';
const day = n => addDays(D0, n);
// 'W' won, 'L' lost, '.' not played, 'P' left unfinished; one char per day starting at D0.
const history = pattern => {
  const days = {};
  [...pattern].forEach((ch, n) => {
    if (ch === '.') return;
    days[day(n)] = { pings: [], marks: [], status: ch === 'W' ? 'won' : ch === 'L' ? 'lost' : 'playing' };
  });
  return days;
};
const streakAt = (pattern, n = pattern.length - 1) => computeStreak(history(pattern), day(n));

test('empty history', () => {
  assert.deepEqual(computeStreak({}, D0), { current: 0, best: 0, shields: 0 });
});

test('consecutive wins add one each', () => {
  assert.deepEqual(streakAt('WWW'), { current: 3, best: 3, shields: 0 });
});

test('a loss with no shield resets the streak, best is kept', () => {
  assert.deepEqual(streakAt('WWWL'), { current: 0, best: 3, shields: 0 });
});

test('a skipped day with no shield resets the streak', () => {
  assert.deepEqual(streakAt('WW.W'), { current: 1, best: 2, shields: 0 });
});

test('an unfinished game on a past day counts as not played', () => {
  assert.deepEqual(streakAt('WWPW'), { current: 1, best: 2, shields: 0 });
});

test('today is ignored until it is finished', () => {
  assert.deepEqual(computeStreak(history('WWW'), day(3)), { current: 3, best: 3, shields: 0 });
  assert.deepEqual(computeStreak(history('WWWP'), day(3)), { current: 3, best: 3, shields: 0 });
});

test('seven wins in a row earn a shield', () => {
  assert.deepEqual(streakAt('WWWWWWW'), { current: 7, best: 7, shields: 1 });
});

test('six wins earn nothing yet', () => {
  assert.equal(streakAt('WWWWWW').shields, 0);
});

test('a shield covers a lost day and is spent automatically; the streak is kept, not added to', () => {
  assert.deepEqual(streakAt('WWWWWWWL'), { current: 7, best: 7, shields: 0 });
  assert.deepEqual(streakAt('WWWWWWWLW'), { current: 8, best: 8, shields: 0 });
});

test('a shield covers a skipped day too', () => {
  assert.deepEqual(streakAt('WWWWWWW.W'), { current: 8, best: 8, shields: 0 });
});

test('a shield covers a day left unfinished', () => {
  assert.deepEqual(streakAt('WWWWWWWPW'), { current: 8, best: 8, shields: 0 });
});

test('without a spare shield the second bad day breaks it', () => {
  assert.deepEqual(streakAt('WWWWWWWLL'), { current: 0, best: 7, shields: 0 });
  // two skipped days, then today still open
  assert.deepEqual(streakAt('WWWWWWW..', 9), { current: 0, best: 7, shields: 0 });
});

test('shields stack up to two and no further', () => {
  assert.equal(streakAt('W'.repeat(14)).shields, 2);
  assert.equal(streakAt('W'.repeat(21)).shields, 2);
  assert.deepEqual(streakAt('W'.repeat(14) + 'LL'), { current: 14, best: 14, shields: 0 });
  assert.deepEqual(streakAt('W'.repeat(14) + 'LLL'), { current: 0, best: 14, shields: 0 });
});

test('a covered missed day while today is still open', () => {
  // 7 wins, yesterday skipped (shield spent), today not played yet.
  assert.deepEqual(computeStreak(history('WWWWWWW'), day(8)), { current: 7, best: 7, shields: 0 });
});

test('a long gap spends the shields then resets', () => {
  // 14 wins = 2 shields; three skipped days use both and break on the third (today open)
  assert.deepEqual(streakAt('W'.repeat(14) + '...', 17), { current: 0, best: 14, shields: 0 });
  assert.deepEqual(streakAt('W'.repeat(14) + '..', 16), { current: 14, best: 14, shields: 0 });
});

test('after a reset the shield count carries on from the new streak', () => {
  assert.deepEqual(streakAt('WWL' + 'W'.repeat(7)), { current: 7, best: 7, shields: 1 });
});

test('future-dated and malformed entries are ignored', () => {
  const days = history('WW');
  days[day(10)] = { pings: [], marks: [], status: 'won' };
  days['not-a-date'] = { pings: [], marks: [], status: 'won' };
  assert.deepEqual(computeStreak(days, day(1)), { current: 2, best: 2, shields: 0 });
});

test('it is pure: the input is not modified', () => {
  const days = history('WWWWWWWL');
  const before = JSON.stringify(days);
  computeStreak(days, day(7));
  assert.equal(JSON.stringify(days), before);
});

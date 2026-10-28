// Sonar engine: deterministic daily puzzle generation + distance rules.
// Pure functions, no DOM. Shared by the prototype page and the simulation.
const N = 7;
const SIZE_BY_WEEKDAY = [8, 5, 5, 6, 6, 7, 7]; // Sun..Sat (JS getDay order)
const STYLE_BY_WEEKDAY = ['snake', 'compact', 'compact', 'mixed', 'mixed', 'snake', 'snake'];
const MAX_MISSES = 8; // only misses spend a charge; hits are free
const PAR_BY_WEEKDAY = [4, 2, 2, 3, 3, 3, 3]; // Sun..Sat, calibrated with the undiscovered-cells rule

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const idx = (r, c) => r * N + c;
const rc = i => [Math.floor(i / N), i % N];

function neighbors(i) {
  const [r, c] = rc(i);
  const out = [];
  if (r > 0) out.push(idx(r - 1, c));
  if (r < N - 1) out.push(idx(r + 1, c));
  if (c > 0) out.push(idx(r, c - 1));
  if (c < N - 1) out.push(idx(r, c + 1));
  return out;
}

function distanceTo(cell, figure) {
  const [r, c] = rc(cell);
  let best = Infinity;
  for (const f of figure) {
    const [fr, fc] = rc(f);
    const d = Math.abs(fr - r) + Math.abs(fc - c);
    if (d < best) best = d;
  }
  return best;
}

function pickWeighted(rng, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

// dateKey: 'YYYY-MM-DD' in the player's local calendar.
function generatePuzzle(dateKey) {
  const rng = mulberry32(hashString('sonar:v1:' + dateKey));
  const weekday = new Date(dateKey + 'T12:00:00Z').getUTCDay();
  const size = SIZE_BY_WEEKDAY[weekday];
  const style = STYLE_BY_WEEKDAY[weekday];

  const set = new Set([Math.floor(rng() * N * N)]);
  while (set.size < size) {
    const frontier = [];
    for (const f of set) for (const n of neighbors(f)) if (!set.has(n) && !frontier.includes(n)) frontier.push(n);
    const weights = frontier.map(n => {
      const touching = neighbors(n).filter(x => set.has(x)).length;
      if (style === 'compact') return touching * touching;
      if (style === 'snake') return 1 / (touching * touching);
      return 1;
    });
    set.add(pickWeighted(rng, frontier, weights));
  }
  const figure = [...set].sort((a, b) => a - b);

  // Opening ping: a shared non-hit cell, preferably at distance 2 (informative, not a giveaway).
  let opening = null;
  for (const want of [2, 3, 1, 4]) {
    const options = [];
    for (let i = 0; i < N * N; i++) if (distanceTo(i, figure) === want) options.push(i);
    if (options.length) { opening = options[Math.floor(rng() * options.length)]; break; }
  }
  return { dateKey, weekday, size, style, par: PAR_BY_WEEKDAY[weekday], figure, opening, openingDistance: distanceTo(opening, figure) };
}

// Value shown for a ping: distance to the nearest figure cell NOT yet found.
// 0 = hit. Old pings keep the number they showed when they were made.
function pingDistance(cell, figure, foundCells) {
  const found = new Set(foundCells);
  return distanceTo(cell, figure.filter(c => !found.has(c)));
}

if (typeof module !== 'undefined') {
  module.exports = { N, MAX_MISSES, PAR_BY_WEEKDAY, SIZE_BY_WEEKDAY, generatePuzzle, distanceTo, pingDistance, neighbors, rc, idx };
}

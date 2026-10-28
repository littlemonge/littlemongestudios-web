/* Sonar: game rules around engine.js, storage, and UI.
 * Load engine.js first. It provides the globals used here: N, MAX_MISSES, generatePuzzle,
 * pingDistance, rc, hashString, mulberry32.
 * The pure helpers (streak, stats, share text, rules) are also exported under Node
 * (module.exports) so tests/sonar can exercise them; the DOM part only runs in a page.
 */
(function () {
  'use strict';

  const LAUNCH = '2026-10-29'; // puzzle #1
  const STORE_KEY = 'sonar:v1';
  const SHARE_URL = 'littlemongestudios.com/sonar';
  const SHIELD_EVERY = 7;
  const MAX_SHIELDS = 2;
  const PLAYING = 'playing', WON = 'won', LOST = 'lost';

  /* ===== Dates (calendar keys 'YYYY-MM-DD'; the player's local day) ===== */
  const pad = n => String(n).padStart(2, '0');
  const localKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const keyToUTC = k => Date.parse(k + 'T00:00:00Z');
  const addDays = (k, n) => new Date(keyToUTC(k) + n * 864e5).toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((keyToUTC(b) - keyToUTC(a)) / 864e5);
  const isDateKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && !Number.isNaN(keyToUTC(k)) && addDays(k, 0) === k;
  const puzzleNumber = k => daysBetween(LAUNCH, k) + 1;
  const mondayOf = k => addDays(k, -((new Date(k + 'T12:00:00Z').getUTCDay() + 6) % 7));
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const prettyDate = k => `${MONTHS[Number(k.slice(5, 7)) - 1]} ${Number(k.slice(8))}`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* ===== Game rules (pure) ===== */
  const hitsOf = g => g.pings.filter(p => p.d === 0).length;
  const missesOf = g => g.pings.filter(p => p.d > 0).length;
  const newGame = () => ({ pings: [], marks: [], status: PLAYING });

  // Ping a cell. Mutates `game`; returns the distance shown, or null if the ping is not allowed.
  // Only misses spend a charge. Numbers already on the board never change.
  function applyPing(game, puzzle, cell) {
    if (game.status !== PLAYING) return null;
    if (cell === puzzle.opening || game.marks.includes(cell) || game.pings.some(p => p.cell === cell)) return null;
    const found = game.pings.filter(p => p.d === 0).map(p => p.cell);
    const d = pingDistance(cell, puzzle.figure, found);
    game.pings.push({ cell, d });
    if (hitsOf(game) === puzzle.size) game.status = WON;
    else if (missesOf(game) >= MAX_MISSES) game.status = LOST;
    return d;
  }

  function verdict(status, misses, par) {
    if (status === LOST) return 'Lost signal';
    const diff = misses - par;
    if (diff <= -2) return 'Perfect echo';
    if (diff === -1) return 'Sharp ears';
    if (diff === 0) return 'On par';
    if (diff <= 2) return 'Found it';
    return 'Close call';
  }

  /* ===== Streak (pure) =====
   * Walks every calendar day from the first finished game up to todayKey.
   *  - a won day adds 1; every 7th day of the running streak earns a shield (max 2);
   *  - a lost, abandoned or skipped day spends a shield if there is one, else resets the streak;
   *  - today is ignored until it is finished.
   */
  function computeStreak(days, todayKey) {
    const keys = Object.keys(days)
      .filter(k => isDateKey(k) && k <= todayKey && days[k] && days[k].status !== PLAYING)
      .sort();
    if (!keys.length) return { current: 0, best: 0, shields: 0 };
    let current = 0, best = 0, shields = 0, k = keys[0];
    while (k <= todayKey) {
      const st = days[k] ? days[k].status : null;
      if (st === WON) {
        current++;
        best = Math.max(best, current);
        if (current % SHIELD_EVERY === 0) shields = Math.min(MAX_SHIELDS, shields + 1);
      } else if (k === todayKey && (st === null || st === PLAYING)) {
        // today still open: no effect yet
      } else if (shields > 0) {
        shields--;
      } else {
        current = 0;
      }
      k = addDays(k, 1);
    }
    return { current, best, shields };
  }

  // Logbook numbers. dist[m] = games finished with m misses; a lost game always has MAX misses.
  function computeStats(days, todayKey, maxMisses) {
    const done = Object.keys(days).filter(k => isDateKey(k) && days[k] && days[k].status !== PLAYING);
    const dist = new Array(maxMisses + 1).fill(0);
    let wins = 0;
    for (const k of done) {
      const g = days[k];
      if (g.status === WON) wins++;
      dist[Math.min(maxMisses, g.status === LOST ? maxMisses : missesOf(g))]++;
    }
    const s = computeStreak(days, todayKey);
    return {
      played: done.length,
      wins,
      winPct: done.length ? Math.round(wins / done.length * 100) : 0,
      streak: s.current,
      best: s.best,
      shields: s.shields,
      dist,
    };
  }

  // 🟩 hit · 🟨 1 away · 🟦 2 away · ⬜ 3 or more. Never positions, only the order of results.
  function shareText({ number, status, misses, par, hits, size, pings, streak }) {
    const squares = pings.map(p => p.d === 0 ? '🟩' : p.d === 1 ? '🟨' : p.d === 2 ? '🟦' : '⬜').join('');
    const flame = streak > 0 ? ` · 🔥${streak}` : '';
    const head = status === WON
      ? `Sonar #${number} · ${plural(misses, 'miss', 'misses')} (par ${par})${flame}`
      : `Sonar #${number} · Lost signal (${hits}/${size} found)${flame}`;
    return `${head}\n${squares}\n${SHARE_URL}`;
  }

  /* ===== Storage shape ===== */
  const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  // Keeps only well-formed entries so a corrupted or hand-edited save cannot break the page.
  function sanitizeStore(raw) {
    const out = { v: 1, days: {} };
    const days = raw && typeof raw === 'object' && raw.days && typeof raw.days === 'object' ? raw.days : {};
    for (const k of Object.keys(days)) {
      const g = days[k];
      if (!isDateKey(k) || !g || ![PLAYING, WON, LOST].includes(g.status) || !Array.isArray(g.pings) || !Array.isArray(g.marks)) continue;
      const seen = new Set();
      const pings = [];
      for (const p of g.pings) {
        if (p && isInt(p.cell, 0, N * N - 1) && isInt(p.d, 0, 2 * N) && !seen.has(p.cell)) { seen.add(p.cell); pings.push({ cell: p.cell, d: p.d }); }
      }
      const marks = [...new Set(g.marks.filter(c => isInt(c, 0, N * N - 1) && !seen.has(c)))];
      out.days[k] = { pings, marks, status: g.status };
    }
    return out;
  }

  const api = { LAUNCH, localKey, addDays, daysBetween, isDateKey, puzzleNumber, mondayOf, hitsOf, missesOf, newGame, applyPing, verdict, computeStreak, computeStats, shareText, sanitizeStore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  /* ===================================================================
   * Page
   * =================================================================== */
  const DEBUG = new URLSearchParams(location.search).get('debug') === '1';
  const KEY = DEBUG ? STORE_KEY + ':debug' : STORE_KEY; // debug sessions never touch the real record
  const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  /* ----- storage (every access guarded) ----- */
  let storageOk = true;
  function loadStore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return sanitizeStore(JSON.parse(raw));
    } catch (e) {
      if (e instanceof SyntaxError) return sanitizeStore(null);
      storageOk = false;
    }
    return sanitizeStore(null);
  }
  function saveStore() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { storageOk = false; }
  }
  let store = loadStore();

  /* ----- state ----- */
  let todayKey = localKey(new Date());
  let dateKey = todayKey;
  let puzzle, game, mode = 'ping', selected = null, revealFigure = false, freshCell = null;
  const isPrelaunch = () => !DEBUG && todayKey < LAUNCH;
  const pingAt = i => game.pings.find(p => p.cell === i);
  const remember = () => { store.days[dateKey] = game; saveStore(); };

  /* ----- board ----- */
  const boardEl = $('board');
  const cells = [];
  let suppressClickUntil = 0;
  for (let i = 0; i < N * N; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell';
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => { if (Date.now() >= suppressClickUntil) onCell(i); });
    b.addEventListener('focus', () => { cells.forEach((c, k) => { c.tabIndex = k === i ? 0 : -1; }); });
    b.addEventListener('keydown', e => onCellKey(e, i));
    // Right-click (mouse) or the context-menu key marks a cell; touch uses a long press instead.
    b.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (e.pointerType === 'touch' || e.pointerType === 'pen') return;
      toggleMark(i);
    });
    let pressTimer = null;
    const cancelPress = () => { clearTimeout(pressTimer); pressTimer = null; };
    b.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      cancelPress();
      pressTimer = setTimeout(() => { pressTimer = null; suppressClickUntil = Date.now() + 600; toggleMark(i); }, 450);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, cancelPress));
    boardEl.appendChild(b);
    cells.push(b);
  }
  for (let i = 0; i < MAX_MISSES; i++) { const c = document.createElement('span'); c.className = 'charge'; $('charges').appendChild(c); }

  function focusCell(i) {
    cells.forEach((c, k) => { c.tabIndex = k === i ? 0 : -1; });
    cells[i].focus();
  }
  function onCellKey(e, i) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const [r, c] = rc(i);
    const clamp = v => Math.max(0, Math.min(N - 1, v));
    let nr = r, nc = c;
    switch (e.key) {
      case 'ArrowUp': nr = clamp(r - 1); break;
      case 'ArrowDown': nr = clamp(r + 1); break;
      case 'ArrowLeft': nc = clamp(c - 1); break;
      case 'ArrowRight': nc = clamp(c + 1); break;
      case 'Home': nc = 0; break;
      case 'End': nc = N - 1; break;
      case 'm': case 'M': case 'x': case 'X': e.preventDefault(); toggleMark(i); return;
      default: return;
    }
    e.preventDefault();
    focusCell(nr * N + nc);
  }

  /* ----- actions ----- */
  const cellName = i => { const [r, c] = rc(i); return `${COLS[c]}${r + 1}`; };
  const stepsText = d => plural(d, 'step', 'steps');
  const say = msg => { $('sr-status').textContent = ''; setTimeout(() => { $('sr-status').textContent = msg; }, 30); };

  function onCell(i) {
    const p = pingAt(i);
    if (p ? p.d > 0 : i === puzzle.opening) { selected = selected === i ? null : i; render(); return; }
    if (p || game.status !== PLAYING) return;
    if (mode === 'mark') { toggleMark(i); return; }
    if (game.marks.includes(i)) { shake(i); toast('Marked as empty. Switch to Mark empty to clear it.'); return; }
    const d = applyPing(game, puzzle, i);
    if (d === null) return;
    remember();
    selected = d > 0 ? i : null;
    freshCell = i;
    ripple(i, d);
    render();
    const left = MAX_MISSES - missesOf(game);
    if (game.status === WON) {
      say(`${cellName(i)}: hit. Figure complete with ${plural(missesOf(game), 'miss', 'misses')}. ${verdict(WON, missesOf(game), puzzle.par)}.`);
    } else if (game.status === LOST) {
      say(`${cellName(i)}: ${stepsText(d)} away. No charges left. Lost signal.`);
    } else if (d === 0) {
      say(`${cellName(i)}: hit. ${hitsOf(game)} of ${puzzle.size} cells found.`);
    } else {
      say(`${cellName(i)}: ${stepsText(d)} away. ${plural(left, 'charge', 'charges')} left.`);
    }
    if (game.status !== PLAYING) {
      setTimeout(() => $('result-panel').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' }), 450);
    }
  }

  function toggleMark(i) {
    if (game.status !== PLAYING || pingAt(i) || i === puzzle.opening) return;
    const at = game.marks.indexOf(i);
    if (at >= 0) game.marks.splice(at, 1); else game.marks.push(i);
    remember();
    render();
    say(`${cellName(i)} ${at >= 0 ? 'unmarked' : 'marked as empty'}.`);
  }

  function shake(i) {
    if (reduceMotion()) return;
    const c = cells[i];
    c.classList.remove('shake');
    void c.offsetWidth;
    c.classList.add('shake');
  }

  // Diamond wave out to the distance the ping returned.
  function ripple(i, d) {
    if (d === 0 || reduceMotion()) return;
    const cell = cells[i];
    const pitch = cells[1].offsetLeft - cells[0].offsetLeft;
    const side = d * pitch * Math.SQRT2;
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.width = side + 'px';
    r.style.height = side + 'px';
    r.style.left = (cell.offsetLeft + cell.offsetWidth / 2) + 'px';
    r.style.top = (cell.offsetTop + cell.offsetHeight / 2) + 'px';
    boardEl.appendChild(r);
    requestAnimationFrame(() => r.classList.add('go'));
    setTimeout(() => r.remove(), 1000);
  }

  /* ----- render ----- */
  const distClass = d => d === 0 ? 'hit' : d === 1 ? 'd1' : d === 2 ? 'd2' : 'd3';

  function render() {
    const over = game.status !== PLAYING, lost = game.status === LOST;
    const opening = puzzle.opening;
    const selD = selected === null ? null : (selected === opening ? puzzle.openingDistance : pingAt(selected).d);
    for (let i = 0; i < N * N; i++) {
      const c = cells[i], p = pingAt(i);
      c.className = 'cell';
      c.textContent = '';
      c.removeAttribute('aria-pressed');
      let label = cellName(i);
      let inert = over;
      if (i === opening) {
        c.classList.add('dist', distClass(puzzle.openingDistance), 'opening');
        c.textContent = puzzle.openingDistance;
        label += `, opening ping, ${stepsText(puzzle.openingDistance)} away`;
        c.setAttribute('aria-pressed', String(i === selected));
        inert = false;
      } else if (p) {
        if (p.d === 0) { c.classList.add('hit'); label += ', hit'; }
        else {
          c.classList.add('dist', distClass(p.d));
          c.textContent = p.d;
          label += `, ${stepsText(p.d)} away`;
          c.setAttribute('aria-pressed', String(i === selected));
          inert = false;
        }
        if (i === freshCell) c.classList.add('pop');
      } else if ((lost || revealFigure) && puzzle.figure.includes(i)) {
        c.classList.add('ghost');
        label += ', part of the figure';
      } else if (game.marks.includes(i)) {
        c.classList.add('marked');
        label += ', marked empty';
      } else {
        label += ', not pinged';
        if (selD !== null && selD > 0 && Math.abs(rc(i)[0] - rc(selected)[0]) + Math.abs(rc(i)[1] - rc(selected)[1]) === selD) {
          c.classList.add('ring');
          label += `, exactly ${stepsText(selD)} from ${cellName(selected)}`;
        }
      }
      if (i === selected) c.classList.add('selected');
      c.setAttribute('aria-disabled', inert ? 'true' : 'false');
      c.setAttribute('aria-label', label);
    }
    freshCell = null;

    const misses = missesOf(game), hits = hitsOf(game);
    [...$('charges').children].forEach((el, k) => el.classList.toggle('spent', k >= MAX_MISSES - misses));
    $('readout').innerHTML = `<b>${MAX_MISSES - misses}</b> left · found <b>${hits}/${puzzle.size}</b> · par <b>${puzzle.par}</b>`;
    $('issue').innerHTML = `<strong>#${puzzleNumber(dateKey)}</strong> · ${WEEKDAYS[puzzle.weekday]}, ${prettyDate(dateKey)}<br>${puzzle.size}-cell figure`;
    $('hint').textContent = mode === 'mark' ? 'Tap cells you have ruled out. Marks are free.'
      : selD > 0 ? `Outlined: every cell exactly ${stepsText(selD)} from the selected number.`
      : 'Tap a number to see its ring of possible cells. Long-press or right-click to mark.';
    renderResult(); renderStats(); renderMosaic();
  }

  function renderResult() {
    const over = game.status !== PLAYING;
    $('result-panel').hidden = !over;
    if (!over) return;
    const misses = missesOf(game);
    const streak = computeStreak(store.days, dateKey).current;
    $('result-title').textContent = verdict(game.status, misses, puzzle.par);
    $('result-sub').textContent = game.status === WON
      ? `${plural(misses, 'miss', 'misses')} · par ${puzzle.par} · ${plural(game.pings.length, 'ping', 'pings')}`
      : `${hitsOf(game)} of ${puzzle.size} cells found before the charges ran out`;
    $('share-box').textContent = shareText({
      number: puzzleNumber(dateKey), status: game.status, misses, par: puzzle.par,
      hits: hitsOf(game), size: puzzle.size, pings: game.pings, streak,
    });
  }

  function renderStats() {
    const s = computeStats(store.days, todayKey, MAX_MISSES);
    const items = [[s.played, 'Played'], [s.winPct, 'Win %'], [s.streak, 'Streak'], [s.best, 'Best streak']];
    $('stats').innerHTML = items.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
    const shield = on => `<svg class="shield${on ? ' on' : ''}" viewBox="0 0 18 20" aria-hidden="true"><path d="M9 1 2 4v6c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V4z"/></svg>`;
    const toNext = SHIELD_EVERY - (s.streak % SHIELD_EVERY);
    const shieldNote = s.shields >= MAX_SHIELDS ? 'Shields full.' : `Next one in ${plural(toNext, 'day', 'days')} of streak.`;
    $('shields').innerHTML = `${shield(s.shields > 0)}${shield(s.shields > 1)}<span class="muted small">${plural(s.shields, 'shield', 'shields')} · a shield covers one missed or lost day. ${shieldNote}</span>`;
    const maxC = Math.max(1, ...s.dist);
    const todayMiss = game.status === PLAYING ? -1 : (game.status === LOST ? MAX_MISSES : missesOf(game));
    $('dist').innerHTML = '<span class="small muted">Misses per game (8 = lost)</span>' + s.dist.map((c, m) =>
      `<div class="bar-row"><span>${m}<span class="sr-only"> ${m === 1 ? 'miss' : 'misses'}${m === MAX_MISSES ? ' (lost)' : ''}</span></span><div class="bar${m === todayMiss && dateKey === todayKey ? ' today' : ''}" style="width:${Math.max(6, c / maxC * 100)}%">${c}<span class="sr-only"> ${c === 1 ? 'game' : 'games'}</span></div></div>`).join('');
    $('storage-note').hidden = storageOk;
  }

  /* ----- weekly mosaic: one scene, seven strips, one strip per solved day -----
   * To use your own illustration, add { id, src: '/sonar/scenes/<file>' } to SCENES (any size; it is
   * drawn "cover" over the 700x300 canvas). Weeks cycle through SCENES in order.
   */
  const SCENE_W = 700, SCENE_H = 300;
  const cssVar = n => getComputedStyle(document.body).getPropertyValue(n).trim();
  const SCENES = [{ id: 'harbour', draw: drawHarbour }];
  const sceneImages = {};

  function sceneForWeek(mon) {
    const week = Math.floor(daysBetween('2024-01-01', mon) / 7); // 2024-01-01 was a Monday
    return SCENES[((week % SCENES.length) + SCENES.length) % SCENES.length];
  }

  function drawImageCover(ctx, img) {
    const s = Math.max(SCENE_W / img.width, SCENE_H / img.height);
    ctx.drawImage(img, (SCENE_W - img.width * s) / 2, (SCENE_H - img.height * s) / 2, img.width * s, img.height * s);
  }

  function drawHarbour(ctx, rng, col) {
    const W = SCENE_W, H = SCENE_H, horizon = H * 0.58;
    ctx.fillStyle = col.sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = col.sun; ctx.beginPath(); ctx.arc(W * (0.15 + rng() * 0.25), horizon - 40 - rng() * 40, 34, 0, Math.PI * 2); ctx.fill();
    for (let b = 0; b < 5; b++) {
      ctx.fillStyle = col.sea; ctx.globalAlpha = 0.35 + b * 0.13;
      ctx.beginPath(); ctx.moveTo(0, horizon + b * 26);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, horizon + b * 26 + Math.sin(x / 38 + b * 1.7 + rng() * 0.2) * 5);
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const lx = W * (0.72 + rng() * 0.12);
    ctx.fillStyle = col.ink; ctx.beginPath(); ctx.moveTo(lx - 70, horizon + 30); ctx.quadraticCurveTo(lx, horizon - 10, lx + 80, horizon + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col.tower; ctx.beginPath(); ctx.moveTo(lx - 16, horizon + 6); ctx.lineTo(lx - 10, horizon - 120); ctx.lineTo(lx + 10, horizon - 120); ctx.lineTo(lx + 16, horizon + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = col.red; for (let s = 0; s < 3; s++) ctx.fillRect(lx - 14 + s * 1.2, horizon - 20 - s * 38, 28 - s * 2.4, 16);
    ctx.fillStyle = col.warm; ctx.fillRect(lx - 9, horizon - 140, 18, 20);
    ctx.fillStyle = col.ink; ctx.beginPath(); ctx.moveTo(lx - 13, horizon - 140); ctx.lineTo(lx, horizon - 154); ctx.lineTo(lx + 13, horizon - 140); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col.warm; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(lx, horizon - 130); ctx.lineTo(lx - 260, horizon - 170); ctx.lineTo(lx - 260, horizon - 100); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    const bx = W * (0.3 + rng() * 0.2), by = horizon + 34;
    ctx.fillStyle = col.ink; ctx.beginPath(); ctx.moveTo(bx - 34, by); ctx.lineTo(bx + 34, by); ctx.lineTo(bx + 24, by + 12); ctx.lineTo(bx - 24, by + 12); ctx.closePath(); ctx.fill();
    ctx.fillRect(bx - 1.5, by - 46, 3, 46);
    ctx.fillStyle = col.tower; ctx.beginPath(); ctx.moveTo(bx + 2, by - 44); ctx.lineTo(bx + 30, by - 6); ctx.lineTo(bx + 2, by - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let b = 0; b < 3; b++) { const x = 40 + rng() * (W - 80), y = horizon + 60 + rng() * 60; ctx.fillStyle = col.red; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
  }

  let mosaicKey = '';
  function renderMosaic() {
    const mon = mondayOf(dateKey);
    const week = Array.from({ length: 7 }, (_, k) => addDays(mon, k));
    const solved = week.map(k => !!store.days[k] && store.days[k].status === WON);
    const scene = sceneForWeek(mon);
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const key = [mon, dateKey, solved.join(), dark, scene.src && sceneImages[scene.id] ? 'img' : ''].join('|');
    if (key === mosaicKey) return;
    mosaicKey = key;

    const cv = $('mosaic'), ctx = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = SCENE_W * dpr; cv.height = SCENE_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const col = {
      ink: cssVar('--ink'), paper: cssVar('--paper'), sky: cssVar('--paper-2'), sea: cssVar('--d2'),
      sun: cssVar('--d1'), warm: cssVar('--d1'), red: cssVar('--accent'), tower: cssVar('--paper'),
    };
    ctx.clearRect(0, 0, SCENE_W, SCENE_H);
    if (scene.src) {
      const img = sceneImages[scene.id];
      if (img && img.complete && img.naturalWidth) drawImageCover(ctx, img);
      else if (!img) {
        const im = new Image();
        im.onload = () => { mosaicKey = ''; renderMosaic(); };
        im.src = scene.src;
        sceneImages[scene.id] = im;
      }
    } else {
      scene.draw(ctx, mulberry32(hashString('mosaic:' + mon)), col);
    }

    const sw = SCENE_W / 7;
    const labels = [];
    week.forEach((dk, k) => {
      if (!solved[k]) {
        ctx.fillStyle = col.paper; ctx.globalAlpha = 0.93; ctx.fillRect(k * sw, 0, sw, SCENE_H); ctx.globalAlpha = 1;
        ctx.strokeStyle = cssVar('--line'); ctx.lineWidth = 1;
        for (let y = -sw; y < SCENE_H; y += 10) { ctx.beginPath(); ctx.moveTo(k * sw, y); ctx.lineTo(k * sw + sw, y + sw); ctx.stroke(); }
      }
      ctx.strokeStyle = col.paper; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(k * sw, 0); ctx.lineTo(k * sw, SCENE_H); ctx.stroke();
      labels.push(`<span class="${dk === dateKey ? 'today' : ''}">${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][k]}${solved[k] ? ' ✓' : ''}</span>`);
    });
    $('week-labels').innerHTML = labels.join('');
    const n = solved.filter(Boolean).length;
    cv.setAttribute('aria-label', `This week's chart: ${n} of 7 strips uncovered. Solve each day to uncover its strip.`);
  }

  /* ----- controls ----- */
  function setMode(m) {
    mode = m;
    $('mode-ping').setAttribute('aria-pressed', String(m === 'ping'));
    $('mode-mark').setAttribute('aria-pressed', String(m === 'mark'));
    render();
  }
  $('mode-ping').addEventListener('click', () => setMode('ping'));
  $('mode-mark').addEventListener('click', () => setMode('mark'));

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
  }

  function selectShareText() {
    const range = document.createRange();
    range.selectNodeContents($('share-box'));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    toast('Selected. Copy it with Ctrl+C or ⌘C.');
  }
  $('copy-btn').addEventListener('click', () => {
    const text = $('share-box').textContent;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no clipboard');
      navigator.clipboard.writeText(text).then(() => toast('Result copied'), selectShareText);
    } catch (e) { selectShareText(); }
  });
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    $('share-btn').hidden = false;
    $('share-btn').addEventListener('click', () => {
      navigator.share({ text: $('share-box').textContent }).catch(e => { if (e && e.name !== 'AbortError') selectShareText(); });
    });
  }

  /* ----- clock ----- */
  function countdownTo(target) {
    const s = Math.max(0, Math.floor((target - new Date()) / 1000));
    const d = Math.floor(s / 86400);
    return `${d ? d + 'd ' : ''}${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  }
  function tick() {
    const now = new Date();
    const key = localKey(now);
    if (key !== todayKey) {
      const wasToday = dateKey === todayKey;
      todayKey = key;
      if (wasToday) { dateKey = key; start(); return; }
    }
    if (isPrelaunch()) {
      const [y, m, d] = LAUNCH.split('-').map(Number);
      $('launch-countdown').textContent = countdownTo(new Date(y, m - 1, d));
    } else {
      $('countdown').textContent = 'Next Sonar in ' + countdownTo(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    }
  }

  /* ----- boot ----- */
  function load(k) {
    dateKey = k;
    puzzle = generatePuzzle(k);
    game = store.days[k] || newGame();
    selected = null;
    revealFigure = false;
    if (DEBUG) {
      $('date-pick').value = k;
      $('reveal-btn').setAttribute('aria-pressed', 'false');
      $('reveal-btn').textContent = 'Show figure';
    }
    mosaicKey = '';
    render();
  }

  function start() {
    const pre = isPrelaunch();
    $('prelaunch').hidden = !pre;
    $('game').hidden = pre;
    if (pre) {
      const [y, m, d] = LAUNCH.split('-').map(Number);
      $('launch-date').textContent = `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]}, ${prettyDate(LAUNCH)}`;
      tick();
      return;
    }
    load(dateKey);
    tick();
  }

  // The rules are open the first time; later visits keep them folded.
  $('how').open = !Object.values(store.days).some(g => g.status !== PLAYING);

  if (DEBUG) {
    $('debug').hidden = false;
    $('date-pick').addEventListener('change', e => { if (isDateKey(e.target.value)) load(e.target.value); });
    $('today-btn').addEventListener('click', () => load(todayKey));
    $('reset-btn').addEventListener('click', () => { delete store.days[dateKey]; saveStore(); load(dateKey); toast('Day reset'); });
    $('wipe-btn').addEventListener('click', () => { store = sanitizeStore(null); saveStore(); load(dateKey); toast('Debug data cleared'); });
    $('reveal-btn').addEventListener('click', () => {
      revealFigure = !revealFigure;
      $('reveal-btn').setAttribute('aria-pressed', String(revealFigure));
      $('reveal-btn').textContent = revealFigure ? 'Hide figure' : 'Show figure';
      render();
    });
  }

  // Another tab played: pick up its state instead of overwriting it later.
  addEventListener('storage', e => { if (e.key === KEY && !isPrelaunch()) { store = loadStore(); load(dateKey); } });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { mosaicKey = ''; if (!isPrelaunch()) renderMosaic(); });

  setInterval(tick, 1000);
  start();
})();

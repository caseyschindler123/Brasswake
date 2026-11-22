/* ===== HOUSE GAMES: a wheel with a flaw you can find in its history, and blackjack with a shoe you can count ===== */
const House = (() => {
  let rnd = Math.random;
  const rng = seed => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const q = s => `'${s}'`;

  /* ---------- the Crooked Wheel: 36 pockets. A bet is a query that returns pockets. One group of pockets comes up more often than it should. ---------- */
  const BOOKS = ['arms', 'spell', 'shadow', 'craft'], RETURN = 34.2, EDGE = 1.18;   // a fair wheel pays back 95%; betting exactly the favoured pockets pays back about 118%
  const pocket = n => ({ pocket: n, color: n % 9 === 0 ? 'gold' : n % 2 ? 'red' : 'black', book: BOOKS[Math.floor((n - 1) / 9)], ring: (n - 1) % 6 + 1 });
  const POCKETS = []; for (let n = 1; n <= 36; n++) POCKETS.push(pocket(n));
  function flaw(r, day) {   // which pockets are favoured today in this town's room. Richer rooms hide it in a smaller or stranger group.
    const g = rng(hash(day + ':wheel:' + r)), tier = r <= 3 ? 0 : r <= 5 ? 1 : 2, x = g(); let f, sql;
    if (tier === 0) { if (x < .5) { const b = BOOKS[Math.floor(g() * 4)]; f = p => p.book === b; sql = `book = '${b}'`; } else { const k = 1 + Math.floor(g() * 6); f = p => p.ring === k; sql = `ring = ${k}`; } }
    else if (tier === 1) { const b = BOOKS[Math.floor(g() * 4)], c = g() < .5 ? 'red' : 'black'; f = p => p.book === b && p.color === c; sql = `book = '${b}' AND color = '${c}'`; }
    else { const a = 1 + Math.floor(g() * 30); f = p => p.pocket >= a && p.pocket <= a + 6; sql = `pocket BETWEEN ${a} AND ${a + 6}`; }
    const hot = POCKETS.filter(f).map(p => p.pocket), k = hot.length, m = EDGE * (36 - k) / (RETURN - EDGE * k), w = POCKETS.map(p => hot.indexOf(p.pocket) >= 0 ? m : 1), g2 = rng(hash(day + ':spins:' + r)), spins = [];
    for (let i = 0; i < 360; i++) spins.push(draw(w, g2)); return { hot, sql, m, w, spins, flat: tier === 0 };
  }
  function draw(w, g) { let t = 0; for (const x of w) t += x; let x = (g || rnd)() * t; for (let i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i + 1; } return w.length; }
  function wheelTables(F) {
    const cols = { wheel: ['pocket', 'color', 'book', 'ring'], spins: F.flat ? ['spin_no', 'pocket', 'color', 'book', 'ring'] : ['spin_no', 'pocket'] };
    const s = `CREATE TABLE wheel (pocket INTEGER, color TEXT, book TEXT, ring INTEGER);INSERT INTO wheel VALUES ${POCKETS.map(p => `(${p.pocket},${q(p.color)},${q(p.book)},${p.ring})`).join(',')};` +
      (F.flat ? `CREATE TABLE spins (spin_no INTEGER, pocket INTEGER, color TEXT, book TEXT, ring INTEGER);INSERT INTO spins VALUES ${F.spins.map((n, i) => { const p = POCKETS[n - 1]; return `(${i + 1},${n},${q(p.color)},${q(p.book)},${p.ring})`; }).join(',')};` : `CREATE TABLE spins (spin_no INTEGER, pocket INTEGER);INSERT INTO spins VALUES ${F.spins.map((n, i) => `(${i + 1},${n})`).join(',')};`);
    return { script: s, cols, note: F.flat ? 'spins holds the last spins of this wheel, with each pocket’s color, book and ring.' : 'spins holds only the pocket of each spin. Join it to wheel for color, book and ring.' };
  }
  // a bet is the set of pockets a query returns in its first column
  function cover(res) { if (res.err) return { err: res.err }; const set = []; for (const row of res.rows) { const n = +row[0]; if (!(n >= 1 && n <= 36 && Math.floor(n) === n)) return { err: 'A bet must return pocket numbers from 1 to 36 in its first column.' }; if (set.indexOf(n) < 0) set.push(n); }
    if (!set.length) return { err: 'That query returns no pockets.' }; if (set.length > 30) return { err: 'The house takes bets on 30 pockets or fewer.' }; return { set, pays: RETURN / set.length }; }

  /* ---------- the Count: blackjack from a two-deck shoe. Every card shown is logged, so the shoe can be counted with a query. ---------- */
  const pts = c => { const r = (c >> 2) + 2; return r === 14 ? 11 : r > 10 ? 10 : r; };
  function total(cs) { let t = 0, a = 0; for (const c of cs) { const p = pts(c); t += p; if (p === 11) a++; } while (t > 21 && a) { t -= 10; a--; } return { t, soft: a > 0 }; }
  function newShoe() { const d = []; for (let k = 0; k < 2; k++) for (let c = 0; c < 52; c++) d.push(c); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), x = d[i]; d[i] = d[j]; d[j] = x; } return { cards: d, seen: [], no: 1 }; }
  function bjDeal(sh, bet) { if (sh.cards.length < 30) { const no = sh.no + 1; Object.assign(sh, newShoe()); sh.no = no; sh.fresh = true; } else sh.fresh = false;
    const g = { bet, me: [sh.cards.pop(), sh.cards.pop()], dl: [sh.cards.pop(), sh.cards.pop()], over: false, doubled: false, res: '', net: 0 }; sh.seen.push(g.me[0], g.me[1], g.dl[0]);
    const mb = total(g.me).t === 21, db = total(g.dl).t === 21; if (mb || db) { sh.seen.push(g.dl[1]); g.over = true; g.res = mb && db ? 'push' : mb ? 'blackjack' : 'dealer blackjack'; g.net = mb && db ? 0 : mb ? Math.floor(bet * 1.5) : -bet; } return g; }
  function bjAct(sh, g, a) {   // hit, stand or double. The dealer draws to 17 and stands on every 17.
    if (g.over) return g; if (a === 'double' && g.me.length === 2) { g.doubled = true; g.bet *= 2; a = 'hit1'; }
    if (a === 'hit' || a === 'hit1') { const c = sh.cards.pop(); g.me.push(c); sh.seen.push(c); const t = total(g.me).t; if (t > 21) { g.over = true; g.res = 'bust'; g.net = -g.bet; sh.seen.push(g.dl[1]); return g; } if (a === 'hit' && t < 21) return g; }
    sh.seen.push(g.dl[1]); while (total(g.dl).t < 17) { const c = sh.cards.pop(); g.dl.push(c); sh.seen.push(c); }
    const m = total(g.me).t, d = total(g.dl).t; g.over = true; g.res = d > 21 ? 'dealer busts' : m > d ? 'win' : m < d ? 'lose' : 'push'; g.net = d > 21 || m > d ? g.bet : m < d ? -g.bet : 0; return g; }
  function bjTables(sh, guard, past) {
    const row = (c, i) => `(${i + 1},${(c >> 2) + 2},${pts(c)})`, CARDS = () => { const v = []; for (let c = 0; c < 52; c++) v.push(`(${c + 101},${(c >> 2) + 2},${pts(c)})`); return `CREATE TABLE cards (card_id INTEGER, rank INTEGER, points INTEGER);INSERT INTO cards VALUES ${v.join(',')};`; };
    if (guard === 'open') return { script: `CREATE TABLE seen (seq INTEGER, rank INTEGER, points INTEGER);` + (sh.seen.length ? `INSERT INTO seen VALUES ${sh.seen.map(row).join(',')};` : ''), cols: { seen: ['seq', 'rank', 'points'] }, note: 'seen holds every card shown since the shuffle. points is 2 to 10, and 11 for an ace. The shoe is 104 cards.' };
    if (guard === 'logged') { const v = []; past.forEach((cs, k) => cs.forEach((c, i) => v.push(`(${sh.no - past.length + k},${i + 1},${c + 101})`))); sh.seen.forEach((c, i) => v.push(`(${sh.no},${i + 1},${c + 101})`));
      return { script: CARDS() + `CREATE TABLE shoe_log (shoe_no INTEGER, seq INTEGER, card_id INTEGER);` + (v.length ? `INSERT INTO shoe_log VALUES ${v.join(',')};` : ''), cols: { shoe_log: ['shoe_no', 'seq', 'card_id'], cards: ['card_id', 'rank', 'points'] }, note: 'shoe_log holds every card shown tonight, across every shoe. This shoe is the highest shoe_no. Join to cards for points. A shoe is 104 cards.' }; }
    return { script: CARDS() + `CREATE TABLE seen (seq INTEGER, card_id INTEGER);` + (sh.seen.length ? `INSERT INTO seen VALUES ${sh.seen.map((c, i) => `(${i + 1},${c + 101})`).join(',')};` : ''), cols: { seen: ['seq', 'card_id'], cards: ['card_id', 'rank', 'points'] }, note: 'seen holds the card number of every card shown since the shuffle. Join it to cards for points. The shoe is 104 cards.' };
  }
  const BJGUARD = ['open', 'open', 'open', 'keyed', 'keyed', 'logged', 'logged', 'logged'];
  return { POCKETS, RETURN, flaw, draw, wheelTables, cover, pts, total, newShoe, bjDeal, bjAct, bjTables, BJGUARD, seed: f => { rnd = f; } };
})();
if (typeof module !== 'undefined') module.exports = House;

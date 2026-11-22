const H = require('../src/casino.js'), assert = require('assert');
let s = 424242; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; H.seed(rnd);
// wheel: betting at random loses about 5%; betting the favoured pockets wins; the flaw shows in the history
let fair = 0, edge = 0, seenHot = 0, n = 0;
for (let r = 1; r <= 8; r++) for (let d = 0; d < 40; d++) { const F = H.flaw(r, 'day' + d), k = F.hot.length; assert(k >= 4 && k <= 9, 'hot size ' + k); n++;
  const share = F.spins.filter(p => F.hot.indexOf(p) >= 0).length / F.spins.length; if (share > k / 36) seenHot++;
  for (let i = 0; i < 2000; i++) { const p = H.draw(F.w); edge += (F.hot.indexOf(p) >= 0 ? H.RETURN / k : 0) - 1; const pick = 1 + Math.floor(rnd() * 36); fair += (p === pick ? H.RETURN : 0) - 1; } }
console.log(`wheel: random single pocket ${(100 * fair / (n * 2000)).toFixed(1)}% per spin; favoured pockets ${(100 * edge / (n * 2000)).toFixed(1)}%; history shows the flaw above its fair share on ${seenHot} of ${n} days`);
assert(edge / (n * 2000) > .1 && fair / (n * 2000) < 0);
assert(H.cover({ cols: ['pocket'], rows: [[1], [2], [2]] }).set.length === 2 && H.cover({ rows: [[40]] }).err && H.cover({ rows: [] }).err);
// blackjack: basic strategy (no splits) at a flat bet, then the same with the bet raised when the count is high
const basic = (me, up) => { const t = H.total(me), u = H.pts(up); if (t.soft) { if (t.t >= 19) return 'stand'; if (t.t === 18) return u >= 9 ? 'hit' : (u >= 3 && u <= 6 && me.length === 2 ? 'double' : 'stand'); return u >= 4 && u <= 6 && me.length === 2 ? 'double' : 'hit'; }
  if (t.t >= 17) return 'stand'; if (t.t >= 13) return u <= 6 ? 'stand' : 'hit'; if (t.t === 12) return u >= 4 && u <= 6 ? 'stand' : 'hit'; if (t.t === 11) return me.length === 2 && u <= 10 ? 'double' : 'hit'; if (t.t === 10) return me.length === 2 && u <= 9 ? 'double' : 'hit'; if (t.t === 9) return me.length === 2 && u >= 3 && u <= 6 ? 'double' : 'hit'; return 'hit'; };
function play(ramp, rounds) { const sh = H.newShoe(); let net = 0, wag = 0; for (let i = 0; i < rounds; i++) { let tc = 0; if (sh.cards.length >= 30) { let rc = 0; for (const c of sh.seen) { const p = H.pts(c); rc += p <= 6 ? 1 : p >= 10 ? -1 : 0; } tc = rc / (sh.cards.length / 52); }
    const bet = 2 * (ramp ? (tc >= 4 ? 10 : tc >= 3 ? 6 : tc >= 2 ? 4 : tc >= 1 ? 2 : 1) : 1), g = H.bjDeal(sh, bet); let c = 0; while (!g.over) { H.bjAct(sh, g, basic(g.me, g.dl[0])); assert(++c < 20); } net += g.net; wag += bet; assert(sh.cards.length + sh.seen.length <= 104); }
  return { perRound: net / rounds, perUnit: net / wag }; }
const flat = play(false, 600000), cnt = play(true, 600000);
console.log(`blackjack: flat bet ${(100 * flat.perUnit).toFixed(2)}% of each bet; counting with a 1-to-10 spread ${(100 * cnt.perUnit).toFixed(2)}% of money bet, ${cnt.perRound.toFixed(3)} gold a round at a base bet of 2`);
assert(flat.perUnit < 0 && flat.perUnit > -.03);
require('sql.js')().then(SQL => { const sh = H.newShoe(); for (let i = 0; i < 9; i++) { const g = H.bjDeal(sh, 1); while (!g.over) H.bjAct(sh, g, basic(g.me, g.dl[0])); }
  let rc = 0; for (const c of sh.seen) { const p = H.pts(c); rc += p <= 6 ? 1 : p >= 10 ? -1 : 0; }
  const Q = { open: 'SELECT SUM(CASE WHEN points <= 6 THEN 1 WHEN points >= 10 THEN -1 ELSE 0 END) FROM seen', keyed: 'SELECT SUM(CASE WHEN c.points <= 6 THEN 1 WHEN c.points >= 10 THEN -1 ELSE 0 END) FROM seen s JOIN cards c ON c.card_id = s.card_id', logged: 'SELECT SUM(CASE WHEN c.points <= 6 THEN 1 WHEN c.points >= 10 THEN -1 ELSE 0 END) FROM shoe_log s JOIN cards c ON c.card_id = s.card_id WHERE s.shoe_no = (SELECT MAX(shoe_no) FROM shoe_log)' };
  for (const g in Q) { const db = new SQL.Database(); db.exec(H.bjTables(sh, g, [[1, 2, 3], [4, 5]]).script); assert.strictEqual(db.exec(Q[g])[0].values[0][0], rc, g); db.close(); }
  const F = H.flaw(2, 'x'), db = new SQL.Database(); db.exec(H.wheelTables(F).script); const best = db.exec('SELECT book, COUNT(*) n FROM spins GROUP BY book ORDER BY n DESC')[0].values; assert(best.length === 4); const F2 = H.flaw(7, 'x'), db2 = new SQL.Database(); db2.exec(H.wheelTables(F2).script); assert.strictEqual(db2.exec(`SELECT COUNT(*) FROM wheel WHERE ${F2.sql}`)[0].values[0][0], F2.hot.length);
  console.log('house tables ok'); });

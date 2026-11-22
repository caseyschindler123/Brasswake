const P = require('../src/poker.js'); const assert = require('assert');
let s = 987654321; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; P.seed(rnd);
const C = t => t.split(' ').map(x => (P.RCH.indexOf(x[0]) - 2) * 4 + 'shdc'.indexOf(x[1]));
// 1. hand ranking
const order = ['Ah Kh Qh Jh Th 2c 3d', '9s 8s 7s 6s 5s Ah Ad', 'Ac Ad Ah As Kd Kh 2c', 'Kc Kd Kh Ks Ad Qh 2c', 'Ac Ad Ah Ks Kd 2h 3c', 'Kc Kd Kh As Ad 2h 3c', 'Ah Jh 9h 6h 2h Kd Ks', 'Kh Jh 9h 6h 2h Ad As', 'Ts 9d 8h 7c 6s Ah Ad', '5s 4d 3h 2c As Kh Kd', 'Qs Qd Qh Ac Kd 7h 2c', 'Qs Qd Qh Ac Jd 7h 2c', 'As Ad Ks Kd Qh 7h 2c', 'As Ad Ks Kd Jh 7h 2c', 'As Ad Qs Jd 9h 7h 2c', 'Ks Kd As Qd 9h 7h 2c', 'As Kd Qs Jd 9h 7h 2c', 'As Kd Qs Jd 8h 7h 2c'];
const sc = order.map(t => P.ev(C(t))); for (let i = 1; i < sc.length; i++) assert(sc[i - 1] > sc[i], 'order ' + i);
assert.strictEqual(P.ev(C('As Kd Qs Jd 9h 3h 2c')), P.ev(C('Ah Kc Qd Js 9c 4d 2s')) - 0 * 1 + 0, 'kicker beyond five must not count') ;
assert.strictEqual(P.ev(C('5s 4d 3h 2c As 9h 9d')) > P.ev(C('9s 9d 9h Ac Kd 7h 2c')), true);   // wheel beats trips
assert.strictEqual(P.ev(C('2s 2d 3h 3c 4s 4h Ad')), P.ev(C('3s 3d 4h 4c Ah 7d 6c')) , 'three pair plays the top two and best kicker');
const cnt = new Array(9).fill(0), N = 400000; for (let i = 0; i < N; i++) { const cs = []; while (cs.length < 7) { const c = Math.floor(rnd() * 52); if (cs.indexOf(c) < 0) cs.push(c); } cnt[P.catOf(P.ev(cs))]++; }
const want = [.174, .438, .235, .0483, .0462, .0303, .026, .00168, .000311]; cnt.forEach((n, i) => assert(Math.abs(n / N - want[i]) < Math.max(.004, want[i] * .25), `freq ${P.CAT[i]} ${n / N}`));
console.log('ranking ok; 7-card frequencies', cnt.map(n => (100 * n / N).toFixed(2)).join(' '));
// 2. rules: seats, minimum raise, side pots, chips conserved under random legal play
let h = P.deal(2, [100, 100, 100, 100, 100, 100], 0); assert(h.sbp === 1 && h.bbp === 2 && h.in[1] === 1 && h.in[2] === 2 && h.to === 3 && h.pot === 3, 'blinds left of the button, first to act left of the big blind');
let L = P.legal(h); assert(L.call === 2 && L.minTo === 4, 'min raise preflop is to two big blinds');
P.act(h, 'raise', 6); assert(h.to === 4); L = P.legal(h); assert(L.call === 6 && L.minTo === 10, 'reraise must add at least the last raise');
P.act(h, 'fold'); P.act(h, 'fold'); P.act(h, 'call'); P.act(h, 'fold'); assert(h.to === 2 && h.street === 0, 'big blind still to act'); P.act(h, 'call');
assert(h.street === 1 && h.board.length === 3 && h.to === 2 && h.pot === 19, 'flop: first live player left of the button acts first');
P.act(h, 'check'); P.act(h, 'check'); assert(h.to === 0); P.act(h, 'raise', 1); assert(h.in[0] === 2, 'a bet is at least one big blind'); P.act(h, 'fold'); P.act(h, 'fold'); assert(h.over && h.stack[0] === 113);
h = P.deal(2, [100, 100, 100], 0); P.act(h, 'call'); P.act(h, 'call'); assert(h.street === 0 && h.to === 2, 'big blind has the option after limps'); P.act(h, 'check'); assert(h.street === 1 && h.to === 1);
h = P.deal(2, [100, 100], 0); assert(h.sbp === 0 && h.to === 0, 'two-handed: button is the small blind and acts first'); P.act(h, 'call'); P.act(h, 'check'); assert(h.street === 1 && h.to === 1);
// side pots: seat 0 has 50 and the best hand, seat 1 the second best, seat 2 the worst
h = P.deal(2, [50, 200, 200], 0); h.hole = [C('As Ad'), C('Ks Kd'), C('Qs Qd')]; h.full = C('2c 7d 9h 3s 4c');
P.act(h, 'raise', 50); P.act(h, 'raise', 120); P.act(h, 'call'); assert(h.street === 1 && h.pot === 290); P.act(h, 'check'); P.act(h, 'check'); P.act(h, 'check'); P.act(h, 'check'); P.act(h, 'check'); P.act(h, 'check');
assert(h.over && h.won[0] === 150 && h.won[1] === 140 && h.won[2] === 0, 'main pot to the short stack, side pot to the next best: ' + h.won);
// a short all-in does not reopen the betting to a player who already acted
h = P.deal(2, [200, 200, 27], 0); P.act(h, 'raise', 20); P.act(h, 'call'); assert(h.to === 2); P.act(h, 'raise', 27); assert(h.to === 0); L = P.legal(h); assert(L.call === 7 && !L.canRaise, 'only call or fold after a short all-in');
// uncalled bet comes back
h = P.deal(2, [100, 30, 100], 0); P.act(h, 'raise', 100); P.act(h, 'call'); P.act(h, 'fold'); assert(h.over && h.stack[0] + h.stack[1] + h.stack[2] === 230 && (h.stack[0] >= 70));
for (let i = 0; i < 30000; i++) { const n = 2 + Math.floor(rnd() * 5), st = []; for (let k = 0; k < n; k++) st.push(1 + Math.floor(rnd() * 150)); const sum = st.reduce((a, b) => a + b, 0); h = P.deal(2, st, i % n); let c = 0;
  while (!h.over) { const L = P.legal(h), x = rnd(); if (x < .15) P.act(h, 'fold'); else if (x < .65 || !L.canRaise) P.act(h, 'call'); else P.act(h, 'raise', L.minTo + Math.floor(rnd() * (L.maxTo - L.minTo + 1))); assert(++c < 400); assert(h.stack.every(v => v >= 0)); }
  assert.strictEqual(h.stack.reduce((a, b) => a + b, 0), sum, 'chips conserved'); }
console.log('rules ok');
// 3. opponents: six seats, 50 big blinds each every hand, button moving round
const scripted = kind => ({ start() { }, read() { }, move(h) { const L = P.legal(h); if (kind === 'call') return { type: 'call' }; if (kind === 'fold') return { type: L.check ? 'check' : 'fold' }; if (kind === 'jam') return { type: 'raise', amt: L.maxTo };
  if (kind === 'minraise') return rnd() < .5 ? { type: 'raise', amt: L.minTo } : { type: 'call' }; const x = rnd(); return x < .3 ? { type: 'fold' } : x < .75 ? { type: 'call' } : { type: 'raise', amt: L.minTo + rnd() * (L.maxTo - L.minTo) * .3 }; } });
const botPlayer = prof => { const b = P.mkBot(prof, 6); return { b, start(h, me) { P.botStart(b, h, me); }, read(h, T) { return P.ask(b, h, T); }, move(h, T) { return P.decide(b, h, T); }, end(h) { P.botEnd(b, h); } }; };
function match(pl, hands) { const n = pl.length, net = new Array(n).fill(0); let tiny = 0, bets = 0;
  for (let i = 0; i < hands; i++) { const h = P.deal(2, new Array(n).fill(100), i % n), T = P.mkTable(n); pl.forEach((p, k) => p.start(h, k)); let st = -1, c = 0;
    while (!h.over) { if (h.street !== st) { st = h.street; pl.forEach((p, k) => { if (!h.out[k]) p.read(h, T); }); } const w = h.to, board = h.board.slice(), street = h.street, cur = h.cur, pot = h.pot, m = pl[w].move(h, T), L = P.legal(h);
      const t = m.type === 'raise' && L.canRaise ? 'raise' : m.type === 'fold' && !L.check ? 'fold' : L.check ? 'check' : 'call';
      if (t === 'raise' && pl[w].b) { bets++; if (cur === 0 && street > 0 && m.amt < pot * .3 && m.amt < L.maxTo) tiny++; }
      P.act(h, m.type, m.amt); if (t !== 'fold') P.track(T, h, w, t, board, street); assert(++c < 300, 'hand ends'); }
    assert.strictEqual(h.stack.reduce((a, b) => a + b, 0), 100 * n); h.stack.forEach((v, k) => { net[k] += v - 100; }); pl.forEach(p => p.end && p.end(h)); }
  return { bb100: net.map(v => v / 2 / hands * 100), tiny, bets }; }
const HN = +process.argv[2] || 2000, t0 = Date.now(); let tiny = 0, allBets = 0, played = 0;
for (const k of ['call', 'fold', 'minraise', 'random']) { const r = match([botPlayer(P.SOLID)].concat([1, 2, 3, 4, 5].map(() => scripted(k))), HN); played += HN; tiny += r.tiny; allBets += r.bets; console.log(`sound player at a table of always-${k}: ${r.bb100[0].toFixed(0)} bb/100`); assert(r.bb100[0] > 0, 'must beat ' + k); }
for (const r of [1, 3, 5, 8]) { const regs = P.regulars(r), res = match([botPlayer(P.SOLID)].concat(regs.map(botPlayer)), HN); played += HN; tiny += res.tiny; allBets += res.bets; console.log(`room ${r}: sound player ${res.bb100[0].toFixed(0)} bb/100 | ` + regs.map((o, i) => `${o.name} (${o.tag}) ${res.bb100[i + 1].toFixed(0)}`).join(', ')); }
console.log(`bets under 30% of the pot: ${tiny} of ${allBets}`); assert.strictEqual(tiny, 0);
console.log('ms per hand', ((Date.now() - t0) / played).toFixed(1));
// 4. every question an opponent can ask is real SQL that returns the same count as its direct calculation
require('sql.js')().then(SQL => { let n = 0;
  for (let i = 0; i < 400; i++) { const h = P.deal(2, [100, 100], i & 1); h.out = [false, false]; h.board = h.full.slice(0, [0, 3, 4, 5][i % 4]); h.street = i % 4;
    const db = new SQL.Database(); db.exec(`CREATE TABLE your_hand (rank INTEGER, suit TEXT);INSERT INTO your_hand VALUES ${h.hole[0].map(c => `(${P.R(c)},'${P.SUITS[P.SU(c)]}')`).join(',')};` + P.tables(h, 1, 'open', ['a', 'b'], [], 1).script);
    for (const q of P.QS) { if ((q.pre && h.street) || (q.post && !h.street)) continue; const m = q.mk(h, 1); if (!m) continue; const got = db.exec(P.qText(m))[0].values[0][0]; assert.strictEqual(got, m.f(h.hole[0][0], h.hole[0][1]), P.qText(m)); assert(P.isCount(P.qText(m))); n++; }
    db.close(); }
  assert(!P.isCount('SELECT MAX(rank) FROM hands') && !P.isCount('SELECT COUNT(*) * 100 FROM hands') && !P.isCount('SELECT rank FROM hands') && P.isCount('select count(distinct suit) from hands'));
  // every room's table shape answers a correct read with the true count
  for (let i = 0; i < 60; i++) { const h = P.deal(2, [100, 100, 100, 100, 100, 100], i % 6), nm = ['You', 'Ann', 'Bo', 'Cy', "D'Arc", 'Eve']; if (i % 2) { P.act(h, 'fold'); } const truth = j => h.hole[j].filter(c => P.R(c) >= 10).length, who = h.out[3] ? 4 : 3;
    const Q = { open: `select count(*) from hands where player = 'NAME' and rank >= 10`, keyed: `select count(*) from hands h join cards c on c.card_id = h.card_id join seats s on s.seat = h.seat where s.player = 'NAME' and c.rank >= 10`, coded: `select count(*) from hands h join ranks r on r.code = substr(h.card, 1, 1) where h.player = 'NAME' and r.rank >= 10`, logged: `select count(*) from deal_log l join cards c on c.card_id = l.card_id join seats s on s.seat = l.seat where l.hand_no = (select max(hand_no) from deal_log) and s.player = 'NAME' and c.rank >= 10` };
    for (const g in Q) { const t = P.tables(h, 0, g, nm, [[[1, 5], [1, 9], [2, 30], [2, 44]]], 77), db = new SQL.Database(); db.exec(t.script); assert.strictEqual(db.exec(Q[g].replace('NAME', nm[who].replace("'", "''")))[0].values[0][0], truth(who), g); db.close(); } }
  console.log('opponent questions ok:', n, 'checked against SQL'); });

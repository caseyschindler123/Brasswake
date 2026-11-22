/* ===== POKER: no-limit hold'em for two to six players. Rules, hand evaluator, and opponents that play by range and equity ===== */
const Poker = (() => {
  let rnd = Math.random;
  const R = c => (c >> 2) + 2, SU = c => c & 3, SUITS = ['spades', 'hearts', 'diamonds', 'clubs'], RCH = '..23456789TJQKA', SCH = 'shdc', SYM = '♠♥♦♣';
  const CAT = ['high card', 'a pair', 'two pair', 'three of a kind', 'a straight', 'a flush', 'a full house', 'four of a kind', 'a straight flush'];
  const P5 = [50625, 3375, 225, 15, 1], BASE = 759375;
  const pack = (cat, k) => { let v = cat * BASE; for (let i = 0; i < k.length; i++) v += k[i] * P5[i]; return v; };
  function straight(m) { if (m & 16384) m |= 2; for (let h = 14; h >= 5; h--) if (((m >> (h - 4)) & 31) === 31) return h; return 0; }
  // best five-card hand from five to seven cards, as one number: higher wins, equal ties
  function ev(cs) {
    const rc = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sc = [0, 0, 0, 0], sm = [0, 0, 0, 0]; let rm = 0;
    for (let i = 0; i < cs.length; i++) { const r = (cs[i] >> 2) + 2, s = cs[i] & 3; rc[r]++; sc[s]++; sm[s] |= 1 << r; rm |= 1 << r; }
    let fs = -1; for (let s = 0; s < 4; s++) if (sc[s] >= 5) fs = s;
    if (fs >= 0) { const h = straight(sm[fs]); if (h) return pack(8, [h]); }
    let q = 0; const t = [], p = [], o = [];
    for (let r = 14; r >= 2; r--) { const n = rc[r]; if (n === 4) q = r; else if (n === 3) t.push(r); else if (n === 2) p.push(r); else if (n === 1) o.push(r); }
    if (q) { let k = 0; for (let r = 14; r >= 2; r--) if (rc[r] && r !== q) { k = r; break; } return pack(7, [q, k]); }
    if (t.length && (t.length > 1 || p.length)) return pack(6, [t[0], Math.max(t[1] || 0, p[0] || 0)]);
    if (fs >= 0) { const k = []; for (let r = 14; r >= 2 && k.length < 5; r--) if ((sm[fs] >> r) & 1) k.push(r); return pack(5, k); }
    const h = straight(rm); if (h) return pack(4, [h]);
    if (t.length) return pack(3, [t[0], o[0] || 0, o[1] || 0]);
    if (p.length >= 2) return pack(2, [p[0], p[1], Math.max(p[2] || 0, o[0] || 0)]);
    if (p.length) return pack(1, [p[0], o[0] || 0, o[1] || 0, o[2] || 0]);
    return pack(0, o.slice(0, 5));
  }
  const catOf = s => Math.floor(s / BASE), name = c => RCH[R(c)] + SCH[SU(c)];

  // the 1326 two-card hands, and each starting hand's place among all of them (0 = best), measured by its chance against a random hand
  const CA = [], CB = []; for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) { CA.push(a); CB.push(b); }
  const cls = (a, b) => { const x = (a >> 2), y = (b >> 2), hi = Math.max(x, y), lo = Math.min(x, y); return x === y ? hi * 13 + hi : (a & 3) === (b & 3) ? hi * 13 + lo : lo * 13 + hi; };
  const PCT = /*PCT*/[480,991,982,955,973,964,906,846,765,686,584,465,318,943,351,946,925,934,916,894,822,729,641,541,437,276,903,864,238,873,882,855,834,798,701,617,517,395,252,870,843,783,137,813,789,774,738,677,593,487,377,211,891,831,762,725,75,750,713,665,626,566,456,333,220,867,810,759,698,659,35,650,605,554,508,410,309,175,807,786,722,674,614,551,27,532,496,428,356,264,142,747,710,695,638,581,529,449,23,419,368,285,199,116,662,635,602,575,526,452,392,342,18,297,243,160,86,578,563,505,484,477,404,348,306,232,14,187,125,66,474,446,407,389,365,330,273,208,169,134,9,101,57,386,345,327,294,261,229,196,157,110,95,80,5,45,235,184,172,151,154,113,98,83,54,42,39,32,0]/*PCT*/.map(v => v / 1000);

  /* ---------- the rules, for two to six players ---------- */
  const zeros = n => new Array(n).fill(0);
  const put = (h, i, n) => { n = Math.max(0, Math.min(n, h.stack[i])); h.stack[i] -= n; h.in[i] += n; h.tot[i] += n; h.pot += n; return n; };
  function deal(bb, stacks, btn) {
    const n = stacks.length, d = []; for (let i = 0; i < 52; i++) d.push(i); for (let i = 51; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), x = d[i]; d[i] = d[j]; d[j] = x; }
    const h = { n, bb, sb: bb >> 1, btn, hole: stacks.map((_, i) => [d[i], d[i + n]]), full: d.slice(2 * n, 2 * n + 5), board: [], street: 0, stack: stacks.slice(), start: stacks.slice(), in: zeros(n), tot: zeros(n), out: stacks.map(s => s <= 0), acted: stacks.map(() => false), open: stacks.map(() => true), pot: 0, cur: 0, last: bb, to: 0, over: false, raises: 0, limps: 0, pfAgg: -1, agg: -1, shown: false, won: zeros(n) };
    const nx = i => { do i = (i + 1) % n; while (h.out[i]); return i; };
    h.sbp = n === 2 ? btn : nx(btn); h.bbp = nx(h.sbp); put(h, h.sbp, h.sb); put(h, h.bbp, bb); h.cur = bb; h.to = (h.bbp + 1) % n; return progress(h);   // two-handed, the button posts the small blind and acts first before the flop
  }
  // seats counted from the button: 0 button, 1 small blind, 2 big blind, then the early seats round to the cutoff
  const posOf = (h, i) => (i - h.btn + h.n) % h.n;
  function legal(h) {
    const i = h.to, call = Math.max(0, Math.min(h.cur - h.in[i], h.stack[i])), maxTo = h.in[i] + h.stack[i], minTo = Math.min(maxTo, h.cur + Math.max(h.last, h.bb));   // a raise must be at least as big as the last bet or raise
    let other = false; for (let j = 0; j < h.n; j++) if (j !== i && !h.out[j] && h.stack[j] > 0) other = true;
    return { call, minTo, maxTo, canRaise: h.open[i] && other && h.stack[i] > call && maxTo > h.cur, check: call === 0 };
  }
  function payout(h) {
    const live = []; for (let i = 0; i < h.n; i++) if (!h.out[i]) live.push(i);
    if (live.length === 1) { h.won[live[0]] = h.pot; }
    else {   // side pots: each level of money in is contested only by the players who put that much in
      h.board = h.full.slice(); h.street = 3; h.shown = true; h.score = h.hole.map((c, i) => h.out[i] ? -1 : ev(c.concat(h.board)));
      const levels = Array.from(new Set(live.map(i => h.tot[i]))).sort((a, b) => a - b); let prev = 0, paid = 0;
      for (const lv of levels) { let amt = 0; for (let i = 0; i < h.n; i++) amt += Math.max(0, Math.min(h.tot[i], lv) - prev); const el = live.filter(i => h.tot[i] >= lv), best = Math.max.apply(null, el.map(i => h.score[i])), ws = el.filter(i => h.score[i] === best), share = Math.floor(amt / ws.length);
        ws.forEach(i => { h.won[i] += share; }); let odd = amt - share * ws.length; for (let k = 1; odd > 0 && k <= h.n; k++) { const i = (h.btn + k) % h.n; if (ws.indexOf(i) >= 0) { h.won[i]++; odd--; } } paid += amt; prev = lv; }
      if (h.pot > paid) { const best = Math.max.apply(null, live.map(i => h.score[i])); h.won[live.find(i => h.score[i] === best)] += h.pot - paid; }
    }
    for (let i = 0; i < h.n; i++) h.stack[i] += h.won[i]; h.over = true; return h;
  }
  function progress(h) {
    for (;;) {
      const live = [], can = []; for (let i = 0; i < h.n; i++) if (!h.out[i]) { live.push(i); if (h.stack[i] > 0) can.push(i); }
      if (live.length === 1) return payout(h);
      let need = can.filter(i => !h.acted[i] || h.in[i] < h.cur); if (can.length === 1 && h.in[can[0]] >= h.cur) need = [];   // nobody left to bet against
      if (need.length) { for (let k = 0; k < h.n; k++) { const i = (h.to + k) % h.n; if (need.indexOf(i) >= 0) { h.to = i; return h; } } }
      if (h.street === 3 || can.length <= 1) return payout(h);
      h.street++; h.board = h.full.slice(0, [0, 3, 4, 5][h.street]); h.in = zeros(h.n); h.cur = 0; h.last = h.bb; h.acted = h.acted.map(() => false); h.open = h.open.map(() => true); h.raises = 0; h.to = (h.btn + 1) % h.n;   // after the flop the first live player left of the button acts first
    }
  }
  function act(h, type, amt) {
    if (h.over) return h; const i = h.to, L = legal(h);
    if (type === 'fold' && L.check) type = 'check'; if (type === 'raise' && !L.canRaise) type = 'call';
    if (type === 'fold') h.out[i] = true;
    else if (type === 'raise') { const to = Math.max(L.minTo, Math.min(L.maxTo, Math.round(amt))), inc = to - h.cur; put(h, i, to - h.in[i]);
      if (inc >= h.last) { h.last = inc; h.open = h.open.map(() => true); }   // an all-in for less than a full raise does not reopen the betting
      h.cur = to; h.raises++; h.agg = i; if (h.street === 0) h.pfAgg = i; h.acted = h.acted.map(() => false); h.acted[i] = true; h.open[i] = false; }
    else { if (h.street === 0 && h.raises === 0 && L.call > 0) h.limps++; put(h, i, L.call); h.acted[i] = true; h.open[i] = false; }
    h.to = (i + 1) % h.n; return progress(h);
  }

  /* ---------- what the table knows, and what each opponent has worked out for itself ---------- */
  function draws(a, b, board) {   // rough count of outs to a flush or a straight
    const cs = [a, b].concat(board); let outs = 0, m = 0; const sc = [0, 0, 0, 0]; for (const c of cs) { sc[c & 3]++; m |= 1 << R(c); }
    if (sc[a & 3] === 4 || sc[b & 3] === 4) outs += 9; if (m & 16384) m |= 2; let w4 = 0;
    for (let hi = 14; hi >= 5; hi--) { let n = 0; for (let k = 0; k < 5; k++) n += (m >> (hi - k)) & 1; if (n === 4) w4++; else if (n === 5) return outs; }
    return outs + (w4 >= 2 ? 8 : w4 === 1 ? 4 : 0);
  }
  // one shared estimate of each player's hand from the betting everyone saw: bets lean strong with some air, checks lean weak, calls lean middling
  function mkTable(n) { return { pub: zeros(n).map(() => new Float32Array(1326).fill(1)) }; }
  function track(T, h, j, type, board, street) {
    const r = T.pub[j], live = [], sc = [];
    for (let i = 0; i < 1326; i++) { if (r[i] > 0 && (board.indexOf(CA[i]) >= 0 || board.indexOf(CB[i]) >= 0)) r[i] = 0; if (r[i] > 0) { live.push(i); sc.push(street === 0 ? 1 - PCT[cls(CA[i], CB[i])] : ev([CA[i], CB[i]].concat(board))); } }
    const n = live.length; if (n < 2) return; const ord = live.map((_, k) => k).sort((x, y) => sc[x] - sc[y]);
    for (let k = 0; k < n; k++) { const i = live[ord[k]]; let p = k / (n - 1); if (street > 0 && street < 3) p = Math.min(1, p + draws(CA[i], CB[i], board) * (street === 1 ? .03 : .018));
      r[i] *= type === 'raise' ? .2 + 1.1 * p + (p < .18 ? .22 : 0) : type === 'call' ? .45 + .7 * p : 1.05 - .4 * p; }
  }
  function equity(hole, board, opps, n) {   // chance of winning the pot against one sampled hand for each opponent, by dealing it out n times
    const used = new Uint8Array(52); for (const c of hole) used[c] = 1; for (const c of board) used[c] = 1;
    const lists = opps.map(o => { const idx = [], cum = []; let t = 0; for (let i = 0; i < 1326; i++) { const w = o.f && !o.f[i] ? 0 : o.w[i]; if (w > 0 && !used[CA[i]] && !used[CB[i]]) { t += w; idx.push(i); cum.push(t); } }
      if (!t) for (let i = 0; i < 1326; i++) if (!used[CA[i]] && !used[CB[i]]) { t += 1; idx.push(i); cum.push(t); } return { idx, cum, t }; });
    let win = 0, cnt = 0; const nb = board.length, need = 5 - nb, mine = hole.concat(board), bd = board.slice(), taken = [], oh = [];
    for (let k = 0; k < n; k++) {
      taken.length = 0; oh.length = 0; let ok = true;
      for (const L of lists) { let a = 0, b = 0, tries = 0; do { const x = rnd() * L.t; let lo = 0, hi = L.cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (L.cum[m] > x) hi = m; else lo = m + 1; } a = CA[L.idx[lo]]; b = CB[L.idx[lo]]; } while ((used[a] || used[b]) && ++tries < 14);
        if (used[a] || used[b]) { ok = false; break; } used[a] = used[b] = 1; taken.push(a, b); oh.push(a, b); }
      if (ok) { mine.length = 2 + nb; bd.length = nb; for (let j = 0; j < need; j++) { let c; do c = Math.floor(rnd() * 52); while (used[c]); used[c] = 1; taken.push(c); mine.push(c); bd.push(c); }
        const s1 = ev(mine); let tie = 1, lose = false; for (let q = 0; q < oh.length; q += 2) { const s2 = ev([oh[q], oh[q + 1]].concat(bd)); if (s2 > s1) { lose = true; break; } if (s2 === s1) tie++; } if (!lose) win += 1 / tie; cnt++; }
      for (const c of taken) used[c] = 0;
    }
    return cnt ? win / cnt : 1 / (opps.length + 1);
  }
  function mkBot(p, n) { return { p, n, f: zeros(n).map(() => new Uint8Array(1326).fill(1)), tilt: 0, asked: {} }; }
  function botStart(bot, h, me) { bot.me = me; bot.asked = {}; bot.f.forEach(f => f.fill(1)); if (bot.tilt > 0) bot.tilt--; }
  function botEnd(bot, h) { if (bot.p.tilt && h.start[bot.me] - h.stack[bot.me] >= 15 * h.bb) bot.tilt = 3; }
  // the questions an opponent can put to another player's hand. Each is real SQL plus the same count worked out directly.
  const QS = [
    { l: 1, mk: () => ({ sql: 'WHERE rank >= 10', f: (a, b) => (R(a) >= 10) + (R(b) >= 10) }) },
    { l: 1, mk: () => ({ sql: 'WHERE rank = 14', f: (a, b) => (R(a) === 14) + (R(b) === 14) }) },
    { l: 1, mk: () => ({ sql: 'WHERE rank >= 12', f: (a, b) => (R(a) >= 12) + (R(b) >= 12) }) },
    { l: 1, mk: () => ({ sql: 'WHERE rank <= 7', f: (a, b) => (R(a) <= 7) + (R(b) <= 7) }) },
    { l: 2, mk: () => ({ sel: 'COUNT(DISTINCT rank)', sql: '', f: (a, b) => R(a) === R(b) ? 1 : 2 }) },
    { l: 2, pre: 1, mk: () => ({ sel: 'COUNT(DISTINCT suit)', sql: '', f: (a, b) => SU(a) === SU(b) ? 1 : 2 }) },
    { l: 2, post: 1, mk: h => { const rs = h.board.map(R); return { sql: 'WHERE rank IN (SELECT rank FROM board)', f: (a, b) => (rs.indexOf(R(a)) >= 0) + (rs.indexOf(R(b)) >= 0) }; } },
    { l: 2, post: 1, mk: h => { const n = [0, 0, 0, 0]; h.board.forEach(c => n[SU(c)]++); const s = n.indexOf(Math.max.apply(null, n)); return n[s] < 2 ? null : { sql: `WHERE suit = '${SUITS[s]}'`, f: (a, b) => (SU(a) === s) + (SU(b) === s) }; } },
    { l: 3, post: 1, mk: h => { const m = Math.max.apply(null, h.board.map(R)); return { sql: 'WHERE rank > (SELECT MAX(rank) FROM board)', f: (a, b) => (R(a) > m) + (R(b) > m) }; } },
    { l: 3, post: 1, mk: h => { const m = Math.max.apply(null, h.board.map(R)); return { sql: 'WHERE rank = (SELECT MAX(rank) FROM board)', f: (a, b) => (R(a) === m) + (R(b) === m) }; } },
    { l: 3, mk: (h, me) => { const m = Math.max(R(h.hole[me][0]), R(h.hole[me][1])); return { sql: 'WHERE rank > (SELECT MAX(rank) FROM my_hand)', f: (a, b) => (R(a) > m) + (R(b) > m) }; } },
    { l: 3, post: 1, mk: h => { const ss = h.board.map(SU); return { from: 'your_hand y JOIN board b ON b.suit = y.suit', sql: '', f: (a, b) => ss.filter(s => s === SU(a)).length + ss.filter(s => s === SU(b)).length }; } },
    { l: 4, post: 1, mk: h => { const rs = h.board.map(R), lo = Math.min.apply(null, rs) - 2, hi = Math.max.apply(null, rs) + 2; return { sql: 'WHERE rank BETWEEN (SELECT MIN(rank) FROM board) - 2 AND (SELECT MAX(rank) FROM board) + 2', f: (a, b) => (R(a) >= lo && R(a) <= hi) + (R(b) >= lo && R(b) <= hi) }; } },
    { l: 4, pre: 1, mk: () => ({ sql: 'WHERE rank >= 13', f: (a, b) => (R(a) >= 13) + (R(b) >= 13) }) },
    { l: 4, post: 1, mk: h => { const m2 = h.board.map(R).sort((x, y) => y - x)[1]; return { sql: 'WHERE rank >= (SELECT rank FROM board ORDER BY rank DESC LIMIT 1 OFFSET 1)', f: (a, b) => (R(a) >= m2) + (R(b) >= m2) }; } },
  ];
  const qText = q => `SELECT ${q.sel || 'COUNT(*)'} FROM ${q.from || 'your_hand'}${q.sql ? ' ' + q.sql : ''}`;
  // one question a street, put to one player: whoever bet last, else anyone still in. Weak players ask blunt questions and sometimes fumble the query; strong ones pick the question that splits the most.
  function ask(bot, h, T) {
    const lvl = bot.p.sql, me = bot.me, pre = h.street === 0; if (h.out[me]) return null; const cand = []; for (let j = 0; j < h.n; j++) if (j !== me && !h.out[j]) cand.push(j); if (!cand.length) return null;
    const t = h.agg >= 0 && h.agg !== me && !h.out[h.agg] && rnd() < .7 ? h.agg : cand[Math.floor(rnd() * cand.length)], w = T.pub[t], f = bot.f[t], mine = h.hole[me], dead = mine.concat(h.board);
    const ent = g => { const d = {}; let s = 0; for (let i = 0; i < 1326; i++) if (f[i] && w[i] > 0 && dead.indexOf(CA[i]) < 0 && dead.indexOf(CB[i]) < 0) { const k = g(CA[i], CB[i]); d[k] = (d[k] || 0) + w[i]; s += w[i]; } let e = 0; for (const k in d) { const p = d[k] / s; e -= p * Math.log2(p); } return e; };
    const pool = []; QS.forEach((q, i) => { if (q.l > lvl || bot.asked[t + '.' + i] || (q.pre && !pre) || (q.post && pre)) return; const m = q.mk(h, me); if (m) pool.push({ i, m, e: lvl >= 3 ? ent(m.f) : 0 }); });
    if (!pool.length) return null; let c;
    if (lvl >= 4) c = pool.reduce((x, y) => y.e > x.e ? y : x); else if (lvl === 3) { const a = pool[Math.floor(rnd() * pool.length)], b = pool[Math.floor(rnd() * pool.length)]; c = a.e > b.e ? a : b; } else c = pool[Math.floor(rnd() * pool.length)];
    bot.asked[t + '.' + c.i] = 1; const sql = qText(c.m);
    if (rnd() < [0, .22, .1, .04, 0][lvl]) return { target: t, sql: rnd() < .5 ? sql.replace('FROM', 'FORM') : sql.replace('COUNT(', 'COUNT '), err: true };
    const ans = c.m.f(h.hole[t][0], h.hole[t][1]); for (let i = 0; i < 1326; i++) if (f[i] && c.m.f(CA[i], CB[i]) !== ans) f[i] = 0;
    return { target: t, sql, ans };
  }

  /* ---------- how an opponent plays ---------- */
  const pickOf = a => a[Math.floor(rnd() * a.length)], clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const RFI = [.44, .38, .5, .16, .2, .27];   // share of hands raised first in from each seat: button, small blind, (big blind), early, middle, cutoff
  function decide(bot, h, T) {
    const p = bot.p, w = h.to, L = legal(h), hole = h.hole[w], pot = h.pot, call = L.call, bb = h.bb, hot = bot.tilt > 0;
    const bluffK = p.bluff * (hot ? 1.7 : 1), station = p.station + (hot ? .07 : 0), agg = p.agg * (hot ? 1.25 : 1), loose = p.open / .82 + (hot ? .15 : 0);
    const raiseTo = x => { let to = Math.max(L.minTo, Math.min(L.maxTo, Math.ceil(x))); if (to > .62 * L.maxTo) to = L.maxTo; return L.canRaise ? { type: 'raise', amt: to } : { type: call ? 'call' : 'check' }; };
    const CALL = { type: call ? 'call' : 'check' }, FOLD = { type: call ? 'fold' : 'check' }; let opp = 0; for (let j = 0; j < h.n; j++) if (j !== w && !h.out[j]) opp++;
    if (h.street === 0) {
      const pc = PCT[cls(hole[0], hole[1])] + (rnd() - .5) * 2 * p.noise, lvl = h.raises, size = h.cur / bb, pos = h.n === 2 ? (w === h.btn ? 0 : 2) : posOf(h, w), blind = pos === 2 || (pos === 1 && h.n > 2);
      const mine = clamp(RFI[Math.min(pos, 5)] * loose, .05, .95);
      if (lvl === 0) {   // nobody has raised
        if (h.limps === 0 && pos !== 2) { if (pc >= mine) return FOLD; return rnd() < p.limp * (pc < .1 ? .25 : 1) ? CALL : raiseTo(bb * (2.2 + rnd() * .6)); }   // first in: raise, never just the minimum
        if (pc < mine * .55 * agg) return raiseTo(bb * (3 + h.limps + rnd()));   // punish the limpers with a real raise
        return pos === 2 || pc < mine * 1.2 + p.limp * .3 + station ? CALL : FOLD;
      }
      const src = h.n === 2 ? .8 : RFI[Math.min(posOf(h, h.agg), 5)], price = clamp(2.5 / size, .45, 1.25), lean = (p.def / .58) * price;   // a raise from a late seat is weaker, so defend wider against it
      if (lvl === 1) {   // facing one raise: reraise the best hands and a few bluffs, call a middle band, fold the rest
        const v3 = .03 + .07 * src, callTo = clamp((pos === 2 ? .12 + .85 * src : blind ? .06 + .2 * src : .06 + .27 * src) * lean + station * 2 - p.nit * 2 + .02 * (opp - 1), .04, .92), b3 = p.tb * .4 * src / .44;
        if (pc < v3 || (pc > callTo - b3 && pc < callTo)) return raiseTo(h.cur * (pos === 0 || pos >= 3 ? 3 : 3.6) + rnd() * bb);
        return pc < callTo ? CALL : FOLD;
      }
      if (lvl === 2) { if (pc < .028 || (pc > .2 && pc < .2 + .012 * bluffK)) return raiseTo(h.cur * 2.3); return pc < Math.min(.3, (.075 + (h.n === 2 ? .22 : 0) + station - p.nit) * 9 / Math.max(7, size)) ? CALL : FOLD; }
      return pc < .022 ? raiseTo(L.maxTo) : pc < .045 + station * .5 ? CALL : FOLD;
    }
    const st = h.street, board = h.board, opps = []; for (let j = 0; j < h.n; j++) if (j !== w && !h.out[j]) opps.push({ w: T.pub[j], f: bot.f[j] });
    let e = equity(hole, board, opps, p.sims || 200) + (rnd() - .5) * 2 * p.noise;
    const made = ev(hole.concat(board)), dr = st < 3 ? draws(hole[0], hole[1], board) : 0, top = Math.max.apply(null, board.map(R));
    if (p.tp && catOf(made) === 1 && (R(hole[0]) === top || R(hole[1]) === top)) e += p.tp;   // falls in love with top pair
    const led = h.pfAgg === w, val = opp <= 1 ? .62 : opp === 2 ? .5 : .42, med = val - .2, big = opp <= 1 ? .8 : opp === 2 ? .68 : .6, crowd = opp <= 1 ? 1 : opp === 2 ? .45 : .2;   // more players in means a lower share is a strong hand, and far fewer bluffs
    if (call === 0) {
      const frac = e > big + .05 ? pickOf([.66, .75, 1]) : e > val + .08 ? pickOf([.5, .66, .75]) : pickOf([.33, .5]), bet = Math.max(bb, pot * frac);
      if (e >= val) return rnd() < Math.min(.95, (st === 3 ? .9 : .78) * agg) ? raiseTo(bet) : CALL;   // bets for value, and now and then checks a big hand
      if (e >= med) return rnd() < (.2 * agg + (st === 1 && led ? .3 : 0)) * (crowd + 1) / 2 ? raiseTo(Math.max(bb, pot * .33)) : CALL;
      let bf = ([0, .4, .3, .24][st] * bluffK + (dr >= 8 ? .3 : dr >= 4 ? .12 : 0) + (st === 1 && led ? .18 : 0)) * crowd; if (st === 3 && e > med * .6) bf *= .4;   // bluffs with draws and with nothing, not with hands that can win a showdown
      return rnd() < bf ? raiseTo(Math.max(bb, pot * pickOf(st === 3 ? [.66, 1] : [.5, .66]))) : CALL;
    }
    const odds = call / (pot + call), margin = .03 + p.nit * (st === 3 ? 1.7 : 1) - station;   // the price of the call against the chance of winning
    if (e >= big && rnd() < .55 * agg) return raiseTo(h.cur + (pot + call) * pickOf([.6, .8, 1]));
    if (e >= odds + margin) return CALL;
    if (dr && e >= odds - .07 - p.chase) return CALL;
    if (dr >= 8 && rnd() < .1 * bluffK * agg * crowd) return raiseTo(h.cur * 2.8);
    if (e > odds * .6 && rnd() < (.16 - p.nit) * crowd) return CALL;   // calls light some of the time so it cannot be bluffed off every hand
    return FOLD;
  }

  /* ---------- the tables a read is written against. Richer rooms keep the cards in a shape that takes more SQL to open. ---------- */
  const row = c => `(${R(c)},'${SUITS[SU(c)]}')`, flat = (n, cs) => `CREATE TABLE ${n} (rank INTEGER, suit TEXT);` + (cs.length ? `INSERT INTO ${n} VALUES ${cs.map(row).join(',')};` : '');
  const CARDS = () => { const v = []; for (let c = 0; c < 52; c++) v.push(`(${c + 101},${R(c)},'${SUITS[SU(c)]}')`); return `CREATE TABLE cards (card_id INTEGER, rank INTEGER, suit TEXT);INSERT INTO cards VALUES ${v.join(',')};`; };
  function tables(h, me, guard, names, past, handNo) {
    const live = []; for (let j = 0; j < h.n; j++) if (j !== me && !h.out[j]) live.push(j); const q = s => `'${s.replace(/'/g, "''")}'`;
    let s = flat('my_hand', h.hole[me]) + flat('board', h.board), cols = { my_hand: ['rank', 'suit'], board: ['rank', 'suit'] }, note = 'hands holds the cards of every player still in.';
    const seats = () => { cols.seats = ['seat', 'player']; return `CREATE TABLE seats (seat INTEGER, player TEXT);INSERT INTO seats VALUES ${names.map((nm, j) => `(${j + 1},${q(nm)})`).filter((_, j) => j !== me).join(',')};`; };
    if (guard === 'keyed') { s += CARDS() + seats() + `CREATE TABLE hands (seat INTEGER, card_id INTEGER);` + (live.length ? `INSERT INTO hands VALUES ${live.map(j => h.hole[j].map(c => `(${j + 1},${c + 101})`).join(',')).join(',')};` : ''); cols.hands = ['seat', 'card_id']; cols.cards = ['card_id', 'rank', 'suit']; note = 'This room files hands by seat and card number. Join hands to cards for rank and suit, and to seats for the name.'; }
    else if (guard === 'coded') { s += `CREATE TABLE hands (player TEXT, card TEXT);` + (live.length ? `INSERT INTO hands VALUES ${live.map(j => h.hole[j].map(c => `(${q(names[j])},'${name(c)}')`).join(',')).join(',')};` : '') + `CREATE TABLE ranks (code TEXT, rank INTEGER);INSERT INTO ranks VALUES ${RCH.slice(2).split('').map((ch, i) => `('${ch}',${i + 2})`).join(',')};CREATE TABLE suits (code TEXT, suit TEXT);INSERT INTO suits VALUES ${SUITS.map((x, i) => `('${SCH[i]}','${x}')`).join(',')};`; cols.hands = ['player', 'card']; cols.ranks = ['code', 'rank']; cols.suits = ['code', 'suit']; note = "This room writes cards as codes like 'Kd' or 'Ts'. substr(card, 1, 1) is the rank code and substr(card, 2, 1) the suit code."; }
    else if (guard === 'logged') { const v = []; past.forEach((hd, k) => hd.forEach(x => v.push(`(${handNo - past.length + k},${x[0] + 1},${x[1] + 101})`))); live.forEach(j => h.hole[j].forEach(c => v.push(`(${handNo},${j + 1},${c + 101})`))); s += CARDS() + seats() + `CREATE TABLE deal_log (hand_no INTEGER, seat INTEGER, card_id INTEGER);INSERT INTO deal_log VALUES ${v.join(',')};`; cols.deal_log = ['hand_no', 'seat', 'card_id']; cols.cards = ['card_id', 'rank', 'suit']; note = 'This room keeps one log of every hand dealt tonight. This hand is the highest hand_no. Join to cards and seats.'; }
    else { s += `CREATE TABLE hands (player TEXT, rank INTEGER, suit TEXT);` + (live.length ? `INSERT INTO hands VALUES ${live.map(j => h.hole[j].map(c => `(${q(names[j])},${R(c)},'${SUITS[SU(c)]}')`).join(',')).join(',')};` : ''); cols.hands = ['player', 'rank', 'suit']; }
    return { script: s, cols, note };
  }
  // the regulars. Each plays sound hold'em bent by one or two habits; richer rooms seat players who bend less and ask sharper questions.
  const SOLID = { open: .82, limp: 0, def: .58, tb: .15, agg: 1, bluff: 1, station: 0, nit: 0, chase: 0, tp: 0, tilt: 0, noise: .03, sims: 200, sql: 4 };
  const ARCH = [
    { tag: 'calls too much', open: 1.15, limp: .55, def: .8, tb: .04, agg: .6, bluff: .3, station: .12, chase: .08, tp: .05, noise: .08 },
    { tag: 'waits for big hands', open: .55, limp: .1, def: .38, tb: .06, agg: .8, bluff: .35, nit: .07, noise: .06 },
    { tag: 'chases every draw', open: 1.05, limp: .4, def: .7, tb: .05, agg: .7, bluff: .6, station: .05, chase: .14, tp: .06, noise: .06 },
    { tag: 'bets at everything', open: 1.5, def: .72, tb: .24, agg: 1.4, bluff: 1.75, station: .05, noise: .05 },
    { tag: 'steams after a loss', open: .9, limp: .05, def: .6, tb: .12, agg: 1.05, bluff: .9, tp: .12, tilt: 1, noise: .04 },
    { tag: 'folds rivers', open: .78, def: .5, tb: .12, agg: 1.1, bluff: .8, nit: .05, noise: .035 },
    { tag: 'fires too many barrels', open: .9, def: .6, tb: .17, agg: 1.2, bluff: 1.45, noise: .03 },
    { tag: 'gives little away', bluff: .9, noise: .025 },
  ];
  const NAMES = 'Marl Wren Dob Jessa Hask Pell Oda Brin Tolly Sark Mirren Cade Ilka Voss Nan Garrow Lys Bram Edda Fitch Rook Sable Thane Una Wick Yara Zeb Anse Corin Dru Elow Gale Hesper Ivo Jory Kes Lorn Mott Nix Orla'.split(' ');
  const SEATS = [[0, 1, 2, 0, 3], [1, 2, 0, 3, 4], [2, 0, 3, 4, 5], [3, 1, 4, 5, 6], [4, 0, 5, 6, 7], [5, 3, 6, 7, 4], [6, 5, 7, 7, 3], [7, 6, 7, 5, 7]];
  const ROOM = [{ bb: 2, guard: 'open' }, { bb: 4, guard: 'open' }, { bb: 10, guard: 'open' }, { bb: 20, guard: 'keyed' }, { bb: 50, guard: 'coded' }, { bb: 100, guard: 'logged' }, { bb: 200, guard: 'logged' }, { bb: 500, guard: 'logged' }];
  // the five regulars of a town's room: an archetype's habits, toned down as the stakes rise
  function regulars(r) { const k = 1.2 - r * .09; return SEATS[r - 1].map((a, i) => { const A = ARCH[a], o = { name: NAMES[(r - 1) * 5 + i], tag: A.tag }; for (const key in SOLID) o[key] = A[key] == null ? SOLID[key] : SOLID[key] + (A[key] - SOLID[key]) * k; o.sql = clamp(Math.ceil(r / 2) + (a === 7 ? 1 : 0) - (a === 0 ? 1 : 0), 1, 4); o.tilt = A.tilt || 0; return o; }); }
  // a read must be one SELECT COUNT(...) and nothing else: the house tells you how many, never which
  const isCount = sql => /^\s*select\s+count\s*\(\s*(\*|(distinct\s+)?[\w.]+)\s*\)\s*(as\s+\w+\s+)?from\b/i.test(sql);

  return { SOLID, ARCH, ROOM, regulars, ev, catOf, CAT, R, SU, SUITS, SYM, RCH, name, deal, legal, act, posOf, equity, draws, mkTable, track, mkBot, botStart, botEnd, ask, decide, tables, isCount, qText, QS, PCT, cls, CA, CB, seed: f => { rnd = f; } };
})();
if (typeof module !== 'undefined') module.exports = Poker;

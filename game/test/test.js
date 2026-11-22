const init = require('../node_modules/sql.js/dist/sql-asm.js');
globalThis.World = require('../src/world.js');
const Engine = require('../src/engine.js'), Content = require('../src/quests.js');
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const R = { pick: a => a[Math.floor(rnd() * a.length)], int: (a, b) => a + Math.floor(rnd() * (b - a + 1)) };
let bad = 0; const fail = (...a) => { bad++; console.log('FAIL', ...a); };
init().then(SQL => {
  Engine.init(SQL, World);
  const verbose = process.argv.includes('-v');
  function vet(tag, t, quiet) {
    let want; try { want = Engine.target(t); } catch (e) { return fail(tag, 'target error', e.message, '\n   ', t.sql); }
    if (!want.rows.length) { if (!quiet) fail(tag, 'EMPTY target'); return 'empty'; }
    if (want.rows.length > 340) fail(tag, 'huge target', want.rows.length);
    const self = Engine.check(t, t.sql); if (!self.ok) fail(tag, 'self-check failed', self.msg || self.err);
    if (t.kind === 'dml') { const noop = Engine.check(t, 'SELECT 1'); if (noop.ok) fail(tag, 'no-op passes DML check'); }
    else {
      if (t.ret && t.ret !== 'all columns' && t.ret.split(',').length !== want.cols.length) fail(tag, 'ret/cols mismatch', t.ret, '|', want.cols.join(','));
      if (t.order) {
        if (t.order.some(c => c >= want.cols.length)) fail(tag, 'order idx out of range');
        const m = /\sLIMIT\s+(\d+)\s*$/i.exec(t.sql);
        if (m) { const all = Engine.runRead(t.sql.replace(/\sLIMIT\s+\d+\s*$/i, '')), n = +m[1]; if (all.rows.length > n && t.order.every(c => String(all.rows[n - 1][c]) === String(all.rows[n][c]))) fail(tag, 'LIMIT boundary tie', all.rows[n - 1], all.rows[n]); }
        const rev = Engine.judge({ cols: want.cols, rows: want.rows.slice().reverse() }, want, t.order);
        const distinct = new Set(want.rows.map(r => t.order.map(c => r[c]).join('|'))).size;
        if (distinct > 1 && rev.ok) fail(tag, 'reversed order accepted');
      } else if (/\sLIMIT\s+\d+\s*$/i.test(t.sql) && !/LIMIT 1$/i.test(t.sql)) fail(tag, 'LIMIT without order check');
      if (/LIMIT 1$/i.test(t.sql)) { const all = Engine.runRead(t.sql.replace(/\sLIMIT\s+\d+\s*$/i, '')); const k = all.cols.length - 1; if (all.rows.length > 1 && all.rows[0][k] === all.rows[1][k]) fail(tag, 'LIMIT 1 tie', all.rows[0], all.rows[1]); }
    }
    if (verbose && !quiet) console.log(tag.padEnd(8), String(want.rows.length).padStart(4) + 'r', want.cols.length + 'c', '[' + Engine.skillsUsed(Engine.bare(t.sql)).join(',') + ']', JSON.stringify(want.rows[0]).slice(0, 90));
    return 'ok';
  }
  // unpaid invoice for c803
  const unpaid = Engine.runRead("SELECT invoice_id FROM invoices WHERE paid_date IS NULL AND amount_paid = 0 ORDER BY invoice_id LIMIT 3").rows.map(r => r[0]);
  console.log('unpaid invoice candidates', unpaid);
  for (const c of Content.CONTRACTS) {
    const t = Object.assign({}, c, { sql: c.sql.replace(/%INV%/g, unpaid[1]) });
    vet(c.id, t);
    if (c.lesson) { const d = new SQL.Database(); try { d.run(World.SCHEMA); d.run('CREATE TABLE notes (note_id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, body TEXT)'); d.exec(c.lesson.code.replace(/CREATE TABLE notes/, 'CREATE TABLE notes2')); } catch (e) { fail(c.id, 'lesson code', e.message); } d.close(); }
    if (!c.hint) fail(c.id, 'no hint');
  }
  for (const b of Content.BOUNTIES) { let empty = 0; const N = 150; for (let i = 0; i < N; i++) { const t = b.gen(R); if (vet(b.id, t, true) === 'empty') empty++; } console.log(b.id, 'r' + b.r, b.title.padEnd(22), 'empty', empty + '/' + N); if (empty > N * 0.4) fail(b.id, 'too many empties'); }
  for (const boss of Content.BOSSES) boss.phases.forEach((ph, i) => { let empty = 0; for (let k = 0; k < 60; k++) if (vet(boss.id + '.' + (i + 1), ph(R), true) === 'empty') empty++; if (empty) fail(boss.id + '.' + (i + 1), 'boss phase empty', empty + '/60'); });
  for (const r of Content.RUMORS) vet(r.id, r);
  const ids = new Set(); [...Content.CONTRACTS, ...Content.BOUNTIES, ...Content.BOSSES, ...Content.RUMORS, ...Content.UNIQUES].forEach(x => { if (ids.has(x.id)) fail('dup id', x.id); ids.add(x.id); });
  for (const x of [...Content.BOSSES, ...Content.RUMORS]) if (!Content.UNIQUES.find(u => u.id === x.drop)) fail('missing drop', x.id);
  // judge sanity
  const j = (a, b, o) => Engine.judge({ cols: ['a', 'b'], rows: a }, { cols: ['a', 'b'], rows: b }, o).ok;
  if (!j([[1, 'x'], [2, 'y']], [[2, 'y'], [1, 'x']])) fail('judge unordered');
  if (j([[1, 'x'], [2, 'y']], [[2, 'y'], [1, 'x']], [0])) fail('judge ordered');
  if (!j([[1.004, 'x']], [[1, 'x']])) fail('judge tolerance');
  if (j([[1.02, 'x']], [[1, 'x']])) fail('judge tolerance2');
  if (!j([['2026', null]], [[2026, null]])) fail('judge numeric text');
  console.log(Engine.check({ sql: 'SELECT name, city FROM customers' }, 'select city, name from customers').msg);
  console.log(Engine.check({ sql: 'SELECT name, city FROM customers' }, "select name, city from customers where tier = ‘Gold’").msg);
  console.log(Engine.check({ sql: 'SELECT name, city FROM customers' }, 'select nam from customers').err);
  console.log(Engine.check({ sql: 'SELECT name FROM customers' }, 'select c.name from customers c, orders o, order_lines l').err);
  console.log(JSON.stringify(Engine.runSandbox("update items set stock_qty = 1 where item_id = 1; select stock_qty from items where item_id=1")));
  console.log('contracts', Content.CONTRACTS.length, 'bounties', Content.BOUNTIES.length, 'bosses', Content.BOSSES.length, 'rumors', Content.RUMORS.length);
  console.log(bad ? bad + ' FAILURES' : 'ALL GOOD');
  if (bad) process.exitCode = 1;
});

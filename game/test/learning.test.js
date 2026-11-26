const assert = require('node:assert/strict');
const { before, test } = require('node:test');
const init = require('../node_modules/sql.js/dist/sql-asm.js');

const Learning = require('../src/learning.js');
const Engine = require('../src/engine.js');
const World = require('../src/world.js');
const Content = require('../src/quests.js');

let SQL;
before(async () => {
  SQL = await init();
  Engine.init(SQL, World);
});
const all = [1, 2, 3, 4, 5, 6, 7, 8].flatMap(r => Learning.pool(r));
const get = variant => all.find(t => t.variant === variant || t.id === variant);
const find = (r, family) => Learning.pool(r).find(t => t.family === family);
function solve(state, variant, options) {
  return Learning.record(state, get(variant), { ok: true, ...options });
}

test('catalog covers the eight circles, prerequisites and specialist datasets', () => {
  const ids = new Set(Learning.CONCEPTS.map(c => c.id));
  assert.equal(ids.size, Learning.CONCEPTS.length);
  for (const { id, circle, prerequisites, body, code, example, commands } of Learning.CONCEPTS) {
    assert.ok(body && code && example, id);
    assert.ok(Array.isArray(commands));
    assert.ok(Learning.regionConcepts(circle).includes(id));
    assert.ok(Learning.conceptsFor(code).includes(id), `${id} is missing from ${code}`);
    function visit(child, visited) {
      assert.ok(ids.has(child), child);
      assert.ok(!visited.includes(child), [...visited, child].join(' -> '));
      for (const next of Learning.CONCEPTS.find(c => c.id === child).prerequisites) visit(next, [...visited, child]);
    }
    for (const prerequisite of prerequisites) visit(prerequisite, [id]);
  }
  const intro = Learning.pool(0);
  assert.ok(new Set(intro.map(t => t.variant)).size >= 8);
  assert.ok(intro.every(t => t.concepts.join(' ') === 'select'));
  assert.ok(new Set(Learning.pool(1).filter(t => t.r === 1).map(t => t.variant)).size >= 24);
  for (let circle = 1; circle <= 8; circle++) {
    for (const id of Learning.regionConcepts(circle)) {
      const tasks = Learning.pool(circle).filter(t => t.concepts.includes(id));
      assert.ok(new Set(tasks.map(t => t.variant)).size >= 3, id + ' cannot earn three successes');
      assert.ok(new Set(tasks.map(t => t.fingerprint)).size >= 6, id + ' has too few chances after mistakes');
      assert.ok(new Set(tasks.map(t => t.datasets.join('|'))).size >= 2, id + ' has just one dataset');
    }
    const specialists = Learning.specialists(circle);
    assert.equal(specialists.length, 3);
    for (const [i, sp] of specialists.entries()) {
      assert.equal(sp.id, `${circle}.${i}`);
      const tasks = Learning.pool(circle, sp.id);
      assert.ok(new Set(tasks.map(t => t.variant)).size >= 4, sp.title);
      assert.ok(new Set(tasks.flatMap(t => t.datasets)).size >= 2, sp.title);
      for (const id of sp.concepts) assert.ok(tasks.some(t => t.concepts.includes(id)), id);
      assert.ok(tasks.every(t => t.concepts.some(id => sp.concepts.includes(id))), sp.title);
    }
  }
});

test('SQL requirements distinguish expressions, keyword-shaped names and nested scopes', () => {
  assert.deepEqual(Learning.conceptsFor("SELECT 'WHERE COUNT(*)' AS \"JOIN\" FROM [vendors] -- LIMIT 1"), ['select', 'alias']);
  assert.deepEqual(Learning.annotate({ sql: 'SELECT a.* FROM "customers" AS a' }).datasets, ['customers']);
  assert.deepEqual(Learning.conceptsFor('SELECT a.* FROM "customers" AS a'), ['select', 'relation-alias']);
  assert.deepEqual(Learning.conceptsFor('SELECT * FROM vendors WHERE rating BETWEEN 3 AND 5'), ['select', 'filter', 'between']);
  assert.deepEqual(Learning.conceptsFor('SELECT * FROM vendors WHERE rating BETWEEN 3 AND 5 AND lead_time_days > 7'), ['select', 'filter', 'boolean', 'between']);
  assert.deepEqual(Learning.conceptsFor('SELECT CAST(7 AS REAL) / NULLIF(14, 0)'), ['select', 'arithmetic', 'safe-math']);
  assert.deepEqual(Learning.conceptsFor('SELECT name, salary * 12 yearly FROM employees'), ['select', 'arithmetic', 'alias']);
  assert.deepEqual(Learning.conceptsFor('SELECT * FROM (SELECT name FROM vendors) v'), ['select', 'relation-alias', 'sub', 'derived']);
  assert.deepEqual(Learning.conceptsFor('SELECT SUM(v.rating) OVER (ORDER BY v.vendor_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS n FROM vendors v ORDER BY n'),
    ['select', 'sort', 'alias', 'agg', 'relation-alias', 'window', 'frame']);
  assert.deepEqual(Learning.conceptsFor('SELECT (SELECT v.name) FROM vendors v'), ['select', 'relation-alias', 'sub', 'correlated']);
  assert.deepEqual(Learning.conceptsFor('SELECT (SELECT v.name FROM vendors v LIMIT 1) FROM vendors v'), ['select', 'limit', 'relation-alias', 'sub']);
  assert.deepEqual(Learning.conceptsFor('SELECT SUM(v.rating) FROM vendors v WHERE ABS(v.rating) > 3'), ['select', 'filter', 'agg', 'relation-alias']);
  const derived = Learning.annotate({ sql: 'WITH r AS (SELECT name FROM customers) SELECT * FROM r' });
  assert.deepEqual(derived.concepts, ['select', 'cte']);
  assert.deepEqual(derived.datasets, ['customers']);
  const self = Learning.conceptsFor('SELECT e.name FROM employees e JOIN employees m ON e.manager_id = m.employee_id');
  assert.ok(self.includes('self') && !self.includes('correlated'));
  const a = Learning.annotate({ sql: ' select  name from items -- note', ask: 'One wording' });
  const b = Learning.annotate({ sql: 'SELECT name FROM items;', ask: 'Another wording' });
  const c = Learning.annotate({ sql: 'SELECT name FROM items LIMIT 3;' });
  const d = Learning.annotate({ sql: 'SELECT name FROM items LIMIT 4;' });
  assert.equal(a.fingerprint, b.fingerprint);
  assert.notEqual(c.fingerprint, d.fingerprint);
  assert.equal(c.variant, d.variant);
});

test('all authored targets execute on the actual ledger and writes stay isolated', () => {
  const validated = new Set();
  const before = Engine.runRead('SELECT * FROM vendors');
  for (const task of all) {
    assert.ok(!validated.has(task.fingerprint), `${task.id} repeats an exact question`);
    validated.add(task.fingerprint);
    assert.ok(task.ask && task.family && task.variant && task.datasets.length, task.id);
    assert.deepEqual(task.concepts, Learning.conceptsFor(task.sql), task.id);
    assert.ok(task.concepts.every(id => Learning.CONCEPTS.find(c => c.id === id).circle <= task.r), task.id);
    const success = Engine.check(task, task.sql);
    assert.ok(success.ok, `${task.id}: ${success.err || success.msg}`);
    const wanted = success.want;
    assert.ok(wanted.rows.length, task.id);
    if (task.ret && task.ret !== 'all columns') {
      assert.equal(wanted.cols.length, task.ret.split(',').length, task.id);
    }
    if (task.kind === 'dml') {
      assert.ok(!Engine.check(task, 'SELECT 1').ok, `${task.id} accepts no changes`);
      assert.deepEqual(Engine.target(task), wanted, `${task.id} starts with reused state`);
    }
    if (task.order?.length) {
      assert.ok(task.order.every(i => i >= 0 && i < wanted.cols.length), task.id);
      const tuples = got => got.rows.map(row => task.order.map(i => row[i]));
      const ordered = tuples(wanted);
      const reversal = { cols: wanted.cols, rows: wanted.rows.slice().reverse() };
      if (new Set(ordered.map(JSON.stringify)).size > 1) assert.ok(!Engine.judge(reversal, wanted, task.order).ok, task.id);
      const limit = task.kind === 'read' && task.sql.match(/\sLIMIT\s+(\d+)\s*$/i);
      if (limit) {
        const count = Number(limit[1]), unlimited = Engine.runRead(task.sql.slice(0, limit.index));
        assert.equal(wanted.rows.length, count, task.id);
        if (unlimited.rows.length > count) {
          const withoutLimit = tuples(unlimited);
          assert.notDeepEqual(withoutLimit[count - 1], withoutLimit[count], `${task.id} has a tie at the cutoff`);
        }
      }
    }
  }
  assert.deepEqual(Engine.runRead('SELECT * FROM vendors'), before);
  assert.ok(Engine.runRead('SELECT * FROM fast_vendors').err);
});

test('worked examples run independently and retain meaningful SQLite edge cases', () => {
  const db = World.build(SQL);
  try {
    for (const c of Learning.CONCEPTS) {
      db.run('SAVEPOINT learning_example');
      // The transaction lesson includes its own BEGIN and ROLLBACK.
      if (c.id === 'transaction') db.run('RELEASE learning_example');
      assert.doesNotThrow(() => db.exec(c.code), c.id);
      if (c.id !== 'transaction') db.run('ROLLBACK TO learning_example; RELEASE learning_example');
    }
  } finally {
    db.close();
  }
  const rates = Engine.target(get('rank-vendor-pair')).rows;
  assert.ok(rates.some(([, , rank, dense]) => rank > dense));
  const firstByRegion = Engine.target(get('lag-reset')).rows.filter(r => r[2] === null);
  assert.equal(firstByRegion.length, 3);
  const quotient = Engine.target(get('safe-quotient')).rows;
  assert.ok(quotient.some(([, v]) => v === null));
  assert.ok(quotient.some(([, v]) => v !== null && !Number.isInteger(v)));
  for (const task of Learning.pool(1).filter(t => t.family === 'distinct')) {
    const dedupe = task.sql.replace(/\sLIMIT\s+\d+$/i, '');
    assert.ok(Engine.runRead(dedupe).rows.length < Engine.runRead(dedupe.replace('DISTINCT ', '')).rows.length, task.id);
  }
});

test('equivalent correct queries pass and explicit required forms still matter', () => {
  assert.ok(Engine.check(get('unique-pair'), 'SELECT tier, city FROM customers GROUP BY tier, city').ok);
  assert.ok(Engine.check(get('unique-top-values'), 'SELECT rating FROM vendors GROUP BY rating ORDER BY 1 DESC LIMIT 3').ok);
  assert.ok(Engine.check(get('c209'), "SELECT name, tier, region FROM customers WHERE region = 'North' AND tier IN ('Gold','Silver')").ok);
  assert.ok(Engine.check(get('c408'), 'SELECT name, joined_date FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders)').ok);
  assert.ok(Engine.check(get('delete-vendor'), 'DELETE FROM vendors WHERE vendor_id IN (8)').ok);
  const view = get('schema-vendor-view');
  assert.ok(!Engine.check(view, view.sql.replace('CREATE VIEW', 'CREATE TABLE')).ok);
  assert.ok(Engine.check(view, view.sql.replace('lead_time_days <= 14', '14 >= lead_time_days')).ok);
  const unique = get('schema-two-rules');
  const compound = Engine.check(unique, unique.sql.replace('UNIQUE, note TEXT', ', note TEXT, UNIQUE (code, note)'));
  assert.ok(!compound.ok && !compound.err);
  const order = get('schema-priority-index');
  assert.ok(!Engine.check(order, order.sql.replace('DESC', 'ASC')).ok);
  assert.equal(Engine.check(get('union-remove-dups'), 'SELECT region FROM customers WHERE 0').ok, false);
  const union = get('union-remove-dups');
  const unionValues = Engine.target(union).rows.map(([v]) => `('${v}')`).join(', ');
  const sameRows = `WITH parts(name) AS (VALUES ${unionValues}) SELECT name FROM parts ORDER BY name`;
  assert.equal(Engine.check(union, sameRows).why, 'must');
});

test('deterministic scheduling covers every family across 32 seeds and relaxes the oldest exclusion', () => {
  for (let circle = 0; circle <= 8; circle++) {
    const tasks = Learning.pool(circle);
    const families = new Set(tasks.map(t => t.family));
    for (const family of families) {
      const state = Learning.fresh(), visited = new Set();
      const eligible = tasks.filter(t => t.family === family);
      for (let seed = 1; seed <= 32; seed++) {
        const options = { circle, family, seed };
        const task = Learning.next(state, options);
        assert.equal(task.fingerprint, Learning.next(state, options).fingerprint);
        assert.equal(task.family, family);
        assert.ok(Engine.target(task).rows.length, task.id);
        const previous = state.recent.at(-1);
        if (eligible.length > 1) assert.notEqual(task.fingerprint, previous?.key, `${circle} ${family}`);
        visited.add(task.fingerprint);
        Learning.record(state, task, { ok: false, assisted: true });
      }
      assert.equal(visited.size, eligible.length, `${circle} ${family} should see every authored variant`);
      assert.equal(state.recent.length, 12);
    }
  }
  for (const bounty of Content.BOUNTIES) {
    const rq = { pick: choices => choices[0], int: a => a };
    const base = Learning.annotate({ tpl: bounty.id, r: bounty.r, ...bounty.gen(rq) });
    const next = Learning.next(Learning.fresh(), { circle: bounty.r, family: base.family, seed: 4 });
    assert.equal(next.family, base.family, bounty.id);
    assert.equal(next.kind, base.kind, bounty.id);
  }
  const state = Learning.fresh();
  assert.equal(Learning.next(state, { circle: 1, introducedOnly: true }), null);
  Learning.introduce(state, ['select', 'sort']);
  assert.equal(Learning.next(state, { circle: 1, family: 'limit', introducedOnly: true }), null);
  const guided = Learning.next(state, { circle: 1, concept: 'sort', introducedOnly: true, seed: 791 });
  assert.ok(guided.concepts.includes('sort') && !guided.concepts.includes('limit'));
  assert.equal(Learning.next(state, { circle: 8, family: 'nonexistent' }), null);
});

test('readiness requires unassisted first submissions across datasets and structures', () => {
  const state = Learning.fresh();
  assert.equal(state.rev, 0);
  assert.deepEqual(Learning.missing(state, ['sort', 'sort', 'unknown', 'select']), ['sort', 'select']);
  assert.deepEqual(Learning.introduce(state, ['sort', 'select']), ['sort', 'select']);
  assert.equal(state.rev, 1);
  assert.deepEqual(Learning.introduce(state, ['sort']), []);
  assert.equal(state.rev, 1);
  assert.deepEqual(Learning.missing(state, ['sort', 'limit']), ['limit']);
  assert.equal(Learning.ready(state, 'sort'), false);
  solve(state, 'sort-text-only');
  solve(state, 'sort-text-only');
  assert.equal(state.evidence.sort.attempts.length, 1);
  solve(state, 'sort-text-reverse', { ok: false });
  solve(state, 'sort-text-reverse', { first: false });
  solve(state, 'sort-number-up', { assisted: true });
  solve(state, 'sort-number-up');
  assert.equal(state.evidence.sort.attempts.length, 2);
  solve(state, 'sort-number-down');
  assert.equal(Learning.ready(state, 'sort'), false);
  assert.ok(solve(state, 'sort-date').includes('sort'));
  assert.equal(Learning.ready(state, 'sort'), true);
  assert.ok(!solve(state, 'sort-mixed-keys', { ok: false }).includes('sort'));
  assert.equal(Learning.ready(state, 'sort'), true);

  const repeats = Learning.fresh();
  const task = find(2, 'between');
  for (const price of [30, 40, 50]) {
    Learning.record(repeats, { ...task, sql: task.sql.replace(60, price) }, { ok: true });
  }
  assert.equal(repeats.evidence.between.attempts.length, 3);
  assert.equal(Learning.ready(repeats, 'between'), false);
  solve(repeats, 'outside-range');
  assert.equal(Learning.ready(repeats, 'between'), true);

  const assisted = Learning.fresh();
  solve(assisted, 'unique-pair', { sql: 'SELECT tier, city FROM customers GROUP BY tier, city' });
  assert.equal(assisted.evidence.distinct, undefined);
  assert.equal(assisted.evidence.select.attempts.length, 1);
});

test('normalization keeps bounded evidence and discards the draft membership filter', () => {
  assert.deepEqual(Learning.normalize(undefined), Learning.fresh());
  assert.deepEqual(Learning.normalize({ v: 5, ready: { select: true } }), Learning.fresh());
  const state = Learning.fresh(), first = get('sort-text-only');
  Learning.record(state, first, { ok: false });
  for (let i = 0; i < 56; i++) {
    Learning.record(state, { id: 'bounded', sql: `SELECT name FROM vendors ORDER BY name LIMIT ${i + 1}` }, { ok: false });
  }
  assert.equal(state.recent.length, 12);
  assert.equal(state.evidence.sort.attempts.length, 4);
  const saved = Learning.normalize(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(saved, state);
  saved.evidence.sort.seen = Array(256).fill(0xffffffff);
  const migrated = Learning.normalize(saved);
  assert.deepEqual(migrated, state);
  Learning.record(migrated, first, { ok: true });
  assert.deepEqual(migrated.evidence.sort.attempts.at(-1), {
    key: first.fingerprint, variant: first.variant, data: 'vendors', ok: true
  });
  const dirty = Learning.normalize({
    ...state, rev: Infinity, introduced: { filter: true, delete: 1, unknown: true },
    ready: { filter: true, none: true }, evidence: { sort: { seen: ['no way'], attempts: [{ ok: 'yes' }] }, unknown: {} },
    recent: [...state.recent, { key: 'invalid', sql: 'SQL', family: 'hi' }]
  });
  assert.equal(dirty.rev, 0);
  assert.deepEqual(dirty.introduced, { filter: true });
  assert.deepEqual(dirty.ready, { filter: true });
  assert.deepEqual(dirty.evidence, {});
  assert.deepEqual(Learning.normalize(dirty), dirty);
});

test('a full pass of failed or assisted questions leaves later readiness possible', () => {
  const circle = 2, concept = 'in';
  const candidates = Learning.pool(circle).filter(task => task.concepts.includes(concept));
  for (const mode of ['failed', 'shown', 'mixed']) {
    const state = Learning.fresh();
    for (let seed = 1; seed <= candidates.length; seed++) {
      const task = Learning.next(state, { circle, concept, seed });
      const assisted = mode === 'shown' || mode === 'mixed' && seed % 2 === 0;
      Learning.record(state, task, { ok: assisted, assisted });
    }
    assert.equal(new Set(state.recent.map(entry => entry.key)).size, candidates.length, mode);
    assert.equal(Learning.ready(state, concept), false, mode);
    for (let seed = 50; seed < 50 + 2 * candidates.length && !Learning.ready(state, concept); seed++) {
      const task = Learning.next(state, { circle, concept, seed });
      const result = Engine.grade(task, task.sql);
      assert.ok(result.ok, task.id);
      Learning.record(state, task, { ok: result.ok, sql: task.sql });
    }
    assert.equal(Learning.ready(state, concept), true, mode);
    assert.ok(state.evidence[concept].attempts.length <= 4);
    assert.ok(state.recent.length <= 12);
  }

  const repeat = Learning.fresh();
  const [a, b, other] = candidates;
  for (let round = 0; round < 20; round++) {
    for (const task of [a, other, b]) {
      Learning.record(repeat, task, { ok: true, assisted: task === other, sql: task.sql });
    }
  }
  assert.equal(repeat.evidence[concept].attempts.length, 2);
  assert.equal(Learning.ready(repeat, concept), false);
});

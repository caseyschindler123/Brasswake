const assert = require('node:assert/strict');
const { before, test } = require('node:test');
const init = require('sql.js/dist/sql-wasm-inline.js');
const AdvancedSQL = require('../src/advanced_sql.js');
const Learning = require('../src/learning.js');
const Engine = require('../src/engine.js');
const World = require('../src/world.js');

before(async () => Engine.init(await init(), World));

test('offers distinct deterministic Circle IX and X pools with no fallback beyond them', () => {
  const ids = new Set();
  for (const r of [9, 10]) {
    const tasks = AdvancedSQL.tasks(r);
    assert.equal(tasks.length, 4);
    for (const task of tasks) {
      assert.equal(task.kind, 'read');
      assert.equal(task.r, r);
      assert.ok(!ids.has(task.id));
      ids.add(task.id);
      assert.ok(task.ret && task.ask && task.tip);
      assert.ok(task.tables.every(table => World.ORDER.includes(table)));
      assert.ok(Learning.annotate(task).concepts.length >= 4, task.id);
    }
    assert.equal(new Set(Array.from({ length: 16 }, (_, seed) => AdvancedSQL.next(r, seed).id)).size, tasks.length);
    assert.equal(AdvancedSQL.next(r, 'wound-132'), AdvancedSQL.next(r, 'wound-132'));
  }
  assert.deepEqual(AdvancedSQL.tasks(8), []);
  assert.equal(AdvancedSQL.next(11, 0), null);
});

for (const task of [9, 10].flatMap(AdvancedSQL.tasks)) {
  test(`${task.id} grades reference, incomplete and wrong results against the actual Ledger`, () => {
    const correct = Engine.grade(task, task.sql);
    assert.equal(correct.grade, 'correct', correct.err || correct.msg);
    assert.ok(correct.want.rows.length >= 4, 'the exercise needs a meaningful result set');
    const partial = Engine.grade(task, `SELECT * FROM (${task.sql}) LIMIT ${Math.ceil(correct.want.rows.length * .6)}`);
    assert.equal(partial.grade, 'partial', partial.err || partial.msg);
    assert.ok(partial.quality >= .5 && partial.quality < 1);
    const wrong = Engine.grade(task, 'SELECT NULL');
    assert.equal(wrong.grade, 'wrong', wrong.err || wrong.msg);
    assert.equal(wrong.quality, 0);
  });
}

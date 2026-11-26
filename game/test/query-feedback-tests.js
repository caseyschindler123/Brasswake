const assert = require('node:assert/strict');
const Feedback = require('../src/query_feedback');
const FirstDay = require('../src/first_day');

module.exports = Engine => {
  const task = { sql: 'SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4' };
  const grade = sql => Engine.grade(task, sql);
  assert.equal(grade('SELECT 4 AS n UNION ALL SELECT 3 UNION ALL SELECT 2 UNION ALL SELECT 1').quality, 1);
  assert.equal(grade('SELECT 1 AS n UNION ALL SELECT 2').quality, .5);
  assert.equal(grade(task.sql + ' UNION ALL SELECT 5').quality, .8);
  assert.equal(grade('SELECT 1 AS n UNION ALL SELECT 1 UNION ALL SELECT 1 UNION ALL SELECT 1').quality, 0);
  assert.equal(grade('SELECT 5 AS n UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8').quality, 0);
  assert.ok(grade('SELEC 1').err);
  assert.equal(Engine.grade({ sql: 'SELECT 1 WHERE 2 > 1' }, 'SELECT 1 WHERE 2 < 1').quality, 0);
  assert.equal(Engine.grade({ sql: 'SELECT 1.004' }, 'SELECT 1').quality, 1);
  const ordered = { sql: task.sql + ' ORDER BY n DESC', order: [0] };
  assert.equal(Engine.grade(ordered, task.sql + ' ORDER BY n ASC').quality, .85);
  assert.equal(Engine.grade({ sql: 'SELECT 1, 2' }, 'SELECT 2, 1').quality, .75);
  assert.equal(Engine.grade({ sql: 'WITH q AS (SELECT 1) SELECT * FROM q', must: ['cte'] }, 'SELECT 1').quality, .7);
  const write = { kind: 'dml', setup: 'CREATE TABLE feedback_test (id INTEGER, v INTEGER); INSERT INTO feedback_test VALUES (1,0),(2,0),(3,0),(4,0)', sql: 'UPDATE feedback_test SET v=1 WHERE id IN (1,2)', check: 'SELECT id,v FROM feedback_test ORDER BY id' };
  assert.equal(Engine.grade(write, 'SELECT 1').quality, 0, 'Unchanged rows cannot earn write-task power');
  assert.equal(Engine.grade(write, 'UPDATE feedback_test SET v=1 WHERE id=1').quality, .5);
  assert.equal(Engine.grade(write, 'UPDATE feedback_test SET v=1 WHERE id IN (1,2)').quality, 1);
  const yours = '-- keep my note\n' + task.sql.toLowerCase() + ' ORDER BY n ASC';
  const res = Engine.grade(ordered, yours), model = Feedback.prepare(ordered, yours, res, Engine);
  assert.equal(model.corrected, true);
  assert.ok(model.solution.includes('-- keep my note'));
  assert.ok(Engine.check(ordered, model.solution).ok);
  assert.equal(Feedback.power(res), .85);
  assert.equal(Feedback.power(res, { hint: 2 }), .6);
  assert.equal(Feedback.power(res, { shown: true }), .05);
  const comparison = Feedback.html(model);
  assert.match(comparison, /Corrected query/);
  assert.match(comparison, /<mark>DESC<\/mark>/);
  assert.doesNotMatch(Feedback.html(model, { free: true, open: true }), /query-solution|DESC/);

  const limited = { ...ordered, sql: ordered.sql + ' LIMIT 2' };
  const large = limited.sql.replace('LIMIT 2', 'LIMIT 3');
  const largeRes = Engine.grade(limited, large);
  assert.match(Feedback.explain(limited, large, largeRes), /1 more row.*LIMIT.*ORDER BY/);
  assert.match(Feedback.prepare(limited, large, largeRes, Engine).message, /Use LIMIT 2/);
  const reversed = limited.sql.replace('DESC', 'ASC');
  assert.match(Feedback.explain(limited, reversed, Engine.grade(limited, reversed)), /row count matches.*ORDER BY.*LIMIT/);
  const unique = { sql: "WITH q(name) AS (VALUES ('A'), ('A'), ('B')) SELECT DISTINCT name FROM q" };
  const repeats = unique.sql.replace('DISTINCT ', '');
  const repeatRes = Engine.grade(unique, repeats);
  assert.match(Feedback.prepare(unique, repeats, repeatRes, Engine).message, /1 more row.*DISTINCT/);
  assert.doesNotMatch(repeatRes.msg, /filter|JOIN/i);
  const unrelated = task.sql + ' UNION ALL SELECT 99';
  assert.match(Feedback.explain(task, unrelated, grade(unrelated)), /1 more row/);
  assert.doesNotMatch(Feedback.explain(task, unrelated, grade(unrelated)), /DISTINCT|LIMIT|WHERE|JOIN/);

  const db = Engine.scratch(FirstDay.script);
  try {
    const destination = FirstDay.tasks[1], cols = FirstDay.tasks[2];
    const check = (practice, sql) => FirstDay.grade(db, practice, sql, Engine);
    const typo = 'SELECT destinaton FROM manifest';
    const unknown = check(destination, typo);
    assert.match(unknown.err, /No such column: destinaton.*Tables/);
    assert.doesNotMatch(unknown.err, /single quotes|Atlas/);
    assert.match(check(destination, 'SELECT destination FROM manifst').err, /No such table: manifst.*Tables/);
    for (const quoted of ['"destinaton"', "'destination'"]) {
      const sql = `SELECT ${quoted} FROM manifest`, result = check(destination, sql);
      assert.equal(result.why, 'values');
      assert.equal(result.got.rows[0][0], quoted.slice(1, -1));
      assert.match(Feedback.explain(destination, sql, result), /returned the text.*Tables/);
    }
    assert.ok(check(destination, 'SELECT "destination" FROM manifest').ok);
    const alias = 'SELECT name quantity FROM manifest', aliasResult = check(cols, alias);
    assert.equal(aliasResult.why, 'colcount');
    assert.deepEqual(aliasResult.got.cols, ['quantity']);
    assert.match(Feedback.explain(cols, alias, aliasResult), /SQLite used quantity as a name for name.*Add a comma/);
    assert.match(Feedback.explain(cols, alias, aliasResult), /complete rows.*different column count earns no power/);
  } finally { db.close(); }

  const incomplete = 'SELECT name FROM';
  assert.match(Engine.grade(task, incomplete).err, /Incomplete input.*Check the end/);
  const capped = Engine.runRead('WITH RECURSIVE q(n) AS (VALUES (1) UNION ALL SELECT n + 1 FROM q WHERE n < 5001) SELECT n FROM q');
  assert.match(capped.err, /stopped after returning more than.*rows/);
  assert.doesNotMatch(capped.err, /join/i);
  const misspelled = '/* my private note ' + '.'.repeat(180) + ' */\nSELEC name FROM customers';
  const syntax = Engine.grade(task, misspelled);
  assert.match(syntax.err, /Near "SELEC": syntax error.*Check the spelling/);
  assert.doesNotMatch(syntax.err, /GROUP BY|HAVING/);
  const repair = Feedback.prepare(task, misspelled, syntax, { check() { assert.fail('Repair should never evaluate the reference'); } });
  assert.equal(repair.solution, undefined);
  const compact = Feedback.html(repair, { free: true });
  const expanded = Feedback.html(repair, { free: true, open: true });
  assert.match(compact, /<mark>SELEC<\/mark>/);
  assert.match(compact, /class="query-error".*Near &quot;SELEC&quot;/);
  assert.match(compact, /aria-expanded="false">Full query/);
  assert.doesNotMatch(compact, /my private note/);
  assert.match(expanded, /my private note/);
  assert.match(expanded, /aria-expanded="true">Show less/);
  for (const markup of [compact, expanded, Feedback.html(repair, { open: true })])
    assert.doesNotMatch(markup, /query-solution|Corrected query|One correct solution|SELECT 1 AS n/);

  const missingColumns = { sql: 'SELECT name, city FROM customers' };
  const names = 'SELECT name FROM customers', namesRes = Engine.grade(missingColumns, names);
  assert.equal(namesRes.quality, 0);
  assert.match(Feedback.explain(missingColumns, names, namesRes), /needs 2 columns.*returned 1.*complete rows/);

  const unsafe = '<img src=x onerror=alert(1)>', error = { err: 'Bad SQL <script>' };
  const markup = Feedback.html(Feedback.prepare(task, unsafe, error, Engine), { free: true, open: true });
  assert.ok(!markup.includes('<img'));
  assert.ok(!markup.includes('<script>'));
  assert.ok(markup.includes('One free fix'));
  const fallback = Feedback.prepare(ordered, 'SELECT 9 AS unrelated', Engine.grade(ordered, 'SELECT 9 AS unrelated'), Engine);
  assert.ok(Engine.check(ordered, fallback.solution).ok);
  const shortTask={kind:'read',sql:'SELECT name, city FROM customers ORDER BY name DESC',order:[0]},shortWrong='SELECT name, city FROM customers ORDER BY name ASC';
  const shortHTML=Feedback.html(Feedback.prepare(shortTask,shortWrong,Engine.grade(shortTask,shortWrong),Engine));
  assert.ok(shortHTML.includes('SELECT name, city FROM customers ORDER BY name'));
  assert.ok(!shortHTML.includes('…'),'A comparison that fits the snippet budget must retain its beginning');
  console.log('Query quality, write progress, verified comparisons and private SQL repair: passed');
};

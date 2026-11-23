const { test } = require('node:test');
const assert = require('node:assert/strict');
const FirstDay = require('../src/first_day');
const Companion = require('../src/companion');
const World = require('../src/world');
globalThis.World = World;
const Engine = require('../src/engine');
const init = require('../node_modules/sql.js/dist/sql-asm');

test('manifest practice accepts equivalent queries and cannot mutate the records', async () => {
  Engine.init(await init(), World);
  const db = Engine.scratch(FirstDay.script);
  assert.equal(FirstDay.grade(db, FirstDay.tasks[0], '/* supply names */ select m.name from manifest m;', Engine).ok, true);
  assert.equal(FirstDay.grade(db, FirstDay.tasks[0], 'SELECT quantity FROM manifest', Engine).ok, false);
  assert.equal(FirstDay.grade(db,FirstDay.tasks[0],'WITH supplies AS (SELECT name FROM manifest) SELECT name FROM supplies',Engine).ok,true);
  assert.ok(db.read('DELETE FROM manifest').err);
  assert.ok(db.read('WITH supplies AS (SELECT name FROM manifest) DELETE FROM manifest').err);
  assert.ok(db.read('SELECT name FROM manifest; DELETE FROM manifest').err);
  assert.equal(db.read('SELECT * FROM manifest').rows.length, 3);
  for (const t of FirstDay.tasks) assert.equal(t.practice ? FirstDay.grade(db,t,t.sql,Engine).ok : Engine.grade(t,t.sql).ok,true);
  db.close();
});
test('authored dialogue retains SQL punctuation and full thoughts', () => {
  assert.deepEqual(FirstDay.dialogue('Use 100.0. Read the result.\n\nThen try it.'), ['Use 100.0. Read the result.','Then try it.']);
  assert.deepEqual(FirstDay.dialogue(['First thought.','Second thought.']), ['First thought.','Second thought.']);
});
test('companion takes a walkable detour, stops short, and bounds failed searches', () => {
  const free=(x,y)=>x>=0&&x<10&&y>=0&&y<7&&!(x===3&&y<5);
  const path=Companion.route([1,1],[7,1],free);
  assert.ok(path.some(p=>p[1]>=5));
  let prev=[1,1];for(const p of path){assert.ok(free(...p));assert.equal(Math.abs(p[0]-prev[0])+Math.abs(p[1]-prev[1]),1);prev=p;}
  assert.equal(Math.abs(prev[0]-7)+Math.abs(prev[1]-1),2);
  assert.deepEqual(Companion.route([1,1],[7,1],()=>false),[]);
  assert.deepEqual(Companion.route([1,1],[100,100],()=>true,5),[]);
});

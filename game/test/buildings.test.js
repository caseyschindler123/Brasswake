const { test } = require('node:test');
const assert = require('node:assert/strict');

test('small owned-house facades reuse structural surfaces without relaxing walk-in limits',()=>{
  for(let w=1;w<=6;w++)for(let h=1;h<=4;h++){
    const p=Buildings.facade({id:'owned-shell',w,h});
    assert.equal(p.visualOnly,true);assert.equal(p.doors.length,0);assert.equal(p.roof.length,w*h);
    assert.ok(p.roof.every(Boolean));assert.equal(p.edges.length,2*(w+h));
  }
  assert.throws(()=>Buildings.compile({id:'too-small',w:3,h:2}),/dimensions/);
  assert.throws(()=>Buildings.facade({id:'bad',w:0,h:2}),/Invalid/);
});
const Buildings = require('../src/buildings.js');

const { compile, contains, walkable, VOID, WALL, FLOOR, DOOR, COURT } = Buildings;
const at = (p, x, y) => p.tiles[y * p.w + x];
const cardinal = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const allSides = ['north', 'east', 'south', 'west'];
const blueprint = (extra = {}) => ({ id: 'test', x: 17, y: 41, w: 7, h: 7, ...extra });

function connected(plan, passable, start) {
  const queue = [start], seen = new Set([`${start.x},${start.y}`]);
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i];
    for (const [dx, dy] of cardinal) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (!passable(plan, nx, ny) || seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

function assertEntrances(plan) {
  const count = plan.tiles.filter(tile => tile >= FLOOR).length;
  const doorCells = new Set();
  for (const door of plan.doors) {
    const { x, y, inside, outside, facing } = door;
    doorCells.add(`${x},${y}`);
    assert.equal(at(plan, x, y), DOOR);
    assert.equal(at(plan, inside.x, inside.y), FLOOR);
    assert.equal(contains(plan, outside.x, outside.y), false);
    assert.deepEqual(inside, { x: x - facing.x, y: y - facing.y });
    assert.deepEqual(outside, { x: x + facing.x, y: y + facing.y });
    assert.equal(connected(plan, walkable, inside).size, count);
  }
  assert.equal(doorCells.size, plan.doors.length);
  assert.equal(plan.tiles.filter(t => t === DOOR).length, plan.doors.length);
  assert.equal(plan.tiles.filter(t => t === WALL).length, plan.walls.length);

  // A player approaching diagonally can only enter through an explicit doorway.
  for (let y = 0; y < plan.h; y++) {
    for (let x = 0; x < plan.w; x++) {
      if (!walkable(plan, x, y) || doorCells.has(`${x},${y}`)) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) assert.ok(contains(plan, x + dx, y + dy), `outside touches ${x},${y}`);
      }
    }
  }
}

test('a small rectangle gets a south-centered doorway and consistent local masks', () => {
  const plan = compile(blueprint({ w: 5, h: 5 }));
  assert.deepEqual([plan.id, plan.x, plan.y, plan.w, plan.h, plan.shape], ['test', 17, 41, 5, 5, 'rect']);
  assert.deepEqual(plan.doors, [{
    x: 2, y: 4, side: 'south', offset: 2, inside: { x: 2, y: 3 }, outside: { x: 2, y: 5 }, facing: { x: 0, y: 1 },
  }]);
  assert.deepEqual([...plan.tiles], [1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 2, 2, 2, 1, 1, 2, 2, 2, 1, 1, 1, 3, 1, 1]);
  assert.equal(plan.roof.every(n => n === 1), true);
  assert.equal(contains(plan, 17, 41), false);
  assert.equal(contains(plan, 1.5, 2), false);
  assert.equal(walkable(plan, 2, NaN), false);
  assert.equal(plan.edges.length, 20);
  assert.deepEqual(plan.edges, plan.roofEdges);
  assert.ok(plan.edges.some(e => e.side === 'south' && e.x0 === 3 && e.x1 === 2 && e.y0 === 5 && e.y1 === 5));
  assertEntrances(plan);
});

test('side, explicit-offset, and multiple entrances share the same connected floor', () => {
  const plan = compile(blueprint({ w: 14, h: 12, doors: ['west', { side: 'e', offset: 3 }, 'north', 's'] }));
  assert.deepEqual(plan.doors.map(d => [d.side, d.x, d.y]), [
    ['west', 0, 6], ['east', 13, 3], ['north', 7, 0], ['south', 7, 11],
  ]);
  assertEntrances(plan);
  assertEntrances(compile(blueprint({ doors: ['east'] })));
  assertEntrances(compile(blueprint({ w: 4, h: 4, doors: allSides })));
});

test('an explicitly sealed residence keeps its original shell and floor without door openings', () => {
  const plan = compile(blueprint({ w: 5, h: 4, doors: [] }));
  assert.deepEqual(plan.doors, []);
  assert.equal(plan.tiles.filter(tile => tile === WALL).length, 14);
  assert.equal(plan.tiles.filter(tile => tile === FLOOR).length, 6);
  assert.equal(plan.tiles.filter(tile => tile === DOOR).length, 0);
  assert.equal(plan.roof.every(n => n === 1), true);
});

test('the L footprint leaves its northeast indentation open with a sealed concave corner', () => {
  const plan = compile(blueprint({ shape: 'L', w: 10, h: 9, doors: allSides }));
  for (const [x, y] of [[5, 0], [9, 3], [5, 3]]) {
    assert.equal(at(plan, x, y), VOID);
    assert.equal(contains(plan, x, y), false);
    assert.equal(contains(plan, x, y, true), false);
  }
  assert.equal(at(plan, 4, 4), WALL);
  assert.equal(at(plan, 3, 4), FLOOR);
  assert.equal(at(plan, 5, 5), FLOOR);
  assert.ok(plan.edges.some(e => e.side === 'east' && e.x === 4 && e.y < 4));
  assert.ok(plan.edges.some(e => e.side === 'north' && e.x >= 5 && e.y === 4));
  assertEntrances(plan);
  assertEntrances(compile(blueprint({ shape: 'L', w: 8, h: 8, doors: allSides })));
});

test('a courtyard is part of the floorplan, without a roof over its walkable central yard', () => {
  const plan = compile(blueprint({ shape: 'courtyard', w: 14, h: 12, doors: allSides }));
  assert.equal(at(plan, 7, 6), COURT);
  assert.equal(contains(plan, 7, 6), true);
  assert.equal(walkable(plan, 7, 6), true);
  assert.equal(contains(plan, 7, 6, true), false);
  assert.equal(at(plan, 7, 3), FLOOR);
  assert.equal(contains(plan, 7, 3, true), true);
  assert.equal(plan.edges.length, 52);
  assert.equal(plan.roofEdges.length, 72);
  assert.ok(plan.roofEdges.some(e => e.side === 'south' && e.x === 7 && e.y === 3));
  assert.ok(!plan.edges.some(e => e.side === 'south' && e.x === 7 && e.y === 3));
  assertEntrances(plan);
});

test('an authored partition creates distinct rooms linked by its floor opening', () => {
  const diagram = [
    '.........',
    '....#....',
    '....#....',
    '.........',
    '....#....',
    '....#....',
    '.........',
  ];
  const spec = blueprint({ w: 9, diagram, doors: ['west', 'east'] });
  const plan = compile(spec);
  assert.equal(at(plan, 4, 2), WALL);
  assert.equal(at(plan, 4, 3), FLOOR);
  assert.ok(plan.walls.some(wall => wall.x === 4 && wall.y === 2));
  assert.ok(!plan.edges.some(edge => edge.x === 4 && edge.y === 2));
  assertEntrances(plan);
  assert.deepEqual(compile(spec), plan);
  assert.deepEqual(spec.diagram, diagram);
  assert.throws(() => compile({ ...spec, diagram: diagram.map(row => row.replace(/^\.{9}$/, '....#....')) }), /connected/);
});

test('invalid and unsealable building specs fail before they reach scene stamping', () => {
  assert.throws(() => compile(null), /specification/);
  assert.throws(() => compile(blueprint({ x: Infinity })), /integer origin/);
  assert.throws(() => compile(blueprint({ x: Number.MAX_SAFE_INTEGER })), /safe coordinates/);
  assert.throws(() => compile(blueprint({ id: ' ' })), /needs an id/);
  assert.throws(() => compile(blueprint({ shape: 'triangle' })), /shape/);
  assert.throws(() => compile(blueprint({ w: 1e8 })), /dimensions/);
  assert.throws(() => compile(blueprint({ h: 3 })), /dimensions/);
  assert.throws(() => compile(blueprint({ shape: 'courtyard', w: 11, h: 10 })), /dimensions/);
  assert.throws(() => compile(blueprint({ doors: 'south' })), /entrance list/);
  assert.throws(() => compile(blueprint({ doors: ['up'] })), /entrance side/);
  assert.throws(() => compile(blueprint({ doors: [{ side: 'south', offset: 0 }] })), /straight wall/);
  assert.throws(() => compile(blueprint({ doors: [{ side: 'west', offset: 0.5 }] })), /offset/);
  assert.throws(() => compile(blueprint({ doors: [{ side: 'west', offset: 3 }, { side: 'west', offset: 3 }] })), /straight wall/);
  assert.throws(() => compile(blueprint({ diagram: ['invalid'] })), /height/);
  assert.throws(() => compile(blueprint({ diagram: Array(7).fill('invalid') })), /diagram row/);
  const diagram = Array(7).fill('.......');
  diagram[3] = '... ...';
  assert.throws(() => compile(blueprint({ diagram })), /Enclosed void/);
  diagram[0] = '...o...';
  diagram[3] = '.......';
  assert.throws(() => compile(blueprint({ diagram })), /enclosed/);
});

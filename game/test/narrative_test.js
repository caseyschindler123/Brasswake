const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const init = require('../node_modules/sql.js/dist/sql-asm.js');
const Deep = require('../src/deep.js');
const Dojo = require('../src/dojo.js');
const Content = require('../src/quests.js');
const World = require('../src/world.js');
const Engine = require('../src/engine.js');

const year = date => Number(date.slice(0, 4));
const aliveOn = (person, date) => person && person[3] + 16 <= year(date) && (person[4] === null || person[4] >= year(date));
const plusDays = (date, days) => new Date(Date.parse(date) + 86400000 * days).toISOString().slice(0, 10);
const byId = rows => new Map(rows.map(row => [row[0], row]));

test('erasures identify a living writer and match the correct surviving entry', () => {
  const rows = Deep.data('Archive tester');
  const people = byId(rows.people);
  const voyages = byId(rows.voyages);
  const strangers = byId(rows.strangers);
  const removals = rows.erasures.filter(e => e[1] !== 'strangers');
  assert.equal(removals.length, 3);
  for (const [id, table, target, removed, writer, name, original] of rows.erasures) {
    assert.ok(aliveOn(people.get(writer), removed), `erasure ${id} needs a living writer`);
    assert.ok(original < removed, `erasure ${id} needs a record that already exists`);
    if (table === 'people') {
      assert.equal(people.get(target)[1], name);
      assert.equal(people.get(target)[3], year(original));
      assert.match(people.get(writer)[5], /council/);
    } else if (table === 'voyages') {
      assert.equal(voyages.get(target)[4], original);
      assert.match(people.get(writer)[5], /council/);
    } else {
      assert.equal(strangers.has(target), false);
      assert.equal(people.get(writer)[1], name);
      assert.equal(removed, plusDays(original, 39));
    }
  }
});

test('registered crossings respect construction, prior loss, and living crew and light witnesses', () => {
  const rows = Deep.data('Archive tester');
  const people = byId(rows.people);
  const towns = byId(rows.towns);
  const ships = byId(rows.ships);
  const voyages = byId(rows.voyages);
  const nextPossible = new Map();
  for (const [id, ship, from, to, sailed, days] of rows.voyages) {
    assert.notEqual(from, to);
    assert.ok(year(sailed) >= Math.max(ships.get(ship)[3], towns.get(from)[3], towns.get(to)[3]), `voyage ${id} predates a ship or port`);
    assert.ok(sailed >= (nextPossible.get(ship) || ''), `voyage ${id} conflicts with a previous crossing or loss`);
    nextPossible.set(ship, days === null ? '9999-12-31' : plusDays(sailed, days));
  }
  for (const [voyage, person] of rows.crew) {
    assert.ok(aliveOn(people.get(person), voyages.get(voyage)[4]), `crew ${person} could not have sailed on ${voyage}`);
  }
  for (const [id, sea, seen, hours, witness] of rows.lights) {
    assert.ok(hours > 0 && aliveOn(people.get(witness), seen), `light ${id} needs a living witness`);
  }
});

test('each rescue has a real crossing, and the two Marigold crews match the story', () => {
  const rows = Deep.data('Archive tester');
  const ilva = rows.erasures.find(e => e[1] === 'strangers');
  const people = byId(rows.people);
  const ships = byId(rows.ships);
  const { BRAM, OLDTULL, TAMSIN, ILVA } = Deep.ids();
  const expectedIlva = ['Ilva Thorne', '1986-03-02', 119];
  assert.deepEqual([ilva[5], ilva[6], 119], expectedIlva);
  const rescues = [...rows.strangers.map(s => s.slice(1, 4)), expectedIlva];
  for (const [name, found, ship] of rescues) {
    const rescue = rows.voyages.find(v => v[1] === ship && v[3] === 1 && v[5] !== null && v[4] <= found && plusDays(v[4], v[5]) >= found);
    assert.ok(rescue && ships.get(ship)[3] <= year(found), `${name} must be rescued by an existing ship on a recorded crossing`);
    const crew = rows.crew.filter(c => c[0] === rescue[0]);
    if (found === Deep.FOUND_ON) {
      assert.equal(plusDays(rescue[4], rescue[5]), '2026-06-17');
      assert.deepEqual(crew.map(c => c.slice(1)), [[BRAM, 'captain'], [TAMSIN, 'deckhand']]);
    }
    if (found === '1986-03-02') assert.deepEqual(crew.map(c => c.slice(1)), [[OLDTULL, 'captain']]);
    const next = rows.lights.find(l => l[1] === 'Brass Sea' && l[2] > found);
    assert.equal(next[2], plusDays(found, 40));
    if (found === Deep.FOUND_ON) assert.equal(people.get(next[4])[1], 'Bram Tull');
    if (found === '1986-03-02') assert.equal(next[4], ILVA);
  }
  assert.equal(Deep.FOUND_ON, '2026-06-14');
  assert.equal(Deep.RETURN_ON, plusDays(Deep.FOUND_ON, 40));
  assert.equal(Deep.RETURN_ON, '2026-07-24');
});

test('each Great Truth runs with only its advertised tables and the critical results match the narrative', async () => {
  const SQL = await init();
  const rowsByTruth = new Map();
  for (const truth of Deep.TRUTHS) {
    const db = new SQL.Database();
    try {
      db.exec(Deep.script(Deep.TABLES.map((_, i) => truth.needs.includes(i)), "Rae O'Neill"));
      const result = db.exec(truth.sql)[0].values;
      assert.ok(result.length && Deep.INTERPRETATIONS[truth.id], truth.id);
      rowsByTruth.set(truth.id, result);
    } finally {
      db.close();
    }
  }
  assert.equal(rowsByTruth.get('t1')[0][0], 'Tallyport');
  assert.deepEqual(rowsByTruth.get('t2')[0].slice(0, 2), ['Tallyport', 'Brackwater']);
  assert.deepEqual(rowsByTruth.get('t3'), [['Merrow Fane', 106]]);
  assert.deepEqual(rowsByTruth.get('t8'), [['Marigold', 4]]);
  const records = Deep.data("Rae O'Neill");
  assert.deepEqual(rowsByTruth.get('t9'), records.strangers.map(s => [s[1], 12]));
  assert.deepEqual(rowsByTruth.get('t10'), records.strangers.map(s => [s[1], 40]));
  assert.deepEqual(rowsByTruth.get('t11'), [['Ilva Thorne', 'strangers', 'Ilva Thorne']]);
  assert.equal(rowsByTruth.get('t12').length, 9);
  assert.deepEqual(rowsByTruth.get('t12').slice(-2), [['Ilva Thorne', '1986-04-11'], ["Rae O'Neill", '2026-07-24']]);
});

test('the billing case follows the actual lead and creates draft invoices for every unbilled shipment', async () => {
  Engine.init(await init(), World);
  const tasks = new Map(Content.CONTRACTS.map(c => [c.id, c]));
  const returns = id => Engine.target(tasks.get(id)).rows;
  const identifiedOrders = returns('c409').map(o => o[0]);
  const byFactor = returns('c412');
  const byCustomer = returns('c611');
  const byMonth = returns('c710');
  const drafts = returns('c811');
  assert.deepEqual(byFactor[0], ['Hale Verity', 8]);
  assert.equal(byCustomer[0][0], 'Harborlight Outfitters');
  assert.ok(byCustomer.length > 1, 'other customers also have unbilled shipments');
  assert.equal(byMonth.at(-1)[2], byCustomer[0][2]);
  assert.deepEqual(drafts.map(d => d[1]).sort(), identifiedOrders.sort());
  for (const id of ['c409', 'c412', 'c511', 'c611', 'c710', 'c811']) assert.ok(tasks.get(id).after, `${id} needs its case result`);
  assert.match(tasks.get('c811').story, /copy/);
  assert.match(tasks.get('c504').story, /label/i);
  assert.match(tasks.get('c703').story, /highest price/i);
  assert.equal(Content.TALK.lead, undefined);
});

test('Sorrel acknowledges precisely the history available to the conversation', () => {
  assert.match(Dojo.sorrelLine(), /I’m from Highwatch/);
  assert.doesNotMatch(Dojo.sorrelLine({ met: true }), /you got me|I remember our final/i);
  assert.match(Dojo.sorrelLine({ met: true, wonHere: true }), /you got me/i);
  assert.match(Dojo.sorrelLine({ met: true, lostHere: true }), /I remember our final/i);
  assert.match(Dojo.sorrelLine({ wonFinal: true, wins: 1 }), /You won in Aldermoot/);
  assert.doesNotMatch(Dojo.sorrelLine({ wonFinal: true, wins: 7 }), /every town/);
  assert.match(Dojo.sorrelLine({ wonFinal: true, wins: 8 }), /every town/);
  assert.equal(Dojo.NOTES.length, 7);
});

test('the release keeps one writing standard and seven examiners before the council', () => {
  assert.deepEqual(fs.readFileSync(path.join(__dirname, '../STYLE.md')), fs.readFileSync(path.join(__dirname, '../docs/04_WRITING_STYLE.md')));
  assert.equal(Content.BOSSES.length, 8);
  assert.ok(Content.BOSSES.slice(0, 7).every(b => b.epithet.startsWith('Examiner of the')));
  assert.equal(Content.BOSSES[7].epithet, 'The Grand Audit');
  assert.equal(Content.DUNGEONS[5].name, 'The Crystal Vaults');
  assert.match(Content.DUNGEONS[5].blurb, /Crystal Sentinel/);
  assert.match(Content.BOSSES[5].name, /Lich/);
});

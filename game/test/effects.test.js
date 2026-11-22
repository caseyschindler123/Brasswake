const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, '../src', name), 'utf8');

function harness() {
  const scheduled = [], nodes = [], listeners = {}, storage = {};
  const param = label => ({ value: 0, setValueAtTime(v, t) { scheduled.push([label, v, t]); }, exponentialRampToValueAtTime(v, t) { scheduled.push([label, v, t]); }, setTargetAtTime() {} });
  const node = kind => { const n = { kind, connect() {}, disconnect() { n.disconnected = true; }, start() {}, stop() {}, frequency: param(kind + '.frequency'), gain: param('gain'), Q: param('Q') }; nodes.push(n); return n; };
  const ctx = { currentTime: 0, state: 'running', sampleRate: 48000, destination: {}, createGain: () => node('gain'), createOscillator: () => node('oscillator'), createBufferSource: () => node('noise'), createBiquadFilter: () => node('filter'), createDynamicsCompressor: () => ({ ...node('compressor'), threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }), createBuffer: () => ({ getChannelData: () => new Float32Array(48000) }) };
  const sandbox = { window: { AudioContext: function () { return ctx; } }, navigator: {}, document: { addEventListener(k, fn) { listeners[k] = fn; } }, localStorage: { getItem: k => storage[k] || null, setItem(k, v) { storage[k] = v; } }, setInterval: () => 1 };
  vm.createContext(sandbox); vm.runInContext(source('effects.js') + '\n' + source('audio.js') + '\nthis.effects = Effects; this.sound = Sound;', sandbox); listeners.pointerdown();
  return { ...sandbox, ctx, scheduled, nodes, storage };
}

test('spell mapping follows the eight named pages and rare variants keep the same identity', () => {
  const { effects } = harness();
  const ids = ['spark', 'frost', 'sun', 'storm', 'fire', 'crystal', 'blizzard', 'rewrite'];
  ids.forEach((id, i) => { assert.equal(effects.spell(i + 1).id, id); assert.equal(effects.spell(i + 1, true).rare, true); });
  assert.equal(effects.spell(99).id, 'rewrite'); assert.equal(effects.spell().id, 'spark');
});

test('magic families schedule distinct sounds and repeated weapon attacks vary', () => {
  const h = harness(), signatures = new Set();
  for (let c = 1; c <= 8; c++) { h.scheduled.length = 0; h.sound.sfx('cast', h.effects.spell(c)); signatures.add(JSON.stringify(h.scheduled.filter(x => x[0].includes('frequency')))); }
  assert.equal(signatures.size, 8);
  h.scheduled.length = 0; h.sound.sfx('swing'); const a = JSON.stringify(h.scheduled); h.scheduled.length = 0; h.sound.sfx('swing'); assert.notEqual(JSON.stringify(h.scheduled), a);
});

test('mute persists, world cues throttle, and finished voices disconnect', () => {
  const h = harness(); h.sound.setFx(false); const before = h.nodes.length; h.sound.sfx('cast'); assert.equal(h.nodes.length, before); assert.equal(JSON.parse(h.storage['brasswake.sound']).fx, 0);
  h.sound.setFx(true); h.sound.sfx('step', 'stone'); const first = h.nodes.length; h.sound.sfx('step', 'stone'); assert.equal(h.nodes.length, first);
  h.ctx.currentTime += .2; h.sound.sfx('step', 'stone'); assert.ok(h.nodes.length > first);
  for (const n of h.nodes.filter(n => n.onended)) { n.onended(); assert.equal(n.disconnected, true); }
  assert.deepEqual(Array.from(h.sound._check()), []);
});

test('creature families cover animals, constructs, ranged and magical enemies', () => {
  const { effects } = harness();
  for (const [name, family] of Object.entries({ 'Gull': 'bird', 'Winter Wolf': 'beast', 'Rat': 'small', 'Giant Spider': 'insect', 'Giant Leech': 'wet', 'Red Dragon': 'dragon', 'Lich': 'spirit', 'Slag Golem': 'stone', 'Brass Crossbow Automaton': 'bow', 'Marauder': 'swing' })) assert.equal(effects.creature(name), family);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../src/audio.js'), 'utf8');

function fixture() {
  const listeners = {}, calls = [], sources = [], effectNodes = [], store = {}, timers = new Map();
  let interval, context = { region: 1 }, timerId = 0;
  const param = () => ({ value: 1, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; },
    exponentialRampToValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param() });
  const ctx = { currentTime: 0, sampleRate: 100, state: 'running', destination: {},
    createGain: node, createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
    createDynamicsCompressor: () => ({ ...node(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createOscillator() { const n = { ...node(), start() {}, stop() {} }; effectNodes.push(n); return n; },
    createBufferSource() { const n = { ...node(), start(t, off) { n.offset = off; n.started = true; }, stop() { n.stopped = true; } }; sources.push(n); return n; },
    decodeAudioData(ab, done) { done({ duration: ab.duration || 240 }); },
    suspend() { ctx.state = 'suspended'; return Promise.resolve(); }, resume() { ctx.state = 'running'; return Promise.resolve(); } };
  const document = { hidden: false, addEventListener(k, fn) { listeners[k] = fn; } };
  const Sound = new Function('window', 'navigator', 'document', 'localStorage', 'setInterval', 'setTimeout', 'clearTimeout', 'fetch', 'AbortController', source + '; return Sound;')(
    { AudioContext: function () { return ctx; } }, {}, document,
    { getItem: () => null, setItem(k, v) { store[k] = v; } }, fn => { interval = fn; return 1; },
    fn => { timers.set(++timerId, fn); return timerId; }, id => timers.delete(id),
    (url, options) => new Promise((resolve, reject) => {
      const call = { url, resolve: (duration = 240) => resolve({ ok: true, arrayBuffer: () => Promise.resolve({ duration }) }), reject };
      options.signal.addEventListener('abort', () => reject(new Error('aborted'))); calls.push(call);
    }), AbortController);
  Sound.init(() => context); listeners.pointerdown();
  const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const complete = async (duration) => { calls.at(-1).resolve(duration); await settle(); };
  return { Sound, ctx, calls, sources, effectNodes, store, document, listeners, timers, settle, complete,
    tick: () => interval(), set: s => { context = s; interval(); } };
}

test('all regions and contextual priorities select a distinct playable soundtrack entry', () => {
  const { Sound } = fixture(), selected = new Set();
  for (let r = 1; r <= 8; r++) {
    for (const c of [{ region: r, town: true }, { region: r, dun: r }, { region: r, town: false }]) {
      const id = Sound.trackFor(c); assert.ok(Sound.MUSIC[id], JSON.stringify(c)); selected.add(id);
    }
  }
  for (const venue of ['tavern', 'dojo', 'cards']) selected.add(Sound.trackFor({ region: 2, venue }));
  for (const c of [{ title: true }, { fight: true }, { fight: true, boss: true }]) selected.add(Sound.trackFor(c));
  assert.equal(selected.size, 26);
  assert.equal(Sound.trackFor({ title: true, fight: true, dun: 4 }), 'm_title');
  assert.equal(Sound.trackFor({ fight: true, boss: true, dun: 4, venue: 'dojo' }), 'm_examiner');
  assert.equal(Sound.trackFor({ dun: 4, venue: 'tavern' }), 'm_tanglewarren');
  assert.equal(Sound.trackFor(null), null); assert.equal(Sound.trackFor({ region: 9 }), null);
  assert.equal(Object.keys(Sound.MUSIC).length, 28);
});

test('one load in flight, no duplicate handlers, and late responses use the latest context', async () => {
  const f = fixture();
  for (let i = 0; i < 10; i++) f.tick();
  assert.equal(f.calls.length, 1);
  f.set({ dun: 1 }); for (let i = 0; i < 10; i++) f.tick();
  assert.equal(f.calls.length, 1);
  await f.complete(); assert.equal(f.sources.length, 0); assert.equal(f.calls.length, 2);
  assert.match(f.calls[1].url, /m_bilge.mp3$/); await f.complete();
  assert.equal(f.Sound.playing(), 'm_bilge'); assert.equal(f.sources.length, 1);
  f.tick(); await f.settle(); assert.equal(f.sources.length, 1);
});

test('mute invalidates an outstanding request, persists, and stops further loading', async () => {
  const f = fixture(); f.Sound.setMu(false); await f.complete();
  assert.equal(f.Sound.playing(), null); assert.equal(f.sources.length, 0);
  f.set({ dun: 1 }); assert.equal(f.calls.length, 1);
  assert.equal(JSON.parse(f.store['brasswake.sound']).mu, 0);
  f.Sound.setMu(true); assert.equal(f.calls.length, 2); await f.complete();
  assert.equal(f.Sound.playing(), 'm_bilge');
});

test('cache stays at two tracks and ambience resumes after combat', async () => {
  const f = fixture(); await f.complete(); f.ctx.currentTime = 20;
  f.set({ fight: true }); await f.complete(); assert.equal(f.Sound.playing(), 'm_combat');
  f.ctx.currentTime = 28; f.set({ region: 1 });
  assert.equal(f.Sound.playing(), 'm_tallyport'); assert.equal(f.sources.at(-1).offset, 20);
  f.set({ dun: 1 }); await f.complete(); assert.ok(f.Sound.status().cached.length <= 2);
  assert.equal(f.Sound.playing(), 'm_bilge');
});

test('musical victory cue respects music independently of effects and returns to ambience', async () => {
  const f = fixture(); await f.complete(); f.Sound.setFx(false); f.ctx.currentTime = 12;
  f.Sound.sfx('win'); f.tick(); await f.complete(f.Sound.MUSIC.m_victory.b - .0000005);
  assert.equal(f.Sound.playing(), 'm_victory'); const cue = f.sources.at(-1); assert.equal(cue.loop, false);
  f.ctx.currentTime = 20; cue.onended(); assert.equal(f.Sound.playing(), 'm_tallyport');
  assert.equal(f.sources.at(-1).offset, 12);
  f.Sound.setMu(false); f.Sound.sfx('death'); f.tick(); assert.equal(f.Sound.status().cue, null);
});

test('new combat cancels a cue and late cue loads expire instead of playing out of context', async () => {
  const f = fixture(); await f.complete(); f.Sound.setFx(false);
  f.Sound.sfx('win'); f.tick(); f.ctx.currentTime = 6; await f.complete();
  assert.equal(f.Sound.playing(), 'm_tallyport');
  f.Sound.sfx('death'); f.tick(); await f.complete(); assert.equal(f.Sound.playing(), 'm_death');
  f.set({ fight: true, boss: true }); await f.complete(); assert.equal(f.Sound.playing(), 'm_examiner');
});

test('music and effect jingles do not overlap; effects-only feedback remains available', async () => {
  const f = fixture(); await f.complete(); f.Sound.sfx('win');
  assert.equal(f.Sound.status().cue, 'm_victory'); assert.equal(f.effectNodes.length, 0);
  f.Sound.setMu(false); f.Sound.sfx('win'); assert.equal(f.effectNodes.length, 6);
  f.Sound.setFx(false); f.Sound.sfx('death'); assert.equal(f.effectNodes.length, 6);
});

test('failed, timed out, and invalid audio loads retry with backoff without stale music', async () => {
  const f = fixture(); await f.complete(); f.set({ dun: 1 }); f.calls.at(-1).reject(new Error('offline')); await f.settle();
  assert.equal(f.Sound.playing(), null); for (let i = 0; i < 20; i++) f.tick(); assert.equal(f.calls.length, 2);
  f.ctx.currentTime = 11; f.tick(); assert.equal(f.calls.length, 3); await f.complete(1); assert.equal(f.Sound.playing(), null);
  f.ctx.currentTime = 22; f.tick(); [...f.timers.values()].at(-1)(); await f.settle(); assert.equal(f.Sound.status().pending, null);
  f.ctx.currentTime = 33; f.tick(); await f.complete(); assert.equal(f.Sound.playing(), 'm_bilge');
});

test('hidden tabs stop music, suppress requests, and safely resume current ambience', async () => {
  const f = fixture(); await f.complete(); f.document.hidden = true; f.listeners.visibilitychange();
  assert.equal(f.Sound.playing(), null); assert.equal(f.ctx.state, 'suspended');
  f.set({ dun: 1 }); assert.equal(f.calls.length, 1);
  f.document.hidden = false; f.listeners.visibilitychange(); await f.settle(); await f.complete();
  assert.equal(f.Sound.playing(), 'm_bilge');
});

test('every soundtrack entry has a committed MP3 and valid bounded metadata', () => {
  const { Sound } = fixture();
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../../arttools/music/soundtrack.json'), 'utf8'));
  assert.equal(Object.keys(catalog.tracks).length, 25);
  for (const [id, meta] of Object.entries(Sound.MUSIC)) {
    assert.ok(meta.a >= 0 && meta.b > meta.a && meta.v > 0 && meta.v <= 1);
    assert.ok(meta.b < 200, id);
    const bytes = fs.readFileSync(path.join(__dirname, '../art/mu', id + '.mp3'));
    assert.ok(bytes.length > 1000, id);
    assert.ok(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224), id);
    const entry = catalog.tracks[id];
    if (entry) {
      for (const field of ['a', 'b', 'v', 'loop']) assert.equal(meta[field], entry[field], id + ': ' + field);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, id);
      if (entry.midi) {
        const midi = fs.readFileSync(path.join(__dirname, '../..', entry.midi));
        assert.equal(midi.subarray(0, 4).toString(), 'MThd');
        assert.equal(createHash('sha256').update(midi).digest('hex'), entry.origin.midiSHA256);
      }
    }
  }
  assert.equal(Sound.MUSIC.m_victory.loop, false); assert.equal(Sound.MUSIC.m_death.loop, false);
});

test('unavailable audio and inaccessible device preferences safely preserve silent play', () => {
  const listeners = {};
  const Sound = new Function('window', 'document', 'localStorage', 'setInterval', source + '; return Sound;')({},
    { addEventListener(k, fn) { listeners[k] = fn; } },
    { getItem() { throw Error('storage blocked'); }, setItem() { throw Error('storage blocked'); } }, () => 1);
  Sound.init(() => ({ title: true })); listeners.pointerdown(); Sound.sfx('win'); Sound.sfx('death'); Sound.setMu(false); Sound.setFx(false);
  assert.equal(Sound.state(), 'none'); assert.equal(Sound.playing(), null); assert.deepEqual(Sound.pref(), { mu: 0, fx: 0 });
});

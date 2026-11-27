const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../src/audio.js'), 'utf8');

function fixture({ cachedDuration } = {}) {
  const listeners = {}, windowListeners = {}, calls = [], fxCalls = [], sources = [], effectNodes = [], store = {}, timers = new Map();
  let interval, context = { region: 1 }, timerId = 0, clock = 0;
  const param = () => ({ value: 1, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; },
    exponentialRampToValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
  const node = () => ({ connect(target) { this.target = target; }, disconnect() {}, gain: param(), frequency: param(), Q: param() });
  const ctx = { currentTime: 0, sampleRate: 100, state: 'running', destination: {},
    createGain: node, createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
    createDynamicsCompressor: () => ({ ...node(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createBiquadFilter: node,
    createOscillator() { const n = { ...node(), start() {}, stop() {} }; effectNodes.push(n); return n; },
    createBufferSource() { const n = { ...node(), playbackRate: param(), start(t, off) { n.offset = off; n.started = true; }, stop() { n.stopped = true; } }; sources.push(n); return n; },
    decodeAudioData(ab, done, fail) { if (ab.invalid) return fail(new Error('decode')); const duration = ab.duration || 240; done({ duration, length: Math.round(duration * 44100), numberOfChannels: 1 }); },
    suspend() { ctx.state = 'suspended'; return Promise.resolve(); }, resume() { ctx.state = 'running'; return Promise.resolve(); } };
  const document = { hidden: false, addEventListener(k, fn) { listeners[k] = fn; } };
  const Sound = new Function('window', 'navigator', 'document', 'localStorage', 'setInterval', 'setTimeout', 'clearTimeout', 'fetch', 'AbortController', 'performance', source + '; return Sound;')(
    { AudioContext: function () { return ctx; }, addEventListener(k, fn) { windowListeners[k] = fn; } }, {}, document,
    { getItem: () => null, setItem(k, v) { store[k] = v; } }, fn => { interval = fn; return 1; },
    fn => { timers.set(++timerId, fn); return timerId; }, id => timers.delete(id),
    (url, options) => new Promise((resolve, reject) => {
      const effect = url.includes('/fx/');
      const call = { url, done: false, resolve: (duration = 240, invalid = false) => { call.done = true; const actual = cachedDuration != null && options.cache !== 'no-cache' ? cachedDuration : duration; resolve({ ok: true, arrayBuffer: () => Promise.resolve({ duration: actual, invalid }) }); }, reject };
      options.signal.addEventListener('abort', () => {call.aborted=true;reject(new Error('aborted'));}); (effect ? fxCalls : calls).push(call);
    }), AbortController, {now:()=>clock});
  Sound.init(() => context); listeners.pointerdown();
  const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const complete = async (duration) => { calls.at(-1).resolve(duration); await settle(); };
  const completeEffect = async id => { const call = fxCalls.find(c => !c.done && c.url.endsWith('/' + id + '.wav')); assert.ok(call, id); call.resolve(Sound.SAMPLES[id]); await settle(); };
  const drainEffects = async () => { for (let n = 0; n < 100; n++) { const waiting = fxCalls.filter(c => !c.done); if (!waiting.length) break; for (const c of waiting) { const id = path.basename(c.url, '.wav'); c.resolve(Sound.SAMPLES[id]); } await settle(); } };
  return { Sound, ctx, calls, fxCalls, sources, effectNodes, store, document, listeners, windowListeners, timers, settle, complete, completeEffect, drainEffects,
    tick: () => interval(), set: s => { context = s; interval(); }, advanceInput: ms => {clock+=ms;} };
}

test('UI click cooldown advances even when a running device audio clock is stalled',async()=>{
  const f=fixture();await f.completeEffect('s_click');
  f.Sound.sfx('click');const first=f.Sound.status().effects.serial;
  f.advanceInput(24);f.Sound.sfx('click');assert.equal(f.Sound.status().effects.serial,first,'duplicate input remains throttled');
  f.advanceInput(2);f.Sound.sfx('click');assert.equal(f.Sound.status().effects.serial,first+1);
  f.advanceInput(100);f.Sound.sfx('click');assert.equal(f.Sound.status().effects.serial,first+2);
  assert.equal(f.ctx.currentTime,0,'actual device audio time never advanced');
});

test('loaded footfalls stay subtle with grass below dirt, wood and paving',async()=>{
  const f=fixture();await f.complete();await f.drainEffects();
  for(const [surface,level] of [['grass',.025],['sand',.07],['snow',.09],['earth',.1],['wood',.18],['stone',.25]]){
    f.ctx.currentTime+=1;f.Sound.sfx('step',surface);await f.drainEffects();
    f.ctx.currentTime+=1;f.Sound.sfx('step',surface);
    const voice=f.sources.at(-1);
    assert.ok(voice.started);
    assert.ok(voice.target.gain.value>=level*.94&&voice.target.gain.value<=level*1.06,surface);
  }
});

test('actual scene contacts distinguish grass from paths and retain indoor surface precedence',()=>{
  const scene=fs.readFileSync(path.join(__dirname,'../src/scene_b.js'),'utf8');
  const body=scene.match(/  function footfall\(\) \{[\s\S]*?\n  \}/)[0];
  const contact=new Function('map','P','buildingContains','emit',body+';footfall();');
  for(const [tile,extra,room,expected] of [
    [0,{},null,'grass'],[1,{},null,'grass'],[2,{},null,'earth'],[5,{},null,'sand'],
    [0,{reg:[7]},null,'snow'],[1,{reg:[7]},null,'snow'],[2,{reg:[7]},null,'earth'],[3,{reg:[7]},null,'stone'],
    [0,{reg:[5]},null,'earth'],[1,{reg:[6]},null,'earth'],[5,{surface:[5]},null,'stone'],
    [3,{},null,'stone'],[7,{},null,'stone'],[6,{},null,'wood'],
    [0,{dungeon:true},null,'stone'],[0,{hall:true,reg:undefined},null,'wood'],
    [0,{},'flag','stone'],[3,{},'floor','wood']]){
    const heard=[],map={w:1,t:[tile],reg:[1],...extra,blds:room?[{enter:true,room:{fl:room}}]:[]};
    contact(map,{x:0,y:0},()=>true,(name,surface)=>heard.push([name,surface]));
    assert.deepEqual(heard,[['step',expected]]);
  }
});

test('all regions and contextual priorities select a distinct playable soundtrack entry', () => {
  const { Sound } = fixture(), selected = new Set();
  for (let r = 1; r <= 8; r++) {
    for (const c of [{ region: r, town: true }, { region: r, dun: r }, { region: r, town: false }]) {
      const id = Sound.trackFor(c); assert.ok(Sound.MUSIC[id], JSON.stringify(c)); selected.add(id);
    }
  }
  for (const venue of ['tavern', 'dojo', 'cards']) { assert.equal(Sound.trackFor({ region: 2, venue }), 'm_' + venue); selected.add(Sound.trackFor({ region: 2, venue })); }
  for (const c of [{ title: true }, { fight: true }, { fight: true, boss: true }]) selected.add(Sound.trackFor(c));
  assert.equal(selected.size, 26);
  assert.equal(Sound.trackFor({ title: true, fight: true, dun: 4 }), 'm_title');
  assert.equal(Sound.trackFor({ fight: true, boss: true, dun: 4, venue: 'dojo' }), 'm_examiner');
  assert.equal(Sound.trackFor({ dun: 4, venue: 'tavern' }), 'm_tanglewarren');
  assert.equal(Sound.trackFor(null), null); assert.equal(Sound.trackFor({ region: 9 }), null);
  assert.equal(Object.keys(Sound.MUSIC).length, 28);
});

test('venue tracks play and return to the retained town position', async () => {
  const f = fixture(); await f.complete();
  f.ctx.currentTime = 8;
  for (const venue of ['tavern', 'dojo', 'cards']) {
    f.ctx.currentTime += 6; f.set({ region: 1, town: true, venue });
    await f.complete(); assert.equal(f.Sound.playing(), 'm_' + venue);
  }
  f.set({ region: 1, town: true }); await f.complete();
  assert.equal(f.Sound.playing(), 'm_tallyport');
  assert.equal(f.sources.at(-1).offset, 14);
});

test('crossing and recrossing town and wilderness boundaries requires five continuous seconds', async () => {
  const f = fixture(); await f.complete();
  const town = { region: 1, town: true }, coast = { region: 2, town: false }, fields = { region: 3, town: false };
  f.set(coast);
  f.ctx.currentTime = 4; f.set(town);
  f.ctx.currentTime = 5; f.set(coast);
  f.ctx.currentTime = 9.9; f.tick();
  assert.equal(f.calls.length, 1);
  f.ctx.currentTime = 10; f.tick();
  assert.match(f.calls.at(-1).url, /m_wild_coast.mp3$/);
  assert.equal(f.Sound.playing(), 'm_tallyport');

  f.set(town); await f.complete();
  assert.equal(f.Sound.playing(), 'm_tallyport');
  assert.equal(f.sources.length, 1);
  f.set(coast); f.ctx.currentTime = 15; f.tick();
  assert.equal(f.Sound.playing(), 'm_wild_coast');

  f.set(fields);
  f.ctx.currentTime = 19; f.set(coast);
  f.ctx.currentTime = 20; f.set(fields);
  f.ctx.currentTime = 24.9; f.tick();
  assert.equal(f.calls.length, 2);
  f.ctx.currentTime = 25; f.tick(); await f.complete();
  assert.equal(f.Sound.playing(), 'm_wild_fields');
  f.set({ ...fields, region: 4 });
  f.ctx.currentTime = 30; f.tick();
  assert.equal(f.calls.length, 3);
  assert.equal(f.Sound.playing(), 'm_wild_fields');
});

test('focus and visibility reset an unfinished surface transition', async () => {
  const f = fixture(); await f.complete();
  f.set({ region: 1, town: false });
  f.ctx.currentTime = 3; f.windowListeners.blur();
  f.ctx.currentTime = 11; f.windowListeners.focus();
  f.ctx.currentTime = 15.9; f.tick();
  assert.equal(f.calls.length, 1);
  assert.equal(f.Sound.playing(), 'm_tallyport');

  f.document.hidden = true; f.listeners.visibilitychange();
  assert.equal(f.Sound.playing(), null);
  f.set({ region: 3, town: false });
  assert.equal(f.calls.length, 1);
  f.document.hidden = false; f.listeners.visibilitychange(); await f.settle();
  assert.match(f.calls.at(-1).url, /m_wild_fields.mp3$/); await f.complete();
  assert.equal(f.Sound.playing(), 'm_wild_fields');
});

test('combat and cues supersede an outstanding surface download', async () => {
  const f = fixture(); await f.complete();
  f.set({ region: 1, town: false }); f.ctx.currentTime = 5; f.tick();
  assert.equal(f.Sound.status().pending, 'm_wild_coast');
  f.set({ region: 1, town: false, fight: true }); await f.settle();
  assert.equal(f.Sound.status().pending, 'm_combat'); await f.complete();
  assert.equal(f.Sound.playing(), 'm_combat');
  f.set({ region: 1 }); assert.equal(f.Sound.playing(), 'm_tallyport');
  f.set({ region: 1, town: false }); f.ctx.currentTime = 10; f.tick();
  assert.equal(f.Sound.status().pending, 'm_wild_coast');
  f.Sound.sfx('win'); f.tick(); await f.settle();
  assert.equal(f.Sound.status().pending, 'm_victory'); await f.complete();
  assert.equal(f.Sound.playing(), 'm_victory');
});

test('priority music uses a bounded second slot and late background completion preserves its owner',async()=>{
  const f=fixture();await f.complete();f.set({region:1,town:false});f.ctx.currentTime=5;f.tick();
  const surface=f.calls.at(-1);f.set({region:1,town:false,fight:true});const combat=f.calls.at(-1);
  assert.match(combat.url,/m_combat.mp3$/);assert.equal(surface.aborted,undefined);
  assert.equal(f.Sound.status().loading.length,2);assert.equal(f.Sound.status().loadLimit,2);
  f.set({region:1,town:false});f.Sound.sfx('win');f.tick();
  assert.equal(f.calls.length,3,'a third request waits for a slot');
  surface.resolve();await f.settle();const victory=f.calls.at(-1);assert.match(victory.url,/m_victory.wav$/);
  assert.equal(f.Sound.status().loading.length,2);assert.equal(f.Sound.status().pending,'m_victory');
  combat.resolve();await f.settle();assert.equal(f.Sound.status().pending,'m_victory','late combat completion cannot clear the newer request');
  assert.notEqual(f.Sound.playing(),'m_combat','an obsolete decoded theme never interrupts the cue');
  victory.resolve();await f.settle();assert.equal(f.Sound.playing(),'m_victory');assert.deepEqual(f.Sound.status().loading,[]);
  assert.ok(f.calls.every(c=>!c.aborted),'healthy transitions do not cancel network requests');
});

test('local ambience respects effects settings, visibility and the shared cooldown', async () => {
  const f = fixture(); await f.complete();
  f.Sound.setMu(false);
  f.Sound.sfx('ambient', 'hearth');
  assert.equal(f.sources.length, 4);
  f.ctx.currentTime = 6.9; f.Sound.sfx('ambient', 'drip');
  assert.equal(f.effectNodes.length, 0);
  f.ctx.currentTime = 7; f.Sound.sfx('ambient', 'drip');
  assert.equal(f.effectNodes.length, 2);
  f.ctx.currentTime = 14; f.Sound.setFx(false); f.Sound.sfx('ambient', 'market');
  assert.equal(f.sources.length, 4);
  f.Sound.setFx(true); f.document.hidden = true; f.Sound.sfx('ambient', 'market');
  assert.equal(f.sources.length, 4);
  f.document.hidden = false; f.Sound.sfx('ambient', 'market');
  assert.equal(f.sources.length, 6);
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
  assert.match(f.calls.at(-1).url, /m_victory\.wav$/);
  assert.equal(f.Sound.playing(), 'm_victory'); const cue = f.sources.at(-1); assert.equal(cue.loop, false);
  f.ctx.currentTime = 20; cue.onended(); assert.equal(f.Sound.playing(), 'm_tallyport');
  assert.equal(f.sources.at(-1).offset, 12);
  f.Sound.setMu(false); f.Sound.sfx('death'); f.tick(); assert.equal(f.Sound.status().cue, null);
});

test('new combat cancels a cue and late cue loads expire instead of playing out of context', async () => {
  const f = fixture(); await f.complete(); f.Sound.setFx(false);
  f.Sound.sfx('win'); f.tick(); f.ctx.currentTime = 6; await f.complete();
  assert.equal(f.Sound.playing(), 'm_tallyport');
  f.Sound.sfx('death'); f.tick(); await f.complete(); assert.equal(f.Sound.playing(), 'm_death'); assert.match(f.calls.at(-1).url, /m_death\.wav$/);
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

test('every soundtrack entry has a committed audio file and valid bounded metadata', () => {
  const { Sound } = fixture();
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../../arttools/music/soundtrack.json'), 'utf8'));
  assert.equal(Object.keys(catalog.tracks).length, 28);
  assert.deepEqual(catalog.retained, []);
  for (const [id, meta] of Object.entries(Sound.MUSIC)) {
    assert.ok(meta.a >= 0 && meta.b > meta.a && meta.v > 0 && meta.v <= 1);
    assert.ok(meta.b < 200, id);
    const bytes = fs.readFileSync(path.join(__dirname, '../art/mu', id + (meta.loop === false ? '.wav' : '.mp3')));
    assert.ok(bytes.length > 1000, id);
    if (meta.loop === false) {
      assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', id);
      assert.equal(bytes.subarray(8, 12).toString(), 'WAVE', id);
    } else assert.ok(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224), id);
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

test('the former Suno themes include regular battles while other music stays intact', () => {
  const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, '../../arttools/music', name), 'utf8'));
  const { tracks } = read('soundtrack.json');
  const history = read('history/soundtrack-2026-11-22.json').tracks;
  const baseline = read('history/soundtrack-before-suno-2026-11-26.json').tracks;
  const restored = ['m_tallyport','m_brackwater','m_haverly','m_four_fords','m_cinderwick',
    'm_kell','m_highwatch','m_aldermoot','m_bilge','m_sunken_sluice','m_combat'];
  const originals = {
    m_tallyport: 'e8b72f694913e7c466104b13028f8281270e8ac8d26cf1de122e1b8e7fd28bfb',
    m_bilge: 'f762b09c3b813119e03c341fb5f6cf3cdd3aaa030a3baa51c60a414ae2579e84',
    m_combat: '85f298d9a93427b687bb0b1948418e1449482fddc464a89bc8103aefde95e353',
  };
  assert.deepEqual(Object.keys(tracks).filter(id => tracks[id].origin.kind === 'user-supplied-suno').sort(), restored.sort());
  for (const [id, entry] of Object.entries(tracks)) {
    if (!restored.includes(id)) assert.deepEqual(entry, baseline[id], id);
    else if (history[id]) assert.deepEqual(entry, history[id], id);
    else {
      assert.equal(entry.origin.sourceCommit, 'ec29131', id);
      assert.equal(entry.origin.sourcePath, 'game/art/mu/' + id + '.mp3', id);
      assert.equal(entry.origin.sourceSHA256, originals[id], id);
      assert.ok(entry.origin.selection.startSeconds >= entry.origin.formerLoop.a, id);
      assert.ok(entry.origin.selection.endSeconds <= entry.origin.formerLoop.b, id);
    }
  }
  const { Sound } = fixture();
  assert.equal(Sound.trackFor({ fight: true }), 'm_combat');
  assert.equal(Sound.trackFor({ fight: true, boss: true }), 'm_examiner');
});

test('a cold effect responds immediately and a completed load never replays an old event', async () => {
  const f = fixture(); await f.complete();
  f.Sound.sfx('door', 'opening');
  const count = f.sources.length;
  assert.ok(f.effectNodes.length > 0, 'fallback responds before fetch finishes');
  await f.completeEffect('s_door_open');
  assert.equal(f.sources.length, count, 'no delayed duplicate after download');
  f.ctx.currentTime = 1; f.Sound.sfx('door', 'opening');
  assert.equal(f.Sound.status().effects.lastSample, 's_door_open');
  const voice = f.sources.at(-1); assert.equal(voice.buffer.duration, f.Sound.SAMPLES.s_door_open);
  assert.equal(f.Sound.status().effects.voices, 1);
  voice.onended(); assert.equal(f.Sound.status().effects.voices, 0);
});

test('a new player revalidates old HTTP-cached music and effects before decoding them', async () => {
  // Model a fresh browser cache containing an obsolete one-second export.
  // Without revalidation it cannot satisfy either the new loop or click cue.
  const f = fixture({ cachedDuration: 1 }); await f.complete();
  assert.equal(f.Sound.playing(), 'm_tallyport');
  await f.completeEffect('s_click'); f.Sound.sfx('click');
  assert.equal(f.Sound.status().effects.lastSample, 's_click');
  assert.equal(f.sources.at(-1).buffer.duration, f.Sound.SAMPLES.s_click);
});

test('sample mute and visibility cancel loading and stop active voices without late playback', async () => {
  const f = fixture(); await f.complete(); await f.completeEffect('s_click');
  f.Sound.sfx('click'); const voice = f.sources.at(-1);
  assert.equal(f.Sound.status().effects.voices, 1);
  f.Sound.setFx(false); await f.settle();
  assert.equal(voice.stopped, true); assert.equal(f.Sound.status().effects.voices, 0);
  assert.equal(f.Sound.status().effects.loading.length, 0);
  const count = f.sources.length;
  f.Sound.sfx('hit'); assert.equal(f.sources.length, count);
  f.Sound.setFx(true); await f.drainEffects(); f.ctx.currentTime = 1; f.Sound.sfx('hit');
  assert.equal(f.Sound.status().effects.lastSample, 's_hit');
  f.document.hidden = true; f.listeners.visibilitychange(); await f.settle();
  assert.equal(f.Sound.status().effects.voices, 0);
  assert.equal(f.Sound.status().effects.loading.length, 0);
  f.Sound.sfx('hit'); assert.equal(f.Sound.status().effects.voices, 0);
});

test('invalid effect decodes back off, retry safely and keep immediate fallback feedback', async () => {
  const f = fixture(); await f.complete(); await f.drainEffects();
  f.Sound.sfx('cast', { id: 'spark' });
  const request = f.fxCalls.at(-1); assert.match(request.url, /s_cast_spark/);
  request.resolve(f.Sound.SAMPLES.s_cast_spark, true); await f.settle();
  assert.ok(!f.Sound.status().effects.cached.includes('s_cast_spark'));
  const count = f.fxCalls.length, nodes = f.effectNodes.length;
  f.Sound.sfx('cast', { id: 'spark' });
  assert.equal(f.fxCalls.length, count); assert.ok(f.effectNodes.length > nodes);
  f.ctx.currentTime = 11; f.Sound.sfx('cast', { id: 'spark' }); await f.completeEffect('s_cast_spark');
  const serial = f.Sound.status().effects.serial;
  f.Sound.sfx('cast', { id: 'spark', rare: true });
  assert.equal(f.Sound.status().effects.serial, serial + 1);
});

test('effect inventory, load concurrency, LRU memory and rapid voice counts stay bounded', async () => {
  const f = fixture(); await f.complete(); await f.drainEffects();
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../../arttools/music/effects.json')));
  assert.equal(Object.keys(f.Sound.SAMPLES).length, 72);
  for (const [id, entry] of Object.entries(catalog.effects)) {
    assert.equal(f.Sound.SAMPLES[id], entry.duration);
    const bytes = fs.readFileSync(path.join(__dirname, '../..', entry.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, id);
    const [name, detail] = entry.hook.split(':');
    if (name === 'step') continue;
    const value = ['cast', 'spellHit'].includes(name) ? { id: detail } : detail;
    assert.equal(f.Sound.sampleFor(name, value), id);
    f.ctx.currentTime += 8; f.Sound.sfx(name, value);
    assert.ok(f.Sound.status().effects.loading.length <= 2);
    assert.ok(f.Sound.status().effects.queued.length <= 16);
    await f.drainEffects(); f.ctx.currentTime += 8; f.Sound.sfx(name, value);
    const state = f.Sound.status().effects;
    assert.ok(state.cached.length <= 24); assert.ok(state.bytes <= 4 * 1024 * 1024);
    assert.ok(state.voices <= 12); assert.ok(state.synthVoices <= 32);
  }
  assert.equal(f.Sound.sampleFor('door', 'closing'), 's_door_close');
  assert.equal(f.Sound.sampleFor('creature', 'bow'), 's_bow');
  assert.equal(f.Sound.sampleFor('creature', 'swing'), 's_swing');
});

test('context changes stop old environmental samples even with music muted', async () => {
  const f = fixture(); await f.complete(); await f.drainEffects(); f.Sound.setMu(false);
  f.set({ region: 1, town: true });
  f.Sound.sfx('ambient', 'hearth'); await f.completeEffect('s_ambient_hearth');
  f.ctx.currentTime = 8; f.Sound.sfx('ambient', 'hearth');
  const voice = f.sources.at(-1); assert.equal(f.Sound.status().effects.lastSample, 's_ambient_hearth');
  f.set({ region: 1, town: false });
  assert.equal(voice.stopped, true); assert.equal(f.Sound.status().effects.voices, 0);
  f.ctx.currentTime = 16; f.Sound.sfx('ambient', 'hearth'); const next = f.sources.at(-1);
  f.set({ region: 2, venue: 'cards' });
  assert.equal(next.stopped, true); assert.equal(f.Sound.status().effects.voices, 0);
});

test('effects-only victory can reuse the generated musical cue without synthesis or a second download', async () => {
  const f = fixture(); await f.complete(); f.Sound.sfx('win'); f.tick(); await f.complete(f.Sound.MUSIC.m_victory.b);
  f.Sound.setMu(false); const count = f.calls.length, synth = f.effectNodes.length;
  f.Sound.sfx('win');
  assert.equal(f.Sound.status().effects.lastSample, 'm_victory');
  assert.equal(f.effectNodes.length, synth); assert.equal(f.calls.length, count);
});

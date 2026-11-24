/* ===== Sound: contextual music and generated effects with immediate fallback ===== */
const Sound = (() => {
  /* Music files live in art/mu/. a and b are the loop start and end in seconds:
     the file plays from 0, then loops a..b. Each looping file carries a copied safety tail
     after b, so a small decoder offset stays seamless. One-shot cues play once. */
  const MUSIC = {
    "m_tallyport": {
      "a": 0,
      "b": 24.0,
      "v": 1,
      "loop": true
    },
    "m_brackwater": {
      "a": 0,
      "b": 50.526621,
      "v": 1,
      "loop": true
    },
    "m_haverly": {
      "a": 0,
      "b": 45.714286,
      "v": 1,
      "loop": true
    },
    "m_four_fords": {
      "a": 0,
      "b": 47.554467,
      "v": 1,
      "loop": true
    },
    "m_cinderwick": {
      "a": 0,
      "b": 41.739138,
      "v": 1,
      "loop": true
    },
    "m_kell": {
      "a": 0,
      "b": 53.333333,
      "v": 1,
      "loop": true
    },
    "m_highwatch": {
      "a": 0,
      "b": 28.235283,
      "v": 1,
      "loop": true
    },
    "m_aldermoot": {
      "a": 0,
      "b": 44.582313,
      "v": 1,
      "loop": true
    },
    "m_bilge": {
      "a": 0,
      "b": 26.749388,
      "v": 1,
      "loop": true
    },
    "m_sunken_sluice": {
      "a": 0,
      "b": 53.333333,
      "v": 1,
      "loop": true
    },
    "m_barrows": {
      "a": 0,
      "b": 28.235283,
      "v": 1,
      "loop": true
    },
    "m_tanglewarren": {
      "a": 0,
      "b": 45.714286,
      "v": 1,
      "loop": true
    },
    "m_slagdeep": {
      "a": 0,
      "b": 43.636372,
      "v": 1,
      "loop": true
    },
    "m_crystal": {
      "a": 0,
      "b": 25.263311,
      "v": 1,
      "loop": true
    },
    "m_ice": {
      "a": 0,
      "b": 30.0,
      "v": 1,
      "loop": true
    },
    "m_stacks": {
      "a": 0,
      "b": 26.749388,
      "v": 1,
      "loop": true
    },
    "m_wild_coast": {
      "a": 0,
      "b": 44.582313,
      "v": 1,
      "loop": true
    },
    "m_wild_fields": {
      "a": 0,
      "b": 41.610159,
      "v": 1,
      "loop": true
    },
    "m_wild_stone": {
      "a": 0,
      "b": 44.582313,
      "v": 1,
      "loop": true
    },
    "m_wild_north": {
      "a": 0,
      "b": 28.235465,
      "v": 1,
      "loop": true
    },
    "m_combat": {
      "a": 0,
      "b": 32.693696,
      "v": 1,
      "loop": true
    },
    "m_examiner": {
      "a": 0,
      "b": 32.0,
      "v": 1,
      "loop": true
    },
    "m_tavern": {
      "a": 0,
      "b": 40.0,
      "v": 1,
      "loop": true
    },
    "m_dojo": {
      "a": 0,
      "b": 43.636372,
      "v": 1,
      "loop": true
    },
    "m_cards": {
      "a": 0,
      "b": 41.610159,
      "v": 1,
      "loop": true
    },
    "m_title": {
      "a": 0,
      "b": 28.235465,
      "v": 1,
      "loop": true
    },
    "m_victory": {
      "a": 0,
      "b": 5.644853,
      "v": 1,
      "loop": false
    },
    "m_death": {
      "a": 0,
      "b": 8.546893,
      "v": 1,
      "loop": false
    }
  };
  const SAMPLES = {
    "s_door_open": 0.873787,
    "s_door_close": 0.5239,
    "s_swing": 0.245669,
    "s_thrust": 0.266576,
    "s_hit": 0.404671,
    "s_hurt": 0.477098,
    "s_bow": 0.276463,
    "s_miss": 0.31229,
    "s_coins": 0.437052,
    "s_cast_spark": 0.356508,
    "s_hit_spark": 0.322494,
    "s_cast_frost": 0.563719,
    "s_hit_frost": 0.557143,
    "s_cast_sun": 0.33805,
    "s_hit_sun": 0.589705,
    "s_cast_storm": 0.533923,
    "s_hit_storm": 1.501088,
    "s_cast_fire": 0.654694,
    "s_hit_fire": 0.884535,
    "s_cast_crystal": 0.724898,
    "s_hit_crystal": 0.708254,
    "s_cast_blizzard": 0.685125,
    "s_hit_blizzard": 1.138957,
    "s_cast_rewrite": 0.734376,
    "s_hit_rewrite": 0.904399,
    "s_smith": 1.158957,
    "s_alchemy": 1.278322,
    "s_craft_fail": 0.525034,
    "s_fish_cast": 0.960136,
    "s_fish_catch": 0.892063,
    "s_fish_empty": 0.754739,
    "s_creature_bird": 0.402993,
    "s_creature_small": 0.591701,
    "s_creature_beast": 0.531474,
    "s_creature_dragon": 1.421905,
    "s_creature_spirit": 1.207982,
    "s_creature_stone": 1.21424,
    "s_creature_insect": 0.533469,
    "s_creature_wet": 1.173469,
    "s_ambient_harbour": 3.590431,
    "s_ambient_market": 3.472834,
    "s_ambient_hearth": 3.060181,
    "s_ambient_cave": 2.888889,
    "s_ambient_drip": 0.471383,
    "s_ambient_draft": 2.837506,
    "s_heal": 0.791655,
    "s_grade_correct": 0.428798,
    "s_grade_close": 0.685215,
    "s_grade_partial": 0.124218,
    "s_grade_wrong": 0.664853,
    "s_click": 0.215737,
    "s_reward": 0.593379,
    "s_step_stone_1": 0.401859,
    "s_step_stone_2": 0.441905,
    "s_step_stone_3": 0.573651,
    "s_step_stone_4": 0.432925,
    "s_step_wood_1": 0.297143,
    "s_step_wood_2": 0.807211,
    "s_step_wood_3": 0.829569,
    "s_step_wood_4": 0.786621,
    "s_step_soil_1": 0.539546,
    "s_step_soil_2": 0.420091,
    "s_step_soil_3": 0.50517,
    "s_step_soil_4": 0.464535
  };
  const TOWN_MU = ['m_tallyport', 'm_brackwater', 'm_haverly', 'm_four_fords', 'm_cinderwick', 'm_kell', 'm_highwatch', 'm_aldermoot'];
  const DUN_MU = ['m_bilge', 'm_sunken_sluice', 'm_barrows', 'm_tanglewarren', 'm_slagdeep', 'm_crystal', 'm_ice', 'm_stacks'];
  const WILD_MU = ['m_wild_coast', 'm_wild_fields', 'm_wild_stone', 'm_wild_north'];
  const SURFACE_MU = new Set([...TOWN_MU, ...WILD_MU]);
  const COMBAT_MU = 'm_combat';
  const VENUE_MU = { tavern: 'm_tavern', dojo: 'm_dojo', cards: 'm_cards' };
  function trackFor(s) {
    if (!s) return null;
    if (s.title) return 'm_title';
    if (s.fight) return s.boss ? 'm_examiner' : COMBAT_MU;
    if (s.dun) return DUN_MU[s.dun - 1] || null;
    if (!(s.region >= 1 && s.region <= 8)) return null;
    if (VENUE_MU[s.venue]) return VENUE_MU[s.venue];
    return s.town === false ? WILD_MU[Math.floor((s.region - 1) / 2)] : TOWN_MU[s.region - 1];
  }
  const MU_VOL = .55, FX_VOL = .7, XFADE = 1.6, AREA_SETTLE = 5, CACHE = 2, PREF = 'brasswake.sound';
  let ctx = null, master = null, muBus = null, fxBus = null, noiseBuf = null, src = () => null, timer = 0;
  let pref = { mu: 1, fx: 1 };
  try { const p = JSON.parse(localStorage.getItem(PREF) || 'null'); if (p) pref = Object.assign(pref, p); } catch (e) { }
  const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch (e) { } };
  const buf = {}, order = [], retry = {}, pos = {};
  let cur = null, want = null, pending = null, cueId = null, cueDeadline = 0;
  let surface = null, candidate = null;

  function makeCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
    master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -8; limiter.knee.value = 12; limiter.ratio.value = 6; limiter.attack.value = .003; limiter.release.value = .12;
    master.connect(limiter); limiter.connect(ctx.destination);
    muBus = ctx.createGain(); muBus.gain.value = pref.mu ? MU_VOL : 0; muBus.connect(master);
    fxBus = ctx.createGain(); fxBus.gain.value = pref.fx ? FX_VOL : 0; fxBus.connect(master);
    const n = ctx.sampleRate; noiseBuf = ctx.createBuffer(1, n, n);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function unlock() {
    const c = makeCtx();
    if (!c) return;
    if (c.state !== 'running') c.resume().then(() => { tick(); warmEffects(); }).catch(() => { }); else { tick(); warmEffects(); }
  }
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('touchend', unlock, true);
  document.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { silenceEffects(); tick(); ctx.suspend().catch(() => { }); }
    else ctx.resume().then(() => { tick(); warmEffects(); }).catch(() => { });
  });
  if (window.addEventListener) {
    window.addEventListener('blur', () => { candidate = null; });
    window.addEventListener('focus', () => { candidate = null; tick(); });
  }

  function trimCache() {
    while (order.length > CACHE) {
      const old = order.find(k => k !== want && (!cur || cur.id !== k));
      if (!old) break;
      order.splice(order.indexOf(old), 1); delete buf[old];
    }
  }
  function load(id) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8000);
    const request = pending = { id, controller, superseded: false };
    fetch('art/mu/' + id + (MUSIC[id].loop === false ? '.wav' : '.mp3'), { signal: controller.signal, cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
      .then(b => {
        /* One-shots play the whole buffer; rounded duration is not a loop boundary. */
        if (MUSIC[id].loop !== false && !(b.duration >= MUSIC[id].b)) throw new Error('Music loop exceeds decoded duration');
        buf[id] = b; order.push(id); trimCache();
      })
      .catch(() => {
        if (request.superseded) return;
        retry[id] = ctx.currentTime + 10;
        if (want === id && !(SURFACE_MU.has(id) && cur && cur.id === surface)) stopCur(XFADE);
      })
      .finally(() => { clearTimeout(timeout); pending = null; tick(); });
  }
  const where = c => {
    const m = MUSIC[c.id], t = c.off + ctx.currentTime - c.t0;
    return m.loop === false ? 0 : t < m.b ? t : m.a + (t - m.a) % (m.b - m.a);
  };
  function stopCur(fade) {
    if (!cur) return;
    const c = cur; cur = null; pos[c.id] = where(c);
    const t = ctx.currentTime; c.gain.gain.cancelScheduledValues(t);
    c.gain.gain.setValueAtTime(c.gain.gain.value, t); c.gain.gain.linearRampToValueAtTime(0, t + fade);
    try { c.node.stop(t + fade + .05); } catch (e) { }
  }
  function startTrack(id) {
    const b = buf[id], m = MUSIC[id]; if (!b || !m) return;
    const node = ctx.createBufferSource(); node.buffer = b; node.loop = m.loop !== false;
    node.loopStart = m.a; node.loopEnd = m.b;
    const g = ctx.createGain(); g.gain.value = 0; node.connect(g); g.connect(muBus);
    const off = id === COMBAT_MU || id === 'm_examiner' || !node.loop ? 0 : (pos[id] || 0);
    node.onended = () => {
      node.disconnect(); g.disconnect();
      if (cur && cur.node === node) { cur = null; if (!node.loop) { cueId = null; tick(); } }
    };
    node.start(0, off);
    const t = ctx.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(m.v, t + (node.loop ? XFADE : .06));
    cur = { id, node, gain: g, t0: t, off };
    if (SURFACE_MU.has(id)) { surface = id; candidate = null; }
  }
  function settledSurface(id) {
    if (!surface || surface === id) { candidate = null; return id; }
    const now = ctx.currentTime;
    if (!candidate || candidate.id !== id) candidate = { id, since: now };
    // Keep the last audible area until its replacement both settles and loads.
    return now - candidate.since >= AREA_SETTLE ? id : surface;
  }
  function tick() {
    if (!ctx) return;
    updateEffectContext();
    if (!pref.mu || document.hidden) { want = cueId = surface = candidate = null; stopCur(.15); return; }
    if (ctx.state !== 'running') { candidate = null; return; }
    let s = null; try { s = src(); } catch (e) { }
    const base = trackFor(s);
    if (cueId && ((s && (s.title || s.fight)) || ((!cur || cur.id !== cueId) && ctx.currentTime > cueDeadline))) cueId = null;
    if (cueId || !SURFACE_MU.has(base)) candidate = null;
    if (!s || s.title || s.dun || s.venue || (!s.fight && !base)) surface = null;
    const id = cueId || (SURFACE_MU.has(base) ? settledSurface(base) : base); want = id;
    if (cur && cur.id === id) return;
    if (!id) { stopCur(XFADE); return; }
    if (buf[id]) {
      stopCur(MUSIC[id].loop === false || id === COMBAT_MU || id === 'm_examiner' ? .3 : XFADE);
      startTrack(id); trimCache();
    } else if (!(retry[id] > ctx.currentTime)) {
      if (!pending) load(id);
      else if (pending.id !== id && (cueId || s.fight) && !pending.superseded) {
        pending.superseded = true;
        pending.controller.abort();
      }
    }
  }
  function cue(id) {
    if (!ctx || ctx.state !== 'running' || !pref.mu || document.hidden) return false;
    let active = null; try { active = src(); } catch (e) { }
    if (!trackFor(active)) return false;
    cueId = id; cueDeadline = ctx.currentTime + 4;
    return true;
  }

  /* ---------- generated effects: bounded loads/cache/voices ---------- */
  const FX_CACHE = 24, FX_BYTES = 4 * 1024 * 1024, FX_LOADS = 2, FX_QUEUE = 16, FX_VOICES = 12;
  const fxBuffers = new Map(), fxLoads = new Map(), fxQueue = [], fxRetry = {}, fxVoices = new Set(), synthVoices = new Set();
  let fxBytes = 0, fxWarmed = false, effectContext = '', effectSerial = 0, lastSample = null;
  const fxVariants = {};
  function sampleFor(name, detail) {
    if (name === 'win' || name === 'death') return name === 'win' ? 'm_victory' : 'm_death';
    if (name === 'step') {
      const material = detail === 'wood' || detail === 'stone' ? detail : 'soil';
      const prior = fxVariants[material] || 0;
      const next = (prior + 1 + (Math.random() * 3 | 0)) % 4;
      fxVariants[material] = next;
      return 's_step_' + material + '_' + (next + 1);
    }
    if (name === 'door') return detail === 'closing' ? 's_door_close' : 's_door_open';
    if (name === 'cast' || name === 'spellHit') return 's_' + (name === 'cast' ? 'cast_' : 'hit_') + ((detail && detail.id) || 'spark');
    if (name === 'creature') return detail === 'bow' || detail === 'swing' ? 's_' + detail : 's_creature_' + (detail || 'beast');
    if (name === 'ambient') return 's_ambient_' + detail;
    if (['correct', 'close', 'partial', 'wrong'].includes(name)) return 's_grade_' + name;
    return { craftFail: 's_craft_fail', fishCast: 's_fish_cast', fishCatch: 's_fish_catch', fishEmpty: 's_fish_empty' }[name] || 's_' + name;
  }
  const sampleDuration = id => SAMPLES[id] || (MUSIC[id] && MUSIC[id].loop === false ? MUSIC[id].b : 0);
  function trimEffects() {
    while (fxBuffers.size > FX_CACHE || fxBytes > FX_BYTES) {
      const id = fxBuffers.keys().next().value, b = fxBuffers.get(id);
      fxBytes -= b.length * b.numberOfChannels * 4; fxBuffers.delete(id);
    }
  }
  function pumpEffects() {
    if (!ctx || ctx.state !== 'running' || !pref.fx || document.hidden) return;
    while (fxLoads.size < FX_LOADS && fxQueue.length) {
      const id = fxQueue.shift();
      if (fxBuffers.has(id) || fxLoads.has(id) || fxRetry[id] > ctx.currentTime) continue;
      const controller = new AbortController(), request = { controller, canceled: false };
      const timeout = setTimeout(() => controller.abort(), 8000);
      fxLoads.set(id, request);
      fetch((MUSIC[id] ? 'art/mu/' : 'art/fx/') + id + '.wav', { signal: controller.signal, cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(ab => new Promise((resolve, reject) => ctx.decodeAudioData(ab, resolve, reject)))
        .then(b => {
          if (request.canceled) return;
          if (!(b.duration > 0 && Math.abs(b.duration - sampleDuration(id)) < .003 && b.length * b.numberOfChannels * 4 <= FX_BYTES)) throw new Error('Invalid effect buffer');
          fxBuffers.set(id, b); fxBytes += b.length * b.numberOfChannels * 4; trimEffects();
        })
        .catch(() => { if (!request.canceled) fxRetry[id] = ctx.currentTime + 10; })
        .finally(() => { clearTimeout(timeout); fxLoads.delete(id); pumpEffects(); });
    }
  }
  function loadEffect(id, priority) {
    if (!sampleDuration(id) || typeof fetch !== 'function' || typeof AbortController !== 'function' || fxBuffers.has(id) || fxLoads.has(id) || fxQueue.includes(id) || fxRetry[id] > ctx.currentTime) return;
    if (fxQueue.length >= FX_QUEUE) { if (!priority) return; fxQueue.pop(); }
    if (priority) fxQueue.unshift(id); else fxQueue.push(id);
    pumpEffects();
  }
  function warmEffects() {
    if (fxWarmed || !ctx || ctx.state !== 'running' || !pref.fx || document.hidden) return;
    fxWarmed = true;
    ['s_click', 's_door_open', 's_door_close', 's_step_stone_1', 's_step_wood_1', 's_step_soil_1', 's_swing', 's_thrust', 's_hit', 's_hurt', 's_bow', 's_miss'].forEach(id => loadEffect(id, false));
  }
  function stopVoice(voice, collection) {
    if (!collection.has(voice)) return;
    collection.delete(voice);
    voice.node.onended = null;
    try { voice.node.stop(); } catch (e) { }
    voice.disconnect();
  }
  function silenceEffects() {
    for (const v of [...fxVoices]) stopVoice(v, fxVoices);
    for (const v of [...synthVoices]) stopVoice(v, synthVoices);
    fxQueue.length = 0; fxWarmed = false;
    for (const r of fxLoads.values()) { r.canceled = true; r.controller.abort(); }
  }
  function updateEffectContext() {
    let s = null; try { s = src(); } catch (e) { }
    const key = s ? [s.title, s.fight, s.dun, s.region, s.town, s.venue].join(':') : '';
    if (key !== effectContext) {
      effectContext = key;
      for (const v of [...fxVoices]) if (v.ambient) stopVoice(v, fxVoices);
    }
  }
  function playSample(id, name, detail) {
    let b = fxBuffers.get(id) || buf[id];
    if (!b) loadEffect(id, true);
    if (!b && name === 'step') {
      const prefix = id.slice(0, -1);
      const cached = [...fxBuffers.keys()].filter(k => k.startsWith(prefix));
      if (cached.length) { id = cached[Math.random() * cached.length | 0]; b = fxBuffers.get(id); }
    }
    if (!b) return false;
    if (fxBuffers.has(id)) { fxBuffers.delete(id); fxBuffers.set(id, b); }
    while (fxVoices.size >= FX_VOICES) stopVoice(fxVoices.values().next().value, fxVoices);
    const node = ctx.createBufferSource(), gain = ctx.createGain(); node.buffer = b;
    const variable = ['step', 'swing', 'thrust', 'bow', 'hit', 'miss', 'creature'].includes(name);
    if (node.playbackRate) node.playbackRate.value = variable ? .98 + Math.random() * .04 : 1;
    gain.gain.value = detail && detail.rare ? 1.1 : variable ? .94 + Math.random() * .12 : 1;
    node.connect(gain); gain.connect(fxBus);
    const voice = { node, ambient: name === 'ambient', disconnect: () => { node.disconnect(); gain.disconnect(); } };
    fxVoices.add(voice);
    node.onended = () => { fxVoices.delete(voice); voice.disconnect(); };
    node.start(); lastSample = id; effectSerial++;
    return true;
  }
  function boundSynth(node, disconnect) {
    while (synthVoices.size >= 32) stopVoice(synthVoices.values().next().value, synthVoices);
    const voice = { node, disconnect }; synthVoices.add(voice);
    node.onended = () => { synthVoices.delete(voice); disconnect(); };
  }

  /* ---------- immediate synthesis fallback ---------- */
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(type, f0, f1, t, a, d, peak, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    env(g, t, a, peak, d); o.connect(g); g.connect(dest || fxBus); boundSynth(o, () => { o.disconnect(); g.disconnect(); }); o.start(t); o.stop(t + a + d + .05);
  }
  function noise(t, d, peak, ftype, f0, f1, q) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; f.type = ftype; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + d);
    env(g, t, .005, peak, d); s.connect(f); f.connect(g); g.connect(fxBus); boundSynth(s, () => { s.disconnect(); f.disconnect(); g.disconnect(); }); s.start(t, Math.random() * .5); s.stop(t + d + .05);
  }
  const notes = (seq, type, gap, peak, d) => { const t = ctx.currentTime + .01; seq.forEach((f, i) => tone(type, f, f, t + i * gap, .008, d, peak)); };
  const vary = () => .93 + Math.random() * .14;
  function magic(s, impact) {
    s = s || Effects.spell(1); const t = ctx.currentTime, p = s.pitch * vary(), v = s.rare ? .19 : .15;
    const ping = (f, dt, d, type) => tone(type || 'sine', f, f * (impact ? .8 : 1.3), t + dt, .006, d, v);
    switch (s.id) {
      case 'spark': ping(p, 0, .12, 'triangle'); ping(p * 1.5, .045, .1); noise(t, .09, .12, 'highpass', 3500, 6000); break;
      case 'frost': [1, 1.5, 2].forEach((f, i) => ping(p * f, i * .035, .19)); noise(t, .17, .1, 'bandpass', 4000, 1800, 2); break;
      case 'sun': [1, 1.25, 1.5].forEach(f => ping(p * f, 0, impact ? .3 : .2, 'triangle')); break;
      case 'storm': [0, .045, .11].forEach(dt => noise(t + dt, .1, .19, 'lowpass', 5000, 700)); ping(p, 0, .2, 'triangle'); break;
      case 'fire': tone('sine', p * 2, p * .6, t, .008, .23, .23); noise(t, impact ? .28 : .2, .25, 'lowpass', 1700, 300); break;
      case 'crystal': [1, 1.26, 1.9, 2.4].forEach((f, i) => ping(p * f, i * .035, .25)); break;
      case 'blizzard': noise(t, .34, .18, 'bandpass', impact ? 3500 : 1200, 4500, .6); [1, 2.01].forEach((f, i) => ping(p * f, i * .07, .18)); break;
      case 'rewrite': [1, 1.059, 1.5].forEach((f, i) => tone('sine', p * f * (impact ? 2 : .7), p * f * (impact ? .5 : 2), t + i * .04, .025, .3, .13)); break;
    }
    if (s.rare) ping(p * 2, .12, .23);
  }
  const SFX = {
    swing: () => { const k = vary(); noise(ctx.currentTime, .14 * k, .3, 'bandpass', 600 * k, 2600 * k, 1.2); },
    thrust: () => { const k = vary(); noise(ctx.currentTime, .1 * k, .28, 'bandpass', 1400 * k, 3200 * k, 2); },
    cast: s => magic(s, false),
    spellHit: s => magic(s, true),
    hit: () => { const t = ctx.currentTime, k = vary(); tone('sine', 140 * k, 55 * k, t, .003, .14, .4); noise(t, .08, .27, 'lowpass', 2200 * k, 400, .8); },
    hurt: () => { const t = ctx.currentTime, k = vary(); tone('triangle', 110 * k, 45 * k, t, .003, .2, .35); noise(t, .12, .24, 'lowpass', 1200, 200, .8); },
    bow: () => { const t = ctx.currentTime, k = vary(); tone('triangle', 196 * k, 150 * k, t, .002, .12, .26); noise(t, .14, .16, 'bandpass', 3000, 1500, 1.5); },
    miss: () => noise(ctx.currentTime, .12, .14, 'highpass', 2500, 5000, .7),
    coins: () => { const t = ctx.currentTime; [0, .06, .13, .17, .26].forEach((dt, i) => tone('triangle', 2400 + Math.random() * 1800, 2400 + Math.random() * 1800, t + dt, .002, .12 + i * .02, .12)); },
    heal: () => notes([523, 659, 784, 1047], 'sine', .07, .16, .35),
    correct: () => notes([784, 1175], 'triangle', .09, .22, .3),
    close: () => notes([659, 784], 'triangle', .09, .16, .25),
    partial: () => notes([523, 494], 'triangle', .1, .14, .25),
    wrong: () => { const t = ctx.currentTime; tone('square', 220, 160, t, .01, .28, .09); tone('square', 185, 130, t + .14, .01, .3, .08); },
    win: () => notes([523, 659, 784, 1047, 784, 1047], 'triangle', .11, .2, .32),
    death: () => { const t = ctx.currentTime;[392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f * .98, t + i * .32, .02, .6, .18)); },
    click: () => tone('sine', 1800, 1200, ctx.currentTime, .001, .03, .05),
    creature: family => {
      const t = ctx.currentTime, k = vary();
      if (family === 'bow') return SFX.bow();
      if (family === 'swing') return SFX.swing();
      const voice = { bird: [1500, 800, 'sine'], small: [950, 500, 'triangle'], beast: [130, 65, 'sawtooth'], dragon: [75, 35, 'sawtooth'], spirit: [440, 180, 'sine'], stone: [85, 42, 'triangle'], insect: [320, 95, 'square'], wet: [220, 85, 'sine'] }[family] || [130, 65, 'triangle'];
      tone(voice[2], voice[0] * k, voice[1] * k, t, .012, family === 'dragon' ? .4 : .2, .1);
      noise(t, .14, .14, 'bandpass', family === 'stone' ? 600 : 1600, 400, 1);
    },
    smith: () => { const t = ctx.currentTime, k = vary(); [0, .15, .32].forEach(dt => { tone('triangle', 1050 * k, 720 * k, t + dt, .002, .13, .13); noise(t + dt, .04, .12, 'highpass', 2400, 1600); }); },
    alchemy: () => { const t = ctx.currentTime; [0, .08, .2, .32].forEach(dt => tone('sine', 180 * vary(), 600 * vary(), t + dt, .006, .08, .13)); },
    craftFail: () => { noise(ctx.currentTime, .19, .17, 'lowpass', 1400, 250); tone('triangle', 260, 120, ctx.currentTime, .004, .17, .12); },
    fishCast: () => { SFX.swing(); noise(ctx.currentTime + .16, .2, .17, 'bandpass', 1100, 400, .7); },
    fishCatch: () => { const t = ctx.currentTime; [0, .1, .23].forEach(dt => noise(t + dt, .12, .2, 'bandpass', 700 * vary(), 2300, .6)); },
    fishEmpty: () => noise(ctx.currentTime, .15, .09, 'bandpass', 900, 350, .6),
    door: () => { const t = ctx.currentTime; tone('triangle', 170 * vary(), 95, t, .012, .16, .08); noise(t + .13, .05, .12, 'lowpass', 900, 200); },
    step: surface => { const t = ctx.currentTime, hard = surface === 'stone', wood = surface === 'wood'; noise(t, .045, .07, hard ? 'highpass' : 'lowpass', hard ? 1800 : wood ? 1300 : 650, hard ? 900 : 250); if (hard || wood) tone('sine', wood ? 190 : 120, 65, t, .002, .04, .08); },
    ambient: place => {
      const t = ctx.currentTime, k = vary();
      switch (place) {
        case 'harbour': noise(t, .4, .045, 'lowpass', 850, 280, .75); break;
        case 'market': noise(t, .22, .025, 'bandpass', 650, 420, .6); noise(t + .2, .12, .022, 'bandpass', 490, 670, .65); break;
        case 'hearth': [0, .085, .18].forEach(dt => noise(t + dt, .035, .028, 'bandpass', 1550 * k, 450, .85)); break;
        case 'cave': noise(t, .4, .026, 'lowpass', 375, 145, .55); break;
        case 'drip': tone('sine', 720 * k, 330 * k, t, .004, .12, .038); tone('sine', 390 * k, 310 * k, t + .14, .01, .15, .012); break;
        case 'draft': noise(t, .45, .025, 'bandpass', 600, 1050, .45); break;
      }
    },
    reward: () => notes([659, 988, 1319], 'sine', .06, .12, .22)
  };
  const recent = {};
  function sfx(name, detail) {
    /* One musical phrase; effects-only cues remain available when music is muted. */
    if ((name === 'win' || name === 'death') && cue(name === 'win' ? 'm_victory' : 'm_death')) return;
    if (!ctx || ctx.state !== 'running' || document.hidden || !pref.fx || !SFX[name]) return;
    /* Only repetitive world events are throttled; query and combat outcomes remain audible. */
    const gap = { step: .14, door: .35, click: .025, ambient: 7 }[name] || 0, t = ctx.currentTime;
    if (gap && recent[name] != null && t - recent[name] < gap) return;
    recent[name] = t;
    try { if (!playSample(sampleFor(name, detail), name, detail)) SFX[name](detail); } catch (e) { try { SFX[name](detail); } catch (e) { } }
  }

  function setMu(on) { pref.mu = on ? 1 : 0; savePref(); if (muBus) { muBus.gain.setTargetAtTime(on ? MU_VOL : 0, ctx.currentTime, .15); tick(); } }
  function setFx(on) { pref.fx = on ? 1 : 0; savePref(); if (fxBus) { fxBus.gain.setTargetAtTime(on ? FX_VOL : 0, ctx.currentTime, .05); if (on) warmEffects(); else silenceEffects(); } }
  /* source() returns title/fight/boss/dun/region/town, or null for silence. */
  function init(source) { src = source; if (!timer) timer = setInterval(tick, 400); }
  return { init, sfx, setMu, setFx, pref: () => Object.assign({}, pref), state: () => ctx ? ctx.state : 'none', playing: () => cur ? cur.id : null, MUSIC, trackFor, effects: () => Object.keys(SFX),
    SAMPLES, sampleFor,
    status: () => ({ wanted: want, playing: cur ? cur.id : null, pending: pending ? pending.id : null, cached: order.slice(), cue: cueId,
      effects: { cached: [...fxBuffers.keys()], bytes: fxBytes, loading: [...fxLoads.keys()], queued: fxQueue.slice(), voices: fxVoices.size, synthVoices: synthVoices.size, lastSample, serial: effectSerial } }),
    /* test hook: exercises every synthesis fallback and returns failures */
    _check: () => !ctx ? ['no context'] : Object.keys(SFX).filter(k => { try { SFX[k](); return false; } catch (e) { return true; } }) };
})();

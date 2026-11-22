/* ===== Sound: looping music by place and situation, synthesized sound effects ===== */
const Sound = (() => {
  /* Music files live in art/mu/. a and b are the loop start and end in seconds:
     the file plays from 0, then loops a..b. Each looping file carries a copied safety tail
     after b, so a small decoder offset stays seamless. One-shot cues play once. */
  const MUSIC = {
    "m_tallyport": {
      "a": 10.658,
      "b": 159.6553,
      "v": 1
    },
    "m_bilge": {
      "a": 14.721,
      "b": 69.5739,
      "v": 1
    },
    "m_combat": {
      "a": 22.361,
      "b": 75.5065,
      "v": 1
    },
    "m_barrows": {
      "a": 0,
      "b": 56.47059,
      "v": 1,
      "loop": true
    },
    "m_tanglewarren": {
      "a": 0,
      "b": 45.714308,
      "v": 1,
      "loop": true
    },
    "m_slagdeep": {
      "a": 0,
      "b": 43.636349,
      "v": 1,
      "loop": true
    },
    "m_crystal": {
      "a": 0,
      "b": 53.333311,
      "v": 1,
      "loop": true
    },
    "m_ice": {
      "a": 0,
      "b": 61.935488,
      "v": 1,
      "loop": true
    },
    "m_stacks": {
      "a": 0,
      "b": 50.526327,
      "v": 1,
      "loop": true
    },
    "m_wild_coast": {
      "a": 0,
      "b": 48,
      "v": 1,
      "loop": true
    },
    "m_wild_fields": {
      "a": 0,
      "b": 51.428594,
      "v": 1,
      "loop": true
    },
    "m_wild_stone": {
      "a": 0,
      "b": 49.230794,
      "v": 1,
      "loop": true
    },
    "m_wild_north": {
      "a": 0,
      "b": 54.857143,
      "v": 1,
      "loop": true
    },
    "m_examiner": {
      "a": 0,
      "b": 44.44449,
      "v": 1,
      "loop": true
    },
    "m_tavern": {
      "a": 0,
      "b": 43.2,
      "v": 1,
      "loop": true
    },
    "m_dojo": {
      "a": 0,
      "b": 43.636349,
      "v": 1,
      "loop": true
    },
    "m_cards": {
      "a": 0,
      "b": 41.739138,
      "v": 1,
      "loop": true
    },
    "m_title": {
      "a": 0,
      "b": 50.526327,
      "v": 1,
      "loop": true
    },
    "m_victory": {
      "a": 0,
      "b": 6.137937,
      "v": 1,
      "loop": false
    },
    "m_death": {
      "a": 0,
      "b": 11.375011,
      "v": 1,
      "loop": false
    },
    "m_brackwater": {
      "a": 0,
      "b": 53.638776,
      "v": 1,
      "loop": true
    },
    "m_haverly": {
      "a": 0,
      "b": 44.582313,
      "v": 1,
      "loop": true
    },
    "m_four_fords": {
      "a": 0,
      "b": 44.442313,
      "v": 1,
      "loop": true
    },
    "m_cinderwick": {
      "a": 0,
      "b": 47.694467,
      "v": 1,
      "loop": true
    },
    "m_kell": {
      "a": 0,
      "b": 53.498776,
      "v": 1,
      "loop": true
    },
    "m_highwatch": {
      "a": 0,
      "b": 44.722313,
      "v": 1,
      "loop": true
    },
    "m_aldermoot": {
      "a": 0,
      "b": 53.638776,
      "v": 1,
      "loop": true
    },
    "m_sunken_sluice": {
      "a": 0,
      "b": 35.66585,
      "v": 1,
      "loop": true
    }
  };
  const TOWN_MU = ['m_tallyport', 'm_brackwater', 'm_haverly', 'm_four_fords', 'm_cinderwick', 'm_kell', 'm_highwatch', 'm_aldermoot'];
  const DUN_MU = ['m_bilge', 'm_sunken_sluice', 'm_barrows', 'm_tanglewarren', 'm_slagdeep', 'm_crystal', 'm_ice', 'm_stacks'];
  const WILD_MU = ['m_wild_coast', 'm_wild_fields', 'm_wild_stone', 'm_wild_north'];
  const VENUE_MU = { tavern: 'm_tavern', dojo: 'm_dojo', cards: 'm_cards' };
  const COMBAT_MU = 'm_combat';
  function trackFor(s) {
    if (!s) return null;
    if (s.title) return 'm_title';
    if (s.fight) return s.boss ? 'm_examiner' : COMBAT_MU;
    if (s.dun) return DUN_MU[s.dun - 1] || null;
    if (VENUE_MU[s.venue]) return VENUE_MU[s.venue];
    if (!(s.region >= 1 && s.region <= 8)) return null;
    return s.town === false ? WILD_MU[Math.floor((s.region - 1) / 2)] : TOWN_MU[s.region - 1];
  }
  const MU_VOL = .55, FX_VOL = .7, XFADE = 1.6, CACHE = 2, PREF = 'brasswake.sound';
  let ctx = null, master = null, muBus = null, fxBus = null, noiseBuf = null, src = () => null, timer = 0;
  let pref = { mu: 1, fx: 1 };
  try { const p = JSON.parse(localStorage.getItem(PREF) || 'null'); if (p) pref = Object.assign(pref, p); } catch (e) { }
  const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch (e) { } };
  const buf = {}, order = [], retry = {}, pos = {};
  let cur = null, want = null, pending = null, cueId = null, cueDeadline = 0;

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
    if (c.state !== 'running') c.resume().then(tick).catch(() => { }); else tick();
  }
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('touchend', unlock, true);
  document.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { tick(); ctx.suspend().catch(() => { }); }
    else ctx.resume().then(tick).catch(() => { });
  });

  function trimCache() {
    while (order.length > CACHE) {
      const old = order.find(k => k !== want && (!cur || cur.id !== k));
      if (!old) break;
      order.splice(order.indexOf(old), 1); delete buf[old];
    }
  }
  function load(id) {
    pending = id;
    const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 8000);
    fetch('art/mu/' + id + (MUSIC[id].loop === false ? '.wav' : '.mp3'), { signal: abort.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
      .then(b => {
        /* One-shots play the whole buffer; rounded duration is not a loop boundary. */
        if (MUSIC[id].loop !== false && !(b.duration >= MUSIC[id].b)) throw new Error('Music loop exceeds decoded duration');
        buf[id] = b; order.push(id); trimCache();
      })
      .catch(() => { retry[id] = ctx.currentTime + 10; if (want === id) stopCur(XFADE); })
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
  }
  function tick() {
    if (!ctx) return;
    if (!pref.mu || document.hidden) { want = cueId = null; stopCur(.15); return; }
    if (ctx.state !== 'running') return;
    let s = null; try { s = src(); } catch (e) { }
    const base = trackFor(s);
    if (cueId && ((s && (s.title || s.fight)) || ((!cur || cur.id !== cueId) && ctx.currentTime > cueDeadline))) cueId = null;
    const id = cueId || base; want = id;
    if (cur && cur.id === id) return;
    if (!id) { stopCur(XFADE); return; }
    if (buf[id]) {
      stopCur(MUSIC[id].loop === false || id === COMBAT_MU || id === 'm_examiner' ? .3 : XFADE);
      startTrack(id); trimCache();
    } else if (!pending && !(retry[id] > ctx.currentTime)) load(id);
  }
  function cue(id) {
    if (!ctx || ctx.state !== 'running' || !pref.mu || document.hidden) return false;
    let active = null; try { active = src(); } catch (e) { }
    if (!trackFor(active)) return false;
    cueId = id; cueDeadline = ctx.currentTime + 4;
    return true;
  }

  /* ---------- sound effects, synthesized ---------- */
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(type, f0, f1, t, a, d, peak, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    env(g, t, a, peak, d); o.connect(g); g.connect(dest || fxBus); o.onended = () => { o.disconnect(); g.disconnect(); }; o.start(t); o.stop(t + a + d + .05);
  }
  function noise(t, d, peak, ftype, f0, f1, q) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; f.type = ftype; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + d);
    env(g, t, .005, peak, d); s.connect(f); f.connect(g); g.connect(fxBus); s.onended = () => { s.disconnect(); f.disconnect(); g.disconnect(); }; s.start(t, Math.random() * .5); s.stop(t + d + .05);
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
    reward: () => notes([659, 988, 1319], 'sine', .06, .12, .22)
  };
  const recent = {};
  function sfx(name, detail) {
    /* One musical phrase; effects-only cues remain available when music is muted. */
    if ((name === 'win' || name === 'death') && cue(name === 'win' ? 'm_victory' : 'm_death')) return;
    if (!ctx || ctx.state !== 'running' || !pref.fx || !SFX[name]) return;
    /* Only repetitive world events are throttled; query and combat outcomes remain audible. */
    const gap = { step: .14, door: .35, click: .025 }[name] || 0, t = ctx.currentTime;
    if (gap && recent[name] != null && t - recent[name] < gap) return;
    recent[name] = t; try { SFX[name](detail); } catch (e) { }
  }

  function setMu(on) { pref.mu = on ? 1 : 0; savePref(); if (muBus) { muBus.gain.setTargetAtTime(on ? MU_VOL : 0, ctx.currentTime, .15); tick(); } }
  function setFx(on) { pref.fx = on ? 1 : 0; savePref(); if (fxBus) fxBus.gain.setTargetAtTime(on ? FX_VOL : 0, ctx.currentTime, .05); }
  /* source() returns title/fight/boss/dun/region/town/venue, or null for silence. */
  function init(source) { src = source; if (!timer) timer = setInterval(tick, 400); }
  return { init, sfx, setMu, setFx, pref: () => Object.assign({}, pref), state: () => ctx ? ctx.state : 'none', playing: () => cur ? cur.id : null, MUSIC, trackFor, effects: () => Object.keys(SFX),
    status: () => ({ wanted: want, playing: cur ? cur.id : null, pending, cached: order.slice(), cue: cueId }),
    /* test hook: runs every effect once and returns the names that threw */
    _check: () => !ctx ? ['no context'] : Object.keys(SFX).filter(k => { try { SFX[k](); return false; } catch (e) { return true; } }) };
})();

/* ===== Sound: looping music by place and situation, synthesized sound effects ===== */
const Sound = (() => {
  /* Music files live in art/mu/. a and b are the loop start and end in seconds:
     the file plays from 0, then loops a..b. Each file carries one extra second
     after b (a copy of the audio at a), so a small decoder offset stays seamless. */
  const MUSIC = {
    m_tallyport: { a: 10.658, b: 159.6553, v: 1 },
    m_bilge: { a: 14.721, b: 69.5739, v: 1 },
    m_combat: { a: 22.361, b: 75.5065, v: 1 }
  };
  /* Which track plays where. Regions are 1..8. Missing entries play nothing yet. */
  const TOWN_MU = { 1: 'm_tallyport' }, DUN_MU = { 1: 'm_bilge' }, COMBAT_MU = 'm_combat';
  const MU_VOL = 0.55, FX_VOL = 0.7, XFADE = 1.6, CACHE = 2, PREF = 'brasswake.sound';

  let ctx = null, master = null, muBus = null, fxBus = null, noiseBuf = null, src = () => null, timer = 0;
  let pref = { mu: 1, fx: 1 };
  try { const p = JSON.parse(localStorage.getItem(PREF) || 'null'); if (p) pref = Object.assign(pref, p); } catch (e) { }
  const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch (e) { } };

  const buf = {}, order = [], loading = {};
  const pos = {};      /* where each track was when it last stopped, for resuming */
  let cur = null;      /* { id, node, gain, t0, off } */
  let want = null;

  function makeCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    /* iOS 17+: play through the silent switch, like a game would */
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
    master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -8; limiter.knee.value = 12; limiter.ratio.value = 6; limiter.attack.value = .003; limiter.release.value = .12;
    master.connect(limiter); limiter.connect(ctx.destination);
    muBus = ctx.createGain(); muBus.gain.value = pref.mu ? MU_VOL : 0; muBus.connect(master);
    fxBus = ctx.createGain(); fxBus.gain.value = pref.fx ? FX_VOL : 0; fxBus.connect(master);
    const n = ctx.sampleRate; noiseBuf = ctx.createBuffer(1, n, n); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  /* Browsers start audio only after a touch. Resume on every touch until running. */
  function unlock() { const c = makeCtx(); if (c && c.state !== 'running') c.resume().catch(() => { }); }
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('touchend', unlock, true);
  document.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => { }); else ctx.resume().catch(() => { }); });

  function load(id) {
    if (buf[id]) return Promise.resolve(buf[id]);
    if (loading[id]) return loading[id];
    return loading[id] = fetch('art/mu/' + id + '.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
      .then(b => {
        buf[id] = b; order.push(id); delete loading[id];
        /* decoded music is large (about 30 MB per minute of stereo), so keep only a few */
        while (order.length > CACHE) { const old = order.find(k => k !== id && k !== want && (!cur || cur.id !== k)); if (!old) break; order.splice(order.indexOf(old), 1); delete buf[old]; }
        return b;
      })
      .catch(() => { delete loading[id]; return null; });
  }
  const where = c => { const m = MUSIC[c.id], t = c.off + ctx.currentTime - c.t0; return t < m.b ? t : m.a + (t - m.a) % (m.b - m.a); };
  function stopCur(fade) {
    if (!cur) return; const c = cur; cur = null;
    try { pos[c.id] = where(c); } catch (e) { }
    const t = ctx.currentTime; c.gain.gain.cancelScheduledValues(t); c.gain.gain.setValueAtTime(c.gain.gain.value, t); c.gain.gain.linearRampToValueAtTime(0, t + fade);
    try { c.node.stop(t + fade + .05); } catch (e) { }
  }
  function startTrack(id) {
    const b = buf[id], m = MUSIC[id]; if (!b || !m) return;
    const node = ctx.createBufferSource(); node.buffer = b; node.loop = true; node.loopStart = m.a; node.loopEnd = m.b;
    const g = ctx.createGain(); g.gain.value = 0; node.connect(g); g.connect(muBus);
    /* resume a track we left recently (UO restarts; picking up mid-tune feels less repetitive) */
    const off = id === COMBAT_MU ? 0 : (pos[id] || 0);
    node.start(0, off); const t = ctx.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(m.v, t + XFADE);
    cur = { id, node, gain: g, t0: t, off };
  }
  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    let s = null; try { s = src(); } catch (e) { s = null; }
    const id = !s ? null : s.fight ? COMBAT_MU : s.dun ? (DUN_MU[s.dun] || null) : (TOWN_MU[s.region] || null);
    want = id;
    if (cur && cur.id === id) return;
    if (!id) { stopCur(XFADE); return; }
    if (buf[id]) { stopCur(id === COMBAT_MU ? .5 : XFADE); startTrack(id); }
    else load(id).then(() => { if (want === id && (!cur || cur.id !== id)) { stopCur(XFADE); startTrack(id); } });
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
    if (!ctx || ctx.state !== 'running' || !pref.fx || !SFX[name]) return;
    /* Only repetitive world events are throttled; query and combat outcomes remain audible. */
    const gap = { step: .14, door: .35, click: .025 }[name] || 0, t = ctx.currentTime;
    if (gap && recent[name] != null && t - recent[name] < gap) return;
    recent[name] = t; try { SFX[name](detail); } catch (e) { }
  }

  function setMu(on) { pref.mu = on ? 1 : 0; savePref(); if (muBus) muBus.gain.setTargetAtTime(on ? MU_VOL : 0, ctx.currentTime, .15); }
  function setFx(on) { pref.fx = on ? 1 : 0; savePref(); if (fxBus) fxBus.gain.setTargetAtTime(on ? FX_VOL : 0, ctx.currentTime, .05); }
  /* source() returns { fight, dun, region } or null for silence */
  function init(source) { src = source; if (!timer) timer = setInterval(tick, 400); }
  return { init, sfx, setMu, setFx, pref: () => Object.assign({}, pref), state: () => ctx ? ctx.state : 'none', playing: () => cur ? cur.id : null, MUSIC, effects: () => Object.keys(SFX),
    /* test hook: runs every effect once and returns the names that threw */
    _check: () => !ctx ? ['no context'] : Object.keys(SFX).filter(k => { try { SFX[k](); return false; } catch (e) { return true; } }) };
})();

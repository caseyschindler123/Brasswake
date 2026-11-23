/* ===== SCENE: the top-down world. All art is painted in code at load; nothing is downloaded. ===== */
const Scene = (() => {
  const T = 16, W = 52, H = 52, K = 3, TS = T * K;   // K: the ground and the canvas are drawn at three times sprite resolution
  let host = null, wrap, cv, cx, ov, ox, zoom = 2, vw = 0, vh = 0, dpr = 1, map = null, P = null, cam = { x: 0, y: 0 }, raf = 0, last = 0, running = false, clock = 0.32, parts = [], fade = 1, banner = null, near = null, lightCv = null;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const sh = (h, f) => { const c = hex(h); return `rgb(${c.map(v => Math.max(0, Math.min(255, Math.round(v * f)))).join(',')})`; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rng = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const hash = (x, y, s) => { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  const noise = s => (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (hash(xi, yi, s) * (1 - u) + hash(xi + 1, yi, s) * u) * (1 - v) + (hash(xi, yi + 1, s) * (1 - u) + hash(xi + 1, yi + 1, s) * u) * v; };
  const I = (x, y) => y * map.w + x;

  // biome palettes: daylight colours, one per region
  const BIO = {
    1: { g: '#6fa550', G: '#5f9547', d: '#c2a574', p: '#b9b2a0', w: '#3f8fb0', s: '#e0cf9a', tree: 'oak', leaf: '#3f7a35', wall: '#d8c9a8', roof: '#b5553f', liquid: 'west', amb: 0, fx: null },
    2: { g: '#5f8f58', G: '#4f7f55', d: '#9a8660', p: '#a09a85', w: '#3f7f78', s: '#8fa070', tree: 'willow', leaf: '#3f6f3a', wall: '#b8ad8c', roof: '#5f7a4a', liquid: 'pools', amb: .03, fx: 'rain' },
    3: { g: '#a8b055', G: '#bcb550', d: '#c9a870', p: '#cfc6ae', w: '#4a94b0', s: '#dccf9f', tree: 'oak', leaf: '#6f8f38', wall: '#e6d9b8', roof: '#c26a3a', liquid: 'none', amb: 0, fx: null },
    4: { g: '#8fa54e', G: '#b5a850', d: '#c4a26e', p: '#bdb39a', w: '#3f88a8', s: '#d4c48c', tree: 'oak', leaf: '#55883a', wall: '#d6c5a0', roof: '#a8553f', liquid: 'river', amb: 0, fx: null },
    5: { g: '#6a5a50', G: '#5a4c44', d: '#8a7460', p: '#857a72', w: '#e8641e', s: '#7a6656', tree: 'dead', leaf: '#3a302c', wall: '#9a8a7e', roof: '#6a4038', liquid: 'lava', amb: .1, fx: 'ember' },
    6: { g: '#5a6078', G: '#4e546c', d: '#7a788a', p: '#74768a', w: '#2f5a80', s: '#666a80', tree: 'shroom', leaf: '#9a6ab5', wall: '#8a8caa', roof: '#55577a', liquid: 'pools', amb: .2, fx: 'mote' },
    7: { g: '#e4ecf0', G: '#d0dde6', d: '#b5aea6', p: '#b0b8c0', w: '#8fbcd6', s: '#eef3f5', tree: 'pine', leaf: '#3a6a5a', wall: '#aab2bd', roof: '#5a6a85', liquid: 'pools', amb: 0, fx: 'snow' },
    8: { g: '#a89a60', G: '#b88f4e', d: '#cdbb92', p: '#d8d0ba', w: '#4a7f90', s: '#c2ae84', tree: 'autumn', leaf: '#d0702c', wall: '#e2d8c0', roof: '#6a6085', liquid: 'pools', amb: .02, fx: 'mote' }
  };
  // monster art: archetype + body color
  const ART = { b101: ['rat', '#6a5848'], b102: ['bird', '#b5b1a5'], b103: ['crab', '#8a4a3a'], b104: ['imp', '#7a5a8a'], b201: ['imp', '#5a7a4a'], b202: ['slug', '#6a3a4a'], b203: ['crab', '#9aa3ad'], b204: ['moth', '#a59a7a'], b205: ['toad', '#5a6a3a'],
    b301: ['imp', '#8a7a3a'], b302: ['slug', '#8a8a5a'], b303: ['bird', '#7a5a3a'], b304: ['ghost', '#c9c2a5'], b401: ['bandit', '#4a3a32'], b402: ['ghost', '#6a7a8a'], b403: ['wolf', '#6a6460'], b404: ['ghost', '#a59a9a'],
    b501: ['golem', '#7a6a5a'], b502: ['moth', '#c97a4a'], b503: ['crab', '#b08a3a'], b504: ['crab', '#3a3a44'], b601: ['bandit', '#5a6a5a'], b602: ['ghost', '#7a6a9a'], b603: ['ghost', '#3a3a4a'], b604: ['golem', '#4a4a5a'],
    b701: ['bird', '#8a6a9a'], b702: ['ghost', '#9ac9d9'], b703: ['golem', '#8a8f98'], b704: ['ghost', '#d9d9e9'], b801: ['slug', '#1c1c24'], b802: ['ghost', '#b9af9a'], b803: ['moth', '#d3a84c'], b804: ['golem', '#8a7c62'] };
  const BOSSART = { 1: ['hum', { top: '#55585c', legs: '#2c2c30', hat: '#2a2a2e', cloak: '#3c3e42', skin: '#b89a80', hair: '#8a8a8a' }], 2: ['ghost', '#d5dde0'], 3: ['hydra', '#4a6a4a'], 4: ['kraken', '#5a3a5a'], 5: ['golem', '#b08a3a'], 6: ['ghost', '#3a2a4a'], 7: ['wolf', '#b0984a'], 8: ['hum', { top: '#5a2a2a', legs: '#2a2020', cloak: '#7a6a2a', skin: '#b89a80', hair: '#d0d0d0', beard: '#d0d0d0' }] };

  /* ---------- generated art: the artifact's own image files. The painters below remain as the fallback. ---------- */
  var artVer = 0; const AD = typeof ArtData !== 'undefined' ? ArtData : null, IMG = {}, ACUT = {}; let curR = 1;
  function img(name) { let o = IMG[name]; if (!o) { o = IMG[name] = { im: new Image(), ok: false }; o.p = new Promise(res => { o.im.onload = () => { o.ok = true; artVer++; res(true); }; o.im.onerror = () => res(false); }); o.im.src = 'art/' + name; } return o; }
  const have = name => !!(AD && IMG[name] && IMG[name].ok), packs = r => ['chars.webp', 'mobs.webp', 'boss.webp', 'oc.webp', 'b' + r + '.webp', 'o' + r + '.webp'];
  function cut(name, x, y, w, h) { const key = name + ':' + x + ',' + y; if (ACUT[key]) return ACUT[key]; const c = mk(w, h); c.getContext('2d').drawImage(IMG[name].im, x, y, w, h, 0, 0, w, h); c.hr = 1; return ACUT[key] = c; }
  const lw = im => im.hr ? im.width / K : im.width, lh = im => im.hr ? im.height / K : im.height;   // art is stored at canvas resolution
  function artHero(look) { if (!have('chars.webp')) return null; const C = AD.chars, row = i => [0, 1, 2, 3].map(f => cut('chars.webp', (i * 4 + f) * C.cw, look * C.ch, C.cw, C.ch)); return { f: row(0), l: row(1), s: row(2), b: row(3), art: 1 }; }
  function artFolk(k) { const C = AD && AD.chars, q = C && C.npc[k]; if (!q || !have('chars.webp')) return null; const c = cut('chars.webp', q[0] * C.cw, q[1] * C.ch, C.cw, C.ch); return { f: [c], b: [c], s: [c], art: 1 }; }
  // creature art is packed to fill its cell, so a gull and a troll come out the same size; this scales each to a person (1 = a grown man)
  const MSC = {b101: 0.32,  b102: 0.38,  b103: 0.34,  b104: 0.5,  b201: 0.62,  b202: 0.38,  b203: 0.32,  b204: 0.38,  b205: 0.32,  b301: 0.54,  b302: 0.34,  b303: 0.42,  b304: 0.38,  b401: 0.83,  b402: 0.83,  b403: 0.59,  b404: 0.75,  b501: 1.12,  b502: 0.42,  b503: 0.42,  b504: 0.58,  b601: 0.83,  b602: 0.83,  b603: 0.88,  b604: 1.17,  b701: 0.83,  b702: 0.42,  b703: 0.96,  b704: 0.83,  b801: 0.51,  b802: 0.88,  b803: 0.38,  b804: 1.08,  a1: 0.32,  a2: 0.79,  a3: 0.51,  a4: 0.42,  a5: 0.32,  a6: 0.54,  a7: 0.5,  a8: 0.32,  l01: 0.83,  l02: 0.83,  l03: 0.92,  l04: 0.83,  l05: 0.88,  l06: 0.83,  l07: 0.92,  l08: 0.83,  l09: 0.68,  l10: 0.85,  l11: 1.18,  l12: 1.5,  l13: 1.42,  l14: 1.6,  l15: 0.93,  l16: 0.83,  k1: 0.88,  k2: 1.0,  k3: 0.92,  k4: 1.5,  k5: 1.33,  k6: 1.17,  k7: 1.08,  k8: 1.0, a09: 0.6, a10: 0.5, a11: 0.35, a12: 0.3, a13: 0.6, a14: 0.4, a15: 0.3, a16: 0.3, a17: 0.6, a18: 0.4, a19: 0.3, a20: 0.3, a21: 0.3, a22: 0.35, a23: 0.4, a24: 0.3, a25: 0.3, a26: 0.35, a27: 0.35, a28: 0.6, a29: 0.3, a30: 0.3, a31: 0.3, a32: 0.3, a33: 0.45, a34: 0.3, a35: 1.0, a36: 0.3, a37: 0.3, a38: 0.5, a39: 0.5, a40: 0.4, l17: 0.6, l18: 0.6, l19: 1.2, l20: 1.4, l21: 0.7, l22: 0.55, l23: 1.3, l24: 0.9, l25: 0.95, l26: 0.95, l27: 1.2, l28: 1.15, l29: 0.6, l30: 0.83, l31: 0.83, l32: 0.83, w01: 0.8, w02: 0.8, w03: 0.75, w04: 1.0, w05: 0.7, w06: 0.6, w07: 1.3, w08: 0.7, b206: 0.38, b405: 0.4, b505: 0.5, b506: 0.5, b507: 0.6, b805: 0.5, b105: 0.38, b605: 0.35};
  function artMob(k) { const dn = dungeonMob(k); if (dn) return dn; const M = AD && AD.mobs, q = M && M.at[k], wk = M && M.walk ? M.walk[k] : null;
    if (wk != null) { if (!IMG['mobwalk.webp']) img('mobwalk.webp'); if (have('mobwalk.webp')) { const row = i => [0, 1, 2, 3].map(f => cut('mobwalk.webp', (i * 4 + f) * M.ww, wk * M.wh, M.ww, M.wh)); return { f: row(0), l: row(1), s: row(2), b: row(3), art: 1, big: M.big[k], msc: MSC[k] || 1 }; } }   // a walk sheet, once one is packed: four directions, four frames
    if (!q) return null; const boss = k[1] === 'o', n = boss ? 'boss.webp' : 'mobs.webp'; if (!have(n)) return null; const c = boss ? cut(n, q[0] * M.bw, q[1] * M.bh, M.bw, M.bh) : cut(n, q[0] * M.cw, q[1] * M.ch, M.cw, M.ch); return { f: [c], b: [c], s: [c], art: 1, left: 1, bob: 1, big: M.big[k], msc: boss ? 1 : MSC[k] || 1 }; }
  function artDead(k) { const M = AD && AD.mobs, q = M && M.dead ? M.dead[k] : null; if (!q) return null; if (!IMG['dead.webp']) img('dead.webp'); return have('dead.webp') ? cut('dead.webp', q[0] * M.cw, q[1] * M.ch, M.cw, M.ch) : null; }   // the fallen version of a creature
  function artFx(row, f) { const X = AD && AD.fx; if (!X) return null; if (!IMG['fx.webp']) img('fx.webp'); return have('fx.webp') ? cut('fx.webp', f * X.cell, row * X.cell, X.cell, X.cell) : null; }   // row 0 slash, 1 impact, 2 bolt, 3 heal, dust, hit flash, treasure
  function artFx2(row, f) { const X = AD && AD.fx2; if (!X) return null; if (!IMG['fx2.webp']) img('fx2.webp'); return have('fx2.webp') ? cut('fx2.webp', f * X.cell, row * X.cell, X.cell, X.cell) : null; }   // row 0 ripples, 1 a jumping fish, 2 a butterfly, 3 a bird
  const rangeImg = n => { if (!AD || !AD.ranges || !AD.ranges[n]) return null; const o = img('mt/U' + String(n).padStart(2, '0') + '.webp'); o.im.sm = 1; return o.ok ? o.im : null; };   // a whole mountain range, drawn smoothed because it is scaled
  // ground textures: each a repeating pattern, anchored to the land so neighbouring chunks line up
  var gVer = 0; const GPAT = {}; let gpCtx = null;
  function gpat(name) { if (GPAT[name]) return GPAT[name]; if (!AD || !AD.ground || !AD.ground[name]) return null; const o = img('g/' + name + '.webp'); if (!o.gw) { o.gw = 1; o.p.then(ok => { if (ok) gVer++; }); } if (!o.ok) return null; return GPAT[name] = (gpCtx || (gpCtx = mk(2, 2).getContext('2d'))).createPattern(o.im, 'repeat'); }
  function artRect(name, rc) { if (!rc || !have(name)) return null; const c = cut(name, rc[0], rc[1], rc[2], rc[3]); return { c, ax: rc[2] / K / 2, ay: rc[3] / K - 1 }; }
  function artProp(kind, r) { if (kind.slice(0,3) === 'dn_') return dungeonArt(kind.slice(3), r); if (!AD) return null; if (kind.slice(0, 3) === 'pi_') { const q = AD.places && AD.places[kind.slice(3)]; if (!q) return null; if (!IMG['pp.webp']) img('pp.webp'); return artRect('pp.webp', q); } if (kind.slice(0, 3) === 'dj_') { const q = AD.dojo && AD.dojo.dp[kind.slice(3)]; if (!q) return null; if (!IMG['dj/dp.webp']) img('dj/dp.webp'); return artRect('dj/dp.webp', q); } if (kind.slice(0, 3) === 'sc_') { const q = AD.scen && AD.scen[kind.slice(3)]; if (!q) return null; if (!IMG['sc.webp']) img('sc.webp'); return artRect('sc.webp', q); } r = r || curR; const k = kind === 'node' ? 'node' + r : kind === 'rock' ? 'rock0' : kind; return AD.com[k] ? artRect('oc.webp', AD.com[k]) : artRect('o' + r + '.webp', (AD.obj[r] || {})[k]); }
  function artBld(slot, w) { const B = AD && AD.bld[curR]; if (!B) return null; const a = artRect('b' + curR + '.webp', B[slot] || B[{ work: 'shop', house: 'healer' }[slot]]); if (a) { a.ax = (lw(a.c) - w * T) / 2; a.ay = lh(a.c) - 3; } return a; }
  const folkSprite = (ak, name, extra) => artFolk(ak) || hum(lookOf(name, extra));
  const portOf = (r, i) => r === 6 ? ['G02_2', 'G06_1', 'G06_2'][i] : 'G0' + r + '_' + (i + 1);
  if (AD) packs(1).forEach(img);
  // fetch every shared sheet and this region's sheets up front, then the other towns' one file at a time, so nothing pops in during play
  function preload(r, prog) {
    if (!AD) return Promise.resolve(); const C = AD.chars, M = AD.mobs;
    const first = Array.from(new Set(['chars.webp', 'mobs.webp', 'boss.webp', 'oc.webp'].concat(typeof WorldArt !== 'undefined' ? WorldArt.files : [], typeof DungeonArt !== 'undefined' ? [DungeonArt.image, DungeonArt.creatures, DungeonArt.gateImage].filter(Boolean) : [], C.walk ? ['folk.webp'] : [], C.atk ? ['atk.webp'] : [], C.diag ? ['diag.webp'] : [], M.walk ? ['mobwalk.webp'] : [], M.dead ? ['dead.webp'] : [], AD.fx ? ['fx.webp'] : [], AD.scen ? ['sc.webp'] : [], AD.cbld ? ['bc.webp'] : [], AD.places ? ['pp.webp'] : [], AD.fx2 ? ['fx2.webp'] : [], Object.keys(AD.ground || {}).map(k => 'g/' + k + '.webp'), packs(r || 1))));
    let n = 0; return Promise.all(first.map(f => img(f).p.then(() => { n++; if (prog) prog(n, first.length); }))).then(() => {
      let p = Promise.resolve(); for (let k = 1; k <= 8; k++) if (k !== r) ['b' + k + '.webp', 'o' + k + '.webp'].forEach(f => { p = p.then(() => img(f).p); });
      Object.keys(AD.ranges || {}).forEach(k => { p = p.then(() => { rangeImg(+k); return img('mt/U' + String(k).padStart(2, '0') + '.webp').p; }); });   // the mountain ranges, one at a time, behind everything else
      p.then(() => { (AD.tables ? ['bg/S01.jpg', 'bg/S02.jpg', 'bg/S03.jpg'] : []).forEach(f => { new Image().src = 'art/' + f; }); });
    });
  }

  /* ---------- painters ---------- */
  const SPR = {};
  function outline(src) { const c = mk(src.width + 2, src.height + 2), g = c.getContext('2d'); g.globalAlpha = .5; for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(src, dx, dy); g.globalCompositeOperation = 'source-in'; g.globalAlpha = 1; g.fillStyle = '#0a0c0e'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; const o = mk(c.width, c.height), q = o.getContext('2d'); q.globalAlpha = .55; q.drawImage(c, 0, 0); q.globalAlpha = 1; q.drawImage(src, 1, 1); return o; }
  function hum(o) {
    const key = 'h' + JSON.stringify(o); if (SPR[key]) return SPR[key];
    const fr = {}, bt = '#2a211a';
    for (const dir of ['f', 'b', 's']) fr[dir] = [0, 1].map(st => {
      const c = mk(16, 24), g = c.getContext('2d'), R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(8, 22.5, 5.5, 1.8, 0, 0, 7); g.fill();
      if (dir === 's') { R(6 + (st ? -1 : 1), 16, 3, 6, sh(o.legs, .75)); R(7 + (st ? 1 : -1), 16, 3, 6, o.legs); R(6 + (st ? -1 : 1), 21, 4, 2, bt); R(7 + (st ? 1 : -1), 21, 4, 2, bt); }
      else { R(5, 16, 3, st ? 5 : 6, o.legs); R(8, 16, 3, st ? 6 : 5, sh(o.legs, .78)); R(5, st ? 20 : 21, 3, 2, bt); R(8, st ? 21 : 20, 3, 2, bt); }
      const tw = dir === 's' ? 6 : 8, tx = dir === 's' ? 5 : 4;
      if (o.cloak && dir === 'f') { R(tx - 1, 9, tw + 2, 10, sh(o.cloak, .8)); }
      R(tx, 8, tw, 9, o.top); R(tx + tw - 2, 8, 2, 9, sh(o.top, .78)); R(tx, 9, tw, 1, sh(o.top, 1.12)); R(tx, 15, tw, 1, sh(o.top, .5));
      if (o.apron && dir === 'f') R(tx + 2, 11, 4, 7, o.apron);
      if (dir !== 's') { R(tx - 2, 9, 2, 6, sh(o.top, .92)); R(tx + tw, 9, 2, 6, sh(o.top, .7)); R(tx - 2, 15, 2, 1, o.skin); R(tx + tw, 15, 2, 1, sh(o.skin, .85)); }
      else { R(7, 9 + st, 2, 6, sh(o.top, .86)); R(7, 15 + st, 2, 1, o.skin); }
      if (o.cloak) { if (dir === 'b') { R(tx - 1, 8, tw + 2, 11, o.cloak); R(tx + tw - 1, 8, 2, 11, sh(o.cloak, .78)); R(tx + 2, 10, 1, 8, sh(o.cloak, .88)); } else if (dir === 's') R(tx - 1, 8, 3, 11, o.cloak); else { R(tx - 1, 8, 2, 3, o.cloak); R(tx + tw - 1, 8, 2, 3, sh(o.cloak, .8)); } }
      R(5, 2, 6, 6, o.skin); R(10, 2, 1, 6, sh(o.skin, .8));
      if (dir === 'b') R(5, 2, 6, 5, o.hair); else { R(5, 1, 6, 2, o.hair); R(5, 3, 1, 2, o.hair); if (dir === 'f') R(10, 3, 1, 2, sh(o.hair, .8)); else R(5, 3, 2, 3, o.hair); }
      if (dir === 'f') { R(6, 5, 1, 1, '#15110e'); R(9, 5, 1, 1, '#15110e'); if (o.beard) R(6, 6, 4, 2, o.beard); }
      if (dir === 's') { R(9, 5, 1, 1, '#15110e'); if (o.beard) R(8, 6, 3, 2, o.beard); }
      if (o.hood) { R(4, 1, 8, 2, o.hood); R(4, 3, 1, 5, o.hood); R(11, 3, 1, 5, sh(o.hood, .78)); if (dir === 'b') R(4, 1, 8, 7, o.hood); if (dir === 's') R(4, 1, 4, 7, o.hood); }
      if (o.hat) { R(3, 2, 10, 1, o.hat); R(5, 0, 6, 2, sh(o.hat, 1.15)); }
      if (o.shield && dir !== 'b') { R(dir === 's' ? 9 : 1, 10, 4, 6, '#6a6f78'); R(dir === 's' ? 10 : 2, 11, 2, 4, '#8f949c'); }
      return outline(c);
    });
    return SPR[key] = fr;
  }
  function beast(kind, col, big) {
    const key = kind + col + (big ? 'B' : ''); if (SPR[key]) return SPR[key];
    const D = sh(col, .62), L = sh(col, 1.28), frames = [0, 1].map(f => {
      const c = mk(24, 24), g = c.getContext('2d'), R = (x, y, w, h, k) => { g.fillStyle = k; g.fillRect(x, y, w, h); }, El = (x, y, rx, ry, k) => { g.fillStyle = k; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
      const air = kind === 'bird' || kind === 'moth' || kind === 'ghost'; El(12, 22.5, air ? 4 : 7, air ? 1.2 : 2, 'rgba(0,0,0,.3)');
      if (kind === 'rat') { El(11, 18, 6, 3.5, col); El(10, 17, 4, 2, L); El(17, 18, 3, 2.5, col); R(18, 15, 2, 2, D); R(19, 18, 1, 1, '#111'); R(20, 19, 1, 1, '#c99'); g.strokeStyle = D; g.beginPath(); g.moveTo(5, 19); g.quadraticCurveTo(1, 18 - f * 3, 3, 14 - f); g.stroke(); R(8, 21, 2, 1, D); R(13, 21, 2, 1, D); }
      else if (kind === 'bird') { const y = 9 + f; El(12, y + 3, 4, 3, col); El(12, y + 2, 2.5, 1.5, L); R(15, y, 3, 3, col); R(18, y + 1, 2, 1, '#c9a23a'); R(16, y + 1, 1, 1, '#111'); g.fillStyle = D; g.beginPath(); g.moveTo(10, y + 2); g.lineTo(2, y + (f ? 6 : -3)); g.lineTo(8, y + 5); g.fill(); g.beginPath(); g.moveTo(13, y + 2); g.lineTo(22, y + (f ? 6 : -3)); g.lineTo(15, y + 5); g.fill(); R(8, y + 5, 2, 2, D); }
      else if (kind === 'crab') { El(12, 17, 6, 4, col); El(11, 15.5, 4, 2, L); g.strokeStyle = D; g.lineWidth = 1; for (let i = 0; i < 3; i++) { const o = (i + f) % 2; g.beginPath(); g.moveTo(7, 16 + i * 2); g.lineTo(3, 15 + i * 2 + o); g.lineTo(2, 19 + i + o); g.moveTo(17, 16 + i * 2); g.lineTo(21, 15 + i * 2 + o); g.lineTo(22, 19 + i + o); g.stroke(); } R(9, 12, 1, 3, D); R(14, 12, 1, 3, D); R(9, 11, 1, 1, '#d9d2b0'); R(14, 11, 1, 1, '#d9d2b0'); R(3, 12 - f, 3, 3, col); R(18, 12 - f, 3, 3, col); }
      else if (kind === 'slug') { El(12, 19 - f * .5, 8 + f, 4 - f * .5, col); El(10, 17.5, 4, 1.5, L); El(18, 16, 3, 3, col); R(19, 11, 1, 4, D); R(21, 12, 1, 3, D); R(19, 10, 1, 1, '#d9d2b0'); R(21, 11, 1, 1, '#d9d2b0'); R(5, 21, 12, 1, D); }
      else if (kind === 'toad') { El(12, 17, 7, 5 - f, col); El(11, 15, 4, 2, L); El(5, 20, 3, 2, D); El(19, 20, 3, 2, D); El(8, 12, 2, 2, col); El(16, 12, 2, 2, col); R(8, 12, 1, 1, '#d9c23a'); R(16, 12, 1, 1, '#d9c23a'); R(8, 19, 8, 1, D); }
      else if (kind === 'moth') { const y = 10 + f, s = f ? 5 : 8; g.fillStyle = col; g.beginPath(); g.moveTo(12, y + 2); g.lineTo(12 - s, y - 3); g.lineTo(12 - s - 1, y + 5); g.lineTo(12, y + 5); g.fill(); g.beginPath(); g.moveTo(12, y + 2); g.lineTo(12 + s, y - 3); g.lineTo(12 + s + 1, y + 5); g.lineTo(12, y + 5); g.fill(); R(12 - s + 1, y, 2, 2, D); R(12 + s - 2, y, 2, 2, D); R(11, y, 2, 7, D); R(11, y - 2, 1, 2, L); R(12, y - 2, 1, 2, L); }
      else if (kind === 'wolf') { El(11, 15, 8, 4, col); El(10, 13.5, 5, 2, L); R(4 + f, 17, 2, 5, D); R(8 - f, 17, 2, 5, col); R(13 + f, 17, 2, 5, D); R(16 - f, 17, 2, 5, col); El(19, 12, 3.5, 3, col); R(21, 13, 3, 2, D); R(18, 8, 2, 2, D); R(20, 8, 2, 2, col); R(20, 11, 1, 1, '#d9c23a'); g.strokeStyle = D; g.lineWidth = 2; g.beginPath(); g.moveTo(3, 14); g.lineTo(0, 10 + f * 2); g.stroke(); }
      else if (kind === 'ghost') { const y = 4 + f; g.globalAlpha = .82; g.fillStyle = col; g.beginPath(); g.moveTo(6, y + 6); g.quadraticCurveTo(6, y, 12, y); g.quadraticCurveTo(18, y, 18, y + 6); g.lineTo(18, y + 14); g.lineTo(15, y + 12 + f); g.lineTo(12, y + 15); g.lineTo(9, y + 12 + f); g.lineTo(6, y + 14); g.fill(); g.globalAlpha = 1; R(7, y + 3, 2, 8, L); R(9, y + 5, 2, 2, '#0b0d10'); R(13, y + 5, 2, 2, '#0b0d10'); R(10, y + 9, 4, 1, D); }
      else if (kind === 'golem') { R(6, 8, 12, 11, col); R(15, 8, 3, 11, D); R(6, 8, 12, 2, L); R(9, 4, 6, 5, col); R(9, 4, 6, 1, L); R(10, 6, 1, 1, '#e0902a'); R(13, 6, 1, 1, '#e0902a'); R(2, 9 + f, 4, 9, col); R(18, 9 - f + 1, 4, 9, D); R(7, 19, 4, 4, D); R(13, 19, 4, 4, D); R(11, 12, 2, 4, '#e0902a'); }
      else if (kind === 'hydra') { El(12, 18, 8, 4, col); El(11, 16.5, 5, 2, L); g.strokeStyle = col; g.lineWidth = 3; for (const [x, bx, by] of [[7, 2, 6 + f], [12, 12, 2 + f], [17, 22, 6 - f + 1]]) { g.beginPath(); g.moveTo(x, 16); g.quadraticCurveTo((x + bx) / 2 + 2, 10, bx, by + 2); g.stroke(); R(bx - 2, by, 4, 3, D); R(bx - 1, by + 1, 1, 1, '#d9c23a'); } }
      else if (kind === 'kraken') { El(12, 9, 6, 7, col); El(10, 7, 3, 3, L); R(9, 10, 2, 2, '#d9c23a'); R(13, 10, 2, 2, '#d9c23a'); g.strokeStyle = D; g.lineWidth = 2; for (let i = 0; i < 6; i++) { const x = 4 + i * 3.2, s = ((i + f) % 2 ? 2 : -2); g.beginPath(); g.moveTo(x + 1, 14); g.quadraticCurveTo(x + s, 18, x - s, 22); g.stroke(); } }
      return outline(c);
    });
    return SPR[key] = { f: frames, b: frames, s: frames, beast: true, air: kind === 'bird' || kind === 'moth' || kind === 'ghost', glow: kind === 'ghost' };
  }
  const imp = col => hum({ skin: col, hair: sh(col, .6), top: '#3a3028', legs: '#2a2420' }), bandit = col => hum({ skin: '#a88a70', hair: '#2a2420', top: col, legs: '#2a2622', hood: sh(col, .8), cloak: sh(col, .7) });
  const LFB = { l01: 'b401', l02: 'b401', l03: 'b401', l04: 'b401', l05: 'b401', l06: 'b401', l07: 'b401', l08: 'b402', l09: 'b202', l10: 'b504', l11: 'b504', l12: 'b501', l13: 'b303', l14: 'boss5', l15: 'b601', l16: 'b601', k1: 'b104', k2: 'b204', k3: 'b304', k4: 'b404', k5: 'b504', k6: 'b604', k7: 'b704', k8: 'b804', l17: 'b401', l18: 'b401', l19: 'b501', l20: 'b501', l21: 'b303', l22: 'b303', l23: 'b501', l24: 'b303', l25: 'b601', l26: 'b401', l27: 'b601', l28: 'b601', l29: 'b303', l30: 'b402', l31: 'b401', l32: 'b402' };   // lair creatures until their own pictures arrive
  function monSprite(tpl) { const art = artMob(tpl); if (art) return art; if (LFB[tpl]) return monSprite(LFB[tpl]); const a = ART[tpl] || ['rat', '#666']; return a[0] === 'imp' ? imp(a[1]) : a[0] === 'bandit' ? bandit(a[1]) : beast(a[0], a[1]); }
  function bossSprite(r) { const art = artMob('boss' + r); if (art) return art; const a = BOSSART[r]; return a[0] === 'hum' ? hum(a[1]) : beast(a[0], a[1], true); }
  function lookOf(name, extra) { const r = rng([...name].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7)), pk = a => a[Math.floor(r() * a.length)]; return Object.assign({ skin: pk(['#c2a084', '#a8846a', '#8a6a52', '#d0b090', '#6a4e3c']), hair: pk(['#2a2420', '#4a3a2a', '#6a5a4a', '#8a8a8a', '#3a2a1c', '#7a4a2a']), top: pk(['#5a4a3a', '#4a5a4a', '#5a3a3a', '#3a4a5a', '#6a6048', '#4a4458', '#6a5a2a']), legs: pk(['#2e2a26', '#3a3228', '#2a2e34', '#40382c']), beard: r() < .3 ? pk(['#4a3a2a', '#8a8a8a', '#2a2420']) : null, hat: r() < .22 ? pk(['#3a3228', '#4a3a2a', '#2a2e34']) : null, apron: r() < .2 ? '#8a7a5a' : null }, extra || {}); }
  const HERO = { null: { top: '#5a5246', legs: '#33302a' }, warrior: { top: '#6a6f78', legs: '#33363c', cloak: '#4a2a2a', shield: 1 }, thief: { top: '#2e3230', legs: '#24262a', hood: '#262a28', cloak: '#1e2220' }, crafter: { top: '#6a4a32', legs: '#3a3228', apron: '#8a7a5a' }, mage: { top: '#3a4266', legs: '#2a2e44', cloak: '#2e3454', hood: '#343a5c' } };
  const heroSprite = () => artHero(host.look()) || hum(Object.assign({ skin: '#b8967a', hair: '#3a2e24' }, HERO[host.role()] || HERO.null));

  function prop(kind, b, r, hue) {
    const art = artProp(kind, r); if (art) return art; if (kind === 'exit') kind = 'stairs';
    const key = kind + (b ? b.wall + b.leaf : '') + (hue || ''); if (SPR[key]) return SPR[key];
    let c, g, ax = 8, ay = 16; const R = (x, y, w, h, k) => { g.fillStyle = k; g.fillRect(x, y, w, h); }, El = (x, y, rx, ry, k) => { g.fillStyle = k; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
    const q = rng(kind.charCodeAt(kind.length - 1) * 131 + (b ? hex(b.leaf)[0] : 0));
    if (kind.startsWith('tree')) {
      c = mk(32, 42); g = c.getContext('2d'); ax = 16; ay = 40; const t = b.tree; El(16, 39, 10, 2.6, 'rgba(0,0,0,.3)');
      if (t === 'pine') { R(15, 30, 3, 9, '#3a2c20'); for (let i = 0; i < 4; i++) { const w = 7 + i * 4, y = 4 + i * 7; g.fillStyle = sh(b.leaf, .8 + i * .08); g.beginPath(); g.moveTo(16, y); g.lineTo(16 + w / 2 + 1, y + 11); g.lineTo(16 - w / 2 - 1, y + 11); g.fill(); g.fillStyle = sh(b.leaf, 1.2); g.fillRect(14, y + 3, 1, 5); g.fillStyle = '#d5dde2'; g.beginPath(); g.moveTo(16, y); g.lineTo(18.5, y + 4); g.lineTo(16, y + 3); g.lineTo(13.5, y + 4); g.fill(); } }
      else if (t === 'dead') { R(14, 16, 4, 23, '#2e2622'); R(17, 16, 1, 23, '#1e1816'); g.strokeStyle = '#2e2622'; g.lineWidth = 2; for (const [x, y] of [[6, 10], [26, 8], [9, 20], [24, 18], [16, 4]]) { g.beginPath(); g.moveTo(16, 24 - (30 - y) * .2); g.lineTo(x, y); g.stroke(); } }
      else if (t === 'shroom') { R(14, 20, 5, 19, '#b8ae9a'); R(17, 20, 2, 19, '#8a8274'); El(16, 17, 13, 8, sh(b.leaf, .8)); El(15, 15, 11, 6, b.leaf); El(12, 13, 6, 3, sh(b.leaf, 1.3)); for (let i = 0; i < 6; i++) R(6 + q() * 20 | 0, 11 + q() * 8 | 0, 2, 2, '#d9cfe6'); }
      else { R(14, 26, 4, 13, '#4a3a2a'); R(17, 26, 1, 13, '#33281c'); for (let i = 0; i < 34; i++) { const a = q() * 6.28, d = Math.sqrt(q()) * 10, x = 16 + Math.cos(a) * d * 1.15, y = 16 + Math.sin(a) * d * .95; El(x, y, 2.5 + q() * 3, 2.5 + q() * 2.5, sh(b.leaf, .62 + (1 - (y - 4) / 26) * .55 + (x < 16 ? .08 : -.06) + (q() - .5) * .14)); } for (let i = 0; i < 16; i++) R(7 + q() * 12 | 0, 6 + q() * 10 | 0, 1, 1, sh(b.leaf, 1.5)); if (t === 'willow') { g.fillStyle = sh(b.leaf, .8); for (let x = 5; x < 28; x += 3) g.fillRect(x, 18, 1, 8 + q() * 9 | 0); } }
    } else if (kind === 'rock') { c = mk(18, 16); g = c.getContext('2d'); ax = 9; ay = 15; El(9, 14, 8, 2, 'rgba(0,0,0,.3)'); g.fillStyle = '#5c5c5e'; g.beginPath(); g.moveTo(1, 13); g.lineTo(3, 5); g.lineTo(9, 2); g.lineTo(15, 6); g.lineTo(17, 13); g.fill(); g.fillStyle = '#8a8a8c'; g.beginPath(); g.moveTo(3, 5); g.lineTo(9, 2); g.lineTo(11, 7); g.lineTo(5, 9); g.fill(); g.fillStyle = '#3e3e42'; g.fillRect(11, 8, 5, 5); }
    else if (kind === 'lamp') { c = mk(8, 24); g = c.getContext('2d'); ax = 4; ay = 23; R(3, 6, 2, 17, '#22201e'); R(2, 22, 4, 1, '#22201e'); R(1, 1, 6, 6, '#22201e'); R(2, 2, 4, 4, '#e8b85a'); R(3, 3, 2, 2, '#fff0c0'); }
    else if (kind === 'well') { c = mk(20, 24); g = c.getContext('2d'); ax = 10; ay = 22; El(10, 21, 9, 2.5, 'rgba(0,0,0,.3)'); R(2, 12, 16, 9, '#6a6862'); R(2, 12, 16, 2, '#8c8a84'); R(4, 14, 12, 3, '#10181c'); R(3, 3, 2, 10, '#4a3a2a'); R(15, 3, 2, 10, '#4a3a2a'); R(1, 1, 18, 3, '#5a3d35'); R(9, 4, 1, 8, '#2a2420'); }
    else if (kind === 'board') { c = mk(22, 22); g = c.getContext('2d'); ax = 11; ay = 21; R(2, 4, 2, 17, '#4a3a2a'); R(18, 4, 2, 17, '#4a3a2a'); R(1, 3, 20, 11, '#5c4a36'); R(3, 5, 5, 6, '#d8ceb0'); R(9, 5, 4, 4, '#c8be9e'); R(14, 6, 5, 6, '#d8ceb0'); R(5, 5, 1, 1, '#a03a2a'); R(16, 6, 1, 1, '#a03a2a'); }
    else if (kind === 'bench') { c = mk(24, 20); g = c.getContext('2d'); ax = 12; ay = 19; R(1, 9, 22, 4, '#6b5238'); R(1, 9, 22, 1, '#8a6c4a'); R(2, 13, 2, 6, '#4a3826'); R(20, 13, 2, 6, '#4a3826'); R(13, 4, 8, 3, '#3a3c42'); R(15, 7, 4, 2, '#2a2c30'); R(13, 4, 8, 1, '#6a6f78'); R(4, 5, 2, 4, '#7a5a3a'); R(3, 3, 4, 2, '#8f949c'); }
    else if (kind === 'stall') { c = mk(48, 30); g = c.getContext('2d'); ax = 24; ay = 29; R(2, 14, 44, 10, '#5c4a36'); R(2, 14, 44, 2, '#7a6248'); R(3, 24, 2, 5, '#3a2e22'); R(43, 24, 2, 5, '#3a2e22'); for (let x = 0; x < 48; x += 6) R(x, 2, 6, 8, x % 12 ? '#7a3a32' : '#b8ae96'); R(0, 9, 48, 2, 'rgba(0,0,0,.35)'); R(2, 4, 1, 12, '#3a2e22'); R(45, 4, 1, 12, '#3a2e22'); for (let i = 0; i < 6; i++) R(6 + i * 6, 11, 4, 3, ['#8a4a3a', '#5a7a4a', '#c9a23a', '#6a5a8a', '#8f949c', '#a8846a'][i]); }
    else if (kind === 'stairs') { c = mk(20, 20); g = c.getContext('2d'); ax = 10; ay = 17; R(0, 0, 20, 18, '#4e4e54'); R(2, 2, 16, 14, '#0c0c10'); for (let i = 0; i < 4; i++) R(2, 12 - i * 3, 16 - i * 3, 2, sh('#5a5a62', 1 - i * .2)); R(0, 0, 20, 2, '#77777e'); }
    else if (kind === 'chest' || kind === 'chestopen') { c = mk(16, 16); g = c.getContext('2d'); ay = 15; El(8, 14, 7, 2, 'rgba(0,0,0,.3)'); R(2, 6, 12, 8, '#5c4028'); R(2, 6, 12, 1, '#7a5636'); R(2, 9, 12, 1, '#c9a23a'); R(7, 8, 2, 3, '#e0c060'); if (kind === 'chestopen') { R(2, 1, 12, 5, '#3a2818'); R(3, 4, 10, 3, '#e0c060'); } else { R(2, 3, 12, 3, '#6a4a2e'); R(2, 3, 12, 1, '#8a6238'); } }
    else if (kind === 'node') { c = mk(16, 16); g = c.getContext('2d'); ay = 15; El(8, 14, 7, 2, 'rgba(0,0,0,.3)'); g.fillStyle = '#55555a'; g.beginPath(); g.moveTo(1, 13); g.lineTo(4, 6); g.lineTo(11, 5); g.lineTo(15, 13); g.fill(); for (const [x, y] of [[5, 7], [9, 5], [11, 9], [6, 10]]) { R(x, y, 2, 3, hue); R(x, y, 1, 1, '#fff'); } }
    else if (kind === 'port') { c = mk(34, 26); g = c.getContext('2d'); ax = 1; ay = 25; R(0, 0, 34, 3, '#3a3a40'); for (let x = 1; x < 34; x += 4) R(x, 2, 2, 23, '#2a2a30'); for (let y = 7; y < 24; y += 7) R(0, y, 34, 2, '#3a3a40'); }
    else if (kind === 'crate') { c = mk(14, 16); g = c.getContext('2d'); ax = 7; ay = 15; R(1, 4, 12, 11, '#6b5238'); R(1, 4, 12, 1, '#8a6c4a'); R(1, 4, 1, 11, '#4a3826'); R(12, 4, 1, 11, '#4a3826'); g.strokeStyle = '#4a3826'; g.beginPath(); g.moveTo(2, 5); g.lineTo(12, 14); g.stroke(); }
    else if (kind === 'torch') { c = mk(6, 12); g = c.getContext('2d'); ax = 3; ay = 12; R(2, 5, 2, 7, '#3a2c20'); R(1, 1, 4, 5, '#e8902a'); R(2, 2, 2, 3, '#ffe08a'); }
    return SPR[key] = { c, ax, ay };
  }
  function building(w, h, b, seed, sign, slot) {
    const art = artBld(slot, w); if (art) return art;
    const Wp = w * T, Hp = h * T + 8, c = mk(Wp, Hp), g = c.getContext('2d'), q = rng(seed), roofH = Math.round(Hp * .56), R = (x, y, ww, hh, k) => { g.fillStyle = k; g.fillRect(x, y, ww, hh); };
    R(1, roofH, Wp - 2, Hp - roofH, b.wall); for (let i = 0; i < Wp * 2; i++) R(1 + q() * (Wp - 2) | 0, roofH + q() * (Hp - roofH) | 0, 1, 1, sh(b.wall, .82 + q() * .3));
    for (let x = 1; x < Wp; x += 15) R(Math.min(x, Wp - 3), roofH, 2, Hp - roofH, sh(b.wall, .5)); R(1, roofH + 9, Wp - 2, 1, sh(b.wall, .6)); R(1, Hp - 2, Wp - 2, 2, sh(b.wall, .45));
    for (let y = 0; y < roofH; y += 4) { const f = .7 + .5 * (y / roofH); R(0, y, Wp, 4, sh(b.roof, f)); for (let x = (y / 4 % 2) * 3; x < Wp; x += 6) R(x, y, 1, 4, sh(b.roof, f * .74)); R(0, y + 3, Wp, 1, sh(b.roof, f * .68)); }
    R(0, 0, Wp, 2, sh(b.roof, 1.35)); R(0, roofH, Wp, 2, 'rgba(0,0,0,.4)'); R(0, 0, 1, roofH, sh(b.roof, .5)); R(Wp - 1, 0, 1, roofH, sh(b.roof, .5));
    R(Wp - 13, 3, 5, 8, '#55524c'); R(Wp - 13, 3, 5, 2, '#2a2826');
    const dx = Wp / 2 - 4; R(dx - 1, Hp - 15, 10, 15, '#241a12'); R(dx, Hp - 14, 8, 14, '#4a3626'); R(dx + 3, Hp - 14, 1, 14, '#38281a'); R(dx + 6, Hp - 8, 1, 1, '#c9a23a');
    for (const wx of [5, Wp - 12]) { R(wx, roofH + 4, 7, 8, '#1a1612'); R(wx + 1, roofH + 5, 5, 6, '#d9a441'); R(wx + 3, roofH + 5, 1, 6, '#1a1612'); R(wx + 1, roofH + 8, 5, 1, '#1a1612'); }
    if (sign) { R(dx + 12, roofH + 2, 1, 4, '#22201e'); R(dx + 9, roofH + 5, 8, 6, sign); R(dx + 10, roofH + 6, 6, 4, sh(sign, 1.3)); }
    return { c, ax: 0, ay: Hp };
  }

  /* ---------- map generation ---------- */
  // seamless painted texture for one kind of ground: layered noise, then brush dabs wrapped at the edges
  const TEX = {};
  function tex(base, k, seed) {
    const key = base + k; if (TEX[key]) return TEX[key];
    const S = 144, c = mk(S, S), g = c.getContext('2d'), im = g.createImageData(S, S), d = im.data, [r0, g0, b0] = hex(base);
    const pn = (x, y, per, sd) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b2) => hash(((a % per) + per) % per, ((b2 % per) + per) % per, sd); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
    const amp = k === 4 ? .16 : (k === 3 || k >= 6) ? .14 : .26, cl = v => Math.max(0, Math.min(255, v));
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = pn(x / 36, y / 36, 4, seed) * .55 + pn(x / 12, y / 12, 12, seed + 1) * .3 + pn(x / 4, y / 4, 36, seed + 2) * .15, f = 1 - amp / 2 + amp * n, w = (pn(x / 48, y / 48, 3, seed + 3) - .5) * 14, i = (y * S + x) * 4;
      d[i] = cl(r0 * f + w); d[i + 1] = cl(g0 * f + w * .4); d[i + 2] = cl(b0 * f - w); d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const q = rng(seed * 31 + k), dab = (x, y, rx, ry, rot, col) => { g.fillStyle = col; for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { if (x + ox < -24 || x + ox > S + 24 || y + oy < -24 || y + oy > S + 24) continue; g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, rot, 0, 7); g.fill(); } };
    for (let i = 0, n = k === 4 ? 26 : 70; i < n; i++) { const l = q() < .5, a = .05 + q() * .08, col = l ? `rgba(255,250,220,${a})` : `rgba(20,30,20,${a})`;
      if (k === 4) dab(q() * S, q() * S, 10 + q() * 16, 1.2 + q() * 1.6, 0, l ? `rgba(255,255,255,${a + .04})` : `rgba(0,30,60,${a})`);
      else if (k < 2) dab(q() * S, q() * S, 1.5 + q() * 2, 4 + q() * (k ? 7 : 4), (q() - .5) * .7, col);
      else dab(q() * S, q() * S, 3 + q() * 8, 2 + q() * 5, q() * 3, col); }
    return TEX[key] = c;
  }

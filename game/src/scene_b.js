
  /* ===== one continuous land: eight regions on a single map, ground painted in chunks as you walk ===== */
  const WW = 576, WH = 1008, CS = 8, CELL = [null, [0, 3], [1, 3], [1, 2], [0, 2], [0, 1], [1, 1], [1, 0], [0, 0]];
  const TOWN = [null]; for (let r = 1; r <= 8; r++) TOWN[r] = [CELL[r][0] * 288 + 144 + [0, -44, 16, -16, 10, -10, 16, -12, 0][r], CELL[r][1] * 252 + 126 + [0, 10, -10, 12, -12, 10, -10, 12, 0][r]];
  let hold = null, world = null, curReg = 1, curB = 1, curT = null, tcheck = 0, inset = 0, locked = false, ambNow = 0, anims = [], floats = [], slashes = [], shots = [], bars = [];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  Object.assign(ART, { s1: ['wolf', '#8a5a3a'], s2: ['bird', '#b0703a'], s3: ['wolf', '#e0a0a0'], s4: ['wolf', '#7a4a2a'], s5: ['wolf', '#2a2a2a'], s6: ['bird', '#f0f0f0'], s7: ['bird', '#1a1a1a'], s8: ['wolf', '#8a8a8a'], a1: ['rat', '#9a7a5a'], a2: ['wolf', '#b08a5a'], a3: ['wolf', '#4a3a32'], a4: ['wolf', '#c9703a'], a5: ['bird', '#8a5a3a'], a6: ['wolf', '#d8d4c8'], a7: ['wolf', '#e6e0d0'], a8: ['rat', '#f0f0f0'] });
  const FB = { bank: 'guild', work: 'shop', house: 'healer', cottage: 'house', hall: 'tavern', casino: 'hall', farm: 'house', barn: 'work', mill: 'hall', cottage2: 'cottage', shack: 'cottage', cabin: 'house', hut: 'cottage', way: 'tavern', tower: 'guild', ruin: 'work', shrine: 'healer', stable: 'work', adobe: 'house', lodge: 'house', stilt: 'cottage', mine: 'work' };
  // new kinds of thing fall back to the nearest older picture until their own art is packed
  const XP = { pi_cabbage: 'flowers', pi_wheat: 'flowers', pi_hay: 'crate', pi_trough: 'crate', pi_fence: 'crate', pi_nets: 'board', pi_fishbarrel: 'crate', pi_traps: 'crate', pi_hides: 'board', pi_woodpile: 'crate', pi_beehives: 'crate', pi_cart: 'crate', pi_cairn: 'rock1', pi_well: 'well', pi_stones: 'pillar', pi_statue: 'pillar', pi_graves: 'bones', pi_camp: 'crate', pi_wagon: 'crate', pi_dig: 'bones', pi_hollow: 'rock0', pi_sign: 'sign', pi_palisade: 'crate', pi_lookout: 'pillar', pi_rack: 'board', pi_cage: 'crate', pi_bones: 'bones', pi_eggs: 'rock1', pi_hoard: 'crate', pi_webs: 'bones', pi_cocoon: 'rock1', pi_cauldron: 'well', pi_gianthut: 'crate', pi_ice: 'rock0', pi_altar: 'pillar', pi_wallbroken: 'rock0', pi_fire: 'fire', pi_hull: 'board', pi_tpad: 'pillar', pi_pedestal: 'pillar', pi_pedestal0: 'pillar', pi_banner: 'sign', pi_lbanner: 'sign', pi_crates: 'crate', pi_rowboat: 'board', pi_tent: 'crate', pi_ltent: 'crate', pi_chest: 'crate', pi_bed: 'board', pi_trophy: 'pillar' };
  function artBld(slot, w, r, big) { if (slot === 'dojo' && AD && AD.dojo && AD.dojo.dx[r]) { if (!IMG['dj/dx.webp']) img('dj/dx.webp'); const a = artRect('dj/dx.webp', AD.dojo.dx[r]); if (a) { const k = Math.min(1, (w + .7) * T / lw(a.c)); return { c: a.c, k, ax: (lw(a.c) * k - w * T) / 2, ay: lh(a.c) * k - 3 }; } } if (slot === 'bank' && AD && AD.banks && AD.banks[r]) { if (!IMG['bk.webp']) img('bk.webp'); const a = artRect('bk.webp', AD.banks[r]); if (a) { const k = Math.min(1, (w + .7) * T / lw(a.c)); return { c: a.c, k, ax: (lw(a.c) * k - w * T) / 2, ay: lh(a.c) * k - 3 }; } } const cb = AD && AD.cbld && AD.cbld[slot]; if (cb) { if (!IMG['bc.webp']) img('bc.webp'); const a = artRect('bc.webp', cb); if (a) { const k = Math.min(1, (w + .7) * T / lw(a.c)); return { c: a.c, k, ax: (lw(a.c) * k - w * T) / 2, ay: lh(a.c) * k - 3 }; } }   // countryside buildings share one sheet, drawn no wider than their ground
    const B = AD && AD.bld[r]; if (!B) return null; const a = artRect('b' + r + '.webp', B[slot] || B[FB[slot]] || B[FB[FB[slot]]] || B.shop); if (!a) return null; if (big) { const k = (w + .7) * T / lw(a.c); return { c: a.c, k, ax: (lw(a.c) * k - w * T) / 2, ay: lh(a.c) * k - 3 }; } return { c: a.c, ax: (lw(a.c) - w * T) / 2, ay: lh(a.c) - 3 }; }
  function artFolk(k) {
    const C = AD && AD.chars; if (!C) return null;
    const q = C.npc[k]; if (!q || !have('chars.webp')) return null; const c = cut('chars.webp', q[0] * C.cw, q[1] * C.ch, C.cw, C.ch); return { f: [c], b: [c], s: [c], art: 1, one: 1 };
  }
  // sprites are resolved when first drawn and again whenever another image file arrives
  const SC = {};
  function artWalk(k) { const C = AD && AD.chars, wk = C && C.walk ? C.walk[k] : null; if (wk == null) return null; if (!IMG['folk.webp']) img('folk.webp'); if (!have('folk.webp')) return null; const row = i => [0, 1, 2, 3].map(f => cut('folk.webp', (i * 4 + f) * C.cw, wk * C.ch, C.cw, C.ch)); return { f: row(0), l: row(1), s: row(2), b: row(3), art: 1 }; }
  /* ---------- the paper doll: recoloured outfits, head layers, and equipment ---------- */
  // D8 order is S, SW, W, NW, N, NE, E, SE; the sheets have S, SE, E, NE, N, and the rest are mirrors
  const DSRC = [[0, 0], [1, 1], [2, 1], [3, 1], [4, 0], [3, 0], [2, 0], [1, 0]];
  const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const DOLL = {};   // cache of recoloured sheets and finished doll sprites
  function recolor(src, cloth, metal, armour, wantMask) {   // off-white cloth takes the dye, plain grey metal takes the metal colour; skin, hair and leather keep theirs
    const c = mk(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); if (!cloth && !metal) return c;
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data, C = cloth && hexRGB(cloth), M = metal && hexRGB(metal), sm = (a, b, x) => Math.max(0, Math.min(1, (x - a) / (b - a))), mc = wantMask && mk(c.width, c.height), md = mc && mc.getContext('2d').createImageData(c.width, c.height), mp = md && md.data;
    for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 8) continue; const r = p[i], gg = p[i + 1], b = p[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0, l = (r + gg + b) / 765;
      const grey = 1 - sm(.14, .24, sat), light = armour ? sm(.5, .64, l) : sm(.22, .34, l), wc = C ? grey * light : 0, wm = M && armour ? (1 - sm(.1, .17, sat)) * (1 - light) * sm(.06, .14, l) : 0;
      if (wc > 0) { const k = Math.min(1.3, .2 + l * 1.12); for (let j = 0; j < 3; j++) p[i + j] = p[i + j] * (1 - wc) + Math.min(255, C[j] * k) * wc; if (mp) { mp[i] = mp[i + 1] = mp[i + 2] = Math.min(255, 70 + l * 230); mp[i + 3] = p[i + 3] * wc; } }
      if (wm > 0) { const k = .3 + l * 1.3; for (let j = 0; j < 3; j++) p[i + j] = p[i + j] * (1 - wm) + Math.min(255, M[j] * k) * wm; } }
    g.putImageData(d, 0, 0); if (mc) { mc.getContext('2d').putImageData(md, 0, 0); c.mask = mc; } return c;
  }
  function gradMap(src, lo, hi) {   // grey hair -> any colour, keeping the light and shade
    const c = mk(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data, A = hexRGB(lo), B = hexRGB(hi);
    for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 8) continue; const l = Math.min(1, (p[i] + p[i + 1] + p[i + 2]) / 765 * 1.15); for (let j = 0; j < 3; j++) p[i + j] = A[j] + (B[j] - A[j]) * l; }
    g.putImageData(d, 0, 0); return c;
  }
  function dollReady(a) { const B = AD && AD.body; if (!B || !a) return false; const need = ['hb/C' + a.combo + '.webp', 'hb/hair.webp', 'hb/wx.webp']; need.forEach(n => { if (!IMG[n]) img(n); }); return need.every(have); }
  function dollHeadLayers(a) {
    const key = 'head|' + [a.cloth, a.metal, a.hc].join('|');
    if (DOLL[key]) return DOLL[key];
    const head = IMG['hb/hair.webp'].im;
    return DOLL[key] = { hair: gradMap(head, a.hc[0], a.hc[1]), gear: recolor(head, a.cloth, a.metal || '#9aa0a8', false) };
  }
  function dollLayers(a) {   // recoloured sheets for this look, cached
    const key = [a.combo, a.cloth, a.metal, a.hc, !!a.fx].join('|'); if (DOLL[key]) return DOLL[key];
    return DOLL[key] = { body: recolor(IMG['hb/C' + a.combo + '.webp'].im, a.cloth, a.metal, (a.combo - 1) % 5 >= 3, !!a.fx), ...dollHeadLayers(a) };
  }
  // one layer (hair, beard or hat) on a head: view v, head anchor [top, hx, hw]
  function headLayer(g, L, a, item, v, an, lift, flip) {
    const H = AD.body.hair, mv = H.v[item] && H.v[item][v]; if (!mv || !an[2]) return; const [ri, cx] = mv, r = H.r[ri], f = an[2] / H.hw, w = r[2] * f, h = r[3] * f;
    const src = item < 12 || (item >= 12 && item < 18) ? L.hair : L.gear; g.drawImage(src, r[0], r[1], r[2], r[3], an[1] - cx * f, an[0] + lift * an[2], w, h);
  }
  const BEARD_Y = [.62, .62, .78, .78, .68, .72], HAT_Y = [-.18, -.2, -.3, -.22, -.95, -.02];
  function weapon(g, a, x, y, ang, len) {
    const W = AD.body.wx[a.wpn]; if (!W) return; const f = len / W[2]; g.save(); g.translate(x, y); g.rotate(ang); if (a.glow) { g.shadowColor = a.glow; g.shadowBlur = 7; }
    g.drawImage(IMG['hb/wx.webp'].im, W[0], W[1], W[2], W[3], -W[4] * f - 2, -W[5] * f, W[2] * f, W[3] * f); g.restore();
  }
  const ARC = { swing: [[-2.3, -1.3, .6, 1.6], [-2.2, -1.2, .1, .9], [-.8, -1.6, -2.6, 2.4]], thrust: [[1.3, 1.3, 1.4, 1.3], [.1, .05, 0, .1], [-1.5, -1.5, -1.55, -1.5]] };
  const swingAng = (a, sr, k) => a.wkind === 'staff' && a.style === 'cast' ? -1.45 : (ARC[a.style] || ARC.thrust)[sr === 0 ? 0 : sr === 2 ? 1 : 2][k];
  const WLEN = { staff: 1.05, bow: .78, sword: .62, long: .8, dagger: .36, shield: .42 };
  function dollFrame(a, L, row, k, sr) {   // sr: which facing the source row is, 0 S, 1 SE, 2 E, 3 NE, 4 N
    const B = AD.body, CW = B.cw, CH = B.ch, an = B.combos[a.combo].a[row * 8 + k] || [0, 0, 0], c = mk(CW, CH), g = c.getContext('2d'); c.hr = 1;
    const back = sr >= 3, atk = row >= 10 && row < 19, len = 64 * (WLEN[a.wkind] || .6);
    const onBack = () => { if (a.wpn < 0 && a.shield < 0) return; const sx = an[1] + (sr === 2 ? -an[2] * .5 : an[2] * .3), sy = an[0] + an[2] * 1.45;
      if (a.shield >= 0) { const W = B.wx[a.shield], f = 64 * WLEN.shield / W[3]; g.drawImage(IMG['hb/wx.webp'].im, W[0], W[1], W[2], W[3], an[1] - W[2] * f / 2 + (sr === 2 ? -an[2] * .6 : 0), an[0] + an[2] * 1.6, W[2] * f, W[3] * f); }
      if (a.wpn >= 0 && !atk) { if (a.wkind === 'staff' || a.wkind === 'bow') weapon(g, a, an[1] + an[2] * (sr === 2 ? -.4 : sr >= 3 ? -.55 : .55), an[0] + an[2] * 3.6, a.wkind === 'bow' ? -1.35 : sr === 2 ? -1.75 : sr >= 3 ? -1.2 : -1.95, len);
        else weapon(g, a, an[1] + an[2] * (sr === 2 ? -.45 : sr >= 3 ? -.5 : .5), an[0] + an[2] * 1.05, sr === 2 ? 1.75 : sr >= 3 ? 1.2 : 1.95, len); } };
    if (!back) onBack();
    if (atk && back) { const h = B.combos[a.combo].h[row + '.' + k]; if (h && a.wpn >= 0) weapon(g, a, h[0], h[1], swingAng(a, sr, k), len); }
    g.drawImage(L.body, k * CW, row * CH, CW, CH, 0, 0, CW, CH);
    if (back) onBack();
    if (an[2]) { const v = sr; if (a.hat >= 0) headLayer(g, L, a, 18 + a.hat, v, an, HAT_Y[a.hat], false); else if (a.hair >= 0) headLayer(g, L, a, a.hair, v, an, -.12, false); if (a.beard >= 0 && sr <= 2) headLayer(g, L, a, 12 + a.beard, v, an, BEARD_Y[a.beard], false); }
    if (atk && !back) { const h = B.combos[a.combo].h[row + '.' + k]; if (h && a.wpn >= 0) weapon(g, a, h[0], h[1], swingAng(a, sr, k), len); }
    if (atk && a.gl && k >= 1 && k <= 2) { const h = B.combos[a.combo].h[row + '.' + k]; if (h) { const gr = g.createRadialGradient(h[0], h[1], 0, h[0], h[1], 7); gr.addColorStop(0, 'rgba(255,244,190,.95)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gr; g.fillRect(h[0] - 7, h[1] - 7, 14, 14); } }
    if (L.body.mask) { const m = mk(CW, CH); m.getContext('2d').drawImage(L.body.mask, k * CW, row * CH, CW, CH, 0, 0, CW, CH); m.hr = 1; c.mask = m; }
    return c;
  }
  const FXC = mk(80, 80);
  function dollFx(g, fx, m, X, Y, w, h, flip, t) {
    const c = FXC, q = c.getContext('2d'); if (c.width !== m.width || c.height !== m.height) { c.width = m.width; c.height = m.height; }
    q.globalCompositeOperation = 'copy'; q.drawImage(m, 0, 0); q.globalCompositeOperation = 'multiply';
    if (fx.k === 'iri') { const u = t / 30, L = fx.soft ? 82 : 62, gr = q.createLinearGradient(0, 0, m.width, m.height); gr.addColorStop(0, `hsl(${u % 360},90%,${L}%)`); gr.addColorStop(.5, `hsl(${(u + 120) % 360},90%,${L}%)`); gr.addColorStop(1, `hsl(${(u + 240) % 360},90%,${L}%)`); q.fillStyle = gr; } else q.fillStyle = fx.c;
    q.fillRect(0, 0, m.width, m.height); q.globalCompositeOperation = 'destination-in'; q.drawImage(m, 0, 0); q.globalCompositeOperation = 'source-over';
    g.save(); if (fx.k === 'glow') { g.shadowColor = fx.c; g.shadowBlur = (7 + 3 * Math.sin(t / 280)) * K; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .65 + .15 * Math.sin(t / 280); } else g.globalAlpha = fx.soft ? .45 : .72;
    if (flip) { g.translate(X + w, Y); g.scale(-1, 1); g.drawImage(c, 0, 0, w, h); } else g.drawImage(c, X, Y, w, h); g.restore();
  }
  const flipC = c => { const o = mk(c.width, c.height), g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); o.hr = 1; if (c.mask) o.mask = flipC(c.mask); return o; };
  function dollSprite(a) {
    const key = JSON.stringify(a); if (DOLL['s' + key]) return DOLL['s' + key]; if (!dollReady(a)) return null; const L = dollLayers(a), s = { art: 1, doll: 1, fx: a.fx };
    const dirRow = (row0, n) => { const rows = [0, 1, 2, 3, 4].map(sr => Array.from({ length: n }, (_, k) => dollFrame(a, L, row0 + sr, k, sr))); return DSRC.map(([sr, fl]) => fl ? rows[sr].map(flipC) : rows[sr]); };
    s.w8 = dirRow(0, 8); s.r8 = dirRow(5, 8); const ar = { swing: 10, thrust: 13, cast: 16 }[a.style] || 10, at = sr => [0, 1, 2, 3].map(k => dollFrame(a, L, ar + [0, 1, 2][sr], k, [0, 2, 4][sr]));
    s.af = at(0); s.as = at(1); s.al = s.as.map(flipC); s.ab = at(2); s.f = [s.w8[0][2]]; s.s = [s.w8[6][2]]; s.l = [s.w8[2][2]]; s.b = [s.w8[4][2]];
    s.fall = [0, 1, 2, 3].map(k => dollFrame(a, L, 19, k, 0));
    return DOLL['s' + key] = s;
  }
  // The ten painted figures have distinct sleeve and finger positions. These
  // palm centers are measured in the 300×450 presentation, in P1–P10 order.
  const DOLL_HANDS = [
    [[80, 224], [220, 224]], [[78, 230], [219, 230]], [[81, 224], [220, 224]],
    [[78, 224], [219, 224]], [[78, 226], [220, 226]], [[75, 226], [224, 227]],
    [[73, 224], [224, 226]], [[80, 224], [220, 225]], [[78, 221], [219, 222]],
    [[77, 225], [226, 227]],
  ];
  // HX index → [grip x, grip y in the atlas cut, carry angle, display length,
  // optional tuck toward the curled fingers for a narrow handle].
  // World animations keep their own pivots and angles.
  const DOLL_CARRY = {
    0: [35, 30, 1.81, 124],   // short sword
    1: [25, 24, 1.78, 151],   // longsword
    2: [30, 25, 1.77, 190],   // greatsword
    3: [33, 48, 1.75, 125],   // broad axe
    4: [27, 53, 1.64, 151],   // battle axe
    5: [35, 28, 1.78, 132],   // mace
    6: [32, 49, 1.72, 158],   // war hammer
    7: [25, 13, -1.63, 236],  // spear
    8: [28, 7, -1.63, 231],   // quarterstaff
    9: [25, 39, -1.63, 217],  // oak staff
    10: [24, 22, -1.63, 221], // crystal staff
    11: [27, 30, -1.63, 220], // bone staff
    12: [27, 22, -1.63, 215], // iron staff
    13: [30, 9, -1.86, 80, 7], // wand
    14: [36, 31, 1.92, 75],   // dagger
    15: [35, 30, 1.86, 121],  // curved blade
    16: [42, 13, 1.87, 63],   // throwing knife
    23: [34, 39, -1.03, 86, 5], // glass orb
    24: [121, 76, .14, 82],   // spellbook
    25: [93, 61, -1.04, 150], // short bow
    26: [100, 92, -.83, 164], // longbow
    27: [43, 35, 1.52, 128],  // crossbow
  };
  function paintHeld(g, body, item, hand, side, glow) {
    const W = AD.body.wx[item], pose = DOLL_CARRY[item];
    if (!W || !pose) return;
    const [gx, gy, angle, length, tuck = 0] = pose, [x, y] = hand, f = length / Math.max(W[2], W[3]);
    g.save();
    g.translate(x - side * tuck, y);
    g.rotate(angle);
    if (glow) { g.shadowColor = glow; g.shadowBlur = 7; }
    g.drawImage(IMG['hb/wx.webp'].im, W[0], W[1], W[2], W[3], -gx * f, -gy * f, W[2] * f, W[3] * f);
    g.restore();

    // Restore the curled outer fingers from the dyed figure over the grip.
    // The diagonal edge lets the handle pass through the painted palm opening.
    g.save();
    g.beginPath();
    g.moveTo(x - side * 20, y - 10);
    g.lineTo(x - side * 5, y - 10);
    g.lineTo(x - side * 3, y + 2);
    g.lineTo(x + side * 8, y + 14);
    g.lineTo(x - side * 20, y + 17);
    g.closePath();
    g.clip();
    g.drawImage(body, 0, 0);
    g.restore();
  }
  function paintOffhand(g, body, item, hand) {
    const W = AD.body.wx[item];
    if (!W) return;
    if (DOLL_CARRY[item]) {
      paintHeld(g, body, item, hand, -1);
    } else if (item >= 20 && item <= 22) {
      // The shield face sits in front of the hand and lower forearm.
      const f = (item === 22 ? 84 : 108) / W[3], w = W[2] * f, h = W[3] * f;
      g.drawImage(IMG['hb/wx.webp'].im, W[0], W[1], W[2], W[3], hand[0] - 4 - w / 2, hand[1] + 6 - h / 2, w, h);
    }
  }
  const DOLL_PAINT = new WeakMap();
  function drawDoll(cv, a) {
    const B = AD && AD.body, hands = a && DOLL_HANDS[a.combo - 1], pd = B && a && B.pd[a.combo];
    if (!pd || !hands) return false;
    const pn = 'hb/P' + a.combo + '.webp', images = [img(pn), img('hb/hair.webp'), img('hb/wx.webp')];
    if (!images.every(entry => entry.ok)) {
      if (DOLL_PAINT.get(cv)?.a === a) return false;
      const request = { a };
      DOLL_PAINT.set(cv, request);
      Promise.all(images.map(entry => entry.p)).then(ready => {
        if (ready.every(Boolean) && cv.isConnected && DOLL_PAINT.get(cv) === request) drawDoll(cv, a);
      });
      return false;
    }
    DOLL_PAINT.delete(cv);
    const key = 'P' + [a.combo, a.cloth, a.metal, !!a.fx].join('|'), P = DOLL[key] || (DOLL[key] = recolor(IMG[pn].im, a.cloth, a.metal, (a.combo - 1) % 5 >= 3, !!a.fx)), L = dollHeadLayers(a), g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    const S = Math.min(cv.width / 300, cv.height / 450);
    g.save();
    g.translate((cv.width - 300 * S) / 2, (cv.height - 450 * S) / 2);
    g.scale(S, S);
    g.drawImage(P, 0, 0); if (a.fx && P.mask) dollFx(g, a.fx, P.mask, 0, 0, 300, 450, false, performance.now());
    const an = [pd.top, pd.hx, pd.hw], H = B.hair, big = (item, lift) => { const mv = H.v[item] && H.v[item][5], m0 = H.v[item] && H.v[item][0]; if (!mv) return; const r = H.r[mv[0]], f = an[2] / H.hw * (m0 ? m0[2] / mv[2] : .5), src = item < 18 ? L.hair : L.gear; g.drawImage(src, r[0], r[1], r[2], r[3], an[1] - mv[1] * f, an[0] + lift * an[2], r[2] * f, r[3] * f); };
    if (a.hat >= 0) big(18 + a.hat, HAT_Y[a.hat]); else if (a.hair >= 0) big(a.hair, -.12); if (a.beard >= 0) big(12 + a.beard, BEARD_Y[a.beard]);
    paintHeld(g, P, a.wpn, hands[0], 1, a.glow);
    paintOffhand(g, P, a.shield, hands[1]);
    g.restore(); return true;
  }
  function heroArt() { const ap = host.app && host.app(); if (ap && AD && AD.body) { const d = dollSprite(ap); if (d) return d; } const s = heroSprite(), C = AD && AD.chars; if (s && s.art && C && C.atk) { if (!IMG['atk.webp']) img('atk.webp'); if (have('atk.webp')) { const lk = host.look(), aw = C.aw || C.cw, row = i => [0, 1, 2, 3].map(f => cut('atk.webp', (i * 4 + f) * aw, lk * C.ch, aw, C.ch)); s.af = row(0); s.al = row(1); s.as = row(2); s.ab = row(3); } }
    if (s && s.art && C && C.diag) { if (!IMG['diag.webp']) img('diag.webp'); if (have('diag.webp')) { const lk = host.look(), row = i => [0, 1, 2, 3].map(f => cut('diag.webp', (i * 4 + f) * C.cw, lk * C.ch, C.cw, C.ch)); s.dl = row(0); s.dr = row(1); s.ul = row(2); s.ur = row(3); } }   // the four diagonals, once that sheet is packed
    if (s && s.art && C && C.w8) { const lk = host.look(), f = 'w8/L' + lk + '.webp'; if (C.w8[lk]) { if (!IMG[f]) img(f); if (have(f)) { const W8 = C.w8[lk], n = W8.n || 4, dir = (d, o) => Array.from({ length: n }, (_, k) => cut(f, (o + k) * W8.cw, d * W8.ch, W8.cw, W8.ch)); s.w8 = [0, 1, 2, 3, 4, 5, 6, 7].map(d => dir(d, 0)); s.r8 = [0, 1, 2, 3, 4, 5, 6, 7].map(d => dir(d, n)); } } }   // walk and run in eight directions
    return s; }
  function spr(kind, r) { const key = kind + '|' + r, c = SC[key]; if (c && c.v === artVer) return c.s; let s = artProp(kind, r); if (!s && XP[kind]) s = spr(XP[kind], r); else if (!s && kind.slice(0, 3) !== 'sc_' && kind.slice(0, 3) !== 'pi_' && kind.slice(0, 3) !== 'dj_') { const pk = { rock0: 'rock', rock1: 'rock', bush: 'rock', pillar: 'lamp', sign: 'board', fire: 'torch' }[kind] || kind; s = pk === 'flowers' || pk === 'bones' ? null : prop(pk, world ? world.pal[r] : map.pal[r], r, host.hue(r)); } SC[key] = { v: artVer, s }; return s; }
  function bldSpr(o) { if (o.v === artVer && o.s) return o.s; o.v = artVer; if (o.home) return o.s = homeSpr(o); const a = artBld(o.slot, o.w, o.r, o.enter); if (a) return o.s = a; if (!o.p) o.p = building(o.w, o.h, world.pal[o.r], o.r * 100 + o.x, o.sign, '-'); return o.s = o.p; }
  /* ---------- walk-in rooms: an enterable building fades out and its room is drawn in the same footprint ---------- */
  // Furniture per room, in tiles from the building's top-left. p: kit piece, x: centre column (may be fractional), y: row it stands on, s: tiles it blocks.
  const ROOMS = {
    tavern: { door: 3, fl: 'floor', wall: [['window', 1.3], ['banner', 4.4], ['lamp', 5.5]], rug: [3, 4.6],
      fur: [{ p: 'kegs', x: 1.5, y: 1, s: [[1, 1], [2, 1]] }, { p: 'hearth', x: 3, y: 1, s: [[3, 1]] }, { p: 'shelf', x: 5, y: 1, s: [[5, 1]] },
        { p: 'bar', x: 4.25, y: 3, s: [[4, 3]] }, { p: 'barend', x: 5.3, y: 3, s: [[5, 3]] }, { p: 'rtable', x: 1, y: 3, s: [[1, 3]] }, { p: 'stool', x: 2, y: 3 },
        { p: 'stool', x: 1, y: 4 }, { p: 'ltable', x: 1.5, y: 5, s: [[1, 5], [2, 5]] }], keep: [5, 2] },
    shop: { door: 3, fl: 'floor', wall: [['widewin', 2.5], ['pots', 4.2]], rug: null,
      fur: [{ p: 'shelf', x: 1, y: 1, s: [[1, 1]] }, { p: 'cupboard', x: 4, y: 1, s: [[4, 1]] }, { p: 'counter', x: 1.5, y: 2, s: [[1, 2], [2, 2]] }, { p: 'chest', x: 4, y: 3, s: [[4, 3]] }], keep: [2, 1] },
    bank: { door: 3, fl: 'flag', wall: [['window', 2.2], ['painting', 3.6], ['lamp', 4.6]], rug: [2.6, 3.6],
      fur: [{ p: 'cupboard', x: 1, y: 1, s: [[1, 1]] }, { p: 'strongbox', x: 4, y: 1, s: [[4, 1]] }, { p: 'bankctr', x: 1.5, y: 2, s: [[1, 2], [2, 2]] }, { p: 'chest', x: 4, y: 4, s: [[4, 4]] }], keep: [2, 1] } };
  // Called from town building: open the room's floor, keep its walls solid, block the furniture.
  function setRoom(m, o) { const R = ROOMS[o.slot]; if (!R) return; o.enter = 1; o.fa = 1; o.room = R; const at = (x, y) => (o.y + y) * m.w + o.x + x;
    for (let y = 1; y < o.h - 1; y++) for (let x = 1; x < o.w - 1; x++) m.solid[at(x, y)] = 0; m.solid[at(R.door, o.h - 1)] = 0;
    for (const f of R.fur) for (const [x, y] of f.s || []) m.solid[at(x, y)] = 1; }
  const kitPiece = n => { const rc = AD && AD.kit && AD.kit.k1[n]; return rc && have('kit/k1.webp') ? cut('kit/k1.webp', rc[0], rc[1], rc[2], rc[3]) : null; };
  // Tile a hi-res texture across a hi-res canvas region.
  function fillTex(c, tex, x0, y0, w, h, alignBottom) { const g2 = c.getContext('2d'); g2.save(); g2.beginPath(); g2.rect(x0, y0, w, h); g2.clip(); const oy = alignBottom ? y0 + h - Math.ceil(h / tex.height) * tex.height : y0; for (let y = oy; y < y0 + h; y += tex.height) for (let x = x0; x < x0 + w; x += tex.width) g2.drawImage(tex, x, y); g2.restore(); }
  let roomT = 0; const WALLH = 2.5;   // the back wall face, in tiles, standing on the room's top row
  function roomArt(o) { if (o.ra && o.ra.v === artVer) return o.ra; if (!have('kit/k1.webp')) { if (AD && AD.kit) img('kit/k1.webp'); return null; } const R = o.room, W = o.w * T * K, H = o.h * T * K;
    const fl = mk(W, H); fillTex(fl, kitPiece('t_' + R.fl), 0, 0, W, H); if (R.rug) { const rg = kitPiece('f_rug'); fl.getContext('2d').drawImage(rg, R.rug[0] * T * K + T * K / 2 - rg.width / 2, R.rug[1] * T * K - rg.height / 2); } fl.hr = 1;
    const wh = WALLH * T * K, wl = mk(W, wh), wg = wl.getContext('2d'); fillTex(wl, kitPiece('t_wall'), 0, 0, W, wh, true);
    const sg = wg.createLinearGradient(0, wh - T * K * .5, 0, wh); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.28)'); wg.fillStyle = sg; wg.fillRect(0, 0, W, wh);
    for (const [n, x] of R.wall) { const pc = kitPiece('w_' + n); if (pc) wg.drawImage(pc, x * T * K - pc.width / 2, wh - T * K * .55 - pc.height); }
    wl.hr = 1;
    const sw = 6 * K, sd = mk(sw, (o.h + WALLH - 1) * T * K); fillTex(sd, kitPiece('t_stone'), 0, 0, sd.width, sd.height); sd.hr = 1;
    const fh = 6 * K, fr = mk(W, fh); fillTex(fr, kitPiece('t_stone'), 0, 0, W, fh); fr.getContext('2d').clearRect(R.door * T * K, 0, T * K, fh); fr.hr = 1;
    return o.ra = { v: artVer, fl, wl, sd, fr }; }
  // Fade the building in or out as the hero crosses its footprint.
  function roomFade(o, dt) { const inside = P && map === world && P.x >= o.x && P.x < o.x + o.w && P.y >= o.y && P.y < o.y + o.h; if (o.inside != null && inside !== o.inside) emit('door'); o.inside = inside; o.fa += ((inside ? 0 : 1) - o.fa) * Math.min(1, dt * 7); if (Math.abs(o.fa - (inside ? 0 : 1)) < .01) o.fa = inside ? 0 : 1; return o.fa; }
  function dress(e) { e.sv = artVer; if (e.wk || e.ak) { e.spr = (e.wk && artWalk(e.wk)) || (e.ak && artFolk(e.ak)) || e.spr; if (e.hop && e.spr && !e.spr.l) e.spr.one = 1; } else if (e.kind === 'mon' || e.kind === 'guard' && e.inst && e.inst.dungeon || e.kind === 'keeper') e.spr = monSprite(e.inst && (e.inst.art || e.inst.lk || e.inst.tpl) || 'k' + e.r); else if (e.kind === 'stock') e.spr = monSprite(e.tpl); else if (e.kind === 'guard') e.spr = monSprite(e.tpl); else if (e.kind === 'boss') e.spr = bossSprite(e.r); if (e.ok) e.obj = spr(e.ok, e.r); else if (e.kind === 'dlever') e.obj = dungeonArt('control',e.r); else if(e.kind==='dgate')e.obj=dungeonGate(e,e.r); else if(e.kind==='dsecret')e.obj=dungeonArt('landmark',e.r); else if(e.kind==='dlore')e.obj=dungeonArt('lore',e.r); }
  // rings spreading on the water where the fish are
  const RIP = []; function ripple(t) { if (!RIP.length) for (let f = 0; f < 6; f++) { const c = mk(22, 12), g = c.getContext('2d'); g.strokeStyle = `rgba(255,255,255,${.75 - f * .11})`; g.lineWidth = 1; g.beginPath(); g.ellipse(11, 6, 2 + f * 1.7, 1 + f * .9, 0, 0, 6.283); g.stroke(); if (f < 3) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(10, 5, 2, 1); } RIP.push(c); } return RIP[Math.floor(t / 170) % 6]; }
  const need = r => { if (AD && r >= 1 && r <= 8) packs(r).forEach(img); };
  const sit = (m, e, x, y) => { if (e.solid) { const o = e.y * m.w + e.x; if (m.occ.get(o) === e) m.occ.delete(o); m.occ.set(y * m.w + x, e); } e.x = x; e.y = y; };
  const addEnt = (m, e) => { e.fx = e.x; e.fy = e.y; if (e.dir == null) e.dir = 'f'; if (e.solid == null) e.solid = 1; m.ents.push(e); if (e.solid) m.occ.set(e.y * m.w + e.x, e); return e; };

  function genWorld() {
    const n = WW * WH, m = { w: WW, h: WH, t: new Uint8Array(n), b: new Uint8Array(n), reg: new Uint8Array(n), solid: new Uint8Array(n), o: new Uint8Array(n), keep: new Uint8Array(n), blds: [], props: [], ents: [], lights: [], pal: [], dungeon: false, occ: new Map(), terr: [], chunks: new Map(), spots: {} };
    const X2 = { dw: '#8f8a80', df: '#77736c', mt: '#8d8a84' };
    m.pal[0] = Object.assign({}, BIO[1], X2); for (let r = 1; r <= 8; r++) m.pal[r] = Object.assign({}, BIO[r], X2, r === 5 ? { mt: '#5e5450' } : r === 7 ? { mt: '#aab4bc', cap: 1 } : r === 3 ? { mt: '#a08a6a' } : null);
    m.pal[9] = Object.assign({}, BIO[3], X2, { g: '#dcc58a', G: '#cfb574', s: '#e6d6a0', tree: 'none', liquid: 'none', amb: 0, fx: null, ar: 3, mt: '#b89a6a' });      // desert
    m.pal[10] = Object.assign({}, BIO[7], X2, { ar: 7, mt: '#aab4bc', cap: 1 });                                                                                     // snowfield
    m.pal[11] = Object.assign({}, BIO[4], X2, { g: '#8f9478', G: '#84896c', tree: 'scrub', fx: null, amb: 0 });                                                       // stony foothills
    const N = []; for (let i = 0; i < 10; i++) N.push(noise(11 + i)); const q = rng(4242), ix = (x, y) => y * WW + x, inb = (x, y) => x >= 0 && y >= 0 && x < WW && y < WH;
    const river = y => 228 + Math.sin(y / 14) * 8 + (N[1](3, y / 16) - .5) * 26, T1 = TOWN[1];
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
      const i = ix(x, y), wx = x + (N[3](x / 28, y / 28) - .5) * 44, wy = y + (N[3](x / 28 + 40, y / 28 + 40) - .5) * 44; let r = 1, d1 = 1e9, d2 = 1e9;
      for (let k = 1; k <= 8; k++) { const d = (wx - TOWN[k][0]) ** 2 + (wy - TOWN[k][1]) ** 2; if (d < d1) { d2 = d1; d1 = d; r = k; } else if (d < d2) d2 = d; }
      const td = Math.hypot(x - TOWN[r][0], y - TOWN[r][1]), home = clamp((48 - td) / 16, 0, 1), border = clamp(1 - (Math.sqrt(d2) - Math.sqrt(d1)) / 26, 0, 1), bio = BIO[r], wet = bio.liquid === 'pools' || bio.liquid === 'lava';
      const edge = Math.min(x, y, WW - 1 - x, WH - 1 - y), coast = 6 + N[2](x / 14, y / 14) * 12 + (x < 130 ? Math.max(0, 14 - Math.abs(y - T1[1])) * 3.6 : 0), nz = N[1](x / 6, y / 6);
      const em = N[4](x / 38, y / 38) * .6 + N[5](x / 12, y / 12) * .4 + border * .2 - home * .6, dz = N[6](x / 50, y / 50) - home, lz = N[8](x / 27, y / 27) - home * .5, cold = r === 7 || y < WH * .22;
      let k = N[0](x / 6, y / 6) > .57 ? 1 : 0, b = r, sea = false;
      if (edge < coast) { k = 4; sea = true; } else if (edge < coast + 2.5) k = 5;
      else if (em > .7) { k = 9; if (cold) b = 10; }
      else if (lz > .76) k = 4; else if (lz > .73) k = 5;
      else if (wet && nz > .72) k = 4; else if (wet && nz > .67) k = 5;
      else if (em > .62) b = cold ? 10 : 11;
      else if (dz > .62 && r !== 2 && r !== 6 && r !== 7) b = 9;
      if (!sea && y > T1[1] - 290) { const d = Math.abs(x - river(y)); if (d < 2) { k = 4; sea = true; } else if (d < 3 && k < 2) k = 5; }
      m.t[i] = k; m.b[i] = sea ? 0 : b; m.reg[i] = r;
    }
    const rect = (x0, y0, x1, y1, k, pad = 1) => { for (let y = y0 - pad; y <= y1 + pad; y++) for (let x = x0 - pad; x <= x1 + pad; x++) if (inb(x, y)) { const i = ix(x, y); m.keep[i] = 1; if (m.t[i] === 9) { m.t[i] = 0; if (m.b[i] !== 10) m.b[i] = 11; } if (m.o[i]) { m.o[i] = 0; m.solid[i] = 0; } if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { if (m.t[i] === 4) { m.t[i] = 6; } else if (!(k === 2 && (m.t[i] === 3 || m.t[i] === 6))) m.t[i] = k; } } };
    const road = (a, b2) => { let x = a[0], y = a[1], g2 = 0; const x1 = b2[0], y1 = b2[1]; while ((x !== x1 || y !== y1) && g2++ < 6000) { rect(x, y, x + 1, y + 1, 2); const dx = x1 - x, dy = y1 - y; if (Math.abs(dx) > Math.abs(dy)) { x += Math.sign(dx); if (dy && q() < .2) y += Math.sign(dy); else if (Math.abs(dx) > 12 && q() < .16) y += N[9](x / 9, y / 9) < .5 ? 1 : -1; } else { y += Math.sign(dy); if (dx && q() < .2) x += Math.sign(dx); else if (Math.abs(dy) > 12 && q() < .16) x += N[9](x / 9, y / 9) < .5 ? 1 : -1; } x = clamp(x, 10, WW - 12); y = clamp(y, 10, WH - 12); } rect(x1, y1, x1 + 1, y1 + 1, 2); };
    const wet = (x0, y0, w, h) => { for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) if (!inb(x, y) || m.t[ix(x, y)] === 4 || m.t[ix(x, y)] === 6) return true; return false; };
    const put = (x, y, kind, r, o) => { m.props.push(Object.assign({ x, y, kind, r, solid: 1 }, o)); m.keep[ix(x, y)] = 1; if (!o || o.solid !== 0) m.solid[ix(x, y)] = 1; };
    const lamp = (x, y, r) => { if (m.t[ix(x, y)] === 4 || m.solid[ix(x, y)]) return; put(x, y, 'lamp', r); m.lights.push({ x: x + .5, y: y - .6, r: 44, c: 1 }); };
    const LEGS = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [1, 4], [3, 6], [5, 8]]; for (const [a, b2] of LEGS) road(TOWN[a], TOWN[b2]);
    const XA = AD ? AD.chars.extra : {}, pool = AD ? Object.keys(AD.chars.npc) : [], names = r => host.townsfolk(r);
    const EE = (kind, x, y, r, o) => addEnt(m, Object.assign({ kind, x, y, r }, o));
    for (let r = 1; r <= 8; r++) {
      const [cx, cy] = TOWN[r], E = (kind, x, y, o) => EE(kind, x, y, r, o);
      for (let y = cy - 21; y <= cy + 14; y++) for (let x = cx - 26; x <= cx + 26; x++) if (inb(x, y)) { const i = ix(x, y); if (m.t[i] === 4 && m.b[i] !== 0) m.t[i] = 0; if (m.b[i] > 8) m.b[i] = r; }
      rect(cx - 7, cy - 4, cx + 7, cy + 5, 3); rect(cx - 23, cy, cx + 23, cy + 1, 2); rect(cx, cy - 17, cx + 1, cy + 17, 2); rect(cx - 23, cy + 10, cx + 22, cy + 11, 2);
      const bld = (x, y, w, h, slot, sign, en) => { if (wet(x, y, w, h)) return; rect(x, y, x + w - 1, y + h - 1, 2, 1); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) m.solid[ix(xx, yy)] = 1; const ob = { x, y, w, h, slot, sign, r, by: (y + h) * T - 1 }; m.blds.push(ob); if (en) setRoom(m, ob); m.lights.push({ x: x + .9, y: y + h - .6, r: 20, c: 1 }, { x: x + w - .9, y: y + h - .6, r: 20, c: 1 }); };
      bld(cx - 9, cy - 10, 7, 5, 'guild', '#c9a23a'); bld(cx + 3, cy - 10, 7, 5, 'casino', '#6b2f7a'); if (r === 1) bld(cx - 17, cy - 8, 7, 7, 'tavern', '#8a3a2a', 1); else bld(cx - 16, cy - 5, 6, 4, 'tavern', '#8a3a2a'); bld(cx - 23, cy - 5, 5, 4, 'house');
      bld(cx + 10, cy - 5, 6, 4, 'work', '#8f949c'); if (r === 1) bld(cx + 17, cy - 6, 6, 5, 'shop', null, 1); else bld(cx + 18, cy - 5, 5, 4, 'shop'); bld(cx - 15, cy + 5, 5, 4, 'healer'); bld(cx - 22, cy + 5, 5, 4, 'cottage'); if (r === 1) bld(cx + 10, cy + 3, 6, 6, 'bank', '#d4a83a', 1); else bld(cx + 10, cy + 5, 5, 4, 'bank', '#d4a83a'); bld(cx + 17, cy + 5, 5, 4, 'cottage');
      bld(cx - 7, cy - 18, 5, 4, 'cottage'); bld(cx + 4, cy - 18, 5, 4, 'house');
      for (const [dx, dy] of [[11, -19], [-17, -17], [-25, -12], [18, -12]]) { const x = cx + dx, y = cy + dy; let ok = !wet(x, y, 7, 6); for (let yy = y; yy < y + 6 && ok; yy++) for (let xx = x; xx < x + 7; xx++) if (!inb(xx, yy) || m.solid[ix(xx, yy)]) { ok = false; break; } if (!ok) continue; bld(x, y, 7, 5, 'dojo', '#7a2a1a'); EE('dojo', x + 3, y + 5, r, { name: 'Dojo', sub: 'Go in' }); m.spots['dojo' + r] = [x + 3, y + 5]; break; }
      for (const [dx, dy] of [[-8, -5], [8, -5], [-8, 6], [8, 6], [-15, -1], [15, -1], [-21, 2], [21, 2], [-1, -13], [2, 13], [-12, 12], [12, 12]]) lamp(cx + dx, cy + dy, r);
      put(cx - 3, cy + 3, 'well', r); if (r === 1) for (const [x, y] of [[cx - 15, cy - 1], [cx - 17, cy + 2], [cx - 19, cy - 1]]) if (m.t[ix(x, y)] !== 4 && !m.solid[ix(x, y)]) put(x, y, 'crate', r);
      const folk = host.folk(r), FP = [[cx - 6, cy - 5], [cx + 6, cy - 5], [cx + 13, cy - 1]];
      folk.forEach((f, i) => { const ak = AD && AD.chars.folk[r][i]; E('npc', FP[i][0], FP[i][1], { i, name: f[0], sub: f[1], ak, pt: portOf(r, i), spr: folkSprite(ak, f[0]) }); });
      const inRm = (slot, dx, dy) => { const o = r === 1 && m.blds.find(b => b.r === r && b.slot === slot && b.enter); return o ? [o.x + o.room.keep[0], o.y + o.room.keep[1]] : [dx, dy]; }, tp = inRm('tavern', cx - 13, cy - 1);
      E('tavern', tp[0], tp[1], { name: 'Tavern keeper', sub: host.tavern(r), ak: XA.tavern, pt: 'G09_1', spr: folkSprite(XA.tavern, 'tav' + r, { apron: '#8a7a5a' }) });
      E('registrar', cx + 4, cy - 3, { name: 'Clerk of the Trials', sub: 'Marks', ak: XA.registrar, pt: 'G09_3', spr: folkSprite(XA.registrar, 'reg' + r, { hat: '#2a2e34', top: '#3a3a52' }) });
      E('stallkeep', cx + 6, cy + 4, { name: 'Stallkeeper', sub: 'Buys and sells', ak: XA.stall, pt: 'G09_2', spr: folkSprite(XA.stall, 'stall' + r) }); put(cx + 4, cy + 3, 'stall', r); m.solid[ix(cx + 3, cy + 3)] = m.solid[ix(cx + 5, cy + 3)] = 1;
      const hk = pool.length ? pool[(r * 5 + 3) % pool.length] : null, hp = m.t[ix(cx - 13, cy + 9)] === 4 || m.solid[ix(cx - 13, cy + 9)] ? [cx - 5, cy + 4] : [cx - 13, cy + 9]; E('healer', hp[0], hp[1], { name: 'Healer', sub: 'Mends and sells draughts', ak: hk, spr: folkSprite(hk, 'heal' + r, { top: '#e6e0d0', apron: '#b04a3a' }) });
      { const bk = pool.length ? pool[(r * 3 + 5) % pool.length] : null, bin = inRm('bank', -1, -1), bp = bin[0] > 0 ? bin : [[cx + 12, cy + 9], [cx + 11, cy + 9], [cx + 13, cy + 9], [cx + 12, cy + 10]].find(([x, y]) => !m.solid[ix(x, y)] && m.t[ix(x, y)] !== 4 && !m.occ.has(ix(x, y))) || [cx + 8, cy + 8];
        { const sp = inRm('shop', -1, -1); if (sp[0] > 0) E('shopkeep', sp[0], sp[1], { name: 'Shopkeeper', sub: 'Buys and sells', ak: XA.stall, spr: folkSprite(XA.stall, 'shop' + r, { apron: '#6a5a3a' }) }); }
        E('banker', bp[0], bp[1], { name: 'Banker', sub: 'Your gold and goods, kept safe', ak: (AD && AD.chars.banker && AD.chars.banker[r]) || bk, pt: AD && AD.bankers ? AD.bankers[r] : undefined, spr: folkSprite(bk, 'bank' + r, { top: '#2e4a3a', hat: '#22302a' }) }); }
      E('board', cx - 5, cy - 3, { name: 'Notice board', sub: 'Daily drills', ok: 'board' }); E('bench', cx + 14, cy - 1, { name: 'Workbench', sub: 'Crafting', ok: 'bench' });
      { const ck = (AD && AD.chars.croup && AD.chars.croup[r]) || (pool.length ? pool[(r * 7 + 1) % pool.length] : null), cp = m.solid[ix(cx + 8, cy - 4)] || m.occ.has(ix(cx + 8, cy - 4)) ? [cx + 7, cy - 4] : [cx + 8, cy - 4]; E('casino', cp[0], cp[1], { name: 'Croupier', sub: 'The card room', ak: ck, pt: AD && AD.casino ? 'G' + (r <= 4 ? 12 : 13) + '_' + ((r - 1) % 4 + 1) : undefined, spr: folkSprite(ck, 'croup' + r, { top: '#5a2a6a', hat: '#2a1a30' }) }); }
      const rk = AD && AD.chars.rival[r]; E('rival', cx + 2, cy + 2, { name: host.rivalName(r), sub: 'Candidate', ak: rk, pt: r === 6 ? 'G06_3' : 'G0' + r + '_4', wk: 'R' + r, spr: folkSprite(rk, 'rival' + r, { cloak: '#3a2a3a', hat: '#2a2228' }), wander: 1, home: [cx + 2, cy + 2], range: 5, t: 2 });
      let placed = 0; for (let k = 0; k < 60 && placed < 8; k++) { const x = cx - 22 + (q() * 45 | 0), y = cy - 16 + (q() * 28 | 0), i = ix(x, y), tt = m.t[i]; if ((tt !== 2 && tt !== 3) || m.solid[i] || m.occ.has(i)) continue; const ak = pool.length ? pool[(r * 7 + placed * 3 + 1) % pool.length] : null, nm = names(r)[placed % 12]; E('folk', x, y, { name: nm, sub: 'Townsfolk', ak, wk: 'K' + String(host.folkIdx(nm) + 1).padStart(2, '0'), spr: folkSprite(ak, nm + r), wander: 2, t: q() * 3 }); placed++; }
      const nx = r < 8 ? TOWN[r + 1] : [cx, cy - 60], hz = Math.abs(nx[0] - cx) > Math.abs(nx[1] - cy), ex = cx + (hz ? Math.sign(nx[0] - cx) * 31 : 6), ey = cy + (hz ? -6 : Math.sign(nx[1] - cy) * 25);
      rect(ex - 2, ey - 2, ex + 2, ey + 2, 3); road([ex, ey + 2], hz ? [ex, cy] : [cx, ey]); for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) put(ex + dx, ey + dy, 'pillar', r); m.lights.push({ x: ex + .5, y: ey, r: 40, c: 2 });
      E('boss', ex, ey, { name: host.bossName(r), sub: 'Examiner', spr: bossSprite(r), big: 1 }); m.spots['boss' + r] = [ex, ey];
    }
    // trees, rocks, flowers: what grows depends on the ground
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { const i = ix(x, y), tt = m.t[i]; if (tt === 4 || tt === 8 || tt === 9) { m.solid[i] = 1; continue; } if (m.keep[i] || tt > 1) continue; const b = m.b[i], bio = m.pal[b], u = q();
      if (b === 9) { if (u < .022) { m.o[i] = 4 + (x & 1); m.solid[i] = 1; } else if (u < .028) m.o[i] = 10; else if (u < .036) { m.o[i] = 6; m.solid[i] = 1; } continue; }
      if (b === 11) { if (u < .07) { m.o[i] = 4 + (x & 1); m.solid[i] = 1; } else if (u < .1) { m.o[i] = 1 + ((x * 7 + y * 3) % 3); m.solid[i] = 1; } else if (u < .12) { m.o[i] = 6; m.solid[i] = 1; } continue; }
      const fz = N[7](x / 32, y / 32), thr = (bio.tree === 'dead' ? .86 : .77) - (fz > .6 ? .2 : fz < .32 ? -.12 : 0);
      if (N[2](x / 3.2, y / 3.2) + u * .22 > thr) { m.o[i] = 1 + ((x * 7 + y * 3) % 3); m.solid[i] = 1; } else { const v = q(); if (v < .012) { m.o[i] = 4 + (x & 1); m.solid[i] = 1; } else if (v < .03) { m.o[i] = 6; m.solid[i] = 1; } else if (v < (fz < .32 ? .14 : .05)) m.o[i] = 7; } }
    for (const e of m.ents) { const i = ix(e.x, e.y); if (m.o[i]) { m.o[i] = 0; m.solid[i] = 0; } m.keep[i] = 1; }
    // space the trees, rocks and bushes: none stands beside or corner to corner with another, or against water, rock or a wall. A path can then never be closed by them.
    m.fo = new Uint8Array(n); { const hard = i => m.solid[i] || m.t[i] === 4 || m.t[i] === 9 || m.t[i] === 8, list = [];
      for (let i = 0; i < n; i++) if (m.o[i] && m.o[i] < 7 && m.solid[i]) { if (m.o[i] < 4) m.fo[i] = 1; list.push(i, m.o[i]); m.solid[i] = 0; m.o[i] = 0; }
      for (let k = 0; k < list.length; k += 2) { const i = list[k], x = i % WW, y = (i / WW) | 0; let fits = x > 0 && y > 0 && x < WW - 1 && y < WH - 1; for (let dy = -1; dy <= 1 && fits; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && hard(i + dy * WW + dx)) { fits = false; break; } if (fits) { m.o[i] = list[k + 1]; m.solid[i] = 1; } } }
    m.seen = reach(m, T1[0], T1[1] + 3);
    // what a place is like, sampled around it: used to put each creature where it belongs
    const probe = (x, y) => { const c = { sea: 0, water: 0, rock: 0, forest: 0, road: 0 }; for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) { if (!inb(x + dx, y + dy)) continue; const i = ix(x + dx, y + dy), tt = m.t[i]; if (tt === 4) c[m.b[i] === 0 ? 'sea' : 'water']++; else if (tt === 9) c.rock++; else if (tt === 2) c.road++; if (m.fo[i]) c.forest++; } return c; };
    const fit = { coast: c => c.sea * 3, water: c => c.water * 3 + c.sea, rock: c => c.rock * 3, forest: c => c.forest * 2 - c.road, road: c => Math.min(c.road, 6) * 3 - c.rock, open: c => 20 - c.forest * 2 - c.rock * 3 - c.water * 3 - c.sea * 3 - c.road };
    const WORD = { coast: ['Strand', 'Rocks', 'Shallows'], water: ['Mere', 'Pools', 'Fen'], rock: ['Crags', 'Heights', 'Scree'], forest: ['Wood', 'Thicket', 'Grove'], road: ['Reach', 'Mile', 'Crossing'], open: ['Downs', 'Field', 'Flats'] };
    const free = (x, y) => inb(x, y) && x > 12 && y > 12 && x < WW - 13 && y < WH - 13 && m.t[ix(x, y)] < 2 && !m.keep[ix(x, y)] && !m.solid[ix(x, y)] && m.seen[ix(x, y)];
    for (let r = 1; r <= 8; r++) {
      const [cx, cy] = TOWN[r], taken = [], used = {}, far = (x, y, d) => taken.every(p => Math.hypot(p[0] - x, p[1] - y) >= d);
      const find = (score, dmin, dmax, gap0) => { for (const gap of [gap0, gap0 * .55, 6]) { let best = null, bs = -1e9; for (let k = 0; k < 400; k++) { const a = q() * 6.283, d = dmin + q() * (dmax - dmin), x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * .9); if (!free(x, y) || m.reg[ix(x, y)] !== r || !far(x, y, gap)) continue; const s = score(probe(x, y)) + q() * 2; if (s > bs) { bs = s; best = [x, y]; } } if (best) { taken.push(best); return best; } } return null; };
      const dp = find(c => c.rock * 2 - c.road, 50, 90, 24) || [cx + 14, cy + 15]; rect(dp[0] - 2, dp[1] - 2, dp[0] + 2, dp[1] + 2, 2); for (const [dx, dy] of [[-2, -2], [2, -2]]) { m.t[ix(dp[0] + dx, dp[1] + dy)] = 8; m.solid[ix(dp[0] + dx, dp[1] + dy)] = 1; } road([dp[0], dp[1] + 2], [cx + (dp[0] > cx ? 22 : -22), cy + (dp[1] > cy ? 10 : 0)]);
      EE('stairs', dp[0], dp[1] - 1, r, { name: host.dungeonName(r), sub: 'Dungeon', ok: 'stairs' }); m.lights.push({ x: dp[0] + .5, y: dp[1], r: 30, c: 2 }); m.spots['dun' + r] = [dp[0], dp[1] + 1];
      const pp = find(c => 10 - c.road * 2, 60, 120, 30) || [cx - 14, cy + 15]; EE('page', pp[0], pp[1], r, { name: 'A weathered signpost', sub: 'Journal page', ok: 'sign' }); m.lights.push({ x: pp[0] + .5, y: pp[1], r: 26, c: 3 }); m.spots['page' + r] = pp;
      for (let pass = 0; pass < 2; pass++) for (const tpl of host.tpls(r)) { const h = host.habitat(tpl), c = find(fit[h], 38, 132, 30); if (!c) continue; const w = WORD[h][(used[h] = (used[h] || 0) + 1) % 3]; m.terr.push({ r, tpl, x: c[0], y: c[1], n: 5, rad: 11, hab: h, agg: host.hunts(tpl), name: host.monName({ tpl }).split(' ').pop() + ' ' + w }); }
      for (let k = 0; k < 5; k++) { const c = find(co => 8 - co.road * 3 + co.forest, 60, 132, 26); if (!c) continue; EE('cache', c[0], c[1], r, { name: 'An old chest', sub: 'Open', cid: r + '-' + k, ok: host.cacheOpen(r + '-' + k) ? 'chestopen' : 'chest' }); }
    }
    for (let r = 1; r <= 8; r++) { const [cx, cy] = TOWN[r], spots = []; for (let k = 0, tries = 0; k < 14 && tries < 4000; tries++) { const a = q() * 6.283, d = 30 + q() * 110, x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * .9); if (!free(x, y) || m.reg[ix(x, y)] !== r || spots.some(p => Math.hypot(p[0] - x, p[1] - y) < 16) || m.terr.some(t => t.r === r && Math.hypot(t.x - x, t.y - y) < 14)) continue; spots.push([x, y]); const b = m.b[ix(x, y)], pc = probe(x, y), cls = pc.sea + pc.water > 3 ? (pc.sea > pc.water ? 'coast' : 'water') : pc.rock > 4 ? 'rock' : pc.forest > 9 ? 'forest' : 'open', wl = k % 2 ? host.wild(r, cls) : [], tpl = wl.length ? wl[(x + y + k) % wl.length] : b === 10 ? 'a8' : b === 11 || pc.rock > 4 ? 'a6' : b === 9 ? 'a4' : pc.forest > 9 ? (k % 2 ? 'a2' : 'a3') : ['a1', 'a5', 'a7', 'a4'][k % 4]; m.terr.push({ r, tpl, x, y, n: 3, rad: 6 }); k++; } }
    m.terr.push({ r: 1, tpl: host.tpls(1)[1], x: T1[0] + 8, y: T1[1] + 17, n: 3, rad: 6, hab: 'open', name: 'The Green' });
    // the road has people on it, and a fire at the middle of every long leg
    LEGS.slice(0, 7).forEach(([a, b2], lj) => [1 / 3, 2 / 3].forEach((fr, fi) => { const li = lj * 2 + fi, mx = Math.round(TOWN[a][0] + (TOWN[b2][0] - TOWN[a][0]) * fr), my = Math.round(TOWN[a][1] + (TOWN[b2][1] - TOWN[a][1]) * fr); let c = null; for (let d = 0; d < 40 && !c; d++) for (let k = 0; k < 16; k++) { const x = mx + Math.round(Math.cos(k * .39) * d), y = my + Math.round(Math.sin(k * .39) * d); if (inb(x, y) && m.t[ix(x, y)] === 2 && !m.solid[ix(x, y)]) { c = [x, y]; break; } } if (!c) return;
      const r = m.reg[ix(c[0], c[1])] || a; let s = null; for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [3, 3], [-3, -3]]) { const x = c[0] + dx, y = c[1] + dy; if (inb(x, y) && m.t[ix(x, y)] < 2 && !m.solid[ix(x, y)] && !m.occ.has(ix(x, y))) { s = [x, y]; break; } } if (!s) return;
      if (m.o[ix(s[0], s[1])]) m.o[ix(s[0], s[1])] = 0; EE('camp', s[0], s[1], r, { name: 'Campfire', sub: 'Rest', ok: 'fire' }); m.lights.push({ x: s[0] + .5, y: s[1], r: 46, c: 2, fl: 1 }); m.keep[ix(s[0], s[1])] = 1; m.spots['camp' + li] = s;
      const pk = pool.length ? pool[(li * 5 + 2) % pool.length] : null, px2 = s[0] + (m.solid[ix(s[0] + 1, s[1])] ? -1 : 1); if (inb(px2, s[1]) && !m.solid[ix(px2, s[1])] && m.t[ix(px2, s[1])] !== 4) EE('peddler', px2, s[1], r, { name: 'Wayfarer', sub: 'Trades on the road', ak: pk, spr: folkSprite(pk, 'way' + li, { cloak: '#5a4a3a', hat: '#3a3228' }) }); }));
    let rw = 0; for (let k = 0; k < 12000 && rw < 44; k++) { const x = 14 + (q() * (WW - 28) | 0), y = 14 + (q() * (WH - 28) | 0), i = ix(x, y), r = m.reg[i]; if (m.t[i] !== 2 || m.solid[i] || m.occ.has(i) || Math.hypot(x - TOWN[r][0], y - TOWN[r][1]) < 34) continue; const ak = pool.length ? pool[(rw * 3 + 5) % pool.length] : null, nm = ['Carter', 'Pilgrim', 'Peddler', 'Courier', 'Drover', 'Tinker'][rw % 6]; EE('folk', x, y, r, { name: nm, sub: 'On the road', ak, wk: 'K' + String((rw % 12) + 1).padStart(2, '0'), spr: folkSprite(ak, nm + rw), wander: 3, t: q() * 3 }); rw++; }
    // Tallyport's pier
    let px = T1[0] - 23; while (px > 4 && m.t[ix(px - 1, T1[1])] !== 4 && m.t[ix(px - 1, T1[1])] !== 6) px--; rect(px - 7, T1[1], px, T1[1] + 1, 2, 0); m.spots.dock = [px - 3, T1[1]]; m.seen = reach(m, T1[0], T1[1] + 3);
    // ---- the living world: homesteads, places to find, fishing water, wanderers, strays. Its own random stream, so nothing placed before it ever moves. ----
    m.sites = []; m.fields = [];
    { let sd = 90210; const g = () => { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; }, gi = k => Math.floor(g() * k), HAS = k => !!(AD && AD.mobs.at[k]);
      const CF = (AD && AD.chars.country) || {}, FACE = (AD && AD.faces) || {};
      const SFB = { s1: 'a7', s2: 'a5', s3: 'a3', s4: 'a6', s6: 'a5', s8: 'a6' }, stockTpl = t => HAS(t) || t[0] === 'a' ? t : SFB[t];   // until the farm animals are drawn, the nearest wild one stands in
      const openT = i => m.t[i] < 2 || m.t[i] === 5;
      const clearAt = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (x < 14 || y < 14 || x > WW - 15 || y > WH - 15) return false; const i = ix(x, y); if (!openT(i) || m.keep[i] || m.occ.has(i) || (m.solid[i] ? !m.o[i] : !m.seen[i])) return false; } return true; };   // trees may be cleared; open ground must be reachable
      const claim = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = ix(x, y); m.keep[i] = 1; if (m.o[i]) { m.o[i] = 0; m.solid[i] = 0; } } };
      const placed = [], spot = (r, w, h, dmin, dmax, gap, want) => { const [cx, cy] = TOWN[r]; let best = null, bs = -1e9; for (let k = 0; k < 300; k++) { const a = g() * 6.283, d = dmin + g() * (dmax - dmin), x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * .9); if (!inb(x, y) || m.reg[ix(x, y)] !== r || !clearAt(x - 1, y - 1, w + 2, h + 2) || placed.some(p => Math.hypot(p[0] - x, p[1] - y) < gap)) continue; if (!want) { best = [x, y]; break; } const s = want(probe(x + (w >> 1), y + (h >> 1))) + g(); if (s > bs) { bs = s; best = [x, y]; } if (k > 90 && best) break; } if (best) placed.push(best); return best; };
      const house = (x, y, w, h, slot, r) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) m.solid[ix(xx, yy)] = 1; m.blds.push({ x, y, w, h, slot, sign: '#7a5a3a', r, by: (y + h) * T - 1 }); m.lights.push({ x: x + w / 2, y: y + h - .6, r: 22, c: 1 }); };
      const prop = (x, y, kind, r, solid) => { const i = ix(x, y); if (m.solid[i] || m.occ.has(i)) return; m.props.push({ x, y, kind, r, solid: solid ? 1 : 0 }); if (solid) m.solid[i] = 1; };
      const YARD = { farmer: [['pi_wheat', 0], ['pi_cabbage', 0], ['pi_wheat', 0], ['pi_hay', 1], ['pi_trough', 1]], shepherd: [['pi_hay', 1], ['pi_trough', 1], ['pi_fence', 1], ['pi_fence', 1]], miller: [['pi_wheat', 0], ['pi_wheat', 0], ['pi_cart', 1], ['pi_hay', 1]], fisher: [['pi_nets', 1], ['pi_fishbarrel', 1], ['pi_traps', 1]], hunter: [['pi_hides', 1], ['pi_woodpile', 1]], trapper: [['pi_hides', 1], ['pi_hides', 1], ['pi_woodpile', 1]], hermit: [['pi_cairn', 1], ['pi_cabbage', 0]], herbalist: [['pi_cabbage', 0], ['pi_cabbage', 0], ['pi_beehives', 1]], beekeeper: [['pi_beehives', 1], ['pi_beehives', 1], ['pi_cabbage', 0]], woodcutter: [['pi_woodpile', 1], ['pi_woodpile', 1], ['pi_cart', 1]], miner: [['pi_cart', 1], ['crate', 1], ['pi_woodpile', 1]] };
      const YPOS = [[6, 5], [7, 5], [8, 5], [9, 3], [6, 3], [8, 3]];
      for (let r = 1; r <= 8; r++) {
        const tp = host.tpls(r), [cx, cy] = TOWN[r];
        host.homeRoles(r).forEach((role, k) => {   // seven homesteads: a house, its owner at the door, a yard, and the animals about the place
          const R = host.settler(role), want = role === 'fisher' ? c => c.water * 2 + c.sea * 2 - c.rock : role === 'miner' ? c => c.rock * 2 - c.water : role === 'woodcutter' || role === 'hunter' || role === 'hermit' ? c => c.forest - c.water : c => 12 - c.forest - c.rock * 2 - c.water * 2 - c.sea * 2;
          const p = spot(r, 11, 8, 34, 136, 28, want); if (!p) return; const x = p[0], y = p[1], b = m.b[ix(x + 2, y + 2)], slot = b === 9 ? 'adobe' : b === 10 ? 'lodge' : r === 2 && role !== 'miller' ? 'stilt' : R.slot, hid = 'h' + r + '-' + k, nm = host.settlerName(hid, role);
          claim(x, y, 11, 8); house(x + 1, y, 4, 3, slot, r); if (role === 'farmer') house(x + 6, y, 4, 3, 'barn', r); else if (role === 'shepherd') house(x + 6, y, 4, 3, 'stable', r);
          const ak = CF[role === 'fisher' && k % 2 ? 'fisher2' : role] || (pool.length ? pool[(r * 11 + k * 7 + 3) % pool.length] : null); EE('home', x + 2, y + 3, r, { name: nm, sub: R.n, hid, role, ak, pt: FACE[role], spr: folkSprite(ak, nm) });
          (YARD[role] || []).forEach((q2, j) => prop(x + YPOS[j][0], y + YPOS[j][1], q2[0], r, q2[1]));
          if (b !== 9 && b !== 10 && b !== 5 && b !== 6) { if (role === 'farmer' || role === 'miller') m.fields.push([x + 5, y + 4, 5, 3]); else if (role === 'herbalist' || role === 'beekeeper' || role === 'hermit') m.fields.push([x + 5, y + 4, 4, 2]); }   // a ploughed patch under the crops
          R.stock.forEach((t0, j) => { const t = stockTpl(t0), sx = x + 4 + j * 2, sy = y + 6; if (!t || m.solid[ix(sx, sy)] || m.occ.has(ix(sx, sy))) return; EE('stock', sx, sy, r, { name: host.stockName(t0), tpl: t, st: t0, spr: monSprite(t), wander: 1, home: [x + 5, y + 5], range: 4, t: g() * 3 }); });
          m.sites.push({ id: hid, kind: 'home', role, name: nm, x: x + 2, y: y + 3, r });
        });
        // places to find: eight small ones, and a tower, a shrine and a ruin
        const kinds = ['stones', 'statue', 'graves', 'camp', 'wagon', 'dig', 'cairn', 'hollow', 'well'].sort(() => g() - .5).slice(0, 8);
        kinds.forEach((pk, k) => { const p = spot(r, 3, 3, 28, 140, 20, pk === 'hollow' ? c => c.forest : null); if (!p) return; const P0 = host.place(pk), pid = 'p' + r + '-' + k; claim(p[0], p[1], 3, 3); EE('poi', p[0] + 1, p[1] + 1, r, { name: P0[0], sub: P0[1], pk, pid, ok: 'pi_' + pk }); m.sites.push({ id: pid, kind: 'poi', pk, name: P0[0], x: p[0] + 1, y: p[1] + 1, r }); });
        [['tower', 3, 4], ['shrine', 3, 3], ['ruin', 4, 3]].forEach(([pk, w, h], k) => { const p = spot(r, w + 2, h + 2, 40, 138, 26, pk === 'tower' ? c => c.rock - c.forest : null); if (!p) return; const P0 = host.place(pk), pid = 'p' + r + '-' + pk; claim(p[0], p[1], w + 2, h + 2); house(p[0] + 1, p[1], w, h, pk, r); EE('poi', p[0] + 1 + (w >> 1), p[1] + h, r, { name: P0[0], sub: P0[1], pk, pid, ok: 'pi_sign' }); m.sites.push({ id: pid, kind: 'poi', pk, name: P0[0], x: p[0] + 1 + (w >> 1), y: p[1] + h, r }); });
        // fishing water: a patch of shallows with reachable ground beside it
        let fs = 0; for (let k = 0; k < 1400 && fs < 9; k++) { const a = g() * 6.283, d = 18 + g() * 124, x0 = Math.round(cx + Math.cos(a) * d), y0 = Math.round(cy + Math.sin(a) * d * .9), dv = D4[gi(4)]; if (!inb(x0, y0) || m.reg[ix(x0, y0)] !== r || m.t[ix(x0, y0)] === 4 || m.solid[ix(x0, y0)] || !m.seen[ix(x0, y0)]) continue;
          let x = x0, y = y0, hit = false; for (let s2 = 0; s2 < 9; s2++) { const nx = x + dv[0], ny = y + dv[1]; if (!inb(nx, ny) || nx < 3 || ny < 3 || nx > WW - 4 || ny > WH - 4) break; if (m.t[ix(nx, ny)] === 4) { hit = !m.solid[ix(x, y)] && m.seen[ix(x, y)] && !m.occ.has(ix(nx, ny)); x = nx; y = ny; break; } if (m.solid[ix(nx, ny)]) break; x = nx; y = ny; }
          if (!hit || m.sites.some(s2 => s2.kind === 'fish' && Math.hypot(s2.x - x, s2.y - y) < 16)) continue; const fid = 'f' + r + '-' + fs; EE('fish', x, y, r, { name: 'Fishing water', sub: 'Fish', fid }); m.sites.push({ id: fid, kind: 'fish', name: 'Fishing water', x, y, r }); fs++; }
        // people on foot away from the roads
        host.roamRoles(r).forEach((role, k) => { for (let tries = 0; tries < 200; tries++) { const a = g() * 6.283, d = 24 + g() * 110, x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * .9); if (!free(x, y) || m.occ.has(ix(x, y)) || m.reg[ix(x, y)] !== r) continue; const hid = 'w' + r + '-' + k, nm = host.settlerName(hid, role), ak = CF[role] || (pool.length ? pool[(r * 5 + k * 13 + 1) % pool.length] : null);
          EE('home', x, y, r, { name: nm, sub: host.settler(role).n, hid, role, ak, pt: FACE[role], hop: CF[role] ? 1 : 0, wk: CF[role] ? null : 'K' + String(((r * 3 + k * 5) % 12) + 1).padStart(2, '0'), spr: folkSprite(ak, nm), wander: 1, home: [x, y], range: 12, t: g() * 3 }); m.sites.push({ id: hid, kind: 'roam', role, name: nm, x, y, r }); break; } });   // a drawn tinker looks like a tinker; without a walk sheet of his own he bobs along
        // lone creatures off their grounds, and more wild animals
        for (let k = 0, tries = 0; k < 26 && tries < 3000; tries++) { const a = g() * 6.283, d = 26 + g() * 116, x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * .9); if (!free(x, y) || m.reg[ix(x, y)] !== r || m.sites.some(s2 => Math.hypot(s2.x - x, s2.y - y) < 9)) continue; const tpl = tp[gi(tp.length)]; m.terr.push({ r, tpl, x, y, n: 1, rad: 5, hab: host.habitat(tpl), agg: host.hunts(tpl), stray: 1 }); k++; }
        for (let k = 0, tries = 0; k < 10 && tries < 2000; tries++) { const a = g() * 6.283, d = 26 + g() * 116, x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * .9); if (!free(x, y) || m.reg[ix(x, y)] !== r) continue; const b = m.b[ix(x, y)], pc = probe(x, y), tpl = b === 10 ? 'a8' : b === 11 || pc.rock > 4 ? 'a6' : b === 9 ? 'a4' : pc.forest > 9 ? (k % 2 ? 'a2' : 'a3') : ['a1', 'a5', 'a7', 'a4', 'a2'][k % 5]; m.terr.push({ r, tpl, x, y, n: 3 + gi(2), rad: 7, stray: 1 }); k++; }
      }
      // lairs: themed creatures with a leader, two per region, out where you have to go looking for them
      m.lairs = []; for (const L of host.lairs()) { const at = spot(L.r, 9, 7, 45, 150, 30); if (!at) continue; const [x, y] = at, c = Math.min(8, L.r), lc = Math.min(8, L.r + 1);
        for (let yy = y; yy < y + 7; yy++) for (let xx = x; xx < x + 9; xx++) { const i = ix(xx, yy); if (m.o[i]) { m.o[i] = 0; m.solid[i] = 0; } } const cx2 = x + 4, cy2 = y + 3; m.lairs.push({ id: L.id, r: L.r, name: L.name, x: cx2, y: cy2 }); m.sites.push({ id: L.id, kind: 'lair', name: L.name, x: cx2, y: cy2, r: L.r });
        const tp = host.tpls(c), tl = host.tpls(lc); for (const [lk, nn] of L.mob) m.terr.push({ r: L.r, tpl: tp[gi(tp.length)], x: cx2, y: cy2, n: nn, rad: 4, hab: 'any', agg: 1, lair: L.id, lk, c });
        m.terr.push({ r: L.r, tpl: tl[gi(tl.length)], x: cx2, y: cy2 - 1, n: 1, rad: 2, hab: 'any', agg: 1, lair: L.id, lk: L.lead, c: L.boss ? 8 : lc, lead: 1 });
        L.props.forEach((k, q2) => { const a = q2 / L.props.length * 6.283 + g(), px = Math.round(cx2 + Math.cos(a) * 3.4), py = Math.round(cy2 + Math.sin(a) * 2.4); if (!inb(px, py) || m.solid[ix(px, py)] || m.occ.has(ix(px, py))) return; m.props.push({ x: px, y: py, kind: 'pi_' + k, r: L.r, solid: 0 }); });
        if (L.props.includes('fire')) m.lights.push({ x: cx2 + .5, y: cy2, r: 52, c: 2, fl: 1 }); }
    }
    const mini = mk(WW, WH), g = mini.getContext('2d'), im = g.createImageData(WW, WH), d = im.data;
    for (let i = 0; i < n; i++) { const b = m.pal[m.b[i]], k = m.t[i], c = hex([b.g, b.G, b.d, b.p, b.w, b.s, '#6b5238', b.df, '#3a3a40', b.mt][k]), f = k === 9 ? (hash(i % WW, i / WW | 0, 5) < .5 ? .72 : (b.cap ? 1.5 : .95)) : k < 2 ? (m.fo[i] ? .62 : .85) : 1; d[i * 4] = Math.min(255, c[0] * f); d[i * 4 + 1] = Math.min(255, c[1] * f); d[i * 4 + 2] = Math.min(255, c[2] * f); d[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); g.fillStyle = '#5a3a2a'; for (const b of m.blds) g.fillRect(b.x, b.y, b.w, b.h); m.mini = mini;
    for (const t of m.terr) for (let k = 0; k < t.n; k++) spawnMon(m, t);
    for (const t of m.terr) if (!t.stray) spawnNode(m, t);
    // whole mountain ranges, once they are in the pack: the largest that fits goes down first, each standing on mountain ground only, so nothing walkable hides behind one
    let cov = null; m.ranges = [];
    if (AD && AD.ranges) { const RG = AD.ranges, hasR = k => !!RG[k]; cov = new Uint8Array(n);
      const setOf = (b, small) => { const a = b === 7 || b === 10 ? [4] : b === 5 ? [7] : b === 9 ? [8] : b === 3 ? [9, 9, 8] : b === 11 ? [10, 1, 3, 10] : small ? [10, 1, 10, 3] : [1, 2, 3, 5, 6]; const ok = a.filter(hasR); return ok.length ? ok : Object.keys(RG).map(Number); };
      for (const w of [40, 34, 26, 20, 15]) for (let y = 3; y < WH - 3; y++) for (let x = 3; x + w < WW - 3; x++) { const i = ix(x, y); if (m.t[i] !== 9 || cov[i] || m.t[i + w - 1] !== 9 || cov[i + w - 1]) continue;
        const set = setOf(m.b[ix(x + (w >> 1), y)], w <= 11), k = set[Math.floor(hash(x, y, 71) * set.length)], sw = w, hh = sw * RG[k][1] / RG[k][0], d = Math.max(2, Math.ceil(hh - .4)); if (y + d >= WH - 3) continue;   // the picture stands wholly on blocked ground
        let ok = m.t[ix(x, y + d - 1)] === 9 && m.t[ix(x + w - 1, y + d - 1)] === 9; for (let yy = y; yy < y + d && ok; yy++) for (let xx = x; xx < x + w; xx++) { const j = ix(xx, yy); if (m.t[j] !== 9 || cov[j]) { ok = false; break; } } if (!ok) continue;
        for (let yy = y; yy < y + d; yy++) for (let xx = x; xx < x + w; xx++) cov[ix(xx, yy)] = 1; m.ranges.push({ x, y: y + d, w: sw, h: hh, k, flip: hash(x, y, 72) < .5 ? 1 : 0 }); } }
    // mountain and desert scenery, placed only once its art is in the pack. It uses its own random stream, so nothing else in the world moves.
    if (AD && AD.scen) { let sd = 77123; const g = () => { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; }, SN = AD.scen, pkc = new Uint8Array(n), add = (x, y, k, solid, sc) => { if (!SN[k]) return; m.props.push({ x, y, kind: 'sc_' + k, r: m.reg[ix(x, y)] || 1, solid: solid ? 1 : 0, sc: sc || 0 }); if (solid) m.solid[ix(x, y)] = 1; };
      const LOW = ['ridge0', 'ridge1', 'cliff', 'boulders', 'pine', 'arch', 'boulders'], DES = ['cactus0', 'cactus1', 'cactus2', 'sandstone0', 'sandstone1', 'palm0', 'palm1', 'dune', 'thorn', 'dbones', 'pot', 'oasis'];
      for (let y = 8; y < WH - 8; y += 3) for (let x = 8; x < WW - 8; x += 3) { const xx = x + (g() * 3 | 0), yy = y + (g() * 3 | 0), i = ix(xx, yy), u = g(), v = g(); if (m.keep[i]) continue;
        if (m.t[i] === 9) { if (cov && cov[i]) continue; let inner = true; for (let dy = -2; dy <= 2 && inner; dy += 2) for (let dx = -2; dx <= 2; dx += 2) if (m.t[ix(xx + dx, yy + dy)] !== 9) { inner = false; break; }
          if (pkc[i]) continue;
          if (inner ? u < (cov ? .7 : .42) : u < (cov ? .5 : .14)) { const k = inner ? (m.b[i] === 10 || m.reg[i] === 7 ? 'snowpeak' + (v * 2 | 0) : 'peak' + (v * 3 | 0)) : LOW[v * LOW.length | 0]; if (!inner || !SN[k]) { add(xx, yy, k); continue; }
            let sc = 0, x0 = 0, x1 = 0, y0 = 0; for (const s0 of [2.2, 1.7, 1.3]) { const wt = Math.ceil(SN[k][2] / 3 / 16 * s0), ht = Math.ceil(SN[k][3] / 3 / 16 * s0); x0 = xx - (wt >> 1); x1 = x0 + wt - 1; y0 = yy - ht + 1; let ok = x0 > 2 && y0 > 2 && x1 < WW - 3; for (let ty = y0; ty <= yy && ok; ty++) for (let tx = x0; tx <= x1; tx++) { const j = ix(tx, ty); if (m.t[j] !== 9 || (cov && cov[j]) || pkc[j]) { ok = false; break; } } if (ok) { sc = s0; break; } }
            if (!sc) { add(xx, yy, k); continue; } for (let ty = y0; ty <= yy; ty++) for (let tx = x0; tx <= x1; tx++) pkc[ix(tx, ty)] = 1; add(xx, yy, k, 0, sc); } }
        else if (m.b[i] === 9 && m.t[i] !== 2 && m.t[i] !== 3 && m.t[i] !== 4 && !m.solid[i] && !m.o[i] && !m.occ.has(i) && u < .05) { const k = DES[v * (v < .55 ? 7 : DES.length) | 0]; add(xx, yy, k, /cactus|sandstone|palm/.test(k)); } } }
    // small things that only exist as drawn art: set about the farms, waters and camps once the pack has them. Their own random stream again.
    if (AD && AD.places) { let sd = 4411; const g = () => { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; }, PL = AD.places;
      const deco = (x, y, k, r, solid, wet) => { if (!PL[k] || !inb(x, y) || x < 3 || y < 3 || x > WW - 4 || y > WH - 4) return false; const i = ix(x, y); if (m.occ.has(i) || m.props.some(p => p.x === x && p.y === y)) return false; if (wet ? m.t[i] !== 4 : (m.solid[i] || m.t[i] > 5 || m.t[i] === 2 || m.t[i] === 3 || m.t[i] === 4)) return false;
        if (solid) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && m.solid[ix(x + dx, y + dy)]) return false; m.solid[i] = 1; }   // a solid thing only where it cannot close a gap
        m.props.push({ x, y, kind: 'pi_' + k, r, solid: solid ? 1 : 0 }); return true; };
      for (const st of m.sites) { const r = st.r, b = m.b[ix(st.x, st.y)];
        if (st.kind === 'home') { const x = st.x - 2, y = st.y - 3; if (st.role === 'farmer') { deco(x + 9, y + 5, 'scarecrow', r, 0); deco(x + 10, y + 3, 'coop', r, 1); deco(x + 10, y + 6, 'haystack', r, 1); } else if (st.role === 'shepherd') { for (let k = 0; k < 4; k++) deco(x + 5 + k, y + 7, k === 2 ? 'gate' : 'fence', r, 0); deco(x + 10, y + 5, 'haystack', r, 1); }
          else if (st.role === 'fisher') { deco(x + 9, y + 5, 'fishrack', r, 1); deco(x + 6, y + 6, 'rowboat', r, 0); } else if (st.role === 'miller') deco(x + 10, y + 5, 'haystack', r, 1); else if (st.role === 'miner') deco(x + 9, y + 5, 'crates', r, 1); else if (st.role === 'hunter' || st.role === 'trapper') deco(x + 9, y + 5, 'pot', r, 0);
          deco(x + 5, y + 3, 'lantern', r, 0); }
        else if (st.kind === 'roam') { deco(st.x - 1, st.y - 1, 'tent', r, 1); deco(st.x + 1, st.y - 1, 'pot', r, 0); deco(st.x + 1, st.y + 1, 'bedroll', r, 0); const ex = { tinker: ['rug', 'crates'], minstrel: ['stool', 'banner'], pilgrim: ['lantern'], forager: ['hides'] }[st.role] || []; ex.forEach((k, j) => deco(st.x - 2 + j * 4, st.y + 1, k, r, 0)); }
        else if (st.kind === 'fish') { const lava = m.pal[b] && m.pal[b].liquid === 'lava', cold = b === 7 || b === 10; let nW = 0, nL = 0;
          for (let k = 0; k < 40 && (nW < 4 || nL < 2); k++) { const x = st.x + Math.round((g() - .5) * 7), y = st.y + Math.round((g() - .5) * 7), u = g(); if (!inb(x, y) || (x === st.x && y === st.y)) continue; const i = ix(x, y);
            if (m.t[i] === 4 && nW < 4 && !lava) { let shore = false; for (const [dx, dy] of D4) if (m.t[ix(x + dx, y + dy)] !== 4) shore = true; if (deco(x, y, cold ? 'wetrock' : shore ? (u < .7 ? 'reeds' : 'wetrock') : (u < .6 ? 'lilies' : u < .8 ? 'buoy' : 'wetrock'), r, 0, 1)) nW++; }
            else if (m.t[i] !== 4 && nL < 2 && deco(x, y, nL ? 'driftwood' : (u < .4 ? 'rowboat' : u < .7 ? 'traps' : 'driftwood'), r, 0)) nL++; } }
        else if (st.kind === 'poi' && st.pk === 'ruin') { deco(st.x - 3, st.y, 'ruinwall', r, 1); deco(st.x + 3, st.y + 1, 'ruinwall', r, 1); } }
      const dk = m.spots.dock; if (dk) { deco(dk[0] - 7, dk[1] - 3, 'sailboat', 1, 0, 1); deco(dk[0] - 9, dk[1] + 4, 'sailboat', 1, 0, 1); deco(dk[0] - 6, dk[1] + 3, 'buoy', 1, 0, 1); deco(dk[0] - 11, dk[1] - 1, 'buoy', 1, 0, 1); } }
    if (AD) for (const o of m.blds) { const cb = AD.cbld && AD.cbld[o.slot], B = AD.bld && AD.bld[o.r], rc = cb || (B && (B[o.slot] || B[{ work: 'shop', house: 'healer' }[o.slot]])); if (!rc || o.enter) continue;
      const k = cb ? Math.min(1, (o.w + .7) * T * K / rc[2]) : 1, ext = Math.floor(rc[3] / K / T * k - o.h - .9);
      for (let yy = o.y - 1; yy >= o.y - ext; yy--) for (let xx = o.x; xx < o.x + o.w; xx++) { if (!inb(xx, yy)) continue; const i = ix(xx, yy); if (m.solid[i] || m.t[i] === 4 || m.occ.has(i) || m.ents.some(e => e.x === xx && e.y === yy)) continue; m.solid[i] = 1; } }
    // the guided first day: a lookout at the foot of Tallyport's pier, and a cast off its end. Added last so nothing else moves.
    { const dk = m.spots.dock, px = dk[0] + 3, py = dk[1], ok = (x, y) => inb(x, y) && m.t[ix(x, y)] !== 4 && !m.solid[ix(x, y)] && !m.occ.has(ix(x, y)) && m.seen[ix(x, y)];
      let tw = null; for (const [dx, dy] of [[2, -2], [3, -2], [2, -3], [3, 2], [2, 3], [4, -2], [4, 2]]) if (ok(px + dx, py + dy)) { tw = [px + dx, py + dy]; break; }
      if (tw) { EE('lookout', tw[0], tw[1], 1, { name: 'Harbor tower', sub: 'Climb', ok: 'pi_lookout' }); m.spots.tower = tw; }
      const fx = px - 8; if (inb(fx, py) && m.t[ix(fx, py)] === 4 && !m.occ.has(ix(fx, py))) { EE('fish', fx, py, 1, { name: 'End of the pier', sub: 'Fish', fid: 'f1-pier' }); m.sites.push({ id: 'f1-pier', kind: 'fish', name: 'End of the pier', x: fx, y: py, r: 1 }); m.spots.pierfish = [fx, py]; } }
    groundKinds(m);
    return m;
  }
  function reach(m, sx, sy) { const seen = new Uint8Array(m.w * m.h), qu = new Int32Array(m.w * m.h); let h = 0, tl = 0; qu[tl++] = sy * m.w + sx; seen[qu[0]] = 1; while (h < tl) { const k = qu[h++], x = k % m.w, y = k / m.w | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; const nk = ny * m.w + nx; if (seen[nk] || m.solid[nk]) continue; seen[nk] = 1; qu[tl++] = nk; } } return seen; }
  function freeNear(m, t, rad) { for (let i = 0; i < 60; i++) { const x = t.x + Math.round((Math.random() * 2 - 1) * rad), y = t.y + Math.round((Math.random() * 2 - 1) * rad), k = y * m.w + x; if (x < 2 || y < 2 || x >= m.w - 2 || y >= m.h - 2 || !m.seen[k] || m.solid[k] || m.keep[k] || m.t[k] > 1 || m.occ.has(k)) continue; if (P && Math.hypot(x - P.x, y - P.y) < 5) continue; return [x, y]; } return null; }
  function spawnMon(m, t) { const p = freeNear(m, t, t.rad || 7); if (!p) return; const inst = host.spawn(t.tpl); if (t.lair) { inst.lk = t.lk; inst.nm = host.lairName(t.lk); inst.c = t.c; inst.lair = t.lair; inst.lead = t.lead; inst.elite = !!t.lead; } addEnt(m, { kind: 'mon', x: p[0], y: p[1], r: t.r, inst, terr: t, agg: t.agg, name: host.monName(inst), spr: monSprite(inst.lk || inst.tpl), big: t.lead && (t.lk === 'l14' || t.lk === 'l12' || t.lk === 'l11'), wander: 1, home: [t.x, t.y], range: (t.rad || 7) + 2, alert: 0, t: Math.random() * 3 }); }
  function spawnNode(m, t) { const p = freeNear(m, t, (t.rad || 7) + 4); if (!p) return; addEnt(m, { kind: 'node', x: p[0], y: p[1], r: t.r, terr: t, name: host.matName(t.r), sub: 'Gather', ok: 'node' }); }

  /* ---------- a dojo hall: one painted room, 14 x 21 tiles. The back wall takes the top four rows, the door is in the middle of the bottom. ---------- */
  function genHall(r, fill) {
    const w = 11, h = 16, b = Object.assign({}, BIO[r], { amb: 0, fx: null, liquid: 'none' });
    const m = { r, w, h, hall: r, paint: 'dj/I' + r + '.jpg', t: new Uint8Array(w * h).fill(6), b: new Uint8Array(w * h).fill(r), reg: new Uint8Array(w * h).fill(r), solid: new Uint8Array(w * h).fill(1), o: new Uint8Array(w * h), keep: new Uint8Array(w * h), blds: [], props: [], ents: [], lights: [], pal: [], dungeon: true, occ: new Map(), chunks: new Map(), terr: [] }; m.pal[r] = b;
    for (let y = 3; y <= 14; y++) for (let x = 1; x <= 9; x++) m.solid[y * w + x] = 0; m.solid[15 * w + 5] = 0;
    const prop = (x, y, k, solid) => { m.props.push({ x, y, kind: 'dj_' + k, r, solid: solid ? 1 : 0 }); if (solid) m.solid[y * w + x] = 1; };
    prop(2, 3, 'rack', 1); prop(8, 3, 'gong', 1); prop(1, 3, 'brazier', 1); prop(9, 3, 'brazier', 1); prop(3, 3, 'cup', 1); prop(9, 6, 'bench', 1); prop(9, 11, 'bench', 1); prop(1, 14, 'barrel', 1); prop(9, 14, 'mats', 1);
    addEnt(m, { kind: 'hallexit', x: 5, y: 15, r, name: 'Door', sub: 'Leave' });
    addEnt(m, { kind: 'bracket', x: 2, y: 13, r, name: 'Bracket board', sub: 'The tournament', ok: 'dj_board' });
    for (const [i, y] of [[0, 5], [1, 8], [2, 11]]) addEnt(m, { kind: 'dummy', i, x: 1, y, r, name: 'Training dummy', sub: 'Practice', ok: 'dj_dummy' });
    (fill || []).forEach(o => addEnt(m, Object.assign({ r }, o)));
    m.entry = [5, 13]; const mini = mk(w, h), g = mini.getContext('2d'); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { g.fillStyle = m.solid[y * w + x] ? '#2a2018' : '#a08060'; g.fillRect(x, y, 1, 1); } m.mini = mini; return m;
  }
  function enterHall(r, fill) { const m = genHall(r, fill); go(m, m.entry[0], m.entry[1]); return m; }
  // a fighter from the dojo sheet: row, frame 0-7 (stand, ready, three attack frames, recover, hit, bow), facing right unless flipped
  function fsCut(row, f) { const F = AD && AD.dojo && AD.dojo.fs; if (!F) return null; if (!IMG['dj/fs.webp']) img('dj/fs.webp'); if (!have('dj/fs.webp')) return null; return cut('dj/fs.webp', f * F.cw, row * F.ch, F.cw, F.ch); }

  /* ---------- ground, painted a chunk at a time ---------- */
  const PATS = {}; let patCtx = null;
  const colOf = (b, k) => [b.g, b.G, b.d, b.p, b.w, b.s, '#8a6a45', b.df, b.dw, b.mt][k] || '#555555';
  const pat = (col, k, seed) => PATS[col + k] || (PATS[col + k] = (patCtx || (patCtx = mk(2, 2).getContext('2d'))).createPattern(tex(col, k, seed), 'repeat'));
  const RANK = [5, 6, 3, 1, 0, 2, 1, 1, 9];
  /* ---------- painted ground. Every tile has a kind (meadow, trail, shallow water...). Soft kinds are laid one over another through masks whose
     edges wander, so a shore or a path never follows the tile grid; paving and planks stay square. Used once the textures are in the pack. ---------- */
  const GCL = [], GIX = {}, GRANK = { deep: 0, shallow: 1, lava: 1, beach: 3, desert: 4, marsh: 4, trail: 5, rock: 6, volcanic: 6, cave: 6, frozen: 6, snow: 6, dry: 6, meadow: 6, lush: 7, forest: 8, field: 9, cobble: 20, marble: 20, planks: 20, none: 30 };
  const gcl = (name, tint, mt) => { const key = name + '|' + (tint || '') + (mt ? '|m' : ''); let i = GIX[key]; if (i == null) { i = GIX[key] = GCL.length; GCL.push({ name, tint: tint || '', mt: !!mt, rank: GRANK[name] + (mt ? .5 : 0), hard: GRANK[name] === 20 }); } return i; };
  //            open ground, tall grass, under trees, among the mountains, sand
  const GB = { 1: ['meadow', 'lush', 'forest', 'rock', 'beach'], 2: ['lush', 'marsh', 'forest', 'rock', 'marsh'], 3: ['dry', 'meadow', 'forest', 'rock', 'beach'], 4: ['meadow', 'lush', 'forest', 'rock', 'beach'], 5: ['volcanic', 'volcanic', 'volcanic', 'volcanic', 'rock'], 6: ['cave', 'cave', 'cave', 'rock', 'rock'],
    7: ['snow', 'frozen', 'snow', 'frozen', 'frozen'], 8: ['dry', 'forest', 'forest', 'rock', 'beach'], 9: ['desert', 'desert', 'desert', 'desert', 'desert'], 10: ['snow', 'frozen', 'snow', 'frozen', 'frozen'], 11: ['dry', 'meadow', 'forest', 'rock', 'beach'] };
  const MD = 'rgba(34,40,30,.42)', GTINT = { 1: { m: MD }, 2: { w: 'rgba(52,84,56,.3)', m: MD }, 3: { m: 'rgba(120,84,44,.42)' }, 4: { m: MD }, 5: { m: 'rgba(0,0,0,.4)' }, 6: { w: 'rgba(18,26,66,.42)', m: 'rgba(20,24,50,.45)' }, 7: { w: 'rgba(214,236,248,.3)', m: 'rgba(70,92,120,.3)' }, 8: { w: 'rgba(30,60,70,.18)', g: 'rgba(200,110,40,.13)', m: MD }, 9: { m: 'rgba(130,60,30,.34)' }, 10: { w: 'rgba(214,236,248,.3)', m: 'rgba(70,92,120,.3)' }, 11: { g: 'rgba(120,124,120,.2)', m: MD } };
  // every tile's soft kind: 0 open ground, 1 tall grass, 2 under trees, 3 among the mountains, 4 sand, 5 trail, 6 shallow water, 7 deep water, 8 ploughed. Paving and planks keep a kind for what lies under them.
  function groundKinds(m) {
    const n = m.w * m.h, W = m.w, gk = m.gk = new Uint8Array(n), gc = m.gc = new Uint8Array(n), near = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (m.t[i] !== 4) { const x = i % W, y = i / W | 0; if (!((x > 0 && m.t[i - 1] === 4) || (x < W - 1 && m.t[i + 1] === 4) || (y > 0 && m.t[i - W] === 4) || (y < m.h - 1 && m.t[i + W] === 4))) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < m.h) near[yy * W + xx] = 1; } }   // water within two tiles of land is shallow
    const none = gcl('none'); for (let i = 0; i < n; i++) { const k = m.t[i], b = m.b[i]; gc[i] = k === 3 ? gcl(b === 8 ? 'marble' : 'cobble') : k === 6 ? gcl('planks') : none; gk[i] = k === 4 ? (near[i] ? 6 : 7) : k === 5 ? 4 : k === 2 ? 5 : k === 9 ? 3 : k === 6 ? 6 : k < 2 ? (m.fo && m.fo[i] ? 2 : k) : 0; }
    for (const f of m.fields || []) for (let y = f[1]; y < f[1] + f[3]; y++) for (let x = f[0]; x < f[0] + f[2]; x++) { const i = y * W + x; if (m.t[i] < 2) gk[i] = 8; }
    m.gct = new Int16Array(12 * 16).fill(-1);
  }
  function gclass(m, b, k) { b = b || 1; let c = m.gct[b * 16 + k]; if (c >= 0) return c; const G = GB[b] || GB[1], TN = GTINT[b] || {}, lava = m.pal[b].liquid === 'lava';
    c = k === 6 || k === 7 ? (lava ? gcl('lava') : gcl(k === 6 ? 'shallow' : 'deep', TN.w)) : k === 4 ? gcl(G[4], TN.g) : k === 5 ? gcl('trail') : k === 3 ? gcl(G[3], TN.m, 1) : k === 8 ? gcl('field') : gcl(G[k], TN.g); return m.gct[b * 16 + k] = c; }
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const GM = 4;
  function paintGround(m, g, X0, Y0) {
    // returns false, having drawn nothing, if any texture this chunk needs has not arrived
    const W = m.w, H = m.h, N = CS + 4, S = N * GM, raw = new Int16Array(S * S), seen = {}, cls = [], ti = (x, y) => Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x));
    // the kind of ground is read a little off true, so edges wander; which country it belongs to is read much further off, so one land runs into the next in long tongues instead of along a line
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) { const wx = (X0 - 2) * GM + px, wy = (Y0 - 2) * GM + py, A = GM * .22, B = GM * .1, C = GM * 2.8;   // edges wander at most about half a tile from where the ground is blocked
      const dx = (vn(wx / (GM * 2.3), wy / (GM * 2.3), 11) - .5) * 2 * A + (vn(wx / (GM * .9), wy / (GM * .9), 12) - .5) * 2 * B, dy = (vn(wx / (GM * 2.3), wy / (GM * 2.3), 13) - .5) * 2 * A + (vn(wx / (GM * .9), wy / (GM * .9), 14) - .5) * 2 * B;
      const i = ti(Math.floor((wx + .5 + dx) / GM), Math.floor((wy + .5 + dy) / GM)), j = ti(Math.floor((wx + .5 + dx * 1.5 + (vn(wx / (GM * 6), wy / (GM * 6), 15) - .5) * 2 * C) / GM), Math.floor((wy + .5 + dy * 1.5 + (vn(wx / (GM * 6), wy / (GM * 6), 16) - .5) * 2 * C) / GM));
      const c = gclass(m, m.b[j] || m.b[i], m.gk[i]), o = Math.round(GCL[c].rank * 2) * 64 + c; raw[py * S + px] = o; if (!seen[o]) { seen[o] = 1; cls.push(o); } }
    const hard = {}; for (let y = Y0; y < Y0 + CS; y++) for (let x = X0; x < X0 + CS; x++) { if (x >= W || y >= H) continue; const c = m.gc[y * W + x]; if (GCL[c].hard) hard[c] = 1; }
    cls.sort((a, b) => a - b); const fillOf = o => { const C = GCL[o & 63]; return C.name === 'lava' ? pat(colOf(m.pal[5], 4), 4, 84) : gpat(C.name); };
    for (const o of cls) if (!fillOf(o)) return false; for (const c in hard) if (!gpat(GCL[c].name)) return false;
    // Each layer is cut out with a clipping path traced round a blurred copy of its mask (marching squares), then filled with its texture.
    // Plain paths and clips only: no extra canvases and no blend modes, which is what iPhones mishandled.
    const x0 = X0 * TS, y0 = Y0 * TS, full = CS * TS, step = TS / GM, ox = (X0 - 2) * TS + step / 2, oy = (Y0 - 2) * TS + step / 2, RB = 2, A = new Float32Array(S * S), Tm = new Float32Array(S * S), F = new Float32Array(S * S);
    const field = o => { for (let i = 0; i < S * S; i++) A[i] = raw[i] >= o ? 1 : 0;
      for (let y = 0; y < S; y++) { let acc = 0; const r0 = y * S; for (let x = 0; x < RB; x++) acc += A[r0 + x]; for (let x = 0; x < S; x++) { if (x + RB < S) acc += A[r0 + x + RB]; if (x - RB - 1 >= 0) acc -= A[r0 + x - RB - 1]; Tm[r0 + x] = acc; } }
      for (let x = 0; x < S; x++) { let acc = 0; for (let y = 0; y < RB; y++) acc += Tm[y * S + x]; for (let y = 0; y < S; y++) { if (y + RB < S) acc += Tm[(y + RB) * S + x]; if (y - RB - 1 >= 0) acc -= Tm[(y - RB - 1) * S + x]; F[y * S + x] = acc / ((2 * RB + 1) * (2 * RB + 1)) - .5; } } };
    const trace = () => { const P = new Path2D(); let any = false, n = 0;
      for (let y = 0; y < S - 1; y++) { let run = -1;
        for (let x = 0; x <= S - 1; x++) { const a = x < S - 1 ? F[y * S + x] : -1, b = x < S - 1 ? F[y * S + x + 1] : -1, c = x < S - 1 ? F[(y + 1) * S + x + 1] : -1, d = x < S - 1 ? F[(y + 1) * S + x] : -1, all = a >= 0 && b >= 0 && c >= 0 && d >= 0;
          if (all) { if (run < 0) run = x; continue; } if (run >= 0) { P.rect(ox + run * step, oy + y * step, (x - run) * step, step); any = true; n++; run = -1; } if (x === S - 1 || !(a >= 0 || b >= 0 || c >= 0 || d >= 0)) continue;
          const cx = [x, x + 1, x + 1, x], cy = [y, y, y + 1, y + 1], v = [a, b, c, d], pts = [];
          for (let k = 0; k < 4; k++) { const k2 = (k + 1) & 3; if (v[k] >= 0) pts.push(cx[k], cy[k]); if ((v[k] >= 0) !== (v[k2] >= 0)) { const t = v[k] / (v[k] - v[k2]); pts.push(cx[k] + (cx[k2] - cx[k]) * t, cy[k] + (cy[k2] - cy[k]) * t); } }
          if (pts.length < 6) continue; P.moveTo(ox + pts[0] * step, oy + pts[1] * step); for (let k = 2; k < pts.length; k += 2) P.lineTo(ox + pts[k] * step, oy + pts[k + 1] * step); P.closePath(); any = true; n++; } }
      return any ? P : null; };
    let foamed = false;
    cls.forEach((o, k) => { const C = GCL[o & 63], fs = fillOf(o);
      if (!k) { g.fillStyle = fs; g.fillRect(x0, y0, full, full); if (C.tint) { g.fillStyle = C.tint; g.fillRect(x0, y0, full, full); } return; }
      field(o); const P = trace(); if (!P) return;
      if (!foamed && C.rank > 1 && GCL[cls[k - 1] & 63].rank <= 1) { foamed = true; const lava = GCL[cls[0] & 63].name === 'lava'; g.save(); g.lineJoin = 'round'; g.strokeStyle = lava ? 'rgba(255,190,90,.45)' : 'rgba(255,255,255,.4)'; g.lineWidth = 14; g.stroke(P); g.lineWidth = 6; g.strokeStyle = lava ? 'rgba(255,220,140,.5)' : 'rgba(255,255,255,.55)'; g.stroke(P); g.restore(); }   // a pale fringe where water meets land
      if (C.mt) { g.save(); g.lineJoin = 'round'; g.strokeStyle = 'rgba(28,22,16,.55)'; g.lineWidth = 7; g.stroke(P); g.restore(); }   // a dark rim round ground you cannot walk on
      g.save(); g.clip(P); g.fillStyle = fs; g.fillRect(x0, y0, full, full); if (C.tint) { g.fillStyle = C.tint; g.fillRect(x0, y0, full, full); } g.restore(); });
    // broad light and shade, so a repeating texture never reads as a repeat
    for (let ly = Math.floor((Y0 - 6) / 6); ly <= Math.floor((Y0 + CS + 6) / 6); ly++) for (let lx = Math.floor((X0 - 6) / 6); lx <= Math.floor((X0 + CS + 6) / 6); lx++) { const h1 = hash(lx, ly, 61), px = (lx * 6 + hash(lx, ly, 62) * 6) * TS, py = (ly * 6 + hash(lx, ly, 63) * 6) * TS, r = (3 + hash(lx, ly, 64) * 2.6) * TS, a = .05 + hash(lx, ly, 65) * .06, gr = g.createRadialGradient(px, py, 0, px, py, r);
      gr.addColorStop(0, h1 < .5 ? `rgba(16,28,12,${a})` : `rgba(255,248,206,${a})`); gr.addColorStop(1, h1 < .5 ? 'rgba(16,28,12,0)' : 'rgba(255,248,206,0)'); g.fillStyle = gr; g.fillRect(x0, y0, full, full); }
    // paving and planks: square, with the ground beside them creeping over their edges
    for (let y = Y0 - 1; y <= Y0 + CS; y++) for (let x = X0 - 1; x <= X0 + CS; x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const c = m.gc[y * W + x], C = GCL[c]; if (!C.hard) continue; const X = x * TS, Y = y * TS, q = rng(x * 7919 + y * 104729 + 7); g.fillStyle = gpat(C.name); g.fillRect(X, Y, TS, TS);
      if (C.name === 'planks') { if (y + 1 < H && m.t[(y + 1) * W + x] === 4) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(X, Y + TS - 4, TS, 4); } continue; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const ni = ny * W + nx; if (m.t[ni] > 1) continue; const nc = GCL[gclass(m, m.b[ni], m.gk[ni])]; g.fillStyle = gpat(nc.name) || '#000'; for (let i = 0; i < 6; i++) { const a = (i + q()) / 6 * TS, r1 = 3 + q() * 7; g.beginPath(); g.ellipse(X + (dx ? (dx > 0 ? TS : 0) : a), Y + (dy ? (dy > 0 ? TS : 0) : a), dx ? r1 : r1 * 1.3, dy ? r1 : r1 * 1.3, 0, 0, 7); g.fill(); } } }
    return true;
  }
  function paintChunk(m, cX, cY) {
    const c = mk(CS * TS, CS * TS), g = c.getContext('2d'), X0 = cX * CS, Y0 = cY * CS, tk = (x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h ? -1 : m.t[y * m.w + x], bid = (x, y) => m.b[y * m.w + x];
    const R = (x, y, w, h, k) => { g.fillStyle = k; g.fillRect(x, y, w, h); }, El = (x, y, rx, ry, k) => { g.fillStyle = k; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); }, rr = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
    g.fillStyle = '#20303a'; g.fillRect(0, 0, c.width, c.height); g.translate(-X0 * TS, -Y0 * TS);
    let tx = false; if (!m.dungeon && m.gc && AD && AD.ground) { g.save(); try { tx = paintGround(m, g, X0, Y0); } catch (e) { tx = false; } g.restore(); } c.tx = tx ? 1 : 0; c.gv = gVer;
    if (m.dungeonFloor) { dungeonPaint(m,g,X0,Y0); tx=true; }
    if (!tx) for (let y = Y0 - 1; y <= Y0 + CS; y++) for (let x = X0 - 1; x <= X0 + CS; x++) { const k = tk(x, y); if (k < 0) continue; const bi = bid(x, y); g.fillStyle = pat(colOf(m.pal[bi], k), k, bi * 16 + k); g.fillRect(x * TS, y * TS, TS, TS); }
    if (!tx) for (let y = Y0 - 1; y <= Y0 + CS; y++) for (let x = X0 - 1; x <= X0 + CS; x++) { const k = tk(x, y); if (k < 0 || k >= 6) continue; const me = bid(x, y), q = rng(x * 7919 + y * 104729 + 7), lava = m.pal[me].liquid === 'lava';
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = tk(x + dx, y + dy); if (n < 0 || n >= 6) continue; const nb = bid(x + dx, y + dy); if (n === k ? (nb <= me || k === 4) : RANK[n] <= RANK[k]) continue;
        if (k === 4 && n !== 4) { g.fillStyle = lava ? 'rgba(40,10,0,.4)' : 'rgba(10,30,45,.3)'; for (let i = 0; i < 5; i++) { const a = (i + q()) / 5 * TS; g.beginPath(); g.ellipse(x * TS + (dx ? (dx > 0 ? TS - 3 : 3) : a), y * TS + (dy ? (dy > 0 ? TS - 3 : 3) : a), dx ? 8 : 11, dy ? 8 : 11, 0, 0, 7); g.fill(); } }
        g.fillStyle = pat(colOf(m.pal[nb], n), n, nb * 16 + n); for (let i = 0; i < 6; i++) { const a = (i + q()) / 6 * TS, r1 = (4 + q() * 8) * (k < 2 ? 2 : 1); g.beginPath(); g.ellipse(x * TS + (dx ? (dx > 0 ? TS : 0) : a), y * TS + (dy ? (dy > 0 ? TS : 0) : a), dx ? r1 : r1 * 1.3, dy ? r1 : r1 * 1.3, 0, 0, 7); g.fill(); }
        if (k === 4 && n !== 4) { g.strokeStyle = lava ? 'rgba(255,220,120,.5)' : 'rgba(255,255,255,.4)'; g.lineWidth = 1.5; g.beginPath(); const o = 14; if (dx) { const X = x * TS + (dx > 0 ? TS - o : o); g.moveTo(X, y * TS + 4); g.quadraticCurveTo(X + (q() - .5) * 8, y * TS + TS / 2, X, y * TS + TS - 4); } else { const Y = y * TS + (dy > 0 ? TS - o : o); g.moveTo(x * TS + 4, Y); g.quadraticCurveTo(x * TS + TS / 2, Y + (q() - .5) * 8, x * TS + TS - 4, Y); } g.stroke(); }
      } }
    g.lineCap = 'round';
    if (!m.dungeonFloor) for (let y = Y0 - 1; y <= Y0 + CS; y++) for (let x = X0 - 1; x <= X0 + CS; x++) { const k = tk(x, y); if (k < 0 || (tx && k !== 7 && k !== 8)) continue; const X = x * TS, Y = y * TS, q = rng(x * 31337 + y * 7477 + 13), b = m.pal[bid(x, y)], base = colOf(b, k);
      if (k < 2) { const lush = b.tree !== 'dead' && b.tree !== 'shroom';
        for (let i = 0, nT = k ? 7 : 3; i < nT; i++) { const px = X + 4 + q() * (TS - 8), py = Y + 9 + q() * (TS - 11), hg = (k ? 9 : 5) + q() * 5; for (let j = -1; j <= 1; j++) { g.strokeStyle = sh(base, j ? .78 : 1.22); g.lineWidth = 1.6; g.beginPath(); g.moveTo(px + j * 2, py); g.quadraticCurveTo(px + j * 3, py - hg * .6, px + j * 5 + (q() - .5) * 2, py - hg); g.stroke(); } }
        if (lush && q() < .13) { const fc = ['#fff6d8', '#f6d24a', '#e88aa8', '#b9a0f0'][q() * 4 | 0]; for (let i = 0; i < 3; i++) { const px = X + 6 + q() * (TS - 12), py = Y + 6 + q() * (TS - 12); El(px, py, 2.2, 2.2, fc); El(px, py, .9, .9, '#c98a1a'); } } }
      else if (k === 2 || k === 5) { for (let i = 0; i < (k === 2 ? 2 : 1); i++) if (q() < .6) { const px = X + 5 + q() * (TS - 10), py = Y + 5 + q() * (TS - 10), r1 = 1.5 + q() * 2.5; El(px + .8, py + 1, r1, r1 * .7, 'rgba(0,0,0,.25)'); El(px, py, r1, r1 * .7, sh(base, 1.25)); } }
      else if (k === 3) { R(X, Y, TS, TS, 'rgba(40,34,26,.3)'); for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 3; c2++) { const f = .9 + hash(x * 3 + c2, y * 3 + r2, 3) * .22, sx = X + c2 * 16 + 1, sy = Y + r2 * 16 + 1; g.fillStyle = sh(base, f); rr(sx, sy, 14, 14, 4); g.fillStyle = 'rgba(255,255,255,.16)'; rr(sx + 1.5, sy + 1.5, 9, 4, 2); } }
      else if (k === 6) { for (let i = 0; i < 4; i++) { R(X, Y + i * 12, TS, 10.5, sh('#9a7850', .9 + hash(x, y * 4 + i, 5) * .2)); R(X, Y + i * 12 + 10.5, TS, 1.5, '#4a3622'); R(X + 6 + hash(x, i, 9) * 30, Y + i * 12 + 3, 2, 2, '#4a3622'); } }
      else if (k === 7) { R(X, Y, TS, TS, 'rgba(0,0,0,.28)'); for (let r2 = 0; r2 < 2; r2++) for (let c2 = 0; c2 < 2; c2++) { g.fillStyle = sh(base, .92 + hash(x * 2 + c2, y * 2 + r2, 7) * .18); rr(X + c2 * 24 + 1, Y + r2 * 24 + 1, 22, 22, 3); g.fillStyle = 'rgba(255,255,255,.08)'; rr(X + c2 * 24 + 2, Y + r2 * 24 + 2, 20, 5, 2); } }
      else if (k === 8) { const below = tk(x, y + 1); if (below >= 0 && below !== 8) { g.save(); g.beginPath(); g.rect(X, Y, TS, TS); g.clip(); R(X, Y, TS, TS, sh(base, .55)); for (let r2 = 0; r2 < 4; r2++) for (let c2 = -1; c2 < 3; c2++) { g.fillStyle = sh(base, .88 + hash(x * 2 + c2, y * 4 + r2, 8) * .24); rr(X + c2 * 24 + (r2 % 2) * 12 + 1, Y + r2 * 12 + 1, 22, 10, 2); } R(X, Y, TS, 4, sh(base, 1.35)); R(X, Y + TS - 3, TS, 3, 'rgba(0,0,0,.3)'); g.restore(); } else R(X, Y, TS, TS, sh(base, .42)); }
    }
    if (!tx) for (const f of m.fields || []) { if (f[0] > X0 + CS || f[0] + f[2] < X0 || f[1] > Y0 + CS || f[1] + f[3] < Y0) continue; g.fillStyle = '#6e4e30'; rr(f[0] * TS + 3, f[1] * TS + 3, f[2] * TS - 6, f[3] * TS - 6, 10); for (let yy = f[1] * TS + 10; yy < (f[1] + f[3]) * TS - 6; yy += 12) { R(f[0] * TS + 8, yy, f[2] * TS - 16, 4, '#57391f'); R(f[0] * TS + 8, yy + 4, f[2] * TS - 16, 2, '#86633f'); } }   // a ploughed field
    // mountains: painted peaks, the ones in front drawn last. Left out once whole ranges are in the pack.
    if (!(m.ranges && m.ranges.length)) for (let y = Y0 - 1; y <= Y0 + CS + 3; y++) for (let x = X0 - 2; x <= X0 + CS + 1; x++) { if (tk(x, y) !== 9) continue; const h1 = hash(x, y, 91); if (h1 > .64) continue; const deep = tk(x, y - 1) === 9 && tk(x, y - 2) === 9 && tk(x, y - 3) === 9, b = m.pal[bid(x, y)], base = b.mt || '#8d8a84';
      const px = x * TS + TS / 2 + (hash(x, y, 92) - .5) * 22, by = y * TS + TS - 3, w = (deep ? 70 : 44) + h1 * 34, hh = (deep ? 84 : 34) + hash(x, y, 93) * (deep ? 52 : 18), sk = (hash(x, y, 94) - .5) * w * .18;
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(px + 6, by, w * .56, 7, 0, 0, 7); g.fill();
      g.fillStyle = sh(base, .6); g.beginPath(); g.moveTo(px + sk, by - hh); g.lineTo(px + w / 2, by); g.lineTo(px - w * .06, by); g.fill();
      g.fillStyle = sh(base, 1.1); g.beginPath(); g.moveTo(px + sk, by - hh); g.lineTo(px - w / 2, by); g.lineTo(px - w * .06, by); g.lineTo(px + w * .05 + sk * .5, by - hh * .42); g.fill();
      g.fillStyle = sh(base, .82); g.beginPath(); g.moveTo(px - w * .22, by - hh * .3); g.lineTo(px - w * .1, by - hh * .12); g.lineTo(px - w * .3, by); g.lineTo(px - w * .38, by - hh * .1); g.fill();
      g.strokeStyle = sh(base, 1.4); g.lineWidth = 1.6; g.beginPath(); g.moveTo(px + sk, by - hh); g.lineTo(px - w * .25, by - hh * .46); g.stroke();
      if (b.cap || hh > 124) { const c0 = by - hh, ch = hh * .34; g.fillStyle = '#f6f9fa'; g.beginPath(); g.moveTo(px + sk, c0); g.lineTo(px + sk - w * .19, c0 + ch); g.lineTo(px + sk - w * .08, c0 + ch * .78); g.lineTo(px + sk, c0 + ch * 1.05); g.lineTo(px + sk + w * .08, c0 + ch * .74); g.lineTo(px + sk + w * .17, c0 + ch); g.fill(); g.fillStyle = 'rgba(120,140,160,.35)'; g.beginPath(); g.moveTo(px + sk, c0); g.lineTo(px + sk + w * .17, c0 + ch); g.lineTo(px + sk + w * .08, c0 + ch * .74); g.lineTo(px + sk, c0 + ch * 1.05); g.fill(); } }
    return c;
  }
  function trim() { if (map.chunks.size < 70) return; const pcx = P.x / CS | 0, pcy = P.y / CS | 0; for (const [k, c] of map.chunks) { const x = k % 1000, y = k / 1000 | 0; if (Math.abs(x - pcx) > 5 || Math.abs(y - pcy) > 6) { c.width = c.height = 0; map.chunks.delete(k); } } }

  /* ---------- movement ---------- */
  const blocked = (x, y, ignore) => { if (x < 0 || y < 0 || x >= map.w || y >= map.h) return true; const i = y * map.w + x; if (map.solid[i]) return true; const e = map.occ.get(i); return !!e && e !== ignore; };
  function pathTo(tx, ty, adj) {
    const R = map.dungeonFloor ? Math.max(map.w,map.h) : 36, x0 = Math.max(0, P.x - R), y0 = Math.max(0, P.y - R), x1 = Math.min(map.w - 1, P.x + R), y1 = Math.min(map.h - 1, P.y + R), w = x1 - x0 + 1, prev = new Int32Array(w * (y1 - y0 + 1)).fill(-1), qu = [(P.y - y0) * w + (P.x - x0)]; prev[qu[0]] = qu[0];
    let goal = -1, best = qu[0], bd = 1e9; const ok = (x, y) => adj ? Math.abs(x - tx) + Math.abs(y - ty) === 1 : x === tx && y === ty;
    for (let i = 0; i < qu.length; i++) { const k = qu[i], x = k % w + x0, y = (k / w | 0) + y0; if (ok(x, y)) { goal = k; break; } const d = Math.abs(x - tx) + Math.abs(y - ty); if (d < bd) { bd = d; best = k; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < x0 || ny < y0 || nx > x1 || ny > y1) continue; const nk = (ny - y0) * w + (nx - x0); if (prev[nk] >= 0 || blocked(nx, ny)) continue; prev[nk] = k; qu.push(nk); } }
    if (goal < 0) goal = best; const path = []; for (let k = goal; k !== qu[0]; k = prev[k]) path.push([k % w + x0, (k / w | 0) + y0]); return path.reverse();
  }
  const nextTo = e => { const d = Math.abs(e.x - P.x) + Math.abs(e.y - P.y); return d === 1 || (d === 0 && !e.solid); };
  function tapAt(px, py, ground) {
    if (!map || fade > .3 || locked) return; const wx = (cam.x + px / zoom) / T, wy = (cam.y + py / zoom) / T; let best = null, bd = 1.1;
    if (GHOST) { GHOST.x = Math.floor(wx - GHOST.w / 2); GHOST.y = Math.floor(wy - GHOST.h / 2); GHOST.why = homeFits(GHOST.x, GHOST.y, GHOST.w, GHOST.h); host.ghostMoved && host.ghostMoved(GHOST); return; }
    if (!ground) for (const e of map.ents) { if(e.hidden)continue; if (Math.abs(e.fx - wx) > 3 || Math.abs(e.fy - wy) > 4) continue; const d = Math.hypot(e.fx + .5 - wx, e.fy + (e.big ? -.2 : .2) - wy); if (d < bd) { bd = d; best = e; } }
    if (best) { P.target = best; P.tries = 0; P.run = Math.hypot(best.x - P.x, best.y - P.y) > 5; P.path = nextTo(best) ? [] : pathTo(best.x, best.y, true); if (!P.path.length) arrive(); return; }
    let tx = Math.floor(wx), ty = Math.floor(wy); P.target = null; if (blocked(tx, ty)) { let f = null, fd = 9; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!blocked(tx + dx, ty + dy) && Math.hypot(dx, dy) < fd) { fd = Math.hypot(dx, dy); f = [tx + dx, ty + dy]; } if (!f) return; [tx, ty] = f; }
    P.run = Math.hypot(tx - P.x, ty - P.y) > (map.dungeonFloor ? 3 : 5); P.path = pathTo(tx, ty, false); if (!ground) P.mark = [tx, ty, 1];
  }
  function arrive() { const e = P.target; if (!e) return; if (!nextTo(e)) { if (map.ents.includes(e) && (P.tries = (P.tries || 0) + 1) < 6) { P.path = pathTo(e.x, e.y, true); if (P.path.length) return; } P.target = null; return; } P.target = null; P.dg = null; P.dir = e.x > P.x ? 's' : e.x < P.x ? 'l' : e.y > P.y ? 'f' : 'b'; P.d8 = D8(Math.sign(e.x - P.x), Math.sign(e.y - P.y)); if (e.kind === 'mon' || e.kind === 'rival') e.unseen = !e.alert; host.interact(e); }
  const setOf = t => { const o = {}; t.split(' ').forEach(k => { o[k] = 1; }); return o; }, PREY = setOf('a1 a2 a4 a5 a6 a7 a8'), FLY = setOf('b102 b204 b303 b304 b402 b404 b502 b602 b603 b701 b702 b704 b802 b803'), SLOW = setOf('b202 b302 b801 b501 b604 b804');
  const D8 = (dx, dy) => [[3, 4, 5], [2, 0, 6], [1, 0, 7]][Math.sign(dy) + 1][Math.sign(dx) + 1] ?? 0;   // 0 S, 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE
  const WALK = 2.2, RUN = 4.6, WALK_CYC = 1.8, RUN_CYC = 2.6, DIRV = { f: [0, 1], b: [0, -1], s: [1, 0], l: [-1, 0] }, D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], dirOf = (dx, dy) => dx > 0 ? 's' : dx < 0 ? 'l' : dy > 0 ? 'f' : 'b';
  function step(dt) {
    clock = (clock + dt / 600) % 1;
    for (const a of anims) { a.t += dt; a.f(Math.min(1, a.t / a.d)); if (a.t >= a.d && a.end) a.end(); } anims = anims.filter(a => a.t < a.d);
    if (P.atk > 0) P.atk -= dt; advanceEffects(dt);
    if (!locked) {
      if (P.path.length) { const [nx, ny] = P.path[0]; if (blocked(nx, ny)) { P.path = P.target ? pathTo(P.target.x, P.target.y, true) : []; } else { const dx = nx - P.fx, dy = ny - P.fy, d = Math.hypot(dx, dy), sp = (P.run ? RUN * (host.runMul ? host.runMul() : 1) : WALK) * dt; { const sx = nx - P.x, sy = ny - P.y; P.dg = sx && sy ? (sy > 0 ? 'd' : 'u') + (sx > 0 ? 'r' : 'l') : null; if (sx || sy) P.d8 = D8(sx, sy); } P.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 's' : 'l') : (dy > 0 ? 'f' : 'b'); P.walk += dt * (P.run ? 13 : 9); P.wd = (P.wd || 0) + Math.min(sp, d); if (d <= sp) { P.fx = P.x = nx; P.fy = P.y = ny; P.path.shift(); onTile(); if (!P.path.length && P.target) arrive(); } else { P.fx += dx / d * sp; P.fy += dy / d * sp; } } } else P.walk = 0;
      if (hold && !P.target) { hold[2] += dt; if (hold[2] > .2) { if (P.path.length > 1) P.path.length = 1; if (!P.path.length) { const hx = (P.fx * T + 8 - cam.x) * zoom, hy = (P.fy * T + 8 - cam.y) * zoom, vx = hold[0] - hx, vy = hold[1] - hy;
        if (Math.hypot(vx, vy) > 14 * zoom) { P.run = Math.hypot(vx, vy) > 2.4 * T * zoom; const a = (Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) + 8) % 8, sx = [1, 1, 0, -1, -1, -1, 0, 1][a], sy = [0, 1, 1, 1, 0, -1, -1, -1][a], ok = (dx, dy) => (dx || dy) && !blocked(P.x + dx, P.y + dy); let st = null;
          if (sx && sy) st = ok(sx, sy) && ok(sx, 0) && ok(0, sy) ? [sx, sy] : Math.abs(vx) > Math.abs(vy) ? (ok(sx, 0) ? [sx, 0] : ok(0, sy) ? [0, sy] : null) : (ok(0, sy) ? [0, sy] : ok(sx, 0) ? [sx, 0] : null);
          else if (ok(sx, sy)) st = [sx, sy]; else { const ox2 = sx ? 0 : (vx > 0 ? 1 : -1), oy2 = sy ? 0 : (vy > 0 ? 1 : -1); if (Math.abs(sx ? vy : vx) > 8 * zoom && ok(ox2, oy2)) st = [ox2, oy2]; }
          if (st) P.path = [[P.x + st[0], P.y + st[1]]]; else { P.dg = null; P.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 's' : 'l') : (vy > 0 ? 'f' : 'b'); P.d8 = D8(Math.abs(vx) > 2 * Math.abs(vy) ? Math.sign(vx) : Math.abs(vy) > 2 * Math.abs(vx) ? 0 : Math.sign(vx), Math.abs(vy) > 2 * Math.abs(vx) ? Math.sign(vy) : Math.abs(vx) > 2 * Math.abs(vy) ? 0 : Math.sign(vy)); } } } } }
      if (P.keys && !P.path.length) { P.run = false; const [dx, dy] = P.keys; if (!blocked(P.x + dx, P.y + dy)) P.path = [[P.x + dx, P.y + dy]]; }
    } else P.walk = 0;
    guideStep(dt);
    near = null; let nd = 1.6;
    for (const e of map.ents) { if(e.hidden)continue; const d = Math.hypot(e.fx - P.fx, e.fy - P.fy); if (d < nd && !e.empty) { nd = d; near = e; } if (e.dead && e.dying == null && (e.decay -= dt) <= 0) e.dying = 1; if (e.dying) { e.dying -= dt * 2.4; continue; } if (!e.wander || e.busy || d > 26) continue; e.t -= dt; if (e.tired > 0) e.tired -= dt; else if (d < 4.4 && e.kind === 'mon' && PREY[e.inst.tpl]) e.t = 0;   // prey reacts at once
      if (e.kind === 'mon' || e.kind === 'rival') { const v = DIRV[e.dir] || [0, 1], facing = (P.fx - e.fx) * v[0] + (P.fy - e.fy) * v[1] > 0; if ((d < 3.2 && facing) || (e.agg && d < 6.5)) e.alert = 4; else if (e.alert > 0) e.alert = Math.max(0, e.alert - dt); if (e.calm > 0) e.calm -= dt;
        if (e.chase > 0) e.chase -= dt; if (e.wait > 0) e.wait -= dt; e.hunt = !(e.wait > 0) && (e.chase > 0 && d < 16 && !locked && host.chasing()) || (e.agg && e.alert > 0 && !(e.calm > 0) && d < 8 && !locked && host.aggro()); if (e.hunt && e.tx == null) { if (Math.abs(e.x - P.x) + Math.abs(e.y - P.y) === 1) { e.hunt = 0; e.calm = 12; host.ambush(e); break; } const ddx = P.x - e.x, ddy = P.y - e.y, st = Math.abs(ddx) >= Math.abs(ddy) ? [[Math.sign(ddx), 0], [0, Math.sign(ddy)]] : [[0, Math.sign(ddy)], [Math.sign(ddx), 0]]; for (const [sx, sy] of st) { if ((!sx && !sy) || blocked(e.x + sx, e.y + sy) || (e.x + sx === P.x && e.y + sy === P.y)) continue; e.dir = dirOf(sx, sy); sit(map, e, e.x + sx, e.y + sy); e.tx = e.x; e.ty = e.y; break; } e.t = 1; continue; } }
      if (e.tx != null) { const dx = e.tx - e.fx, dy = e.ty - e.fy, dd = Math.hypot(dx, dy), sp = (e.wander >= 2 ? 1.4 : e.hunt && e.chase > 0 ? (FLY[e.inst && e.inst.tpl] ? 4.0 : SLOW[e.inst && e.inst.tpl] ? 1.9 : 3.6) : e.hunt ? 2.0 : e.run ? 2.4 : e.kind === 'mon' ? (FLY[e.inst.tpl] ? 1.6 : SLOW[e.inst.tpl] ? .5 : .9) : 1.1) * dt; e.walk = (e.walk || 0) + dt * 7; if (dd <= sp) { e.fx = e.tx; e.fy = e.ty; e.tx = null; } else { e.fx += dx / dd * sp; e.fy += dy / dd * sp; } }
      else if (e.t <= 0 && d > 1.6) {
        if (e.wander >= 2) { let v = e.mv && Math.random() < .8 ? e.mv : D4[Math.random() * 4 | 0]; const nx = e.x + v[0], ny = e.y + v[1], tt = nx >= 0 && ny >= 0 && nx < map.w && ny < map.h ? map.t[ny * map.w + nx] : 9; if ((tt === 2 || tt === 3 || (e.wander === 3 && tt === 6)) && !blocked(nx, ny) && !(nx === P.x && ny === P.y) && (e.wander === 3 || Math.hypot(nx - TOWN[e.r][0], ny - TOWN[e.r][1]) < 26)) { e.mv = v; e.dir = dirOf(v[0], v[1]); sit(map, e, nx, ny); e.tx = nx; e.ty = ny; e.t = Math.random() < .12 ? 1 + Math.random() * 4 : 0; } else { e.mv = null; e.t = .2 + Math.random() * .8; } }
        else if (e.kind === 'mon') {   // creatures roam their ground: pick a spot, walk to it, rest, go again. Prey bolts when you come close, then tires.
          const tp = e.inst.tpl, fly = FLY[tp]; if (PREY[tp] && d < 4.4 && !(e.tired > 0)) { e.goal = [e.x + Math.round((e.x - P.x) / d * 5), e.y + Math.round((e.y - P.y) / d * 5)]; e.steps = 0; e.run = 1; e.tired = 4.5; }
          if (!e.goal) { const a = Math.random() * 6.283, rr = 2 + Math.random() * e.range * (fly ? .95 : .65); e.goal = [Math.round(e.home[0] + Math.cos(a) * rr), Math.round(e.home[1] + Math.sin(a) * rr)]; e.steps = 0; e.run = 0; }
          const gx = e.goal[0] - e.x, gy = e.goal[1] - e.y, rest = () => { e.goal = null; e.run = 0; e.t = fly ? .3 + Math.random() * 1.4 : SLOW[tp] ? 1.5 + Math.random() * 3 : .7 + Math.random() * 3.2; };
          if ((!gx && !gy) || e.steps > 16) rest();
          else { const opts = Math.abs(gx) >= Math.abs(gy) ? [[Math.sign(gx), 0], [0, Math.sign(gy)]] : [[0, Math.sign(gy)], [Math.sign(gx), 0]]; let went = false; if (e.run) for (const v of D4) if (v[0] * (P.x - e.x) + v[1] * (P.y - e.y) <= 0) opts.push(v);   // bolting prey goes round whatever is in its way
            for (const [sx, sy] of opts) { if (!sx && !sy) continue; const nx = e.x + sx, ny = e.y + sy; if (blocked(nx, ny) || (nx === P.x && ny === P.y) || map.keep[ny * map.w + nx] || Math.hypot(nx - e.home[0], ny - e.home[1]) > e.range + (e.run ? 5 : 0)) continue; e.dir = dirOf(sx, sy); sit(map, e, nx, ny); e.tx = nx; e.ty = ny; e.steps++; e.t = 0; went = true; break; }
            if (!went) rest(); } }
        else { e.t = 1.2 + Math.random() * 3.5; const [dx, dy] = D4[Math.random() * 4 | 0], nx = e.x + dx, ny = e.y + dy; e.dir = dirOf(dx, dy); if (!blocked(nx, ny) && !(nx === P.x && ny === P.y) && Math.hypot(nx - e.home[0], ny - e.home[1]) <= e.range && (e.kind === 'rival' || !map.keep[ny * map.w + nx])) { sit(map, e, nx, ny); e.tx = nx; e.ty = ny; } } } }
    if (map.ents.some(e => e.dying != null && e.dying <= 0)) map.ents = map.ents.filter(e => !(e.dying != null && e.dying <= 0));
    if(map.dungeonFloor && (map.respawnCheck=(map.respawnCheck||0)-dt)<=0){map.respawnCheck=1;dungeonRespawn(map);}
    if (map.respawn) { map.respawn = map.respawn.filter(o => { o.t -= dt; if (o.t > 0) return true; o.node ? spawnNode(map, o.terr) : spawnMon(map, o.terr); return false; }); }
    const pi = P.y * map.w + P.x, r = map.dungeon ? map.r : (map.reg[pi] || curReg), nb = map.dungeon ? map.r : (map.b[pi] || curB); if (nb !== curB) { if (map.pal[nb].fx !== map.pal[curB].fx) parts = []; curB = nb; need(map.pal[nb].ar || r); }
    if (r !== curReg) { curReg = r; need(r); banner = { a: host.regionName(r), b: host.regionSub(r), t: 3.2 }; host.entered(r); }
    if (!map.dungeon && (tcheck -= dt) <= 0) { tcheck = .5; let in_ = null; for (const t of map.terr) if (Math.abs(t.x - P.x) < 14 && Math.hypot(t.x - P.x, t.y - P.y) < (t.rad || 7) + 2) { in_ = t; break; } if (in_ !== curT) { curT = in_; if (in_ && in_.name && !banner) banner = { a: in_.name, b: host.monName({ tpl: in_.tpl }) + ' ground', t: 3.2 }; } }
    const bio = map.pal[curB], fx = bio.fx; ambNow += (bio.amb - ambNow) * Math.min(1, dt * 1.5);
    if (fx && parts.length < (fx === 'rain' ? 70 : 34)) parts.push({ x: Math.random() * vw, y: fx === 'ember' ? vh : (fx === 'mote' ? Math.random() * vh : -4), l: 1, s: Math.random() });
    for (const p of parts) { if (fx === 'rain') { p.y += 260 * dt; p.x -= 40 * dt; } else if (fx === 'snow') { p.y += (18 + p.s * 16) * dt; p.x += Math.sin(p.y / 14 + p.s * 9) * 12 * dt; } else if (fx === 'ember') { p.y -= (20 + p.s * 26) * dt; p.x += Math.sin(p.y / 9 + p.s * 9) * 14 * dt; p.l -= dt * .35; } else { p.x += Math.sin(clock * 300 + p.s * 40) * 5 * dt; p.y -= 4 * dt; p.l -= dt * .2; } }
    parts = parts.filter(p => p.y < vh + 6 && p.y > -8 && p.x > -8 && p.l > 0);
    // butterflies over green ground by day, and birds crossing overhead: nothing to do with play, only there so the land is not still
    if (!map.dungeon) { const day = Math.max(0, Math.cos((clock - .78) * 6.283) - .1) < .05, green = curB === 1 || curB === 2 || curB === 3 || curB === 4 || curB === 8 || curB === 11;
      if ((flyT -= dt) <= 0) { flyT = .8 + Math.random() * 1.6;
        if (day && green && flies.filter(f => !f.bird).length < 5) { const x = cam.x / T + Math.random() * vw / T, y = cam.y / T + Math.random() * vh / T, k = map.t[(y | 0) * map.w + (x | 0)]; if (k < 2) flies.push({ x, y, vx: 0, vy: 0, l: 9 + Math.random() * 10, s: Math.random(), c: ['#fffdf0', '#f6d24a', '#9ec7f2', '#f2a0c0'][Math.random() * 4 | 0] }); }
        if (curB !== 6 && Math.random() < .2 && flies.filter(f => f.bird).length < 3) { const a = (Math.random() < .5 ? 0 : Math.PI) + (Math.random() - .5) * .9, sp = 5 + Math.random() * 2.5, n = 1 + (Math.random() * 3 | 0), cx0 = cam.x / T + (Math.cos(a) > 0 ? -2 : vw / T + 2), cy0 = cam.y / T + Math.random() * vh / T; for (let k = 0; k < n; k++) flies.push({ bird: 1, x: cx0 - Math.cos(a) * k * 1.1 + Math.sin(a) * (k % 2 ? .7 : -.5) * k, y: cy0 - Math.sin(a) * k * 1.1 + (k % 2 ? .8 : -.6) * k * .6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 14, s: Math.random() }); } }
      for (const f of flies) { f.l -= dt; if (f.bird) { f.x += f.vx * dt; f.y += f.vy * dt; } else { f.vx += (Math.random() - .5) * 9 * dt; f.vy += (Math.random() - .5) * 9 * dt; const v = Math.hypot(f.vx, f.vy); if (v > 1.3) { f.vx *= 1.3 / v; f.vy *= 1.3 / v; } f.x += f.vx * dt; f.y += f.vy * dt; } }
      flies = flies.filter(f => f.l > 0 && f.x > cam.x / T - 6 && f.y > cam.y / T - 6 && f.x < (cam.x + vw) / T + 6 && f.y < (cam.y + vh) / T + 6); } else if (flies.length) flies = [];
    if (P.mark) { P.mark[2] -= dt * 1.6; if (P.mark[2] <= 0) P.mark = null; }
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    if (!map.pending) fade = Math.max(0, fade - dt * 2.2);
  }
  function onTile() {
    const k = map.t[P.y * map.w + P.x], room = (map.blds || []).find(o => o.enter && P.x >= o.x && P.x < o.x + o.w && P.y >= o.y && P.y < o.y + o.h);
    const surface = room ? room.room.fl === 'flag' ? 'stone' : 'wood' : map.hall || k === 6 ? 'wood' : map.dungeon || k === 3 || k === 7 ? 'stone' : 'earth';
    if (map.dungeonFloor) dungeonReveal(map,P.x,P.y);
    emit('step', surface); host.moved(P.x, P.y, map.dungeon, P.run);
  }

  /* ---------- drawing ---------- */
  const OBJK = [null, 'tree0', 'tree1', 'tree2', 'rock0', 'rock1', 'bush', 'flowers', null, null, 'bones'];
  function draw() { if (P && host.app) { const ak = artVer + JSON.stringify(host.app()); if (P.sv !== ak) { P.sv = ak; P.spr = heroArt(); } }
    const g = cx, vv = Math.max(60, vh - inset / zoom), now = performance.now();
    cam.x = map.w * T < vw ? (map.w * T - vw) / 2 : clamp(P.fx * T + 8 - vw / 2, 0, map.w * T - vw); cam.y = map.h * T < vv ? (map.h * T - vv) / 2 : clamp(P.fy * T + 8 - vv / 2, 0, map.h * T - vv);
    const ox0 = Math.round(cam.x * K) / K, oy0 = Math.round(cam.y * K) / K; g.setTransform(K, 0, 0, K, 0, 0); g.imageSmoothingEnabled = false; g.fillStyle = map.dungeon ? '#15151b' : '#20303a'; g.fillRect(0, 0, vw, vh);
    const x0 = Math.max(0, ox0 / T | 0), y0 = Math.max(0, oy0 / T | 0), x1 = Math.min(map.w - 1, (ox0 + vw) / T | 0), y1 = Math.min(map.h - 1, (oy0 + vh) / T | 0);
    let budget = fade >= 1 ? 99 : 1;
    if (map.paint) { if (!IMG[map.paint]) img(map.paint); if (have(map.paint)) g.drawImage(IMG[map.paint].im, -ox0, -oy0, map.w * T, map.h * T); else { g.fillStyle = '#6b4a2e'; g.fillRect(-ox0, -oy0, map.w * T, map.h * T); } budget = -1e9; }
    if (!map.paint) for (let cY = y0 / CS | 0; cY <= (y1 / CS | 0); cY++) for (let cX = x0 / CS | 0; cX <= (x1 / CS | 0); cX++) { const key = cY * 1000 + cX; let ch = map.chunks.get(key); if (!ch) { if (budget-- <= 0) { g.fillStyle = colOf(map.pal[map.b[Math.min(map.h - 1, cY * CS + 4) * map.w + Math.min(map.w - 1, cX * CS + 4)]], 0); g.fillRect(cX * CS * T - ox0, cY * CS * T - oy0, CS * T, CS * T); continue; } ch = paintChunk(map, cX, cY); map.chunks.set(key, ch); } else if (!ch.tx && ch.gv !== gVer && !map.dungeon && budget > 0) { budget--; ch.width = ch.height = 0; ch = paintChunk(map, cX, cY); map.chunks.set(key, ch); } g.drawImage(ch, cX * CS * T - ox0, cY * CS * T - oy0, CS * T, CS * T); }
    if (budget > 0 && !map.dungeon && P.path.length) { const v = DIRV[P.dir], cX = ((v[0] > 0 ? x1 : x0) / CS | 0) + v[0], cY = ((v[1] > 0 ? y1 : y0) / CS | 0) + v[1]; for (let k = -1; k <= 1 && budget > 0; k++) { const X = cX + (v[0] ? 0 : k), Y = cY + (v[1] ? 0 : k), key = Y * 1000 + X; if (X >= 0 && Y >= 0 && X * CS < map.w && Y * CS < map.h && !map.chunks.has(key)) { map.chunks.set(key, paintChunk(map, X, Y)); budget--; } } trim(); }
    const ph = now / 520 | 0, vl = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * map.w + x; if (map.t[i] !== 4) continue; const b = map.pal[map.b[i]], lava = b.liquid === 'lava'; if (lava && x % 3 === 2 && y % 3 === 2) vl.push({ x: x + .5, y: y + .5, r: 34, c: 2 }); for (let k = 0; k < 3; k++) { const hx = hash(x * 3 + k, y, ph) * 13 | 0, hy = hash(x, y * 3 + k, ph + 7) * 15 | 0; g.fillStyle = lava ? (k ? '#f0a03a' : '#ffe08a') : (b.fx === 'snow' ? 'rgba(255,255,255,.5)' : 'rgba(190,220,225,.34)'); g.fillRect(x * T + hx - ox0, y * T + hy - oy0, lava ? 2 : 3, 1); } }
    const rdt = Math.min(.1, (now - (roomT || now)) / 1000); roomT = now;
    for (const o of map.blds) if (o.enter) { roomFade(o, rdt); if (o.fa < 1) { const ra = roomArt(o); if (ra) g.drawImage(ra.fl, Math.round((o.x * T - ox0) * K) / K, Math.round((o.y * T - oy0) * K) / K, o.w * T, o.h * T); } }
    if (P.mark) { g.strokeStyle = `rgba(211,168,76,${P.mark[2]})`; g.strokeRect(P.mark[0] * T - ox0 + 3.5, P.mark[1] * T - oy0 + 3.5, 9, 9); }
    const list = [];
    for (let y = y0; y <= Math.min(map.h - 1, y1 + 4); y++) for (let x = Math.max(0, x0 - 3); x <= Math.min(map.w - 1, x1 + 3); x++) { const i = y * map.w + x, o = map.o[i]; if (!o) continue; const pb = map.pal[map.b[i]], r = (pb && pb.ar) || map.reg[i] || curReg, s = spr(OBJK[o], r); if (!s) continue; list.push([y * T + (o === 7 || o === 10 ? 2 : 15), s.c, x * T + 8 - s.ax, y * T + 15 - s.ay]); if (o < 4 && map.pal[r].tree === 'shroom' && (x + y) % 2 === 0) vl.push({ x: x + .5, y: y - .5, r: 22, c: 3 }); }
    for (const o of map.props) { const mg = o.sc ? 9 : 4; if (o.x < x0 - mg || o.x > x1 + mg || o.y < y0 - 2 || o.y > y1 + (o.sc ? 18 : 7)) continue; const s = spr(o.kind, o.r); if (!s) continue; const sc = o.sc || 1; list.push([o.y * T + 15, s.c, o.x * T + 8 - s.ax * sc, o.y * T + (o.hang ? 14 : 15) - s.ay * sc, false, o.sc || 0]); }
    if (map.ranges) for (const o of map.ranges) { if (o.x + o.w < x0 || o.x > x1 + 1 || o.y < y0 || o.y - o.h > y1 + 1) continue; const im = rangeImg(o.k); if (im) list.push([o.y * T - 1, im, o.x * T, (o.y - o.h) * T, o.flip, o.w * T / im.width]); }
    for (const o of map.blds) { if (o.x + o.w < x0 - 3 || o.x > x1 + 3 || o.y + o.h < y0 - 1 || o.y > y1 + 10) continue; const s = bldSpr(o); if (o.enter && o.fa < 1) { const ra = roomArt(o); if (ra) { const bx = o.x * T, ty = o.y * T, R = o.room;
        list.push([ty + T - 2, ra.wl, bx, ty + T - WALLH * T]); list.push([o.by - 2, ra.sd, bx - 2, ty - (WALLH - 1) * T]); list.push([o.by - 2, ra.sd, bx + o.w * T - 4, ty - (WALLH - 1) * T]); list.push([o.by - 1.5, ra.fr, bx, o.by - 5]);
        for (const f of R.fur) { const pc = kitPiece('f_' + f.p); if (pc) list.push([ty + (f.y + 1) * T - 3, pc, bx + (f.x + .5) * T - lw(pc) / 2, ty + (f.y + 1) * T - lh(pc) - 1]); } } if (o.fa <= 0) continue; }
      list.push([o.by, s.c, o.x * T - (s.ax || 0), o.by - s.ay + 1, false, s.k, 0, o.enter ? o.fa : undefined]); }
    const fr = (now / 260 | 0) % 2;
    const ent = (e, me) => {
      const bx = (e.fx + (e.ax || 0)) * T + 8, by = (e.fy + (e.ay || 0)) * T + 15; if (e.kind === 'fish') { if (AD && AD.fx2) { const tt = now + e.x * 400 + e.y * 130, cyc = tt % 6400, jump = cyc > 5800, a2 = artFx2(jump ? 1 : 0, jump ? Math.min(3, (cyc - 5800) / 150 | 0) : (tt / 240 | 0) % 4); if (a2) { const k = jump ? .62 : .55; list.push([by - 30, a2, bx - lw(a2) * k / 2, by - 8 - lh(a2) * k / 2 - (jump ? 3 : 0), false, k]); return; } } const rp = ripple(now + e.x * 400); list.push([by - 30, rp, bx - rp.width / 2, by - 13]); return; } if (e.obj) { list.push([by, e.obj.c, bx - e.obj.ax, by - e.obj.ay + 1]); return; }
      if (e.fs != null) { const c = fsCut(e.fs, e.ff | 0); if (c) list.push([by, c, bx - lw(c) / 2 + (e.ox || 0), by - lh(c) + 2, !!e.flip]); else if (e.spr) list.push([by, (e.spr.f || e.spr)[0], bx - 8, by - 15]); return; }
      if (!e.spr) return;
      const s = e.spr, moving = me ? P.path.length && !locked : e.tx != null, left = e.dir === 'l', fl = me && s.w8 && !(P.atk > 0) ? (P.run && moving && s.r8 ? s.r8 : s.w8)[P.d8 || 0] : me && P.dg && s[P.dg] && !(P.atk > 0) ? s[P.dg] : left && s.l ? s.l : s[left ? 's' : (e.dir || 'f')], f = s.beast ? fr : (moving ? (me && s.w8 && !(P.atk > 0) ? Math.floor(P.wd / ((P.run ? RUN_CYC : WALK_CYC) / fl.length)) % fl.length : ((me ? P.walk : e.walk) | 0) % fl.length) : me && s.w8 && fl.length === 8 ? 2 : 0), ak = me && P.atk > 0 && s.af ? s['a' + (left ? 'l' : (e.dir || 'f'))] : null, im = ak ? ak[Math.min(3, Math.floor((1 - P.atk / .3) * 4))] : fl[f], sc = e.big && !s.art ? 2 : s.msc || 1;
      if (e.dead) { const da = artDead(e.inst ? (e.inst.art || e.inst.tpl) : e.tpl); if (da) { const ds = s.msc || 1; list.push([by - 8, da, bx - lw(da) * ds / 2, by - lh(da) * ds + 3, false, ds, 0, e.dying != null ? Math.max(0, e.dying) : 1]); return; } const di = (s.s || s.f)[0]; list.push([by - 8, di, bx - lw(di) * sc / 2, by - lh(di) * sc + 1, false, sc, 0, e.dying != null ? Math.max(0, e.dying) : 1, 1]); return; }
      const flip = me && s.w8 && !(P.atk > 0) ? false : s.left ? (e.dir === 's' && !e.flip) : ((left && !s.l) || e.flip), bob = s.bob ? (moving && !(e.inst && FLY[e.inst.tpl]) ? -Math.round(Math.abs(Math.sin(now / 105 + e.x)) * 3) / K : Math.round(Math.sin(now / 320 + e.x * 2) * 2) / K) : (s.one && moving ? Math.round(Math.abs(Math.sin(now / 90)) * 3) / K : 0);
      list.push([by + (bars.length && (me || bars.some(b => b.e === e)) ? 4000 : 0), im, bx - lw(im) * sc / 2, by - lh(im) * sc + (s.art ? 1 : 2 + (s.beast ? 3 * sc : 0)) + (s.one && moving ? -bob : bob), flip, sc, e.flash > 0 ? 1 : 0, e.dying != null ? Math.max(0, e.dying) : 1, 0, me && s.fx && im.mask ? s.fx : null]);
    };
    for (const e of map.ents) { if(e.hidden)continue; if (Math.abs(e.fx * T - ox0 - vw / 2) > vw / 2 + 60 || Math.abs(e.fy * T - oy0 - vh / 2) > vh / 2 + 70) continue; if (e.sv !== artVer) dress(e); else if (e.wk && !e.spr.l && AD && AD.chars.walk && have('folk.webp')) dress(e); if (e.flash > 0) e.flash -= .016; ent(e); }
    if (P.flash > 0) P.flash -= .016; ent(P, true);
    list.sort((a, c2) => a[0] - c2[0]);
    for (const [, im, px, py, flip, sc, fl, al, rot, fx] of list) { if (!im) continue; const X = Math.round((px - ox0) * K) / K, Y = Math.round((py - oy0) * K) / K, w = lw(im) * (sc || 1), h = lh(im) * (sc || 1); if (al != null && al < 1) g.globalAlpha = al; if (im.sm) { g.imageSmoothingEnabled = true; if (flip) { g.save(); g.translate(X + w, Y); g.scale(-1, 1); g.drawImage(im, 0, 0, w, h); g.restore(); } else g.drawImage(im, X, Y, w, h); g.imageSmoothingEnabled = false; continue; } if (rot) { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(X + w / 2, Y + h - 1, h * .46, 3, 0, 0, 7); g.fill(); g.save(); g.translate(X + w / 2 - h / 2, Y + h - w / 2); g.rotate(Math.PI / 2); g.drawImage(im, -w / 2, -h, w, h); g.restore(); g.globalAlpha = 1; continue; } if (flip) { g.save(); g.translate(X + w, Y); g.scale(-1, 1); g.drawImage(im, 0, 0, w, h); if (fl) { g.globalCompositeOperation = 'lighter'; g.drawImage(im, 0, 0, w, h); } g.restore(); } else { g.drawImage(im, X, Y, w, h); if (fl) { g.globalCompositeOperation = 'lighter'; g.drawImage(im, X, Y, w, h); g.globalCompositeOperation = 'source-over'; } } if (fx) dollFx(g, fx, im.mask, X, Y, w, h, flip, now); g.globalAlpha = 1; }
    // blows and bolts
    for (const s of slashes) { const u = s.t / (s.d || .2), X = s.x * T + 8 - ox0, Y = s.y * T + 4 - oy0 - (s.rise || 0) * u * T;
      if (s.style) { g.save(); g.translate(X, Y); Effects.drawMagic(g, s.style, s.phase, u); g.restore(); continue; }
      const one = s.f != null, fi = artFx(s.row || 0, one ? s.f : Math.min(3, Math.floor(u * 4)));
      if (fi) { const k = one ? .65 + .35 * Math.min(1, u * 3) : 1; g.save(); g.globalAlpha = one ? Math.min(1, (1 - u) * 2.5) : 1; if (s.flip && !s.row) { g.translate(2 * X, 0); g.scale(-1, 1); } g.drawImage(fi, X - lw(fi) * k / 2, Y - lh(fi) * k / 2, lw(fi) * k, lh(fi) * k); g.restore(); continue; } if (s.row) continue; g.strokeStyle = `rgba(255,255,240,${1 - u})`; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.arc(X + (s.flip ? 4 : -4), Y, 9, (s.flip ? Math.PI : 0) - 1.1 + u * 1.6, (s.flip ? Math.PI : 0) + .2 + u * 1.6); g.stroke(); }
    for (const s of shots) { const u = Math.min(1, s.t / FLIGHT), X = (s.x + (s.tx - s.x) * u) * T + 8 - ox0, Y = (s.y + (s.ty - s.y) * u) * T + 2 - oy0;
      g.save(); g.translate(X, Y); g.rotate(Math.atan2(s.ty - s.y, s.tx - s.x));
      if (s.style) Effects.drawMagic(g, s.style, 'flight', u);
      else { g.strokeStyle = '#e8d4a3'; g.lineWidth = 1; g.beginPath(); g.moveTo(-9, 0); g.lineTo(7, 0); g.lineTo(3, -2); g.moveTo(7, 0); g.lineTo(3, 2); g.stroke(); }
      g.restore(); }
    for (const f of flies) { const X = f.x * T - ox0, Y = f.y * T - oy0, al = Math.min(1, f.l * 2, f.bird ? 1 : (f.l > 1 ? 1 : f.l)), wf = Math.floor(now / (f.bird ? 110 : 70) + f.s * 9) % 4, im = artFx2(f.bird ? 3 : 2, wf); g.globalAlpha = al;
      if (f.bird) { g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(X + 5, Y + 22, 4, 1.6, 0, 0, 7); g.fill(); }   // its shadow on the ground far below
      if (im) { const k = f.bird ? .4 : .26, w = lw(im) * k, h = lh(im) * k; g.save(); g.translate(X, Y); g.rotate(Math.atan2(f.vy, f.vx) + Math.PI / 2); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); }
      else if (f.bird) { const sp = [5, 3.4, 1.6, 3.4][wf], a = Math.atan2(f.vy, f.vx); g.save(); g.translate(X, Y); g.rotate(a); g.strokeStyle = '#2a2622'; g.lineWidth = 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-2, -sp); g.lineTo(1.5, 0); g.lineTo(-2, sp); g.stroke(); g.fillStyle = '#2a2622'; g.fillRect(-1, -.7, 4, 1.4); g.restore(); }
      else { const sp = [2, 1.3, .5, 1.3][wf]; g.fillStyle = f.c; g.fillRect(X - sp - .3, Y - 1, sp, 2); g.fillRect(X + .3, Y - 1, sp, 2); g.fillStyle = '#3a3026'; g.fillRect(X - .3, Y - 1, .6, 2); } }
    g.globalAlpha = 1;
    if (SHOWB) { g.fillStyle = 'rgba(255,30,30,.32)'; for (let y = Math.max(0, y0 - 1); y <= Math.min(map.h - 1, y1 + 1); y++) for (let x = Math.max(0, x0 - 1); x <= Math.min(map.w - 1, x1 + 1); x++) if (map.solid[y * map.w + x]) g.fillRect(x * T - ox0, y * T - oy0, T, T); }   // the blocked-ground switch
    if (GHOST && map === world) { const ok = !GHOST.why; g.fillStyle = ok ? 'rgba(60,220,90,.35)' : 'rgba(240,50,40,.38)'; g.strokeStyle = ok ? '#3fe06a' : '#ff5040'; g.lineWidth = 1.5; g.fillRect(GHOST.x * T - ox0, GHOST.y * T - oy0, GHOST.w * T, GHOST.h * T); g.strokeRect(GHOST.x * T - ox0 + .5, GHOST.y * T - oy0 + .5, GHOST.w * T - 1, GHOST.h * T - 1); g.fillRect((GHOST.x + (GHOST.w >> 1)) * T - ox0 + 4, (GHOST.y + GHOST.h) * T - oy0 + 4, T - 8, T - 8); }
    const bio = map.pal[curB], fx = bio.fx; for (const p of parts) { g.fillStyle = fx === 'rain' ? 'rgba(170,200,210,.4)' : fx === 'snow' ? 'rgba(255,255,255,.85)' : fx === 'ember' ? `rgba(255,${120 + p.s * 80 | 0},40,${p.l})` : `rgba(200,190,230,${p.l * .5})`; g.fillRect(p.x | 0, p.y | 0, 1, fx === 'rain' ? 4 : 1); }
    const night = Math.max(0, Math.cos((clock - .78) * 6.283) - .1) * .2, amb = Math.min(.86, Math.max(night, ambNow)), dusk = Math.max(0, 1 - Math.abs(clock - .58) * 9) * .08, lava = bio.liquid === 'lava';
    if (dusk > .01) { g.fillStyle = `rgba(210,110,50,${dusk})`; g.fillRect(0, 0, vw, vh); }
    if (amb > .03) { const L = lightCv, lg = L.getContext('2d'); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, vw, vh); lg.fillStyle = map.dungeon ? `rgba(4,4,8,${amb})` : lava ? `rgba(24,6,4,${amb})` : `rgba(6,10,26,${amb})`; lg.fillRect(0, 0, vw, vh); lg.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a) => { const gr = lg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.fillRect(x - r, y - r, r * 2, r * 2); };
      const ls = []; for (const l of map.lights) { const x = l.x * T - ox0, y = l.y * T - oy0; if (x > -60 && y > -60 && x < vw + 60 && y < vh + 60) ls.push(l); } for (const l of vl) ls.push(l);
      hole(P.fx * T + 8 - ox0, P.fy * T + 4 - oy0, 58, .92); for (const l of ls) hole(l.x * T - ox0, l.y * T - oy0, l.r * (l.fl ? 1 + Math.sin(now / 90 + l.x) * .05 : 1), .85);
      g.imageSmoothingEnabled = true; g.drawImage(L, 0, 0); g.imageSmoothingEnabled = false; g.globalCompositeOperation = 'lighter'; for (const l of ls) { const x = l.x * T - ox0, y = l.y * T - oy0, gr = g.createRadialGradient(x, y, 0, x, y, l.r * .7); gr.addColorStop(0, l.c === 2 ? `rgba(255,120,40,${amb * .34})` : l.c === 3 ? `rgba(150,110,220,${amb * .28})` : `rgba(255,190,90,${amb * .3})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2); } g.globalCompositeOperation = 'source-over'; }
    if (fade > 0) { g.fillStyle = `rgba(5,7,9,${fade})`; g.fillRect(0, 0, vw, vh); }
    // crisp overlay: names, markers, health bars, damage numbers, corner map
    const o = ox, z = zoom * dpr; o.clearRect(0, 0, ov.width, ov.height); o.textAlign = 'center'; o.font = `500 ${11 * dpr}px 'Alegreya Sans', sans-serif`;
    const top = e => (e.fy * T - (e.spr && e.spr.art ? Math.max(6, lh(e.spr.f[0]) * (e.spr.msc || 1) - 13 * Math.min(1, e.spr.msc || 1)) : e.obj && e.obj.c.hr ? lh(e.obj.c) - 12 : e.big ? 34 : e.obj ? 8 : 12) - oy0) * z;
    for (const e of map.ents) { if (e.hidden || e.dying != null) continue; const sx = (e.fx * T + 8 - ox0) * z, sy = top(e); if (sx < -50 || sy < -30 || sx > ov.width + 50 || sy > ov.height) continue; const d = Math.hypot(e.fx - P.fx, e.fy - P.fy), mark = e.kind === 'folk' ? null : host.mark(e);
      if (mark) { o.font = `700 ${15 * dpr}px Georgia, serif`; o.fillStyle = '#0a0c0e'; o.fillText(mark[0], sx + dpr, sy - 2 * dpr + Math.sin(now / 300) * 2 * dpr + dpr); o.fillStyle = mark[1]; o.fillText(mark[0], sx, sy - 2 * dpr + Math.sin(now / 300) * 2 * dpr); o.font = `500 ${11 * dpr}px 'Alegreya Sans', sans-serif`; }
      if (d < (e.kind === 'mon' ? 3.4 : e.kind === 'folk' ? 2.2 : 4.6) && !bars.some(b => b.e === e)) { const y = sy - (mark ? 16 : 3) * dpr, txt = (e.inst && e.inst.elite ? 'Gilded ' : '') + e.name; o.lineWidth = 3 * dpr; o.strokeStyle = 'rgba(8,10,12,.85)'; o.strokeText(txt, sx, y); o.fillStyle = e.kind === 'mon' || e.kind === 'guard' ? (e.inst && e.inst.elite ? '#f3a53f' : '#e8b0a0') : e.kind === 'boss' ? '#e06a50' : '#ece5d0'; o.fillText(txt, sx, y); if ((e.kind === 'mon' || e.kind === 'rival') && e.alert > 0 && host.thief() && !locked) { o.fillStyle = '#e06a50'; o.fillText('sees you', sx, y - 12 * dpr); } } }
    for (const b of bars) { const e = b.e === 'me' ? P : b.e, sx = (e.fx * T + 8 - ox0) * z, sy = (b.e === 'me' ? (P.fy * T - 14 - oy0) * z : top(e)) - 6 * dpr, w = 44 * dpr, h = 6 * dpr; o.fillStyle = 'rgba(8,10,12,.85)'; o.fillRect(sx - w / 2 - dpr, sy - dpr, w + 2 * dpr, h + 2 * dpr); o.fillStyle = '#3a1c18'; o.fillRect(sx - w / 2, sy, w, h); o.fillStyle = b.e === 'me' ? '#6fbf5a' : '#e0563e'; o.fillRect(sx - w / 2, sy, w * clamp(b.pct, 0, 1), h); if (b.name) { o.lineWidth = 3 * dpr; o.strokeStyle = 'rgba(8,10,12,.85)'; o.strokeText(b.name, sx, sy - 4 * dpr); o.fillStyle = '#ece5d0'; o.fillText(b.name, sx, sy - 4 * dpr); } }
    // the guided start: a bouncing arrow over the next thing to do, or at the screen edge pointing toward it
    { const gt = !locked && host.guide && host.guide(); if (gt) { const gx = (gt[0] * T + 8 - ox0) * z, gy = (gt[1] * T - 30 - oy0) * z + Math.sin(now / 220) * 5 * dpr, m = 26 * dpr, W2 = ov.width, H2 = ov.height, inside = gx > m && gx < W2 - m && gy > m && gy < H2 - m;
      o.save(); if (inside) { o.translate(gx, gy); o.rotate(Math.PI / 2); } else { const cx = W2 / 2, cy = H2 / 2, a = Math.atan2(gy - cy, gx - cx), k = Math.min((W2 / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (H2 / 2 - m) / Math.abs(Math.sin(a) || 1e-6)); o.translate(cx + Math.cos(a) * k, cy + Math.sin(a) * k); o.rotate(a); }
      const L = 22 * dpr; o.beginPath(); o.moveTo(L * .55, 0); o.lineTo(-L * .45, -L * .42); o.lineTo(-L * .2, 0); o.lineTo(-L * .45, L * .42); o.closePath(); o.lineWidth = 3 * dpr; o.strokeStyle = 'rgba(20,12,4,.9)'; o.stroke(); o.fillStyle = '#f2c94c'; o.fill(); o.restore(); } }
    o.font = `700 ${17 * dpr}px 'Alegreya Sans', sans-serif`; for (const f of floats) { const e = f.e === 'me' ? P : f.e, sx = (e.fx * T + 8 - ox0) * z + f.dx * dpr, sy = (e.fy * T - 18 - oy0) * z - f.t * 34 * dpr; o.globalAlpha = Math.min(1, (1 - f.t) * 2.2); o.lineWidth = 4 * dpr; o.strokeStyle = 'rgba(8,10,12,.9)'; o.strokeText(f.txt, sx, sy); o.fillStyle = f.col; o.fillText(f.txt, sx, sy); } o.globalAlpha = 1; o.font = `500 ${11 * dpr}px 'Alegreya Sans', sans-serif`;
    if (!locked) { const MS = 44, ms = 1.5 * dpr, sz = MS * ms, mx = ov.width - sz - 8 * dpr, my = 8 * dpr, sx0 = clamp(P.x - MS / 2, 0, Math.max(0, map.w - MS)), sy0 = clamp(P.y - MS / 2, 0, Math.max(0, map.h - MS)), mw = Math.min(MS, map.w), mh = Math.min(MS, map.h); o.globalAlpha = .9; o.imageSmoothingEnabled = false; o.fillStyle = '#0a0c0e'; o.fillRect(mx - 2 * dpr, my - 2 * dpr, mw * ms + 4 * dpr, mh * ms + 4 * dpr); o.drawImage(map.mini, sx0, sy0, mw, mh, mx, my, mw * ms, mh * ms); o.globalAlpha = 1;
      for (const e of map.ents) { if (e.x < sx0 || e.y < sy0 || e.x >= sx0 + mw || e.y >= sy0 + mh) continue; const c = e.kind === 'mon' || e.kind === 'guard' ? '#e06a50' : e.kind === 'npc' ? (host.mark(e) ? '#f3c95a' : '#d8d0c0') : e.kind === 'boss' ? '#ff5a3a' : e.kind === 'stairs' || e.kind === 'chest' ? '#a98be6' : e.kind === 'page' || e.kind === 'corpse' ? '#f3c95a' : e.kind === 'cache' && e.ok === 'chest' ? '#a98be6' : e.kind === 'camp' ? '#ff9a4a' : e.kind === 'node' ? host.hue(e.r) : null; if (!c) continue; o.fillStyle = c; o.fillRect(mx + (e.fx - sx0) * ms, my + (e.fy - sy0) * ms, 2 * dpr, 2 * dpr); }
      o.fillStyle = '#fff'; o.fillRect(mx + (P.fx - sx0) * ms - dpr, my + (P.fy - sy0) * ms - dpr, 3 * dpr, 3 * dpr); }
    if (banner) { const a = Math.min(1, banner.t, (3.2 - banner.t) * 2); o.globalAlpha = Math.max(0, a); o.font = `400 ${30 * dpr}px 'IM Fell English', Georgia, serif`; o.lineWidth = 5 * dpr; o.strokeStyle = 'rgba(8,10,12,.8)'; o.strokeText(banner.a, ov.width / 2, ov.height * .24); o.fillStyle = '#ece5d0'; o.fillText(banner.a, ov.width / 2, ov.height * .24); o.font = `italic 400 ${16 * dpr}px 'IM Fell English', Georgia, serif`; o.strokeText(banner.b, ov.width / 2, ov.height * .24 + 24 * dpr); o.fillStyle = '#d3a84c'; o.fillText(banner.b, ov.width / 2, ov.height * .24 + 24 * dpr); o.globalAlpha = 1; }
    if(map.dungeonFloor && !locked){ const area=map.layout.rooms.find(R=>P.x>=R.x&&P.y>=R.y&&P.x<R.x+R.w&&P.y<R.y+R.h);o.textAlign='left';o.font=`600 ${12*dpr}px 'Alegreya Sans',sans-serif`;const label='Floor '+(map.f+1)+' · '+(area?area.name:map.layout.name);const tw=o.measureText(label).width;o.fillStyle='rgba(8,15,22,.85)';o.fillRect(8*dpr,52*dpr,Math.min(tw+16*dpr,ov.width-16*dpr),23*dpr);o.fillStyle='#f4dfac';o.fillText(label,16*dpr,68*dpr,ov.width-36*dpr);o.textAlign='center';}
    host.hud(locked ? null : near);
  }
  function loop(ts) { raf = 0; if (!running) return; const dt = Math.max(0, Math.min(.05, (ts - last) / 1000 || 0)); last = ts; step(dt); draw(); raf = requestAnimationFrame(loop); }
  function size() { if (!wrap) return; const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return; dpr = Math.min(3, window.devicePixelRatio || 1); zoom = w >= 760 ? 3 : 2; vw = Math.ceil(w / zoom); vh = Math.ceil(h / zoom); cv.width = vw * K; cv.height = vh * K; cv.style.width = vw * zoom + 'px'; cv.style.height = vh * zoom + 'px'; ov.width = Math.round(w * dpr); ov.height = Math.round(h * dpr); cx.imageSmoothingEnabled = false; lightCv = mk(vw, vh); }

  /* ---------- public ---------- */
  function init(el, h) {
    host = h; wrap = el; cv = mk(1, 1); ov = mk(1, 1); cv.className = 'game'; ov.className = 'over'; el.prepend(ov); el.prepend(cv); cx = cv.getContext('2d'); ox = ov.getContext('2d');
    const at = e => { const r = wrap.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, 0]; };
    el.addEventListener('pointerdown', e => { if (e.target !== ov && e.target !== cv) return; const p = at(e); tapAt(p[0], p[1]); hold = P && !P.target ? p : null; });
    el.addEventListener('pointermove', e => { if (hold) { const p = at(e); hold[0] = p[0]; hold[1] = p[1]; } }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => { hold = null; });
    const KM = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    window.addEventListener('keydown', e => { if (!running || !P || locked || /TEXTAREA|INPUT/.test(document.activeElement.tagName)) return; if (KM[e.key]) { P.keys = KM[e.key]; P.target = null; e.preventDefault(); } else if ((e.key === ' ' || e.key === 'Enter') && near) act(); });
    window.addEventListener('keyup', e => { if (P && KM[e.key]) P.keys = null; }); window.addEventListener('resize', size);
  }
  function place(x, y) { if (map && map.solid[y * map.w + x]) { let best = null; for (let rr = 1; rr < 16 && !best; rr++) for (let dy = -rr; dy <= rr && !best; dy++) for (let dx = -rr; dx <= rr; dx++) { const i = (y + dy) * map.w + x + dx; if (x + dx > 0 && y + dy > 0 && x + dx < map.w && y + dy < map.h && !map.solid[i] && !map.occ.has(i) && (!map.seen || map.seen[i])) { best = [x + dx, y + dy]; break; } } if (best) { x = best[0]; y = best[1]; } }   // the world can gain a building where a saved game left the hero
    P = { x, y, fx: x, fy: y, dir: 'f', path: [], walk: 0, target: null, spr: heroArt() }; }
  let flies = [], flyT = 0, SHOWB = false;
  function go(m, x, y) { map = m; place(x, y); fade = 1; parts = []; flies = []; anims = []; floats = []; slashes = []; shots = []; bars = []; locked = false; curReg = m.dungeon ? m.r : (m.reg[y * m.w + x] || 1); curB = m.dungeon ? m.r : (m.b[y * m.w + x] || curReg); curT = null; ambNow = m.pal[curB].amb; need(curReg); host.entered(curReg); if (AD && !packs(curReg).every(have)) { m.pending = true; const t = setTimeout(() => { m.pending = false; }, 5000); Promise.all(packs(curReg).map(n => img(n).p)).then(() => { clearTimeout(t); m.pending = false; if (P) P.spr = heroArt(); }); } banner = { a: m.hall ? 'The dojo' : m.dungeon ? host.dungeonName(m.r) : host.regionName(curReg), b: m.hall ? host.regionName(m.r) : m.dungeonFloor ? 'Floor ' + (m.f+1) + ' · ' + m.layout.name : m.dungeon ? 'walk in, walk out' : host.regionSub(curReg), t: 3.2 }; }
  function load(pos, r) {
    if (!world) world = genWorld(); for (const [, c] of world.chunks) c.width = c.height = 0; world.chunks.clear();
    const free = (x, y) => x > 0 && y > 0 && x < WW && y < WH && !world.solid[y * WW + x] && world.seen[y * WW + x] && !world.occ.has(y * WW + x);
    let p = r === 'dock' ? world.spots.dock : pos && free(pos[0], pos[1]) ? pos : null; if (!p) { const t = pos || TOWN[r > 0 ? r : 1], c = pos ? pos : [t[0], t[1] + 3]; for (let d = 0; d < 12 && !p; d++) for (let dy = -d; dy <= d && !p; dy++) for (let dx = -d; dx <= d; dx++) if (free(c[0] + dx, c[1] + dy)) { p = [c[0] + dx, c[1] + dy]; break; } if (!p) p = [TOWN[1][0], TOWN[1][1] + 3]; }
    go(world, p[0], p[1]);
  }
  function enterDungeon(r, options) { const m = genDungeon(r, options), at=options && options.pos || m.entry; go(m, at[0], at[1]); dungeonReveal(m,P.x,P.y); }
  function kill(e, delay) { if (!map) return; { const o = e.y * map.w + e.x; if (map.occ.get(o) === e) map.occ.delete(o); } e.dying = 1; e.wander = 0; if (e.terr && (e.kind === 'mon' || e.kind === 'node')) (map.respawn = map.respawn || []).push({ t: delay || respT(e.terr, e.kind === 'node'), node: e.kind === 'node', terr: e.terr }); }
  // respawn in minutes, UO style: camps 2.5-5 min, lair guards 8 min, lair leaders 15 min, ore and herbs 4 min
  const respT = (t, node) => node ? 240 : t.lead ? 900 : t.lair ? 480 : 150 + Math.random() * 150;
  function emptied(e) { if (!e) return; e.loot = {}; e.decay = Math.min(e.decay || 90, 90); e.sub = 'Picked clean'; e.empty = 1; }
  /* ---------- player homes ---------- */
  const HOMEC = {};
  function tintHome(src, wall, roof) { const c = mk(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); c.hr = src.hr; const im = g.getImageData(0, 0, c.width, c.height), d = im.data, W = hexRgb(wall), R = hexRgb(roof);
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 8) continue; const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), L = (mx + mn) / 510, sat = mx ? (mx - mn) / mx : 0; if (sat > .16) continue; let C = null, f = 0;
      if (L > .6) { C = W; f = L / .86; } else if (L > .26) { C = R; f = L / .5; } if (!C) continue; d[i] = Math.min(255, C[0] * f); d[i + 1] = Math.min(255, C[1] * f); d[i + 2] = Math.min(255, C[2] * f); }
    g.putImageData(im, 0, 0); return c; }
  function hexRgb(h) { const n = parseInt(String(h).slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function homeSpr(o) { const h = o.home, key = h.shape + '|' + h.mat + '|' + h.wall + '|' + h.roof + '|' + artVer; if (HOMEC[key]) return HOMEC[key]; const rc = AD && AD.homes && AD.homes[h.mat * 10 + h.shape]; let s = null;
    if (rc) { if (!IMG['hm.webp']) img('hm.webp'); const a = artRect('hm.webp', rc); if (a) { const c = tintHome(a.c, h.wall, h.roof), k = Math.min(1, (o.w + .7) * T / lw(c)); s = { c, k, ax: (lw(c) * k - o.w * T) / 2, ay: lh(c) * k - 3 }; } }
    if (!s) s = building(o.w, o.h, { wall: h.wall, roof: h.roof }, 7 + h.shape * 31 + h.mat, null, '-');
    return HOMEC[key] = s; }
  function homeFits(x, y, w, h) { const m = world; if (!m) return 'nomap'; if (map !== world) return 'inside';
    for (let r = 1; r <= 8; r++) if (Math.hypot(x + w / 2 - TOWN[r][0], y + h / 2 - TOWN[r][1]) < 26) return 'town';
    for (let yy = y - 1; yy <= y + h + 1; yy++) for (let xx = x - 1; xx <= x + w; xx++) { if (xx < 2 || yy < 2 || xx >= m.w - 2 || yy >= m.h - 2) return 'edge'; const i = yy * m.w + xx; if (m.solid[i] || m.keep[i] || m.t[i] > 1 || m.occ.has(i)) return 'ground'; if (P && P.x === xx && P.y === yy) return 'you'; }
    for (const b of m.blds) if (x < b.x + b.w + 2 && x + w + 2 > b.x && y < b.y + b.h + 2 && y + h + 2 > b.y) return 'ground';
    const dx = x + (w >> 1), dy = y + h; if (!P) return null; const solid0 = m.solid.slice(); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) m.solid[yy * m.w + xx] = 1; const seen = reach(m, P.x, P.y); m.solid.set(solid0); return seen[dy * m.w + dx] ? null : 'path'; }
  function addHome(h) { const m = world; if (!m || m.blds.some(b => b.home && b.home.id === h.id)) return; const { x, y, w, h: hh } = h; for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + w; xx++) m.solid[yy * m.w + xx] = 1; const r = m.reg[y * m.w + x] || 1;
    const o = { x, y, w, h: hh, slot: 'home', home: h, r, by: (y + hh) * T - 1 }; m.blds.push(o); m.lights.push({ x: x + w / 2, y: y + hh - .6, r: 22, c: 1 });
    const s = homeSpr(o), ext = Math.max(0, Math.floor(lh(s.c) * (s.k || 1) / T - hh - .9)); o.ext = []; for (let yy = y - 1; yy >= y - ext; yy--) for (let xx = x; xx < x + w; xx++) { if (yy < 1) continue; const i = yy * m.w + xx; if (m.solid[i] || m.occ.has(i)) continue; m.solid[i] = 1; o.ext.push(i); }
    addEnt(m, { kind: 'myhome', x: x + (w >> 1), y: y + hh, r, hid: h.id, name: h.name || 'Your home', sub: 'Your house', solid: 0, ok: h.pad ? 'pi_tpad' : null });
    if (m.seen) { const sn = reach(m, x + (w >> 1), y + hh); for (let i = 0; i < sn.length; i++) if (sn[i]) m.seen[i] = 1; } }
  function dropHome(id) { const m = world; if (!m) return; const k = m.blds.findIndex(b => b.home && b.home.id === id); if (k < 0) return; const o = m.blds[k]; for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) m.solid[yy * m.w + xx] = 0; for (const i of o.ext || []) m.solid[i] = 0; m.blds.splice(k, 1); m.ents = m.ents.filter(e => !(e.kind === 'myhome' && e.hid === id)); }
  function clearHomes() { if (!world) return; for (const b of world.blds.filter(b => b.home)) dropHome(b.home.id); }
  function homeDoor(id) { const o = world && world.blds.find(b => b.home && b.home.id === id); return o ? [o.x + (o.w >> 1), o.y + o.h + 1] : null; }
  let GHOST = null;
  function ghost(o) { GHOST = o; if (o && P && o.x == null) { o.x = P.x - (o.w >> 1); o.y = P.y - o.h - 2; } if (o) o.why = homeFits(o.x, o.y, o.w, o.h); return o; }
  // Tamsin, who walks you through your first day: she waits at the next place you need to go
  let GUIDE = null;
  function guidePut(x, y, o) { const m = world; if (!m) return null; const free = (a, b) => a > 1 && b > 1 && a < m.w - 2 && b < m.h - 2 && !m.solid[b * m.w + a] && m.t[b * m.w + a] !== 4 && !m.occ.has(b * m.w + a);
    let at = null; for (let d = 0; d < 6 && !at; d++) for (let dy = -d; dy <= d && !at; dy++) for (let dx = -d; dx <= d; dx++) if ((Math.abs(dx) === d || Math.abs(dy) === d) && free(x + dx, y + dy) && !(P && P.x === x + dx && P.y === y + dy)) { at = [x + dx, y + dy]; break; }
    if (!at) return GUIDE; if (!GUIDE || !m.ents.includes(GUIDE)) { GUIDE = addEnt(m, Object.assign({ kind: 'guide', solid: 0, x: at[0], y: at[1], r: 1, name: 'Tamsin', sub: 'Deckhand, the Marigold', ak: AD && AD.chars.country ? AD.chars.country.fisher2 : null, pt: AD && AD.faces ? AD.faces.fisher : undefined }, o || {})); GUIDE.spr = folkSprite(GUIDE.ak, 'Tamsin', { hat: '#2e3a4a', top: '#3a5a6a' }); return GUIDE; }
    const k = GUIDE.y * m.w + GUIDE.x; if (m.occ.get(k) === GUIDE) m.occ.delete(k); GUIDE.x = at[0]; GUIDE.y = at[1]; GUIDE.fx = at[0]; GUIDE.fy = at[1]; GUIDE.tx = null; return GUIDE; }
  function guideStep(dt) {
    if (!GUIDE || map !== world || locked || !host.guideActive || !host.guideActive()) return;
    const e = GUIDE, d = Math.hypot(e.fx-P.fx,e.fy-P.fy);
    if (P.target === e && e.tx == null) { e.walk=0; return; }
    if (d < 1.8 && e.tx == null) { e.walk=0; return; }
    e.repath = (e.repath || 0) - dt;
    if (e.tx == null && e.repath <= 0) {
      e.repath=.35;
      const path = Companion.route([e.x,e.y],[P.x,P.y],(x,y)=>!blocked(x,y,e));
      if (path.length) { const p=path[0];e.dir=dirOf(p[0]-e.x,p[1]-e.y);e.tx=p[0];e.ty=p[1]; }
    }
    if (e.tx != null) {
      if (blocked(e.tx,e.ty,e)) {e.tx=null;return;}
      const dx=e.tx-e.fx,dy=e.ty-e.fy,n=Math.hypot(dx,dy),speed=(d>4?5.4:2.5)*dt;
      e.walk=(e.walk||0)+dt*9;
      if(n<=speed){e.fx=e.x=e.tx;e.fy=e.y=e.ty;e.tx=null;e.repath=0;}
      else{e.fx+=dx/n*speed;e.fy+=dy/n*speed;}
    }
  }
  function guideOff() { const m = world; if (!m || !GUIDE) return; const k = GUIDE.y * m.w + GUIDE.x; if (m.occ.get(k) === GUIDE) m.occ.delete(k); const i = m.ents.indexOf(GUIDE); if (i >= 0) m.ents.splice(i, 1); GUIDE = null; }
  function remains(x, y, loot, secs, name) { if (!map) return null; const e = { kind: 'corpse', x, y, fx: x, fy: y, r: map.dungeon ? map.r : (map.reg[y * map.w + x] || 1), dead: 1, mine: 1, name: name || 'Your body', sub: 'What you were carrying', loot, decay: secs, spr: heroArt(), solid: 0 }; map.ents.push(e); return e; }
  function corpse(e, loot) { if (!map || !e) return; slashes.push({ x: e.x, y: e.y, t: 0, row: 3, f: 1, d: .55, rise: .3 }); { const o = e.y * map.w + e.x; if (map.occ.get(o) === e) map.occ.delete(o); } e.solid = 0; e.kind = 'corpse'; e.dead = 1; e.wander = 0; e.busy = 0; e.alert = 0; e.agg = 0; e.hunt = 0; e.tx = null; e.fx = e.x; e.fy = e.y; e.loot = loot; e.decay = 300; e.sub = 'Body'; e.name += ', dead'; e.flash = 0; e.ax = e.ay = 0; if (e.terr) (map.respawn = map.respawn || []).push({ t: respT(e.terr), node: false, terr: e.terr }); }
  function refresh() { if (!map) return; if(map.dungeonFloor && host.dungeonState)dungeonApply(map,host.dungeonState()); if (P) P.spr = heroArt(); for (const e of map.ents) if (e.kind === 'cache' && e.ok === 'chest' && host.cacheOpen(e.cid)) { e.ok = 'chestopen'; e.obj = null; e.sv = -1; } const c = map.ents.find(e => e.kind === 'chest'); if (c && host.chestOpen()) { c.ok = 'chestopen'; c.obj = spr('chestopen', c.r); c.sub = 'Open'; } }
  function resume() { size(); if (!map || running) { if (map) draw(); return; } running = true; last = performance.now(); if (!raf) raf = requestAnimationFrame(loop); }
  function pause() { running = false; if (P) P.keys = null; }
  function act() { if (near && P && !locked) { P.target = near; P.tries = 0; P.path = nextTo(near) ? [] : pathTo(near.x, near.y, true); if (!P.path.length) arrive(); } }
  function portrait(e) { if (AD && e.pt) return 'art/p/' + e.pt + '.webp'; if (e.spr && e.spr.big) return 'art/f/' + e.spr.big + '.webp'; if (e.ok && !e.obj) e.obj = spr(e.ok, e.r); const s = e.obj ? e.obj.c : (e.spr.f || e.spr)[0], k = 4; if (s.hr) { try { return s.toDataURL(); } catch (x) { return ''; } } const c = mk(s.width * k, s.height * k), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(s, 0, 0, c.width, c.height); return c.toDataURL(); }
  const backdrop = (r, dun) => AD ? 'art/bg/I' + String(dun ? 8 + r : r).padStart(2, '0') + '.jpg' : '';
  // fights are played on the map: the host asks for lunges, hits and health bars
  const who = a => a === 'me' ? P : a;
  const emit = (name, detail) => { if (host && host.sound) host.sound(name, detail); };
  const FLIGHT = .26;
  function advanceEffects(dt) {
    for (const f of floats) f.t += dt; floats = floats.filter(f => f.t < 1);
    for (const s of slashes) s.t += dt; slashes = slashes.filter(s => s.t < (s.d || .2));
    for (const s of shots) s.t += dt;
    shots = shots.filter(s => {
      if (s.t < FLIGHT) return true;
      const miss = s.impact && (String(s.impact.txt) === 'miss' || String(s.impact.txt) === '0');
      if (s.style) slashes.push({ x: s.tx, y: s.ty, t: 0, style: s.style, phase: miss ? 'fizzle' : 'impact', d: .36 });
      if (s.impact) landHit(s.impact.b, s.impact.txt, s.impact.col, s.style);
      return false;
    });
  }
  function landHit(b, txt, col, style) {
    const B = who(b); if (!B) return; const text = String(txt), healing = text[0] === '+', miss = text === 'miss' || text === '0';
    if (!healing) emit(miss ? 'miss' : style ? 'spellHit' : b === 'me' ? 'hurt' : 'hit', style);
    if (!miss && !healing) {
      B.flash = .16; if (!style) slashes.push(b === 'me' ? { x: B.fx, y: B.fy, t: 0, row: 3, f: 2, d: .3 } : { x: B.fx, y: B.fy, t: 0, row: 1 });
      anims.push({ t: 0, d: .16, f: u => { B.ax = Math.sin(u * Math.PI * 3) * .07; }, end: () => { B.ax = 0; } });
    }
    floats.push({ e: b, txt: text, col: col || '#fff', t: 0, dx: (Math.random() - .5) * 26 });
  }
  const FX = {
    heal() { if (map && P) { emit('heal'); slashes.push({ x: P.fx, y: P.fy - .5, t: 0, row: 3, f: 0, d: .9, rise: .8 }); } }, treasure(x, y) { if (map) { emit('coins'); slashes.push({ x, y: y - .4, t: 0, row: 3, f: 3, d: .8, rise: .6 }); } },
    lock(v) { locked = !!v; hold = null; if (P) { P.path = []; P.target = null; P.keys = null; } }, inset(px) { inset = px || 0; }, bars(b) { bars = b || []; },
    face(e) { const dx = e.x - P.x, dy = e.y - P.y; P.dg = null; P.d8 = D8(Math.sign(dx), Math.sign(dy)); P.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 's' : 'l') : (dy > 0 ? 'f' : 'b'); e.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'l' : 's') : (dy > 0 ? 'b' : 'f'); e.busy = 1; e.tx = null; e.fx = e.x; e.fy = e.y; },
    free(e) { if (e) e.busy = 0; },
    swing(a, b, kind, style) {
      const A = who(a), B = who(b); if (!A || !B) return; if (a === 'me') P.atk = .3;
      const dx = B.fx - A.fx, dy = B.fy - A.fy, d = Math.hypot(dx, dy) || 1;
      if (kind === 'spell') {
        if (a !== 'me') emit('creature', Effects.creature(A.name));
        style = style || Effects.spell(1); emit('cast', style);
        slashes.push({ x: A.fx, y: A.fy, t: 0, style, phase: 'cast', d: FLIGHT });
        shots.push({ x: A.fx, y: A.fy, tx: B.fx, ty: B.fy, target: b, style, t: 0 }); return;
      }
      emit(a !== 'me' ? 'creature' : kind === 'fencing' ? 'thrust' : kind === 'archery' ? 'bow' : 'swing', a !== 'me' ? Effects.creature(A.name) : null);
      if (kind === 'archery') { shots.push({ x: A.fx, y: A.fy, tx: B.fx, ty: B.fy, target: b, t: 0 }); return; }
      anims.push({ t: 0, d: .2, f: u => { const s = Math.sin(u * Math.PI) * .45; A.ax = dx / d * s; A.ay = dy / d * s; }, end: () => { A.ax = A.ay = 0; } }); slashes.push({ x: B.fx, y: B.fy, t: 0, flip: dx < 0 });
    },
    hit(b, txt, col) { const s = shots.find(s => s.target === b && !s.impact); if (s && String(txt)[0] !== '+') s.impact = { b, txt, col }; else landHit(b, txt, col); }
  };
  function musicContext() {
    if (!map || !P) return null;
    if (map.hall) return { region: map.r, town: true, venue: 'dojo' };
    if (map.dungeon) return { region: map.r, dun: map.r };
    const r = map.reg[P.y * map.w + P.x] || curReg || 1, t = TOWN[r];
    const room = map.blds.find(b => b.enter && P.x >= b.x && P.x < b.x + b.w && P.y >= b.y && P.y < b.y + b.h);
    return { region: r, town: P.x >= t[0] - 26 && P.x <= t[0] + 26 && P.y >= t[1] - 21 && P.y <= t[1] + 17,
      venue: room && room.slot === 'tavern' ? 'tavern' : null };
  }
  return { preload, init, load, clearRemains: () => { if(world)world.ents=world.ents.filter(e=>!e.mine);if(map && map!==world)map.ents=map.ents.filter(e=>!e.mine); }, remains, emptied, musicContext, chase: (e, secs) => { if (e) { e.chase = secs; e.wait = 1.3; e.calm = 0; e.alert = 8; e.busy = 0; } }, inDungeonMap: () => !!(map && map.dungeon), mapRegion: () => map ? (map.dungeon ? map.r : 0) : 0, enterDungeon, dungeonRefresh: p => { if(map && map.dungeonFloor)dungeonApply(map,p); }, backdrop, kill, corpse, refresh, resume, pause, portrait, act, FX, towns: () => TOWN, terr: () => world ? world.terr : [], sites: () => world ? world.sites : [], spots: () => world ? world.spots : {}, mini: () => world && world.mini, size: [WW, WH],
    traveling: () => !!(P && P.path.length),
    pos: () => P ? [P.x, P.y] : null, inDungeon: () => !!(map && map.dungeon), region: () => curReg, bossPortrait: r => portrait({ spr: bossSprite(r) }), find: f => map ? map.ents.find(f) : null, showBlocked: v => { SHOWB = !!v; }, homeFits, addHome, dropHome, clearHomes, homeDoor, ghost, ghostNow: () => GHOST, homeSpr, debug: () => ({ map, P, world, cam, zoom, spr, CS, TS, GCL, gpat, gclass, bldSpr, effects: { shots, slashes, floats }, advanceEffects, draw }),
    warp(x, y) { load([x, y]); }, hop(x, y) { go(map, x, y); }, guidePut, guideOff, guideEnt: () => GUIDE, drawDoll, dollKey: () => artVer, enterHall, inHall: () => map && map.hall ? map.r : 0, hallAdd: o => map ? addEnt(map, Object.assign({ r: map.r }, o)) : null, hallMove: (e, x, y) => { if (!map || !e) return; const k = e.y * map.w + e.x; if (map.occ.get(k) === e) map.occ.delete(k); e.x = e.fx = x; e.y = e.fy = y; e.tx = null; map.occ.set(y * map.w + x, e); }, ents: () => map ? map.ents : [], fsReady: () => !!(AD && AD.dojo && (IMG['dj/fs.webp'] || img('dj/fs.webp')) && have('dj/fs.webp')) };
})();

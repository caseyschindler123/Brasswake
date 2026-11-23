  /* Surface architecture and harbours. Geometry is shared by movement, roofs and room art. */
  const WORLD_SURFACE = ['', 'quay', 'pier', 'plaza', 'black_sand', 'shingle', 'tidal'];
  const WORLD_BUILDING_CACHE = BuildingCache.create(32 * 1024 * 1024);
  function worldPiece(key) {
    const a = typeof WorldArt !== 'undefined' && WorldArt.at[key];
    if (!a) return null;
    if (!IMG[a.f]) img(a.f);
    return have(a.f) ? cut(a.f, ...a.r) : null;
  }
  function worldProp(kind) {
    const c = worldPiece(kind);
    return c ? { c, ax: lw(c) / 2, ay: lh(c) } : null;
  }
  function buildingContains(o, x, y, roofOnly = true) {
    return o.modular ? Buildings.contains(o.plan, Math.floor(x - o.x), Math.floor(y - o.y), roofOnly)
      : x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h;
  }
  function worldBuilding(m, o, options = {}) {
    const closed = !!options.closed, shape = options.shape || 'rect';
    o.modular = true;
    o.plan = Buildings.compile({ id: options.id || 'building-' + o.r + '-' + o.x + '-' + o.y,
      x: o.x, y: o.y, w: o.w, h: o.h, shape,
      doors: closed ? [] : options.doors || ['south'] });
    o.name = options.name || o.name || o.slot;
    o.landmark = options.landmark || null;
    o.enter = closed ? 0 : 1;
    o.fa = 1;
    o.furniture = [];
    const room = ROOMS[o.slot], desired = room ? room.keep : [Math.max(1, o.w - 3), 1];
    let keeper = null;
    for (let radius = 0; radius < Math.max(o.w, o.h) && !keeper; radius++) {
      for (let y = 1; y < o.h - 1 && !keeper; y++) for (let x = 1; x < o.w - 1; x++) {
        if (Math.abs(x - desired[0]) + Math.abs(y - desired[1]) === radius && Buildings.walkable(o.plan, x, y)) { keeper = [x, y]; break; }
      }
    }
    o.room = { fl: o.r === 8 || o.slot === 'bank' ? 'flag' : 'floor', keep: keeper || [1, 1],
      door: o.plan.doors.length ? o.plan.doors[0].x : Math.floor(o.w / 2), fur: [] };
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
      const i = (o.y + y) * m.w + o.x + x, tile = o.plan.tiles[y * o.w + x];
      m.keep[i] = 1; m.o[i] = 0; m.b[i] = o.r; m.reg[i] = o.r;
      m.t[i] = tile === Buildings.COURT ? 0 : 3;
      m.solid[i] = tile === Buildings.WALL || (closed && tile !== Buildings.VOID) ? 1 : 0;
    }
    const add = (p, x, y) => {
      if (!Buildings.walkable(o.plan, Math.floor(x), Math.floor(y))) return;
      o.furniture.push({ p: 'f' + o.r + '_' + p, x, y });
    };
    if (room) for (const f of room.fur) add(f.p, f.x, f.y);
    else {
      add(o.slot === 'warehouse' ? 'kegs' : 'shelf', 1.5, 1);
      add(o.slot === 'house' || o.slot === 'cottage' ? 'bed' : 'counter', o.w - 2.5, 1);
      if (o.w >= 8 && o.h >= 7) { add('rtable', 2.5, o.h - 3); add('stool', 3.5, o.h - 3); }
      if (shape === 'courtyard') add('bench', 2, Math.floor(o.h / 2));
    }
    return o;
  }
  function worldView(o) {
    return WORLD_BUILDING_CACHE.get(o, artVer, () => BuildingView.create(o.plan, { piece: worldPiece, r: o.r,
        roofFamily: o.r === 2 || o.r === 4 ? 3 : o.r === 5 || o.r === 8 ? 4 : o.r === 6 || o.r === 7 ? 2 : 1,
        furniture: o.furniture }));
  }
  function worldBuildingFloor(o, g, ox0, oy0, dt) {
    if (o.enter) roomFade(o, dt);
    const v = worldView(o);
    g.drawImage(v.floor, o.x * T - ox0, o.y * T - oy0, o.w * T, o.h * T);
  }
  function worldBuildingLayers(o, list) {
    const v = worldView(o), inside = o.inside, bx = o.x * T, by = o.y * T;
    for (const a of v.walls.concat(v.furniture)) {
      list.push([by + a.sortY, a.image, bx + a.x, by + a.y, false, 1, 0,
        inside && a.front ? .16 : 1]);
    }
    const art = o.landmark && worldPiece(o.landmark);
    if (art) {
      const scale = o.w * T / lw(art);
      list.push([o.by + 1, art, bx, o.by - lh(art) * scale, false, scale, 0, o.fa]);
    } else if (o.fa > 0) list.push([o.by + 1, v.roof, bx, by - v.wallHeight, false, 1, 0, o.fa]);
  }
  function worldHeroSort(by) {
    if (map !== world || !P) return by;
    const court = world.blds.find(o => o.modular && o.plan.shape === 'courtyard'
      && buildingContains(o, P.x, P.y, false) && !buildingContains(o, P.x, P.y));
    return court ? Math.max(by, court.by + 2) : by;
  }
  function worldPaintSurface(m, g, x0, y0) {
    if (!m.surface) return;
    for (let y = y0; y < Math.min(m.h, y0 + CS); y++) for (let x = x0; x < Math.min(m.w, x0 + CS); x++) {
      const key = WORLD_SURFACE[m.surface[y * m.w + x]], image = key && worldPiece(key);
      if (!image) continue;
      const sx = x * TS % image.width, sy = y * TS % image.height;
      for (let yy = 0; yy < TS;) {
        const sh = Math.min(TS - yy, image.height - (sy + yy) % image.height);
        for (let xx = 0; xx < TS;) {
          const sw = Math.min(TS - xx, image.width - (sx + xx) % image.width);
          g.drawImage(image, (sx + xx) % image.width, (sy + yy) % image.height, sw, sh,
            x * TS + xx, y * TS + yy, sw, sh); xx += sw;
        }
        yy += sh;
      }
    }
    const edge = worldPiece('pier_edge');
    if (edge) for (let y = y0; y < Math.min(m.h - 1, y0 + CS); y++) for (let x = x0; x < Math.min(m.w, x0 + CS); x++) {
      if (m.surface[y * m.w + x] !== 2 || m.t[(y + 1) * m.w + x] !== 4) continue;
      const sx = x * TS % edge.width;
      const first = Math.min(TS, edge.width - sx);
      g.drawImage(edge, sx, 0, first, edge.height, x * TS, (y + 1) * TS - 8, first, edge.height);
      if (first < TS) g.drawImage(edge, 0, 0, TS - first, edge.height, x * TS + first, (y + 1) * TS - 8, TS - first, edge.height);
    }
  }
  function worldStamp(m, x0, y0, x1, y1, r, tile, surface = 0) {
    for (let y = Math.max(0, y0); y <= Math.min(m.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(m.w - 1, x1); x++) {
      const i = y * m.w + x; m.t[i] = tile; m.b[i] = tile === 4 ? 0 : r;
      m.reg[i] = r; m.solid[i] = tile === 4 ? 1 : 0; m.o[i] = 0;
      m.keep[i] = 1; m.surface[i] = surface;
    }
  }
  function worldPrepareGround(m) {
    m.surface = new Uint8Array(m.w * m.h);
    for (let i = 0; i < m.t.length; i++) if (m.t[i] === 5) {
      if (m.reg[i] === 5) m.surface[i] = 4;
      else if (m.reg[i] === 6 || m.reg[i] === 7) m.surface[i] = 5;
    }
    m.districts = [];
    for (let r = 1; r <= 8; r++) {
      const a = Geography.city(r);
      worldStamp(m, ...a.slice(0, 2), ...a.slice(2), r, r === 8 ? 3 : 0, r === 8 ? 3 : 0);
    }
    // A real working basin west of Tallyport, connected to the open sea.
    worldStamp(m, 210, 908, 291, 984, 1, 4);
    worldStamp(m, 292, 908, 299, 984, 1, 3, 1);
    for (const y of [931, 950, 972]) worldStamp(m, 238, y, 294, y + 2, 1, 6, 2);
    // A broad cargo apron gives the new arrival room to walk and run on a phone.
    worldStamp(m, 278, 931, 294, 941, 1, 6, 2);
    worldStamp(m, 299, 929, 320, 932, 1, 2);
    m.spots.dock = [288, 931];
    m.spots.pierfish = [237, 932];
    m.districts.push({ name: 'Tallyport Harbour', r: 1, box: [238, 908, 302, 985] });
    // Aldermoot's port lies below its western city wall, with a public approach.
    worldStamp(m, 194, 270, 244, 315, 8, 4);
    worldStamp(m, 245, 264, 253, 315, 8, 3, 1);
    for (const y of [276, 295, 311]) worldStamp(m, 208, y, 249, y + 2, 8, 6, 2);
    worldStamp(m, 250, 247, 253, 270, 8, 3, 3);
  }
  function worldRoad(m, a, b, rect) {
    const n = m.w * m.h;
    if (!m.roadScratch) m.roadScratch = { prev: new Int32Array(n), queue: new Int32Array(n) };
    const { prev, queue } = m.roadScratch; prev.fill(0);
    const sx = Math.round(a[0]), sy = Math.round(a[1]), tx = Math.round(b[0]), ty = Math.round(b[1]);
    const start = sy * m.w + sx, goal = ty * m.w + tx, mass = Geography.landmass(sx, sy);
    if (!mass || mass !== Geography.landmass(tx, ty)) return false;
    let head = 0, tail = 0; queue[tail++] = start; prev[start] = -1;
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    while (head < tail && !prev[goal]) {
      const at = queue[head++], x = at % m.w, y = Math.floor(at / m.w);
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy, i = ny * m.w + nx;
        if (nx < 2 || ny < 2 || nx >= m.w - 2 || ny >= m.h - 2 || prev[i]
          || Geography.landmass(nx, ny) !== mass || (m.solid[i] && m.keep[i] && !m.o[i] && i !== goal)) continue;
        prev[i] = at + 1; queue[tail++] = i;
      }
    }
    if (!prev[goal]) return false;
    for (let at = goal; at !== start;) {
      const x = at % m.w, y = Math.floor(at / m.w);
      rect(x, y, x, y, 2, 1);
      if (Geography.landmass(x + 1, y) === mass && !m.solid[at + 1]) rect(x + 1, y, x + 1, y, 2, 0);
      at = prev[at] - 1;
    }
    rect(sx, sy, sx, sy, 2, 1);
    return true;
  }
  function worldReach(m) {
    const result = reach(m, TOWN[1][0], TOWN[1][1] + 3);
    for (const r of [2, 5]) {
      const island = reach(m, TOWN[r][0], TOWN[r][1] + 3);
      for (let i = 0; i < result.length; i++) result[i] |= island[i];
    }
    return result;
  }
  function worldGrownBuilding(m, x, y, w, h, slot, r, options = {}) {
    if (x < 2 || y < 2 || x + w >= m.w - 2 || y + h >= m.h - 2) return null;
    if (m.blds.some(b => x < b.x + b.w + 2 && x + w + 2 > b.x && y < b.y + b.h + 2 && y + h + 2 > b.y)) return null;
    if (m.ents.some(e => e.x >= x - 1 && e.x <= x + w && e.y >= y - 1 && e.y <= y + h)) return null;
    const o = { x, y, w, h, slot, r, by: (y + h) * T - 1 };
    worldBuilding(m, o, options); m.blds.push(o);
    return o;
  }
  function worldGrowCapital(m, EE, put, lamp) {
    const [cx, cy] = TOWN[8], r = 8;
    const districts = [
      ['Council Terrace', [-24, -64, 26, -29]], ['Temple & Gardens', [27, -64, 79, -29]],
      ['Grand Market', [-27, -27, 27, 23]], ['Merchants’ Quarter', [-79, -64, -29, 5]],
      ['Harbour', [-136, 64, -76, 115]], ['Residential Wards', [-79, 24, 79, 64]]
    ];
    for (const [name, a] of districts) m.districts.push({ name, r, box: [cx + a[0], cy + a[1], cx + a[2], cy + a[3]] });
    const stamp = (x0, y0, x1, y1, tile = 3) => worldStamp(m, cx + x0, cy + y0, cx + x1, cy + y1, r, tile, tile === 3 ? 3 : 0);
    for (const x of [-76, -31, -1, 29, 76]) stamp(x, -63, x + 2, 63);
    for (const y of [-61, -29, 21, 61]) stamp(-77, y, 77, y + 2);
    const palace = worldGrownBuilding(m, cx - 17, cy - 57, 32, 17, 'palace', r,
      { name: 'Council Palace', landmark: 'land_palace', doors: ['south', 'east'] });
    if (palace) m.spots.palace = [palace.x + palace.plan.doors[0].outside.x, palace.y + palace.plan.doors[0].outside.y];
    worldGrownBuilding(m, cx + 43, cy - 55, 21, 16, 'temple', r,
      { name: 'Temple & Gardens', landmark: 'land_temple', doors: ['south', 'west'] });
    worldGrownBuilding(m, cx - 23, cy + 30, 17, 15, 'inn', r,
      { name: 'The Capital Inn', shape: 'courtyard', doors: ['south', 'east'] });
    worldGrownBuilding(m, cx - 68, cy + 30, 16, 12, 'warehouse', r,
      { name: 'Merchants’ Warehouse', shape: 'L', doors: ['south', 'west'] });
    let serial = 0;
    const rows = [-55, -42, -16, 4, 29, 48], cols = [-70, -55, -40, -23, -7, 10, 33, 49, 64];
    for (const dy of rows) for (const dx of cols) {
      if (dx > -29 && dx < 29 && dy > -28 && dy < 24) continue;
      const w = 8 + (serial % 3), h = 8 + (serial % 2), shape = serial % 5 === 0 ? 'L' : 'rect';
      const o = worldGrownBuilding(m, cx + dx, cy + dy, w, h, serial % 4 === 0 ? 'shop' : 'house', r,
        { name: serial % 4 === 0 ? 'City Workshop' : 'Aldermoot Townhouse', shape,
          doors: serial % 3 === 0 ? ['south', 'west'] : ['south'] });
      if (o) serial++;
    }
    // A second line of narrow houses makes blocks, rather than isolated buildings in a field.
    for (let y = cy - 55; y < cy + 56 && m.blds.filter(b => b.r === 8).length < 68; y += 11) {
      for (let x = cx - 69; x < cx + 70; x += 12) {
        if (Math.abs(x - cx) < 29 && y > cy - 28 && y < cy + 24) continue;
        worldGrownBuilding(m, x, y, 7, 7, 'house', r, { name: 'Aldermoot Townhouse', doors: ['south'] });
      }
    }
    // Fill a few remaining parcels with narrow houses while retaining the main avenues.
    let cityCount = m.blds.filter(b => b.r === 8).length;
    for (let y = cy - 58; y < cy + 57 && cityCount < 64; y++) for (let x = cx - 73; x < cx + 70 && cityCount < 64; x++) {
      const w = cityCount % 2 ? 5 : 6, h = cityCount % 2 ? 6 : 5;
      if ([-76,-31,-1,29,76].some(dx => x <= cx + dx + 3 && x + w >= cx + dx - 1)
        || [-61,-29,21,61].some(dy => y <= cy + dy + 3 && y + h >= cy + dy - 1)) continue;
      if (worldGrownBuilding(m, x, y, w, h, 'house', r,
        { name: 'Aldermoot Townhouse', doors: cityCount % 2 ? ['south'] : ['south','east'] })) cityCount++;
    }
    // The wall remains a physical boundary; all road and harbour gates are actual gaps.
    const gate = (x, y) => Math.abs(x - cx) <= 3 || Math.abs(y - cy) <= 3
      || (x <= cx - 78 && Math.abs(y - (cy + 49)) <= 3);
    for (let y = cy - 65; y <= cy + 65; y++) for (let x = cx - 80; x <= cx + 80; x++) {
      if (x !== cx - 80 && x !== cx + 80 && y !== cy - 65 && y !== cy + 65) continue;
      if (gate(x, y)) continue;
      const i = y * m.w + x; m.t[i] = 8; m.solid[i] = 1; m.keep[i] = 1; m.surface[i] = 0;
    }
    for (const [dx, dy] of [[-79, -64], [78, -64], [-79, 64], [78, 64]]) put(cx + dx, cy + dy, 'pillar', r);
    put(cx, cy + 65, 'land_gate', r, { solid: 0, sc: .85 });
    // The temple opens onto a small planted court between the built street blocks.
    const clear = (x, y) => !m.solid[y * m.w + x] && !m.occ.has(y * m.w + x)
      && !m.blds.some(b => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h);
    for (let y = cy - 37; y <= cy - 30; y++) for (let x = cx + 38; x <= cx + 70; x++) {
      if (!clear(x, y) || y === cy - 33) continue;
      worldStamp(m, x, y, x, y, r, 0);
    }
    for (let x = cx + 39; x <= cx + 69; x += 6) if (clear(x, cy - 35)) put(x, cy - 35, 'tree0', r);
    for (let y = cy - 59; y < cy + 60; y += 12) { lamp(cx - 3, y, r); lamp(cx + 4, y, r); }
    const roles = ['Weaponsmith', 'Armourer', 'Fletcher', 'Bookseller', 'Apothecary', 'Baker',
      'Fishmonger', 'Clothier', 'Carpenter', 'Stonemason', 'Jeweller', 'Provisioner'];
    m.specialists = [];
    for (let i = 0; i < roles.length; i++) {
      const x = cx - 22 + (i % 6) * 8, y = cy + (i < 6 ? 16 : 25);
      worldStamp(m, x - 1, y - 1, x + 2, y + 1, r, 3, 3);
      put(x, y - 1, 'market_' + i, r, { solid: 0, sc: .8 });
      const e = EE('specialist', x + 1, y + 1, r, { name: roles[i], sub: 'Grand Market', specialty: i,
        spr: folkSprite(AD && AD.chars.extra.stall, roles[i], { top: i % 2 ? '#334e75' : '#846b37' }) });
      m.specialists.push(e);
    }
    const pedestrians = ['Market visitor', 'City resident', 'Messenger', 'Merchant', 'Dockworker', 'City watch'];
    let residents = 0;
    for (let y = cy - 58; y < cy + 60; y += 9) for (const x of [cx - 30, cx + 30, cx + 1]) {
      if (!clear(x, y) || residents >= 36) continue;
      const name = pedestrians[residents % pedestrians.length];
      EE('folk', x, y, r, { name, sub: 'Aldermoot', wander: 2, t: (residents % 5) * .4,
        roam: [cx - 78, cy - 63, cx + 78, cy + 63],
        spr: folkSprite(AD && AD.chars.extra.stall, 'city-' + residents,
          { top: ['#404c68','#765a41','#597057','#74565c'][residents % 4], hat: '#4b4236' }) });
      residents++;
    }
  }
  function worldHarbourDecor(m, put, EE, road) {
    const prop = (x, y, key, r, scale = 1) => put(x, y, key, r, { solid: 0, sc: scale });
    prop(273, 930, 'ship_three', 1, 1.25); prop(262, 949, 'ship_cog', 1, 1.1);
    prop(282, 971, 'ship_ferry', 1, 1.1);
    prop(220, 275, 'ship_three', 8, 1.15); prop(225, 294, 'ship_cog', 8, 1.05);
    prop(239, 294, 'ship_ferry', 8, .8);
    prop(299, 911, 'land_lighthouse', 1, .9); prop(253, 265, 'land_lighthouse', 8, .85);
    for (const r of [1, 8]) {
      const x = r === 1 ? 294 : 250, y = r === 1 ? 914 : 269;
      for (let i = 0; i < 12; i++) prop(x + (i % 2) * 3, y + i * 5, 'dock_' + (i % 14), r, .7);
    }
    for (const [x, y, w, h, slot, options] of [
      [302, 953, 13, 9, 'warehouse', { name: 'Marigold Stores', shape: 'L', doors: ['south', 'west'] }],
      [302, 970, 12, 9, 'warehouse', { name: 'Harbour Warehouse', doors: ['south', 'west'] }],
      [277, 988, 11, 8, 'shop', { name: 'Harbour Office', doors: ['north', 'east'] }]
    ]) worldGrownBuilding(m, x, y, w, h, slot, 1, options);
    m.spots.marigold = [288, 931];
    EE('landmark', 292, 931, 1, { name: 'The Marigold', sub: 'Merchant ship', place: 'marigold', ok: 'sign' });
    for (const [i, x, y] of [[0, 291, 937], [1, 284, 938]]) EE('folk', x, y, 1, {
      name: i ? 'Dockworker' : 'Porter', sub: 'Harbour crew', wander: 3, t: 1 + i,
      roam: [279, 932, 293, 940], spr: folkSprite(AD && AD.chars.extra.stall, 'harbour-crew-' + i,
        { top: i ? '#5a675c' : '#725c42', hat: '#514833' }) });
    m.ferries = Geography.ferries.map(route => ({ id: route.id,
      from: { r: route.from.region, at: route.from.tile.slice() },
      to: { r: route.to.region, at: route.to.tile.slice() } }));
    m.ferries[0].from.at = [289, 973];
    m.ferries[3].to.at = [249, 296];
    for (const route of m.ferries) for (const [side, end] of [['from', route.from], ['to', route.to]]) {
      if ((end.r === 1 && route.id === 'tallyport-brackwater') || end.r === 8) {
        // These two landings are part of the authored working harbours.
      } else {
        const [x, y] = end.at; let best = null;
        for (let d = 1; d <= 18 && !best; d++) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (!Geography.land(x + dx * d, y + dy * d)) { best = [dx, dy, d]; break; }
        }
        if (!best) throw new Error('No water at ferry landing ' + route.id);
        const [dx, dy, distance] = best, length = distance + 5;
        for (let step = 0; step <= length; step++) worldStamp(m, x + dx * step, y + dy * step,
          x + dx * step + (dy ? 1 : 0), y + dy * step + (dx ? 1 : 0), end.r, 6, 2);
        end.at = [x + dx * (length - 1), y + dy * (length - 1)];
        const [tx, ty] = TOWN[end.r]; road([x, y], [tx, ty + 3]);
        const scale = .8, half = 6 * scale; let berth = null, score = Infinity;
        for (let by = end.at[1] - 8; by <= end.at[1] + 8; by++) for (let bx = end.at[0] - 18; bx <= end.at[0] + 18; bx++) {
          const left = Math.floor(bx + .5 - half), right = Math.ceil(bx + .5 + half) - 1;
          let water = true, alongside = false;
          for (let x = left; x <= right; x++) if (m.t[by * m.w + x] !== 4 || m.b[by * m.w + x] !== 0) { water = false; break; }
          if (!water) continue;
          for (let x = left - 1; x <= right + 1 && !alongside; x++) for (const y of [by - 1, by, by + 1])
            if (m.t[y * m.w + x] === 6) alongside = true;
          const distance = Math.abs(bx + half - end.at[0]) + 2 * Math.abs(by + 1 - end.at[1]);
          if (alongside && distance < score) { berth = [bx, by]; score = distance; }
        }
        if (!berth) throw new Error('No wet ferry berth at ' + route.id);
        prop(berth[0], berth[1], 'ship_ferry', end.r, scale);
      }
      worldStamp(m, end.at[0], end.at[1], end.at[0] + 1, end.at[1] + 1, end.r, 6, 2);
      EE('ferry', end.at[0], end.at[1], end.r, { name: 'Ferryman', sub: 'Free crossing', route: route.id, side,
        spr: folkSprite(AD && AD.chars.extra.tavern, 'ferry-' + route.id + side, { top: '#35546b', hat: '#494032' }) });
    }
    // Chart the crossing through actual open water; never draw a ferry across a headland.
    const n = m.w * m.h, previous = new Int32Array(n), queue = new Int32Array(n);
    const water = (x, y) => x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1
      && m.t[y * m.w + x] === 4 && m.b[y * m.w + x] === 0;
    const offshore = p => {
      for (let d = 1; d < 30; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++)
        if ((Math.abs(dx) === d || Math.abs(dy) === d) && water(p[0] + dx, p[1] + dy)) return [p[0] + dx, p[1] + dy];
      return null;
    };
    for (const route of m.ferries) {
      const a = offshore(route.from.at), b = offshore(route.to.at); if (!a || !b) continue;
      previous.fill(0); const start = a[1] * m.w + a[0], end = b[1] * m.w + b[0];
      let head = 0, tail = 0; queue[tail++] = start; previous[start] = -1;
      while (head < tail && !previous[end]) {
        const at = queue[head++], x = at % m.w, y = Math.floor(at / m.w);
        for (const [dx, dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
          const nx = x + dx, ny = y + dy, i = ny * m.w + nx;
          if (!water(nx, ny) || previous[i]) continue;
          previous[i] = at + 1; queue[tail++] = i;
        }
      }
      if (!previous[end]) throw new Error('No sea passage for ' + route.id);
      const points = [];
      for (let at = end; at !== start; at = previous[at] - 1) points.push([at % m.w, Math.floor(at / m.w)]);
      points.push(a); points.reverse();
      route.path = points.filter((p, i) => !i || i === points.length - 1
        || p[0] - points[i-1][0] !== points[i+1][0] - p[0] || p[1] - points[i-1][1] !== points[i+1][1] - p[1]);
    }
    m.spots.ferries = m.ferries;
  }

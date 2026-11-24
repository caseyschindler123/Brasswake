  /* Surface charts and physical navigation live inside Scene, alongside world generation. */
  const chartSteps = [[0, 1], [1, 0], [-1, 0], [0, -1]];
  const chartDry = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h
    && !m.solid[y * m.w + x] && m.t[y * m.w + x] !== 4;
  const chartOpen = (m, x, y) => chartDry(m, x, y) && !m.occ.has(y * m.w + x);
  const chartFerryId = (id, side) => 'ferry:' + id + ':' + side;

  function cartographyShops(m) {
    for (let r = 1; r <= 8; r++) {
      const [cx, cy] = TOWN[r], w = 8, h = 7;
      let shop = null;
      // The capital has occupied every large parcel. One of its unstaffed workshops
      // becomes the public map room, keeping the original footprint and its doors.
      if (r === 8) shop = m.blds.filter(b => b.r === r && b.name === 'City Workshop' && b.plan.shape === 'rect' && b.w >= w && b.h >= h
        && !m.ents.some(e => buildingContains(b, e.x, e.y, false)))
        .sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
      if (!shop) {
        const lots = [];
        for (let y = cy - 42; y <= cy + 38; y++) for (let x = cx - 42; x <= cx + 38; x++) {
          const entry = (y + h) * m.w + x + (w >> 1);
          if (!m.seen[entry] || !chartOpen(m, x + (w >> 1), y + h)) continue;
          let clear = true;
          for (let yy = y - 1; yy <= y + h && clear; yy++) for (let xx = x - 1; xx <= x + w; xx++) {
            const i = yy * m.w + xx;
            if (m.reg[i] !== r || (m.solid[i] ? !m.o[i] : !m.seen[i]) || m.t[i] > 1 ||
              (m.keep[i] && !Geography.inTown(xx, yy, 4))) { clear = false; break; }
          }
          if (!clear) continue;
          const inTown = Geography.inTown(x, y) === r && Geography.inTown(x + w - 1, y + h - 1) === r;
          const score = Math.abs(x + (w >> 1) - cx) + Math.abs(y + h - cy) + (inTown ? 0 : 16);
          lots.push({ x, y, score });
        }
        lots.sort((a, b) => a.score - b.score);
        for (const lot of lots) {
          if (m.props.some(p => p.x >= lot.x - 1 && p.x <= lot.x + w && p.y >= lot.y - 1 && p.y <= lot.y + h)) continue;
          shop = worldGrownBuilding(m, lot.x, lot.y, w, h, 'cartographer', r);
          if (shop) break;
        }
      }
      if (!shop) throw new Error('No accessible map shop in ' + host.regionName(r));
      shop.name = host.regionName(r) + ' Map Room';
      shop.cartographer = true;
      // Starting stock varies with local work: nautical charts at the port, instruments in the mountains.
      const equipment = ['rolled_maps', 'desk_compass', 'ink_parchment', 'survey_instruments',
        'lantern', 'celestial_instrument', 'survey_instruments', 'atlas_case'];
      shop.furniture = [
        { p: 'scroll_rack', x: 1.65, y: 2.1 }, { p: 'chart_counter', x: 2.5, y: 4.4 },
        { p: 'map_cabinet', x: shop.w - 1.7, y: 2.1 }, { p: equipment[r - 1], x: 2.5, y: 3.95 },
        { p: 'mapmaker_stool', x: 1.6, y: 5.5 }, { p: 'chart_supply_' + r, x: shop.w - 1.7, y: 3.8 },
      ];
      const px = shop.x, py = shop.y;
      const entity = (kind, dx, dy, fields) => addEnt(m, { kind, r, x: px + dx, y: py + dy, ...fields });
      const ak = AD && AD.chars.extra.registrar;
      entity('cartographer', 4, 3, { ak, name: 'Cartographer', sub: shop.name,
        spr: folkSprite(ak, 'cartographer' + r, { apron: '#455e66' }) });
      entity('regionchart', 4, 1, { name: host.regionName(r) + ' wall chart', sub: 'Read the regional chart', ok: 'wall_chart_' + r });
      if (r === 8) entity('atlasdisplay', shop.w - 3, 4,
        { name: 'Grand Atlas of Brasswake', sub: 'Display copy', ok: 'grand_atlas', objectScale: .56 });
      const door = shop.plan.doors.find(d => d.side === 'south') || shop.plan.doors[0];
      const [dx, dy] = [px + door.outside.x, py + door.outside.y];
      m.props.push({ kind: 'compass_sign', r, x: dx - 1, y: dy, solid: 0 });
      m.keep[dy * m.w + dx] = 1;
      m.spots['cartographer' + r] = [dx, dy];
    }
  }

  // Flood using permanent collision. Roaming actors and respawning wilderness nodes
  // may move before the traveller arrives; actual route steps check live occupancy.
  function chartReachable(m) {
    const seen = new Uint8Array(m.w * m.h), queue = new Int32Array(seen.length);
    let head = 0, tail = 0;
    function visit(x, y) {
      const i = y * m.w + x;
      if (seen[i] || !chartDry(m, x, y)) return;
      const e = m.occ.get(i);
      if (e && !e.wander && !['mon', 'node', 'corpse', 'companion'].includes(e.kind)) return;
      seen[i] = 1; queue[tail++] = i;
    }
    for (const r of [1, 2, 5]) visit(TOWN[r][0], TOWN[r][1] + 3);
    while (head < tail) {
      const id = queue[head++], x = id % m.w, y = Math.floor(id / m.w);
      visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1);
    }
    return seen;
  }

  function cartographySetup(m) {
    const reachable = chartReachable(m);
    m.seen = worldReach(m);
    const destinations = [], named = new Map();
    const accessible = (x, y) => chartOpen(m, x, y) && !!reachable[y * m.w + x];
    function nearest(x, y, radius, predicate) {
      for (let d = 0; d <= radius; d++) for (let dy = -d; dy <= d; dy++) {
        const dx = d - Math.abs(dy);
        for (const xx of dx ? [x - dx, x + dx] : [x]) if (predicate(xx, y + dy)) return [xx, y + dy];
      }
      return null;
    }
    function destination(id, r, kind, name, site, at, published = true) {
      if (!at) return;
      const dest = { id, r, kind, name, site, at, x: at[0], y: at[1] };
      named.set(id, dest);
      if (published) destinations.push(dest);
      return dest;
    }
    function approach(e) {
      const eligible = chartSteps.map(([dx, dy]) => [e.x + dx, e.y + dy])
        .filter(([x, y]) => accessible(x, y));
      return eligible.find(([x, y]) => m.reg[y * m.w + x] === e.r) || eligible[0];
    }
    for (let r = 1; r <= 8; r++) {
      const [x, y] = TOWN[r];
      destination('town' + r, r, 'town', host.regionName(r), [x, y], nearest(x, y + 3, 5, accessible));
      const shop = m.spots['cartographer' + r];
      destination('shop' + r, r, 'poi', host.regionName(r) + ' Map Room', shop, nearest(...shop, 2, accessible));
      const civic = m.venues && Array.from(m.venues.values()).find(v => v.r === r && v.type === 'civic');
      if (civic) {
        const b = civic.building, d = b.plan.doors.find(door => door.side === 'south') || b.plan.doors[0];
        const entry = [b.x + d.outside.x, b.y + d.outside.y];
        destination('civic' + r, r, 'poi', b.name, [b.x + (b.w >> 1), b.y + (b.h >> 1)], nearest(...entry, 3, accessible));
      }
    }
    for (const e of m.ents) {
      const site = [e.x, e.y], r = e.r;
      if (e.kind === 'stairs') destination('stairs' + r, r, e.kind, e.name, site, approach(e));
      if (e.kind === 'poi' && ['tower', 'shrine', 'well', 'graves'].includes(e.pk)
        && ['view', 'heal', 'tale'].includes((host.place(e.pk) || [])[3]))
        destination(e.pid, r, e.kind, e.name, site, approach(e));
      if (e.kind === 'fish') {
        const number = Number(e.fid.split('-')[1]);
        const name = Number.isInteger(number) ? host.regionName(r) + ' fishing water ' + (number + 1) : e.name;
        destination(e.fid, r, e.kind, name, site, approach(e));
      }
      if (e.kind === 'ferry') {
        const route = m.ferries.find(f => f.id === e.route), other = route[e.side === 'from' ? 'to' : 'from'];
        destination(chartFerryId(e.route, e.side), r, 'ferry', 'Ferry to ' + host.regionName(other.r), site, approach(e));
      }
    }
    const roads = (x, y) => accessible(x, y) && [2, 3, 6].includes(m.t[y * m.w + x]) &&
      !m.blds.some(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
    for(const b of m.blds){
      const type=ServicePlaces.typeFor(b),door=b.plan&&b.plan.doors.find(d=>d.side==='south')||b.plan&&b.plan.doors[0];
      if(!type||!door||b.home)continue;
      const at=nearest(b.x+door.outside.x,b.y+door.outside.y,4,accessible);
      const p=destination('service:'+b.r+':'+type+':'+b.x+':'+b.y,b.r,'service',b.name||ServicePlaces.types[type].name,[b.x+door.x,b.y+door.y],at);
      if(p){p.type=type;Object.defineProperties(p,{building:{value:b},door:{value:door}});}
    }
    const ferryLinks = m.ferries.map(ferry => ({ id: ferry.id,
      from: named.get(chartFerryId(ferry.id, 'from')).at, to: named.get(chartFerryId(ferry.id, 'to')).at }));
    m.cartography = { destinations, named, ferryLinks, navigator: Navigation.create(m.w, m.h, (x, y) => chartOpen(m, x, y)) };
    function sign(r, x, y, ids, radius, name, predicate = roads) {
      const at = nearest(x, y, radius, (xx, yy) => predicate(xx, yy) &&
        !m.ents.some(e => e.x === xx && e.y === yy) && !m.props.some(p => p.x === xx && p.y === yy));
      const targets = ids.filter(id => named.has(id));
      if (!at || !targets.length) return;
      addEnt(m, { kind: 'roadsign', r, x: at[0], y: at[1], name, sub: 'Read directions',
        ok: 'road_sign', solid: 0, destinations: targets });
      m.keep[at[1] * m.w + at[0]] = 1;
    }
    for (let r = 1; r <= 8; r++) {
      const [x, y] = TOWN[r];
      const linked = Geography.roadLinks.filter(pair => pair.includes(r)).map(pair => 'town' + pair.find(t => t !== r));
      const berths = destinations.filter(d => d.r === r && d.kind === 'ferry');
      sign(r, x, y + (r === 8 ? 64 : 12), ['shop' + r, ...berths.map(d => d.id), ...linked.slice(0, 2)], 12, 'Town signpost');
      for (const berth of berths) {
        sign(r, berth.x, berth.y,  ['town' + r, berth.id], 20, 'Ferry signpost',
          (xx, yy) => roads(xx, yy) && Math.abs(xx - berth.x) + Math.abs(yy - berth.y) >= 6);
      }
    }
    for (const [a, b] of Geography.roadLinks) {
      const x = Math.round((TOWN[a][0] + TOWN[b][0]) / 2), y = Math.round((TOWN[a][1] + TOWN[b][1]) / 2);
      sign(Geography.region(x, y), x, y, ['town' + a, 'town' + b], 85, 'Road junction',
        (xx, yy) => m.t[yy * m.w + xx] === 2 && roads(xx, yy)
          && chartSteps.filter(([dx, dy]) => [-1, 0, 1].some(s => {
            const xp = xx + dx * 4 + dy * s, yp = yy + dy * 4 + dx * s;
            return m.t[yp * m.w + xp] === 2 && chartDry(m, xp, yp);
          })).length >= 3);
    }
    const districts = m.districts.filter(d => d.r === 8);
    for (let i = 0; i < districts.length; i++) {
      const { box, name } = districts[i], x = Math.floor((box[0] + box[2]) / 2), y = Math.floor((box[1] + box[3]) / 2);
      const at = nearest(x, y, 40, (xx, yy) => xx >= box[0] && xx <= box[2] && yy >= box[1] && yy <= box[3] && roads(xx, yy));
      destination('district' + i, 8, 'district', name, at, at, false);
    }
    const districtIds = districts.map((_, i) => 'district' + i);
    for (const id of districtIds) {
      const d = named.get(id);
      if (d) sign(8, d.x, d.y, districtIds.filter(other => other !== id), 8, d.name + ' signpost');
    }
  }

  function cartographyCatalogue() { return world && world.cartography ? world.cartography.destinations : []; }

  function chartPlan(dest, start, ferries) {
    const chart = world.cartography, path = chart.navigator.route(start, dest.at, ferries);
    if (!path) return null;
    const berth = path.boarding && chart.named.get(chartFerryId(path.boarding.route, path.boarding.side));
    return { ...path, target: dest, nextName: berth ? berth.name : dest.name };
  }
  function cartographyRoute(destId, position) {
    if (!world || !world.cartography || (!position && (map !== world || !P))) return null;
    const chart = world.cartography, dest = chart.named.get(destId);
    if (!dest) return null;
    return chartPlan(dest, position || [P.x, P.y], chart.ferryLinks);
  }
  function cartographySign(e) {
    if (!world || !e || e.kind !== 'roadsign' || !world.ents.includes(e)) return [];
    const out = [];
    for (const id of e.destinations) {
      const dest = world.cartography.named.get(id);
      const route = dest && chartPlan(dest, [e.x, e.y], []);
      if (!route || !route.path.length) continue;
      const [nx, ny] = route.path[1] || route.path[0];
      const direction = nx < e.x ? 'West' : nx > e.x ? 'East' : ny < e.y ? 'North' : ny > e.y ? 'South' : 'Here';
      out.push({ id, name: dest.name, direction, distance: route.distance });
    }
    return out;
  }

  function cartographyGuide(destId, position) {
    if (!destId || map !== world || !P || !world.cartography) return null;
    const chart = world.cartography, start = position || [P.x, P.y], key = start[1] * world.w + start[0];
    let cache = chart.guide;
    let cursor = cache && cache.id === destId && cache.indices.get(key);
    if (!Number.isInteger(cursor) || (cache.route.path[cursor + 1] && !chartOpen(world, ...cache.route.path[cursor + 1]))) {
      // A temporarily sealed passage must not start a full-world search each frame.
      if (cache && cache.id === destId && cache.failedAt === key && Date.now() < cache.retryAt) return null;
      const route = cartographyRoute(destId, start), indices = new Map();
      cache = chart.guide = { id: destId, route, indices };
      if (!route) { cache.failedAt = key; cache.retryAt = Date.now() + 3000; return null; }
      route.path.forEach(([x, y], i) => indices.set(y * world.w + x, i));
      cursor = 0;
    }
    const route = cache.route, remaining = route.path.length - cursor - 1;
    // Aim down the current straight segment. Never sight across a wall at a turn.
    let next = Math.min(cursor + 1, route.path.length - 1);
    const dx = route.path[next][0] - start[0], dy = route.path[next][1] - start[1];
    while (next + 1 < route.path.length && next < cursor + 12
      && route.path[next + 1][0] - route.path[next][0] === dx && route.path[next + 1][1] - route.path[next][1] === dy) next++;
    const boarding = route.boarding;
    const berth = boarding && chart.named.get(chartFerryId(boarding.route, boarding.side));
    return { at: remaining ? route.path[next] : berth ? berth.site : route.target.at,
      name: remaining || !berth ? route.nextName : 'Board the ferry to ' + berth.name.slice('Ferry to '.length),
      distance: remaining, boarding, target: route.target, arrived: remaining === 0 && !boarding };
  }

  function cartographyDrawGuide(o, ox0, oy0, z) {
    if (locked || map !== world || !host.waypoint || !P) return;
    const step = host.waypoint();
    if (!step || step.arrived || !step.at) return;
    const dx = step.at[0] - P.fx, dy = step.at[1] - P.fy;
    const pX = (P.fx * T + 8 - ox0) * z, pY = (P.fy * T + 8 - oy0) * z;
    const lo = 16 * dpr, right = ov.width - lo, top = 86 * dpr, bottom = ov.height - 128 * dpr;
    const ax = dx ? (dx > 0 ? right - pX : lo - pX) / dx : Infinity;
    const ay = dy ? (dy > 0 ? bottom - pY : top - pY) / dy : Infinity;
    const length = Math.max(0, Math.min(ax, ay));
    if (!Number.isFinite(length)) return;
    o.save();
    o.translate(clamp(pX + dx * length, lo, right), clamp(pY + dy * length, top, bottom));
    o.rotate(Math.atan2(dy, dx)); o.scale(dpr, dpr);
    o.beginPath(); o.moveTo(8, 0); o.lineTo(-6, -6); o.lineTo(-3, 0); o.lineTo(-6, 6); o.closePath();
    o.fillStyle = '#a5e5f4'; o.strokeStyle = '#173942'; o.lineWidth = 2.5; o.stroke(); o.fill(); o.restore();
    o.save(); o.font = `600 ${12 * dpr}px 'Alegreya Sans',sans-serif`; o.textAlign = 'center';
    const label = step.distance ? step.name + ' · ' + step.distance + ' tiles' : step.name;
    const width = Math.min(o.measureText(label).width + 16 * dpr, ov.width - 32 * dpr);
    const x = ov.width / 2, y = ov.height - 112 * dpr;
    o.fillStyle = 'rgba(12,36,42,.9)'; o.fillRect(x - width / 2, y - 14 * dpr, width, 20 * dpr);
    o.fillStyle = '#d1eff3'; o.fillText(label, x, y, width - 10 * dpr); o.restore();
  }

  function cartographyBounds(r) {
    if (!world || !world.cartography) return null;
    const chart = world.cartography;
    if (!chart.bounds) {
      chart.bounds = Array.from({ length: 9 }, () => [world.w, world.h, -1, -1]);
      for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
        const i = y * world.w + x, box = chart.bounds[world.reg[i]];
        if (!world.b[i] || !box) continue;
        box[0] = Math.min(x, box[0]); box[1] = Math.min(y, box[1]);
        box[2] = Math.max(x, box[2]); box[3] = Math.max(y, box[3]);
      }
      for (const b of chart.bounds) {
        b[0] = Math.max(0, b[0] - 8); b[1] = Math.max(0, b[1] - 8);
        // Right and bottom are exclusive, matching drawImage source rectangles.
        b[2] = Math.min(world.w, b[2] + 9); b[3] = Math.min(world.h, b[3] + 9);
      }
    }
    return r >= 1 && r <= 8 ? chart.bounds[r].slice() : [0, 0, world.w, world.h];
  }

  function cartographyMap(mask, maps, previewRegion = 0, revision) {
    if (!world || !world.mini || !world.cartography) return null;
    const chart = world.cartography, w = world.w, h = world.h;
    let rights = 0;
    for (let r = 1; r <= 8; r++) if (maps && maps[r] === true) rights |= 1 << r;
    let cache = previewRegion ? chart.preview : chart.mapCache;
    if (cache && cache.region === previewRegion && (previewRegion ||
      (revision !== undefined && cache.revision === revision && cache.mask === mask && cache.rights === rights))) return cache.canvas;
    if (!chart.source) {
      const pixels = world.mini.getContext('2d').getImageData(0, 0, w, h);
      chart.source = new Uint32Array(pixels.data.buffer);
      // Read/write channels by bytes; the Uint32Array is only an opaque packed-pixel copy.
      const bytes = new Uint8ClampedArray(pixels.data);
      for (let i = 0; i < bytes.length; i += 4) {
        const luma = .30 * bytes[i] + .59 * bytes[i + 1] + .11 * bytes[i + 2];
        bytes[i] = bytes[i] * .25 + luma * .3 + 14;
        bytes[i + 1] = bytes[i + 1] * .25 + luma * .3 + 16;
        bytes[i + 2] = bytes[i + 2] * .25 + luma * .3 + 18;
      }
      chart.muted = new Uint32Array(bytes.buffer);
      chart.black = new Uint32Array(Uint8Array.of(0, 0, 0, 255).buffer)[0];
    }
    if (!cache) {
      const canvas = mk(w, h), ctx = canvas.getContext('2d'), image = ctx.createImageData(w, h);
      cache = { canvas, ctx, image, output: new Uint32Array(image.data.buffer) };
      if (previewRegion) chart.preview = cache; else chart.mapCache = cache;
    }
    const full = cache.region !== previewRegion || cache.mask !== mask || cache.rights !== rights || !cache.previous;
    const size = Cartography.cellSize, cols = Math.ceil(w / size);
    let left = w, top = h, right = 0, bottom = 0;
    function paint(x0, y0, x1, y1, explored) {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * w + x, r = world.reg[i];
        cache.output[i] = previewRegion ? (r === previewRegion ? chart.muted[i] : chart.black)
          : explored ? chart.source[i] : rights & (1 << r) ? chart.muted[i] : chart.black;
      }
    }
    if (previewRegion) {
      paint(0, 0, w, h, false); left = top = 0; right = w; bottom = h;
    } else {
      const groups = Math.ceil(cols * Math.ceil(h / size) / 6);
      if (full) cache.previous = new Uint8Array(groups);
      for (let group = 0; group < groups; group++) {
        const bits = mask ? mask[group] : 0, changed = full ? 63 : cache.previous[group] ^ bits;
        if (!changed) continue;
        cache.previous[group] = bits;
        for (let bit = 0; bit < 6; bit++) {
          if (!(changed & (1 << bit))) continue;
          const cell = group * 6 + bit, x = cell % cols * size, y = Math.floor(cell / cols) * size;
          if (y >= h) break;
          const endX = Math.min(w, x + size), endY = Math.min(h, y + size);
          paint(x, y, endX, endY, bits & (1 << bit));
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, endX); bottom = Math.max(bottom, endY);
        }
      }
    }
    if (right > left && bottom > top) cache.ctx.putImageData(cache.image, 0, 0, left, top, right - left, bottom - top);
    Object.assign(cache, { mask, rights, revision, region: previewRegion });
    return cache.canvas;
  }

  function cartographyInsideHome(home) {
    if (!home || !world || map !== world || !P) return false;
    const house = world.blds.find(b => b.home && b.home.id === home.id && b.atlasFloor);
    return !!(house && house.atlasFloor.includes(P.y * world.w + P.x));
  }
  function cartographyAtlas(home) {
    if (!world || !world.cartography) return null;
    const m = world, chart = m.cartography;
    const house = home && m.blds.find(b => b.home && b.home.id === home.id);
    if (house && chart.atlasHouse === house && m.ents.includes(chart.atlas)) return chart.atlas;
    const old = chart.atlasHouse;
    if (old) {
      if (m.blds.includes(old)) {
        for (const i of old.atlasFloor) m.solid[i] = 1;
        old.enter = 0; old.room = null; old.ra = null; old.atlasFloor = null;
      }
      const entity = chart.atlas;
      if (m.occ.get(entity.y * m.w + entity.x) === entity) m.occ.delete(entity.y * m.w + entity.x);
      m.ents = m.ents.filter(e => e !== entity);
      chart.atlasHouse = chart.atlas = null;
    }
    chart.guide = null;
    if (!house) return null;
    const { x, y, w, h, r } = house, door = w >> 1;
    house.enter = 1; house.fa = 1; house.ra = null;
    house.room = { fl: 'floor', door, wall: [], fur: [] };
    house.atlasFloor = [];
    // Painted homes range from a 2×2 tower to a 6×4 manor. The back row holds
    // the table; even the smallest house retains a dry tile inside to stand on.
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      if (dx !== door && (dx === 0 || dx === w - 1 || dy === h - 1)) continue;
      const i = (y + dy) * m.w + x + dx;
      m.solid[i] = 0; m.seen[i] = 1; house.atlasFloor.push(i);
    }
    const atlas = CartographyArt.at.grand_atlas, nativeWidth = atlas.r[2] / K;
    const entity = addEnt(m, { kind: 'homeatlas', x: x + door, y, r, hid: home.id,
      ax: w % 2 ? 0 : -.5, objectScale: Math.min(.88, (w - .5) * T / nativeWidth),
      name: 'Grand Atlas of Brasswake', sub: 'Read the atlas', ok: 'grand_atlas' });
    chart.atlasHouse = house; chart.atlas = entity;
    return entity;
  }

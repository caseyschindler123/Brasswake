  /* Public buildings keep their surface address. Upper rooms use local tile coordinates. */
  function venuePosition(m, b, want, actor, reserved = []) {
    const choices = [];
    for (let y = 1; y < b.h - 1; y++) for (let x = 1; x < b.w - 1; x++) {
      const xx = b.x + x, yy = b.y + y, i = yy * m.w + xx, occupant = m.occ.get(i);
      if (b.plan.tiles[y * b.w + x] !== Buildings.FLOOR || m.solid[i] || (occupant && occupant !== actor)
        || reserved.some(p => p[0] === xx && p[1] === yy)) continue;
      if (b.plan.doors.some(d => x === d.inside.x && y === d.inside.y)) continue;
      const approaches = chartSteps.filter(([dx, dy]) => chartOpen(m, xx + dx, yy + dy));
      if (!approaches.length) continue;
      choices.push({ at: [xx, yy], score: Math.abs(x - want[0]) + Math.abs(y - want[1]) });
    }
    choices.sort((a, b2) => a.score - b2.score);
    return choices.length ? choices[0].at : null;
  }

  function venueSeat(m, b, actor, want) {
    if (!b || !actor) return;
    const currentX = actor.x - b.x, currentY = actor.y - b.y;
    const sameRoom = currentX >= 0 && currentY >= 0 && currentX < b.w && currentY < b.h &&
      b.plan.tiles[currentY * b.w + currentX] === Buildings.FLOOR && !m.solid[actor.y * m.w + actor.x];
    const at = venuePosition(m, b, sameRoom ? [currentX, currentY] : want, actor);
    if (!at) return;
    sit(m, actor, at[0], at[1]); actor.fx = actor.x; actor.fy = actor.y;
    actor.venueId = b.plan.id;
  }

  function venueFit(b, pieces) {
    b.furniture = pieces.map(([piece, x, y]) => ({
      p: piece.startsWith('!') ? piece.slice(1) : 'f' + b.r + '_' + piece, x, y,
    }));
  }

  function venueRestoreFittings(m, b) {
    const furnished = new Map(), reserved = [];
    for (const f of b.furniture) {
      furnished.set(f.p, (furnished.get(f.p) || 0) + 1);
      reserved.push([b.x + Math.floor(f.x), b.y + Math.floor(f.y)]);
    }
    // A recessed frontage may remove a rectangle's old fixture anchor. Fit
    // the service counter first, then return the remaining stock to unused floor.
    const priority = { bankctr: 3, counter: 3, bar: 3, barend: 2, strongbox: 1 };
    const pieces = ROOMS[b.slot].fur.slice().sort((a,c) => (priority[c.p] || 0) - (priority[a.p] || 0));
    for (const f of pieces) {
      const p = 'f' + b.r + '_' + f.p, count = furnished.get(p) || 0;
      if (count) { furnished.set(p, count - 1); continue; }
      const at = venuePosition(m, b, [f.x, f.y], null, reserved);
      if (!at) continue;
      reserved.push(at);
      b.furniture.push({ p, x: at[0] - b.x + .5, y: at[1] - b.y + .75 });
    }
  }

  function venueCivic(m, r) {
    const spec = Interiors.civic[r];
    if (r === 8) return m.blds.find(b => b.r === r && b.slot === 'palace');
    const [cx, cy] = TOWN[r], { w, h } = spec;
    const candidates = [];
    // Keep the streets, old story locations and claimed sites. Nearest viable
    // parcels get first choice, with the public entrance facing the town road.
    for (let y = cy - 65; y < cy + 58; y++) for (let x = cx - 65; x < cx + 58; x++) {
      const dx = x + (w >> 1), dy = y + h;
      if (!chartOpen(m, dx, dy) || !m.seen[dy * m.w + dx]) continue;
      let okay = true;
      for (let yy = y - 1; yy <= y + h && okay; yy++) for (let xx = x - 1; xx <= x + w; xx++) {
        const i = yy * m.w + xx;
        if (m.reg[i] !== r || m.t[i] > 1 || (m.solid[i] ? !m.o[i] : !m.seen[i])
          || (m.keep[i] && !Geography.inTown(xx, yy, 3))) { okay = false; break; }
      }
      if (okay) candidates.push({ x, y, score: Math.abs(dx - cx) + Math.abs(dy - cy) });
    }
    candidates.sort((a, b) => a.score - b.score);
    for (const { x, y } of candidates) {
      if (m.props.some(p => p.x >= x - 1 && p.x <= x + w && p.y >= y - 1 && p.y <= y + h)) continue;
      const shape = spec.shape === 'court' ? 'courtyard' : spec.shape === 'L' ? 'L' : 'rect';
      const diagram = spec.shape === 'gallery' ? Interiors.diagram(w, h, [[0, h - 2, 3, 2], [w - 3, h - 2, 3, 2]]) : undefined;
      const b = worldGrownBuilding(m, x, y, w, h, 'civic', r, { name: spec.name, shape, diagram,
        id: 'civic-' + r, doors: ['south', r % 2 ? 'west' : 'east'] });
      if (b) return b;
    }
    throw new Error('No civic parcel in ' + host.regionName(r));
  }

  function venueGroundStair(m, b, type, name) {
    if (!b) return;
    const at = venuePosition(m, b, [b.w - 2, b.h - 2]);
    if (!at) return;
    const id = b.plan.id;
    const e = addEnt(m, { kind: 'venueup', x: at[0], y: at[1], r: b.r, venueId: id,
      name, sub: 'Go upstairs', ok: 'venue_stairs_up' });
    if (!b.landmark) b.storeyLift = type === 'civic' ? 24 : type === 'tavern' ? 18 : 12;
    m.venues.set(id, { id, type, r: b.r, name, building: b, stair: e });
  }

  function venueStreet(m, b) {
    const door = b.plan.doors.find(d => d.side === 'south');
    if (!door) return;
    const x = b.x + door.outside.x, y = b.y + door.outside.y, first = y * m.w + x;
    const margin = 72, queue = [first], parent = new Map([[first, -1]]);
    const inside = new Set();
    for (const other of m.blds) {
      if (Math.abs(other.x - x) > margin + other.w || Math.abs(other.y - y) > margin + other.h) continue;
      for (let yy = 0; yy < other.h; yy++) for (let xx = 0; xx < other.w; xx++) {
        if (!other.modular || Buildings.contains(other.plan, xx, yy, true))
          inside.add((other.y + yy) * m.w + other.x + xx);
      }
    }
    const buildable = (xx, yy) => {
      const i = yy * m.w + xx;
      return chartOpen(m, xx, yy) && !inside.has(i) && m.reg[i] === b.r && [0,1,2,3,6].includes(m.t[i]);
    };
    const paving = b.r === 2 ? 6 : [3,4,7].includes(b.r) ? 2 : 3;
    const pave = i => {
      // A connecting walk must leave an existing road, bridge or quay intact.
      if (m.t[i] > 1) return;
      m.t[i] = paving; m.keep[i] = 1; m.o[i] = 0;
      if (m.surface) m.surface[i] = b.r === 8 ? 3 : 0;
    };
    let road = null;
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head], xx = i % m.w, yy = Math.floor(i / m.w);
      if (m.t[i] === 2 && m.keep[i]) { road = i; break; }
      for (const [dx,dy] of chartSteps) {
        const nx = xx + dx, ny = yy + dy, ni = ny * m.w + nx;
        if (parent.has(ni) || Math.abs(nx - x) + Math.abs(ny - y) > margin || !buildable(nx,ny)) continue;
        queue.push(ni); parent.set(ni,i);
      }
    }
    if (road !== null) for (let i = road; i !== -1; i = parent.get(i)) pave(i);
    // A reed landing is narrow; carriers and carts need a wider apron.
    const half = [3,4,8].includes(b.r) ? 4 : b.r === 2 ? 1 : 2;
    for (let yy = y; yy < y + (b.r === 4 ? 4 : 2); yy++) for (let xx = x - half; xx <= x + half; xx++)
      if (buildable(xx,yy)) pave(yy * m.w + xx);
    b.street = { at: [x,y], joins: road === null ? null : [road % m.w, Math.floor(road / m.w)], paving };
  }

  function venueSetup(m) {
    m.venues = new Map();
    for (let r = 1; r <= 8; r++) {
      const [cx, cy] = TOWN[r], nick = Interiors.districts[r], civicSpec = Interiors.civic[r];
      const core = m.blds.filter(b => b.r === r && Math.abs(b.x - cx) <= 26 && Math.abs(b.y - cy) <= 21 && !b.cartographer);
      const bySlot = slot => core.find(b => b.slot === slot);
      const entity = (kind, i) => m.ents.find(e => e.r === r && e.kind === kind && (i === undefined || e.i === i));
      const titles = { guild: nick + ' Guildhall', bank: nick + ' Counting House', casino: nick + ' Card Room',
        shop: nick + ' Provisioners', work: nick + ' Workshop', healer: nick + ' Infirmary',
        tavern: host.tavern(r), dojo: nick + ' Training Hall' };
      for (const b of core) {
        if ((b.slot === 'house' || b.slot === 'cottage') && b.modular && b.plan.shape === 'rect' && (b.x + b.y + r) % 3 !== 0) {
          const diagram = Interiors.frontage(b.slot, b.w, b.h, r + b.x);
          worldBuilding(m,b,{ id:b.plan.id, name:b.name, doors:b.plan.doors.map(d=>d.side), diagram });
          b.roofFamily = (b.x + r) % 2 ? civicSpec.roof : r === 2 || r === 3 ? 3 : 1;
          continue;
        }
        if (!(b.slot in titles)) continue;
        const original = b.plan;
        const doors = original ? original.doors.map(d => d.side) : ['south'];
        if (r === 1 && b.slot === 'guild') {
          // Odalys receives new arrivals at the south entrance. Leave that
          // meeting in place and give visitors a clear entrance from the east.
          const south = original.doors.find(d => d.side === 'south');
          const actor = south && m.occ.get((b.y + south.outside.y) * m.w + b.x + south.outside.x);
          if (actor && actor.kind === 'npc' && actor.i === 0) doors.push('east');
        }
        const diagram = Interiors.frontage(b.slot, b.w, b.h, r);
        if (diagram || !b.modular) worldBuilding(m, b, { id: original && original.id,
          name: titles[b.slot], doors, diagram });
        b.name = titles[b.slot];
        b.roofFamily = b.slot === 'bank' || b.slot === 'guild' ? (r === 5 || r === 8 ? 4 : 2)
          : b.slot === 'work' || b.slot === 'dojo' ? (r === 2 || r === 3 ? 3 : 1) : civicSpec.roof;
        if (b.slot === 'healer') venueFit(b, [['bed', 1.3, 2.8], ['cupboard', b.w - 1.1, 1.6],
          ['!venue_medicine', b.w - 1.35, 2.0]]);
        if (b.slot === 'guild') venueFit(b, [['shelf', 1.5, 2.3], ['ltable', 3.3, 3.4], ['stool', 5, 3.3]]);
        if (b.slot === 'casino') venueFit(b, [['rtable', 2.2, 3.3], ['stool', 1.35, 3.5], ['stool', 3.15, 3.7], ['strongbox', 5.5, 1.8]]);
        if (b.slot === 'work') venueFit(b, [['shelf', 1.6, 1.6], ['chest', b.w - 1.3, 1.8]]);
        if (b.slot === 'dojo') venueFit(b, [['bench', 1.8, 2.4], ['!venue_training_mat', 4.4, 3.7]]);
      }
      const civic = venueCivic(m, r);
      if (!civic) throw new Error('Missing civic venue in ' + host.regionName(r));
      civic.civic = true; civic.roofFamily = civicSpec.roof;
      venueStreet(m, civic);
      const furnishings = civicSpec.fittings.map((p, i) => {
        const at = venuePosition(m, civic, [i === 2 ? 1 : 2 + i, i === 2 ? civic.h - 3 : 2]) || [civic.x + 2, civic.y + 2];
        return [p, at[0] - civic.x + .45, at[1] - civic.y + .9];
      });
      venueFit(civic, furnishings);
      for (const [kind, slot, want] of [
        ['healer','healer',[3,2]], ['banker','bank',[4,1]], ['tavern','tavern',[5,2]],
        ['shopkeep','shop',[4,1]], ['casino','casino',[4,2]], ['registrar','guild',[4,2]], ['bench','work',[2,1]],
      ]) venueSeat(m, bySlot(slot), entity(kind), want);

      // First-day Odalys and Tamsin keep their original meetings. The other
      // chapter masters receive visitors in their guildhalls.
      if (r !== 1) venueSeat(m, bySlot('guild'), entity('npc', 0), [2,2]);
      const assignments = [null, ['guild', 'civic'], ['guild', 'civic'], ['guild', 'civic'], ['guild', 'civic'],
        ['work', 'guild'], ['work', 'civic'], ['civic', 'bank'], ['guild', 'civic']];
      assignments[r].forEach((slot, j) => venueSeat(m, slot === 'civic' ? civic : bySlot(slot), entity('npc', j + 1), [2, 3]));
      const keeper = venuePosition(m, civic, [2, 2]);
      if (keeper) addEnt(m, { kind: 'folk', r, x: keeper[0], y: keeper[1], venueId: civic.plan.id,
        name: civicSpec.role, sub: civic.name, venueLine: Interiors.civicLines[r],
        spr: folkSprite(AD && AD.chars.extra.registrar, civicSpec.role) });
      venueGroundStair(m, bySlot('tavern'), 'tavern', 'Guest rooms');
      venueGroundStair(m, bySlot('healer'), 'healer', 'Recovery ward');
      venueGroundStair(m, civic, 'civic', civicSpec.room);
      for (const slot of ['bank','shop','tavern']) {
        const room = bySlot(slot);
        if (room) venueRestoreFittings(m, room);
      }
    }
    m.venueRoofs = new Map();
    m.doorApproaches = new Set();
    for (const b of m.blds) if (b.modular && b.enter) {
      for (const door of b.plan.doors) for (const p of [door.outside, door, door.inside])
        m.doorApproaches.add((b.y + p.y) * m.w + b.x + p.x);
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++)
        if (b.plan.roof[y * b.w + x]) m.venueRoofs.set((b.y + y) * m.w + b.x + x, b);
    }
    for (const e of m.ents) if (e.wander && m.doorApproaches.has(e.y * m.w + e.x)) venueClearDoor(m,e);
  }

  function venueClearDoor(m, e) {
    const origin = e.y * m.w + e.x, region = m.reg[origin];
    const queue = [[e.x,e.y]], visited = new Set([origin]);
    let nearest = null, street = null;
    for (let head = 0; head < queue.length && !street; head++) {
      const [x,y] = queue[head];
      for (const [dx,dy] of chartSteps) {
        const nx = x + dx, ny = y + dy, i = ny * m.w + nx;
        if (visited.has(i) || Math.abs(nx-e.x) + Math.abs(ny-e.y) > 14 || !chartOpen(m,nx,ny) || m.reg[i] !== region) continue;
        visited.add(i); queue.push([nx,ny]);
        if (m.doorApproaches.has(i) || (e.roam && (nx < e.roam[0] || ny < e.roam[1] || nx > e.roam[2] || ny > e.roam[3]))) continue;
        const at = [nx,ny];
        if (!nearest) nearest = at;
        if (!m.venueRoofs.has(i) && (m.t[i] === 2 || m.t[i] === 3 || (e.wander === 3 && m.t[i] === 6))) {
          street = at; break;
        }
      }
    }
    const at = street || nearest;
    if (!at) return;
    sit(m,e,at[0],at[1]);
    e.fx = e.x; e.fy = e.y; e.tx = e.ty = null;
  }

  function venueHiddenEntity(e) {
    if (!e || !world || map !== world || !world.venueRoofs) return false;
    const room = world.venueRoofs.get(e.y * world.w + e.x);
    return !!(room && room.fa > .5 && !room.inside &&
      !(P && buildingContains(room, P.x, P.y)));
  }

  function venueHall(m) {
    delete m.paint;
    const solid = m.solid.slice();
    const b = { x: 0, y: 2, w: m.w, h: m.h - 2, r: m.r, slot: 'dojo', by: m.h * T - 1 };
    worldBuilding(m, b, { name: host.regionName(m.r) + ' Training Hall', doors: ['south'] });
    // Keep the dojo's published sparring and lesson coordinates and its solid equipment.
    for (let i = 0; i < solid.length; i++) if (solid[i]) m.solid[i] = 1;
    b.indoor = true; b.inside = true; b.fa = 0;
    venueFit(b, [['!venue_training_mat', 4.4, 7], ['!venue_training_mat', 7.3, 7], ['!venue_training_mat', 5.5, 11.3]]);
    m.blds.push(b);
    return m;
  }

  function venueRoomSpot(m, want) {
    const options = [];
    let open = 0;
    for (let y=1; y<m.h-1; y++) for (let x=1; x<m.w-1; x++) {
      if (!chartOpen(m,x,y)) continue;
      open++;
      if (x === m.entry[0] && y === m.entry[1]) continue;
      options.push({ x, y, score:Math.abs(x-want[0])+Math.abs(y-want[1]) });
    }
    if (open <= 2) return null;
    options.sort((a,b)=>a.score-b.score);
    // Try the furniture or attendant at the requested end of the room. Keep
    // smaller wards and the narrow galleries navigable as each piece is added.
    for (const p of options) {
      const trial = p.y*m.w+p.x;
      m.solid[trial]=1;
      const seen = new Set([m.entry[1]*m.w+m.entry[0]]), queue=[m.entry];
      for(let head=0;head<queue.length;head++) {
        const [x,y]=queue[head];
        for(const [dx,dy] of chartSteps) {
          const nx=x+dx,ny=y+dy,i=ny*m.w+nx;
          if(seen.has(i)||!chartOpen(m,nx,ny))continue;
          queue.push([nx,ny]); seen.add(i);
        }
      }
      m.solid[trial]=0;
      if (seen.size === open-1 && m.ents.every(e=>chartSteps.some(([dx,dy])=>seen.has((e.y+dy)*m.w+e.x+dx)))) return [p.x,p.y];
    }
    return null;
  }

  function venueUpper(mother) {
    const { type, r } = mother, spec = Interiors.upper(mother.building), { w, h } = spec, n = w * h;
    const m = { w, h, r, venue: mother, t: new Uint8Array(n), b: new Uint8Array(n).fill(r), reg: new Uint8Array(n).fill(r),
      solid: new Uint8Array(n), keep: new Uint8Array(n), o: new Uint8Array(n), occ: new Map(), pal: [],
      chunks: new Map(), ents: [], props: [], blds: [], lights: [], terr: [], dungeon: false };
    m.pal[r] = Object.assign({}, BIO[r], { amb: 0, fx: null, liquid: 'none' });
    const b = { x: 0, y: 0, w, h, r, slot: 'upper', by: h * T - 1 };
    worldBuilding(m, b, { id: mother.id + '-upper', name: mother.name, diagram: spec.diagram, doors: spec.doors });
    b.indoor = true; b.inside = true; b.fa = 0; b.room.fl = 'floor'; m.blds.push(b);
    for (let i=0; i<n; i++) m.solid[i] = b.plan.tiles[i] === Buildings.FLOOR ? 0 : 1;
    const down = addEnt(m, { kind:'venuedown', x:mother.stair.x-mother.building.x, y:mother.stair.y-mother.building.y,
      r, venueId:mother.id, name:'Stairs to ' + mother.building.name, sub:'Go downstairs', ok:'venue_stairs_down' });
    m.entry = chartSteps.map(([dx,dy])=>[down.x+dx,down.y+dy]).find(([x,y])=>chartOpen(m,x,y));
    const attendant = type === 'healer' ? 'Ward attendant' : type === 'tavern' ? 'Inn attendant' : 'Records clerk';
    const venueLine = type === 'healer' ? 'The clean wraps are by the beds. The healer sees new patients downstairs.'
      : type === 'tavern' ? 'The keeper serves supper downstairs. It’s quieter up here once the guests settle in.'
        : 'I keep the records for ' + mother.building.name + ' here. The stairs lead back to the public hall.';
    const staff = venueRoomSpot(m,[w-2,2]);
    if (staff) addEnt(m,{ kind:'folk', x:staff[0],y:staff[1],r,name:attendant,sub:mother.name,venueLine,
      spr:folkSprite(AD && AD.chars.extra.tavern,attendant + r) });
    const furnishings = [];
    const pieces = type === 'tavern' ? ['bed','bed','chest','rtable','stool'] : type === 'healer' ? ['bed','bed','cupboard']
      : [...Interiors.civic[r].fittings,'shelf','bench'];
    const positions = [[1,1],[w-2,1],[w-2,h-2],[2,h-3],[3,h-2]];
    pieces.forEach((piece,i)=>{
      const at=venueRoomSpot(m,positions[i]);
      if (!at) return;
      m.solid[at[1]*w+at[0]]=1;
      furnishings.push([piece,at[0]+.5,at[1]+.9]);
    });
    if (type==='healer') furnishings.push(['!venue_medicine',w-1.6,1.45]);
    venueFit(b,furnishings);
    m.mini = mk(w,h);
    const g = m.mini.getContext('2d');
    for (let i=0; i<n; i++) { g.fillStyle = m.solid[i] ? '#40372e' : '#bb9368'; g.fillRect(i%w,Math.floor(i/w),1,1); }
    return m;
  }

  function venueState() {
    if (!map || !map.venue || !P) return null;
    const v = map.venue;
    return { v: 1, id: v.id, r: v.r, f: 1, x: P.x, y: P.y, back: map.back.slice() };
  }
  function venueLanding(v, at) {
    const stair = v.stair;
    const safe = p => Array.isArray(p) && p.length === 2 && Number.isInteger(p[0]) && Number.isInteger(p[1])
      && Math.abs(p[0] - stair.x) + Math.abs(p[1] - stair.y) === 1 && chartOpen(world, ...p);
    if (safe(at)) return at.slice();
    return chartSteps.map(([dx, dy]) => [stair.x + dx, stair.y + dy]).find(safe) || null;
  }
  function enterVenue(e) {
    if (!world || map !== world || !P || !e || e.kind !== 'venueup') return false;
    const v = world.venues.get(e.venueId);
    if (!v || e !== v.stair || !nextTo(e)) return false;
    const up = venueUpper(v); up.back = [P.x,P.y]; go(up,...up.entry); return true;
  }
  function exitVenue(e) {
    if (!map || !map.venue || !P || !e || e.kind !== 'venuedown' || !map.ents.includes(e) || !nextTo(e)) return false;
    const at = venueLanding(map.venue, map.back);
    if (!at) return false;
    go(world,...at); return true;
  }
  function restoreVenue(data) {
    if (!world || !world.venues || !data || data.v !== 1 || data.f !== 1 || typeof data.id !== 'string') return false;
    const v = world.venues.get(data.id);
    if (!v || v.r !== data.r) return false;
    const back = venueLanding(v, data.back);
    if (!back) return false;
    const up = venueUpper(v), saved = Number.isInteger(data.x) && Number.isInteger(data.y)
      && chartOpen(up,data.x,data.y) ? [data.x,data.y] : up.entry;
    up.back = back; go(up,...saved); return true;
  }

  const venueArt = new Map();
  function venueProp(kind, r) {
    const key = kind + '/' + r;
    if (venueArt.has(key)) return venueArt.get(key);
    const w = kind === 'venue_training_mat' ? 38 : kind === 'venue_awning' ? 32 : 24;
    const h = kind === 'venue_training_mat' ? 23 : kind === 'venue_awning' ? 15 : kind === 'venue_medicine' ? 16 : 29;
    const c = mk(w * K, h * K), g = c.getContext('2d'); c.hr = 1; g.scale(K, K);
    const rect = (x, y, width, height, color) => { g.fillStyle=color; g.fillRect(x,y,width,height); };
    const poly = (pts, color) => {
      g.fillStyle=color; g.beginPath(); g.moveTo(...pts[0]); for(const p of pts.slice(1)) g.lineTo(...p);
      g.closePath(); g.fill();
    };
    const wood = Interiors.timber[r], trim = Interiors.trim[r];
    if (kind === 'venue_stairs_up' || kind === 'venue_stairs_down') {
      const up = kind === 'venue_stairs_up';
      poly([[1,26],[5,12],[18,1],[23,2],[23,17],[8,28]], '#44382c');
      for (let i = 0; i < 6; i++) {
        const x = 2 + i * 2.3, y = 26 - i * 3.65;
        poly([[x,y-2],[x+4,y-5],[x+12,y-5],[x+9,y-2]], i%2 ? '#c8a57c' : '#b99b73');
        poly([[x,y-2],[x+9,y-2],[x+9,y],[x,y]], up ? wood : '#675442');
        rect(x+1,y-2,8,.45,'#e1c29a');
        rect(x+2,y-1.1,5,.55,'#72543e');
      }
      g.lineWidth=1.25; g.strokeStyle=wood; g.beginPath(); g.moveTo(11,23);g.lineTo(23,4);g.stroke();
      for(const [x,y] of [[11,23],[17,14],[23,4]]) rect(x-1,y-3,1.8,6,wood);
    } else if (kind === 'venue_medicine') {
      rect(1,10,22,4,'#5c4332'); rect(2,10,20,1,'#d1b495');
      rect(3,8,9,2,'#b3b2a2'); rect(4,6.5,7,2,'#e3deca');
      for (const [x, y, col] of [[13,3,'#47776a'],[17,5,'#976642'],[21,4,'#657d86']]) {
        rect(x-1,y,2,2,'#b7a888');rect(x-1,y+2,2,2,col);rect(x-2,y+3,4,5,col);rect(x-1,y+4,1,2,'#c4d4be');
      }
      poly([[2,4],[3,8],[7,9],[10,5]],'#aa967a');
      rect(1.5,4,9,1,'#e1d2b8');
    } else if (kind === 'venue_training_mat') {
      rect(0,1,w,h-1,'#65594c');rect(1.1,1,w-2.2,h-2.4,'#ad9d76');
      for(let y=2; y<h-2; y+=1.3) {
        rect(2,y,w-4,.35,'#766e54');
        for(let x=4 + (Math.round(y)%2);x<w-2;x+=4)rect(x,y,1.6,.45,'#d4c6a0');
      }
      rect(1.2,1.2,1.5,h-2.5,trim);rect(w-2.6,1.2,1.5,h-2.5,trim);
    } else if (kind === 'venue_awning') {
      for(let i=0;i<8;i++){
        const x=i*4;
        poly([[x+2,1],[x+5.6,1],[x+4,9],[x,9]], i%2 ? '#d4c6a0' : trim);
        poly([[x,9],[x+4,9],[x+4,11.7],[x+2,13.1],[x,11.7]], i%2 ? '#af9878' : trim);
      }
      rect(2,0,30,1,wood); rect(0,9,32,.7,'#796754');
    }
    const art = { c, ax:w/2, ay:h-1 }; venueArt.set(key,art); return art;
  }

  const venueDoorArt = new Map();
  function venueDoorImage(r, side, frame) {
    const key = 'door/' + r + '/' + side + '/' + frame;
    if (venueDoorArt.has(key)) {
      const art=venueDoorArt.get(key);venueDoorArt.delete(key);venueDoorArt.set(key,art);return art;
    }
    const value = BuildingView.doorLeaf(Interiors.timber[r], side, frame);
    venueDoorArt.set(key, value);
    // Under 6 MiB, independent of the number of settlements visited.
    if(venueDoorArt.size>96)venueDoorArt.delete(venueDoorArt.keys().next().value);
    return value;
  }

  function venueDoors(b, list) {
    if (!map || !P || !b.plan) return;
    if (b.indoor) {
      if (map.venue) venueOpenAir(b,list);
      return;
    }
    if (b.storeyLift && b.fa > .01) venueUpperWalls(b,list);
    const now = performance.now();
    if (!b.doorMotion) b.doorMotion = b.plan.doors.map(() => ({ amount:0, open:false, last:now }));
    for (const [index,d] of b.plan.doors.entries()) {
      const motion=b.doorMotion[index], x=b.x+d.x,y=b.y+d.y;
      let open=Math.hypot(P.fx-x,P.fy-y)<1.65;
      if (!open) for (const [dx,dy] of [[0,0],...chartSteps]) {
        const e=map.occ.get((y+dy)*map.w+x+dx);
        if(e && e.wander && e.tx!=null && Math.hypot(e.fx-x,e.fy-y)<1.5) {open=true;break;}
      }
      if (open!==motion.open && Math.hypot(P.fx-x,P.fy-y)<4) emit('door', open ? 'opening' : 'closing');
      motion.open=open;
      const dt=Math.min(.12,Math.max(0,now-motion.last)/1000); motion.last=now;
      motion.amount=clamp(motion.amount+(open?1:-1)*dt*5.2,0,1);
      const art=venueDoorImage(b.r,d.side,Math.round(motion.amount*8));
      const wx=x*T+(d.side==='east'?T:d.side==='west'?0:T/2);
      const wy=y*T+(d.side==='south'?T:0);
      list.push([wy+(d.facing.x?T:0)+.65,art.c,wx-art.ax,wy-art.ay,false,1,0,b.inside && d.side!=='north'?.45:1]);
      venueEntrance(b,d,list,wx,wy);
    }
  }

  function venueOpenAir(b, list) {
    if (b.openAir === undefined) {
      b.openAir = null;
      const tiles = b.plan.tiles, sample = (x,y) => x>=0 && y>=0 && x<b.w && y<b.h ? tiles[y*b.w+x] : Buildings.VOID;
      if (tiles.includes(Buildings.COURT) || tiles.includes(Buildings.VOID)) {
        const c = mk(b.w*T,b.h*T), g = c.getContext('2d');
        for (let y=0; y<b.h; y++) for (let x=0; x<b.w; x++) {
          const tile=sample(x,y);
          if (tile!==Buildings.COURT && tile!==Buildings.VOID) continue;
          g.fillStyle=tile===Buildings.COURT ? '#373b39' : '#1b2025';
          g.fillRect(x*T,y*T,T,T);
          if (tile===Buildings.COURT) {
            for(const [dx,dy] of chartSteps) {
              if(sample(x+dx,y+dy)===Buildings.COURT)continue;
              const xx=x*T+(dx>0?T-2:0), yy=y*T+(dy>0?T-2:0);
              g.fillStyle='#292c2b';g.fillRect(xx,yy,dx?2:T,dy?2:T);
              g.fillStyle='#a99675';g.fillRect(xx,yy,dx?1:T,dy?1:T);
            }
          }
        }
        b.openAir=c;
      }
    }
    if(b.openAir)list.push([-1,b.openAir,b.x*T,b.y*T]);
  }

  function venueUpperWalls(b, list) {
    const lift = b.storeyLift;
    for (const edge of b.plan.edges) {
      const side = edge.side, across = side === 'north' || side === 'south';
      if (side === 'north') continue;
      const panel = across && (edge.x + edge.y) % 3 === 1 ? 2 : 0;
      const key = ['gallery', b.r, lift, side, panel].join('/');
      const face = worldPiece('wf'+b.r+'_'+panel);
      let cached = venueArt.get(key);
      if (!cached || cached.face !== face) {
        const w = across ? T : 5, h = across ? lift : lift + T;
        const image = mk(w*K,h*K); image.hr=1;
        const g = image.getContext('2d');
        g.scale(K,K);
        g.fillStyle = across ? Interiors.timber[b.r] : '#625548'; g.fillRect(0,0,w,h);
        if (face) g.drawImage(face,0,0,w,h);
        g.fillStyle = across ? '#c8b18c' : '#807562'; g.fillRect(0,0,w,1.25);
        g.fillStyle = '#665647'; g.fillRect(0,h-2,w,2);
        cached = { image, face }; venueArt.set(key,cached);
      }
      const bx = (b.x+edge.x+(side==='east'?1:0))*T;
      const by = (b.y+edge.y+(side==='south'?1:0))*T;
      list.push([b.by+.45, cached.image, bx-(side==='east'?3:0), by-40-lift, false, 1, 0, b.fa]);
    }
  }

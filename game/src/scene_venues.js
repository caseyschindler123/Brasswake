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

  function venueFit(b, pieces, keep = false) {
    const fitted = pieces.map(([piece, x, y]) => ({
      p: piece.startsWith('!') ? piece.slice(1) : 'f' + b.r + '_' + piece, x, y,
    }));
    b.furniture = keep ? b.furniture.concat(fitted) : fitted;
  }

  function venueReach(m, b, blocked = -1) {
    const open = (x,y) => y * m.w + x !== blocked && Buildings.walkable(b.plan,x-b.x,y-b.y) && chartOpen(m,x,y);
    const queue = b.plan.doors.map(d => [b.x + d.inside.x, b.y + d.inside.y]).filter(([x,y]) => open(x,y));
    const reached = new Set(queue.map(([x,y]) => y*m.w+x));
    for (let i = 0; i < queue.length; i++) {
      const [x,y] = queue[i];
      for (const [dx,dy] of chartSteps) {
        const nx = x+dx, ny = y+dy, index = ny*m.w+nx;
        if (reached.has(index) || !open(nx,ny)) continue;
        reached.add(index); queue.push([nx,ny]);
      }
    }
    return reached;
  }

  function venueResident(m, b, [name, sub, want, dir, venueLine, venueSeated], kind = 'venuefolk') {
    const before = venueReach(m,b);
    const residents = m.ents.filter(e => e.venueId === b.plan.id);
    const spots = [];
    for (const i of before) {
      const x = i % m.w - b.x, y = Math.floor(i / m.w) - b.y;
      if (b.plan.tiles[y*b.w+x] !== Buildings.FLOOR || b.plan.doors.some(d => d.inside.x === x && d.inside.y === y)) continue;
      if (b.furniture.some(f => !f.p.startsWith('venue_') && Math.floor(f.x) === x && Math.floor(f.y) === y)) continue;
      spots.push({ i, score: Math.abs(x-want[0]) + Math.abs(y-want[1]) });
    }
    spots.sort((a,c) => a.score-c.score);
    for (const {i} of spots) {
      const after = venueReach(m,b,i), x = i % m.w, y = Math.floor(i / m.w);
      const approach = (xx,yy) => chartSteps.some(([dx,dy]) => after.has((yy+dy)*m.w+xx+dx));
      if (after.size !== before.size-1 || !approach(x,y) || residents.some(e => !approach(e.x,e.y))) continue;
      const e = addEnt(m,{kind,r:b.r,x,y,name,sub,dir,venueLine,venueSeated,venueId:b.plan.id,
        venueActivity:dir, spr:folkSprite(null,name+'-'+b.r)});
      venueResidentLook(e);
      if (venueSeated) b.furniture.push({p:'venue_seat',x:x-b.x+.5,y:y-b.y+.91});
      return e;
    }
    return null;
  }

  function venueResidentLook(e) {
    const look = NpcAppearance.describe({ ...e, kind:'folk', venueId:e.id||e.venueId });
    if (look) e.npcLook = { ...look, key:JSON.stringify(look) };
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

  function venueCapitalAvenue(x,y) {
    const [cx,cy] = TOWN[8], dx = x-cx, dy = y-cy;
    if (Math.abs(dx)>80 || Math.abs(dy)>65) return false;
    // The capital's established north/south avenues and cross streets.
    return [-76,-31,-1,29,76].some(v=>dx>=v&&dx<=v+2) || [-61,-29,21,61].some(v=>dy>=v&&dy<=v+2);
  }

  function venueParcel(m, r, slot, w, h, options) {
    const [cx, cy] = TOWN[r];
    const capitalParcel = (i,x,y) => r === 8 && m.t[i] === 3 && m.surface[i] === 3
      && !venueCapitalAvenue(x,y) && Math.abs(x-cx)>11;
    // Keep the streets, old story locations and claimed sites. Nearest viable
    // parcels get first choice, with the public entrance facing the town road.
    const search = (northwest,southeast,shore = false) => {
      const candidates = [];
      const bottom=Math.min(m.h-h-2,cy+southeast),right=Math.min(m.w-w-2,cx+southeast);
      for (let y = Math.max(2,cy-northwest); y < bottom; y++) for (let x = Math.max(2,cx-northwest); x < right; x++) {
        const dx = x + (w >> 1), dy = y + h;
        if (!chartOpen(m, dx, dy) || !m.seen[dy * m.w + dx]) continue;
        let okay = true;
        for (let yy = y - 1; yy <= y + h && okay; yy++) for (let xx = x - 1; xx <= x + w; xx++) {
          const i = yy * m.w + xx, tile = m.t[i];
          const land = tile <= 1 || (shore && tile === 5) || capitalParcel(i,xx,yy);
          if (m.reg[i] !== r || !land || (m.solid[i] ? !m.o[i] : !m.seen[i])
            || (m.keep[i] && !Geography.inTown(xx, yy, 3))) { okay = false; break; }
        }
        if (okay) candidates.push({ x, y, score: Math.abs(dx - cx) + Math.abs(dy - cy) });
      }
      candidates.sort((a, b) => a.score - b.score);
      for (const { x, y } of candidates) {
        if (m.props.some(p => p.x >= x - 1 && p.x <= x + w && p.y >= y - 1 && p.y <= y + h)) continue;
        const b = worldGrownBuilding(m, x, y, w, h, slot, r, options);
        if (b) return b;
      }
      return null;
    };
    const b = search(65,58) || (slot !== 'civic' && (search(92,88,true) || search(124,121,true)));
    if (b) return b;
    throw new Error('No ' + slot + ' parcel in ' + host.regionName(r));
  }

  function venueCivic(m, r) {
    if (r === 8) return m.blds.find(b => b.r === r && b.slot === 'palace');
    const {name,shape,w,h} = Interiors.civic[r];
    return venueParcel(m,r,'civic',w,h,{name,shape:shape === 'court' ? 'courtyard' : shape === 'L' ? 'L' : 'rect',
      diagram:shape === 'gallery' ? Interiors.diagram(w,h,[[0,h-2,3,2],[w-3,h-2,3,2]]) : undefined,
      id:'civic-'+r, doors:['south',r % 2 ? 'west' : 'east']});
  }

  function venueCasino(m, r, title, original) {
    const {w,h,stations} = Interiors.casino, [cx,cy] = TOWN[r];
    const b = venueParcel(m,r,'casino',w,h,{name:title,id:'casino-'+r,doors:['south'],diagram:Interiors.frontage('casino',w,h,r)});
    b.serviceId = 'service:'+r+':casino:'+(cx+3)+':'+(cy-10);
    b.roofFamily = Interiors.civic[r].roof;
    venueStreet(m,b);
    venueFit(b,[['rtable',10.3,7.8],['bench',11.8,8.2],['strongbox',7,2.25],['kegs',11.9,7.15],
      ['shelf',1.5,2.15],['cupboard',12.1,2.15],
      ...stations.map(({key,table:[x,y]})=>['!venue_'+key,x,y])]);
    for (const station of stations) for (const [x,y] of station.footprint) m.solid[(b.y+y)*m.w+b.x+x] = 1;
    for (const {key,name,dealer,facing,seats} of stations) {
      const [x,y] = dealer;
      let e;
      if (key === 'poker') {
        e = original;
        venueSeat(m,b,e,dealer);
      } else e = addEnt(m,{ kind:'casino', r, x:b.x+x, y:b.y+y, name:name+' dealer', venueId:b.plan.id,
        ak:original.ak, pt:original.pt, spr:folkSprite(original.ak,key+'-'+r) });
      Object.assign(e,{station:key,sub:name,dir:facing,venueActivity:facing});
      for (const [seat, [sx,sy,dir]] of seats.entries()) {
        const patron = addEnt(m,{kind:'venuefolk', id:'casino-patron-'+r+'-'+key+'-'+seat, r, x:b.x+sx,y:b.y+sy,
          name:'Card room patron', sub:key==='wheel'?'Watching the wheel':'Playing '+name, dir, venueId:b.plan.id,
          venueLine:key==='wheel' ? 'I like to watch the wheel turn. I’ll leave the betting to someone else.'
            : 'I’m in the middle of a hand. The dealer can find you a seat when it’s done.',
          venueSeated:true, venueActivity:dir, spr:folkSprite(null,key+'-patron-'+r+'-'+seat)});
        venueResidentLook(patron);
        b.furniture.push({p:'venue_seat',x:sx+.5,y:sy+.91});
      }
      m.lights.push({x:b.x+x+.5,y:b.y+y-.65,r:28,c:1});
    }
  }

  function venueStable(m,r,name) {
    const {w,h,stalls} = Interiors.stable;
    const b = venueParcel(m,r,'stable',w,h,{name,id:'stable-'+r,doors:['south']});
    b.serviceId='service:'+r+':stable';
    b.roofFamily = r===2 || r===3 ? 3 : 1;
    b.stalls = stalls;
    venueStreet(m,b);
    venueFit(b,[['chest',9.6,5.2],['kegs',1.8,5.5]]);
    for(const [x,y] of stalls) for(let xx=x;xx<=x+1;xx++) m.solid[(b.y+y)*m.w+b.x+xx] = 1;
    const e = venueResident(m,b,['Stable keeper','Sells horses',[8,5],'l'], 'stablekeep');
    if (!e) throw new Error('No fitting stable keeper position in ' + host.regionName(r));
  }

  function venueGroundStair(m, b, type, name) {
    if (!b) return;
    const at = venuePosition(m, b, [b.w - 2, b.h - 2]);
    if (!at) return;
    const id = b.plan.id;
    const e = addEnt(m, { kind: 'venueup', x: at[0], y: at[1], r: b.r, venueId: id,
      name, sub: 'Go upstairs', ok: 'venue_stairs_up' });
    b.storeyLift = 38;
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
      return chartOpen(m, xx, yy) && !inside.has(i) && m.reg[i] === b.r && [0,1,2,3,5,6].includes(m.t[i]);
    };
    const paving = b.r === 2 ? 6 : [3,4,7].includes(b.r) ? 2 : 3;
    const pave = i => {
      // A connecting walk must leave an existing road, bridge or quay intact.
      if (m.t[i] > 1 && m.t[i] !== 5) return;
      m.t[i] = paving; m.keep[i] = 1; m.o[i] = 0;
      if (m.surface) m.surface[i] = b.r === 8 ? 3 : 0;
    };
    let road = null;
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head], xx = i % m.w, yy = Math.floor(i / m.w);
      if (m.keep[i] && (m.t[i] === 2 || (b.r === 8 && m.t[i] === 3 && venueCapitalAvenue(xx,yy)))) {
        road = i; break;
      }
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
        const use = Interiors.roomUses[b.slot];
        if (use) {
          venueFit(b, use.pieces.filter(([,x,y])=>Buildings.walkable(b.plan,Math.floor(x),Math.floor(y))), !!ROOMS[b.slot]);
        }
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
        ['shopkeep','shop',[4,1]], ['registrar','guild',[4,2]], ['bench','work',[2,1]],
      ]) venueSeat(m, bySlot(slot), entity(kind), want);
      const workshop = bySlot('work');
      if (workshop) workshop.venueBench = entity('bench');

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
      for (const [slot,use] of Object.entries(Interiors.roomUses)) {
        const room = bySlot(slot);
        if (room) venueResident(m,room,use.resident);
      }
      venueResident(m,civic,['Hall assistant','Sorting the hall’s deliveries',[civic.w-3,3],'l',
        'If you’re here on business, you can speak to the keeper. I’m getting these deliveries out of the way.']);
      venueCasino(m,r,titles.casino,entity('casino'));
      venueStable(m,r,nick+' Stables');
    }
    m.venueRoofs = new Map();
    m.doorApproaches = new Set();
    m.publicVenueDistrict = new Set();
    for (const b of m.blds) if (b.modular && b.enter) {
      for (const door of b.plan.doors) for (const p of [door.outside, door, door.inside])
        m.doorApproaches.add((b.y + p.y) * m.w + b.x + p.x);
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++)
        if (b.plan.roof[y * b.w + x]) m.venueRoofs.set((b.y + y) * m.w + b.x + x, b);
      if (b.stalls || b.slot === 'casino') {
        // Carry the town ambience across the new premises and their immediate forecourt.
        for (let y = b.y; y < b.y + b.h + 3; y++) for (let x = b.x - 1; x <= b.x + b.w; x++)
          m.publicVenueDistrict.add(y * m.w + x);
      }
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
    if (!v || e !== v.stair || !Number.isFinite(interactionDistance(e))) return false;
    const up = venueUpper(v); up.back = [P.x,P.y]; go(up,...up.entry); return true;
  }
  function exitVenue(e) {
    if (!map || !map.venue || !P || !e || e.kind !== 'venuedown' || !map.ents.includes(e) || !Number.isFinite(interactionDistance(e))) return false;
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
  const venueSitting = new WeakMap();
  function venueSeatedFrame(image) {
    if (venueSitting.has(image)) return venueSitting.get(image);
    const {width,height} = image, {top,bottom} = actorBounds(image);
    const hips = Math.round(top + (bottom-top)*.58);
    const lower = Math.round(Math.min(6*K,(bottom-hips)*.55));
    if (width === 0 || lower < 1) return image;
    const c = mk(width,height), g = c.getContext('2d');
    c.hr = 1; c.originX = image.originX; c.originY = image.originY;
    if (image.anchor) c.anchor = [image.anchor[0]+lower,...image.anchor.slice(1)];
    g.drawImage(image,0,0,width,hips,0,lower,width,hips);
    g.drawImage(image,0,hips,width,height-hips,0,hips+lower,width,height-hips-lower);
    venueSitting.set(image,c);
    return c;
  }

  function venueIdleFacing(e, still) {
    if (!e.venueActivity || e.busy > 0) return still;
    const base = {f:0,l:2,b:4,s:6}[e.venueActivity];
    const phase = Math.floor((performance.now() + (e.x*619 + e.y*191) % 7300) / 1500) % 6;
    return (base + (phase === 4 ? 1 : phase === 5 ? 7 : 0)) % 8;
  }

  const VENUE_SURFACE_FITTINGS = {
    tavern: { tray:'venue_meal', support:'ltable', height:.7, offset:-4 },
    bank: { tray:'venue_records', support:'bankctr', height:.39, offset:1 },
    guild: { tray:'venue_records', support:'ltable', height:.7, offset:-4 },
    work: { tray:'venue_tools', height:.66, offset:3 },
  };
  const VENUE_TRAYS = new Set(Object.values(VENUE_SURFACE_FITTINGS).map(fitting => fitting.tray));

  function venuePiece(kind) {
    if (typeof VenueArt === 'undefined' || !VenueArt.at[kind]) return null;
    if (!IMG[VenueArt.image]) img(VenueArt.image);
    return artRect(VenueArt.image, VenueArt.at[kind]);
  }

  function venueFittedProp(kind, r) {
    if (kind === 'venue_medicine') {
      const source = kitPiece('w_herbs');
      if (!source && !IMG['kit/k1.webp']) img('kit/k1.webp');
      return [source, 17, 18];
    }
    if (kind === 'venue_training_mat') return [worldPiece('f'+r+'_rug') || worldPiece('f1_rug'), 38, 23];
    if (kind === 'venue_stock') return [worldPiece('f'+r+'_chest') || worldPiece('f1_chest'), 20, 16];
    if (kind === 'venue_stairs_up') return [architecturePiece(r,'stairs_up'), 32, 32];
    if (kind === 'venue_stairs_down') return [architecturePiece(r,'stairs_down'), 34, 24];
    return [null, 0, 0];
  }

  function venueProp(kind, r) {
    if (VENUE_TRAYS.has(kind)) return {c:null};
    const painted = venuePiece(kind);
    if (painted) return painted;
    const [source, w, h] = venueFittedProp(kind, r);
    const key = kind + '/' + r + (source ? '/painted/' + artVer : '');
    if (venueArt.has(key)) return venueArt.get(key);
    if (source) {
      const scale = Math.min(w*K/source.width, h*K/source.height);
      const c = mk(Math.round(source.width*scale), Math.round(source.height*scale)); c.hr = 1;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(source,0,0,c.width,c.height);
      const art = {c, ax:c.width/K/2, ay:c.height/K-1, source};
      venueArt.set(key,art);
      return art;
    }
    return {c:null};
  }

  const venueDoorArt = new Map();
  function venueDoorImage(r, side, frame) {
    const painted=architecturePiece(r,'door');
    const key = 'door/' + r + '/' + side + '/' + frame+(painted?'/painted/'+artVer:'');
    if (venueDoorArt.has(key)) {
      const art=venueDoorArt.get(key);venueDoorArt.delete(key);venueDoorArt.set(key,art);return art;
    }
    const value = BuildingView.doorLeaf(Interiors.timber[r], side, frame, painted);
    venueDoorArt.set(key, value);
    // Under 6 MiB, independent of the number of settlements visited.
    if(venueDoorArt.size>96)venueDoorArt.delete(venueDoorArt.keys().next().value);
    return value;
  }

  function venueFittingLayer(list, kind, middle, feet, sortY = feet) {
    const art = venuePiece(kind);
    if (art) list.push([sortY,art.c,middle-art.ax,feet-art.c.height/K]);
  }

  function venueSurfaceLayers(b, list) {
    const fitting = VENUE_SURFACE_FITTINGS[b.slot];
    if (!fitting || !b.furniture?.some(f => f.p === fitting.tray)) return;
    const support = b.furniture.find(f=>f.p.endsWith('_'+fitting.support));
    const bench = b.venueBench;
    const art = support ? worldPiece(support.p) || worldPiece('f1_'+fitting.support) : bench?.obj?.c;
    if (!art) return;
    const x = support ? (b.x+support.x)*T : (bench.x+.5)*T;
    const feet = support ? (b.y+support.y)*T : (bench.y+1)*T;
    const tabletop = feet - art.height/K*fitting.height;
    venueFittingLayer(list,fitting.tray,x+fitting.offset,tabletop,feet+.2);
  }

  function venueStableLayers(b, list) {
    for (const [i,[x,y]] of b.stalls.entries()) {
      const middle = (b.x+x+1)*T;
      const gate = (b.y+y+.98)*T;
      const hooves = (b.y+y+.42)*T;
      venueFittingLayer(list,'venue_stall_back',middle,gate,hooves-4);
      venueFittingLayer(list,'venue_hay_rack',middle+5,gate-13,hooves-3);

      // Open alpha between the painted rails reveals the standing horse.
      if (i === 1) venueFittingLayer(list,'venue_trough',middle,hooves+3);
      else if (typeof MountView !== 'undefined') {
        const horse = MountView.standing(i === 0 ? 1 : 2);
        if (horse) {
          const scale = .72;
          list.push([hooves,horse,middle-horse.originX/K*scale,hooves-horse.originY/K*scale,false,scale]);
        }
      }
      venueFittingLayer(list,'venue_stall_gate',middle,gate);
    }
  }

  function venueDoors(b, list) {
    if (!map || !P || !b.plan) return;
    if (b.indoor) {
      if (map.venue) venueOpenAir(b,list);
      return;
    }
    if (b.slot === 'casino' && b.fa < 1) {
      venueFittingLayer(list,'venue_runner',(b.x+b.w/2+.5)*T,(b.y+b.h-1.4)*T,b.y*T);
    }
    if (b.fa < 1) {
      if (b.stalls) venueStableLayers(b,list);
      venueSurfaceLayers(b,list);
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
    for(const wall of worldView(b).upperWalls)
      list.push([b.by+.45,wall.image,b.x*T+wall.x,b.y*T+wall.y,false,1,0,b.fa]);
  }

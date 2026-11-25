// Build the reusable canvas layers from the same tile plan that owns collision.
const BuildingView = (() => {
  const T = 16, K = 3, WALL_HEIGHT = 40;
  const DOOR_LINTEL = 7, DOOR_HEIGHT = WALL_HEIGHT - DOOR_LINTEL;
  const VERTICAL = new Set(['west', 'east']);
  const EAVES = { north: 5, east: 7, south: 4, west: 6 };
  const ROOF_PITCH = .38;

  function canvas(w, h) {
    const image = document.createElement('canvas');
    image.width = Math.ceil(w * K);
    image.height = Math.ceil(h * K);
    image.hr = 1;
    const g = image.getContext('2d');
    g.scale(K, K);
    return { image, g };
  }

  function draw(g, art, x, y, w, h) {
    if (art) g.drawImage(art, x, y, w, h);
  }

  function repeat(g, art, w, h, tint) {
    g.fillStyle = tint;
    g.fillRect(0, 0, w, h);
    if (!art) return;
    g.save();
    // The atlas already stores the pattern at the canvas' physical resolution.
    g.scale(1 / K, 1 / K);
    g.fillStyle = g.createPattern(art, 'repeat');
    g.fillRect(0, 0, w * K, h * K);
    g.restore();
  }

  function tilePath(plan, predicate, g) {
    g.beginPath();
    for (let y = 0; y < plan.h; y++) {
      let x = 0;
      while (x < plan.w) {
        if (!predicate(y * plan.w + x)) { x++; continue; }
        const start = x++;
        while (x < plan.w && predicate(y * plan.w + x)) x++;
        g.rect(start * T, y * T, (x - start) * T, T);
      }
    }
  }

  // Group only adjacent unit edges on one straight line. Optional kinds (such as doors)
  // keep structural openings out of the adjacent runs.
  function runs(edges, kind) {
    const lines = new Map(), result = [];
    for (const e of edges) {
      const vertical = VERTICAL.has(e.side);
      const line = vertical ? e.x0 : e.y0, along = vertical ? e.y : e.x;
      const key = `${e.side}:${line}`;
      if (!lines.has(key)) lines.set(key, []);
      lines.get(key).push({ first: along, last: along + 1, side: e.side, vertical, line, kind: kind && kind(e) });
    }
    for (const line of lines.values()) {
      let pending;
      for (const edge of line.sort((a, b) => a.first - b.first)) {
        if (pending && pending.last === edge.first && pending.kind === edge.kind) pending.last++;
        else { pending = edge; result.push(pending); }
      }
    }
    return result;
  }

  function span(first, last, max, fn) {
    const sections = Math.ceil((last - first) / max);
    for (let i = 0; i < sections; i++) {
      const start = first + Math.round((last - first) * i / sections);
      const end = first + Math.round((last - first) * (i + 1) / sections);
      fn(start, end - start);
    }
  }

  function renderFloor(plan, kit) {
    const w = plan.w * T, h = plan.h * T, { image, g } = canvas(w, h);
    g.save();
    tilePath(plan, i => plan.tiles[i] !== Buildings.VOID, g);
    g.clip();
    repeat(g, kit.floor, w, h, '#927052');
    for (const { x, y } of plan.walls) {
      g.fillStyle = '#49312666'; g.fillRect(x * T, y * T, T, T);
    }
    for (const { first, last, line, vertical, side } of runs(plan.edges.filter(e => plan.tiles[e.y * plan.w + e.x] === Buildings.WALL))) {
      const across = line * T + (side === 'north' || side === 'west' ? 1 : -9);
      span(first * T, last * T, 38, (start, length) => {
        if (vertical) {
          g.save(); g.translate(across + 8, start); g.rotate(Math.PI / 2);
          draw(g, kit.cap(15), 0, 0, length, 8);
          g.restore();
        } else draw(g, kit.cap(15), start, across, length, 8);
      });
    }
    g.restore();

    g.save();
    tilePath(plan, i => plan.tiles[i] === Buildings.COURT, g);
    g.clip();
    repeat(g, kit.court, w, h, '#a9a889');
    g.fillStyle = '#b4cb8a27'; g.fillRect(0, 0, w, h);
    for (const edge of plan.roofEdges) {
      const { x, y } = edge, vertical = VERTICAL.has(edge.side);
      const dx = +(edge.side === 'east') - +(edge.side === 'west');
      const dy = +(edge.side === 'south') - +(edge.side === 'north');
      if (plan.tiles[(y + dy) * plan.w + x + dx] !== Buildings.COURT) continue;
      g.fillStyle = '#423f2e62';
      g.fillRect(edge.x0 * T + (dx < 0 ? -2 : 0) - (edge.side === 'south' ? T : 0),
        edge.y0 * T + (dy < 0 ? -2 : 0) - (edge.side === 'west' ? T : 0), vertical ? 2 : T, vertical ? T : 2);
    }
    g.restore();

    for (const { x, y, facing } of plan.doors) {
      const left = x * T, top = y * T;
      const vertical = !!facing.x;
      const edgeX = vertical && facing.x > 0 ? left + T - 2 : left;
      const edgeY = !vertical && facing.y > 0 ? top + T - 2 : top;
      g.fillStyle = '#403933'; g.fillRect(edgeX, edgeY, vertical ? 2 : T, vertical ? T : 2);
      g.fillStyle = '#c7a780'; g.fillRect(edgeX, edgeY, vertical ? 1 : T, vertical ? T : 1);
    }
    return image;
  }

  // A uniform hip roof rises in proportion to distance from the nearest eave.
  // Measure to the finite edge, including its ends. Extending an interior
  // eave through the next wing would put a false fold in the middle of it.
  function roofInset(edges, x, y) {
    let inset = Infinity;
    for (const { first, last, line, vertical } of edges) {
      const across = vertical ? x : y, along = vertical ? y : x;
      inset = Math.min(inset, Math.max(Math.abs(across - line), first - along, along - last));
    }
    return inset;
  }

  function roofMesh(plan, lift) {
    const planes = new Map(), meshEdges = new Map(), vertices = new Map();
    const caps = new Path2D(), valleys = new Path2D();
    // Edge endpoints lie on the tile grid. Equal-pitch planes can therefore
    // meet on grid lines, diagonals and midlines. These eight triangles per
    // tile include each of those lines and share the same raised vertices.
    const ring = [[0, 0], [.5, 0], [1, 0], [1, .5], [1, 1], [.5, 1], [0, 1], [0, .5]];
    const stride = plan.w * 2 + 1;
    function vertex(x, y) {
      const id = y / (T / 2) * stride + x / (T / 2);
      if (!vertices.has(id)) vertices.set(id, { id, x, y, z: lift(x, y) });
      return vertices.get(id);
    }
    function project(p, a, b) {
      p.moveTo(a.x, a.y - a.z);
      p.lineTo(b.x, b.y - b.z);
    }
    function crease(a, b, opposite, plane) {
      const key = a.id < b.id ? a.id + ':' + b.id : b.id + ':' + a.id;
      const previous = meshEdges.get(key);
      if (!previous) {
        meshEdges.set(key, plane);
        return;
      }
      if (plane === previous) return;
      const { x, y, z } = opposite;
      const priorHeight = previous.dx * x + previous.dy * y + previous.offset;
      project(priorHeight > z ? caps : valleys, a, b);
    }

    for (let y = 0; y < plan.h; y++) {
      for (let x = 0; x < plan.w; x++) {
        if (!plan.roof[y * plan.w + x]) continue;
        const center = vertex((x + .5) * T, (y + .5) * T);
        const outline = ring.map(([u, v]) => vertex((x + u) * T, (y + v) * T));
        for (let i = 0; i < outline.length; i++) {
          const a = outline[i], b = outline[(i + 1) % outline.length];
          const axis = a.x === b.x ? 'y' : 'x', across = axis === 'x' ? 'y' : 'x';
          const slope = Math.round((b.z - a.z) / ((b[axis] - a[axis]) * ROOF_PITCH));
          const other = Math.round((center.z - a.z - slope * ROOF_PITCH * (center[axis] - a[axis])) /
            ((center[across] - a[across]) * ROOF_PITCH));
          const dx = (axis === 'x' ? slope : other) * ROOF_PITCH;
          const dy = (axis === 'y' ? slope : other) * ROOF_PITCH;
          const offset = Math.round((a.z - dx * a.x - dy * a.y) / ROOF_PITCH) * ROOF_PITCH;
          const key = dx + ':' + dy + ':' + offset;
          if (!planes.has(key)) planes.set(key, { dx, dy, offset, path: new Path2D() });
          const plane = planes.get(key);
          project(plane.path, a, b);
          plane.path.lineTo(center.x, center.y - center.z);
          plane.path.closePath();
          crease(a, b, center, plane);
          crease(b, center, a, plane);
          crease(center, a, b, plane);
        }
      }
    }
    return { planes, caps, valleys };
  }

  function renderRoof(plan, kit, edges, lift) {
    const w = plan.w * T, h = plan.h * T, { image, g } = canvas(w, h);
    tilePath(plan, i => !!plan.roof[i], g);
    g.clip();
    // The projected north and south slopes have different apparent depths.
    // Their shared eaves stay fixed and the projection preserves each hole.
    repeat(g, kit.roof(0), w, h, '#9c4c2c');
    const { planes, caps, valleys } = roofMesh(plan, lift);
    for (const { dx, dy, offset, path } of planes.values()) {
      g.save();
      g.clip(path);
      g.save();
      g.transform(1, -dx, 0, 1 - dy, 0, -offset);
      if (dx) {
        g.translate(w, 0);
        g.rotate(Math.PI / 2);
        repeat(g, kit.roof(0), h, w, '#9c4c2c');
      } else repeat(g, kit.roof(0), w, h, '#9c4c2c');
      g.restore();
      g.fillStyle = dy > 0 ? '#211c2371' : dy < 0 ? '#f7d4a52e' : dx > 0 ? '#d8bb991b' : '#27222c3d';
      g.fillRect(0, 0, w, h);
      g.restore();
    }

    // Caps and flashing follow the actual creases. The old stamped corner
    // patches brought their own roof planes and could read as extra dormers.
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = '#241d1b64'; g.lineWidth = 2; g.stroke(valleys);
    g.strokeStyle = '#3a291eae'; g.lineWidth = 2.8; g.stroke(caps);
    g.strokeStyle = '#e4c3a38e'; g.lineWidth = 1.05; g.stroke(caps);
    for (const { first, last, side, vertical, line } of edges) {
      const thickness = side === 'south' ? 3.5 : 2.5;
      const origin = line * T - (side === 'south' || side === 'east' ? thickness : 0);
      span(first * T, last * T, 44, (start, length) => {
        g.fillStyle = '#482e24b0';
        g.fillRect(vertical ? origin : start, vertical ? start : origin, vertical ? thickness : length, vertical ? length : thickness);
        draw(g, kit.roof(EAVES[side]), vertical ? origin : start, vertical ? start : origin,
          vertical ? thickness : length, vertical ? length : thickness);
      });
    }
    return image;
  }


  function wallPanel(g, art, x, w, height) {
    if (art) draw(g, art, x, 0, w, height);
    else {
      g.fillStyle = '#b9a48a'; g.fillRect(x, 0, w, height);
      g.fillStyle = '#5d4637'; g.fillRect(x, 0, 2, height);
      g.fillRect(x, height - 3, w, 3);
    }
  }

  function windowCap(g,width,variant) {
    const middle=width/2,half=Math.min(11,width*.32);
    // These small caps sit over the painted facade's window panel. A sloped
    // timber hood suits shuttered windows; paired stone bands suit the arch.
    g.fillStyle='#4e4035';
    if(variant===2){
      g.beginPath();g.moveTo(middle-half-2,9);g.lineTo(middle,3);
      g.lineTo(middle+half+2,9);g.closePath();g.fill();
      g.fillStyle='#d3bd95';g.fillRect(middle-half-2,9,half*2+4,1.5);
    }else{
      g.fillStyle='#cebd9e';g.fillRect(middle-half-1,5,half*2+2,2);
      g.fillStyle='#6f5a44';g.fillRect(middle-half-2,7,half*2+4,1.5);
      g.fillStyle='#b1a080';g.fillRect(middle-half-1,27,half*2+2,2);
    }
  }

  function doorway(g, art, width) {
    const jamb = 3, lintel = DOOR_LINTEL;
    // The opening stays one tile wide even if a regional painted frame is narrower.
    g.save();
    g.beginPath();
    g.rect(0, 0, width, lintel);
    g.rect(0, lintel, jamb, WALL_HEIGHT - lintel);
    g.rect(width - jamb, lintel, jamb, WALL_HEIGHT - lintel);
    g.clip();
    wallPanel(g, art, 0, width, WALL_HEIGHT);
    g.restore();
    // The opening and the moving leaf share a 16 by 33 logical-pixel aperture.
    const shade = g.createLinearGradient(0, lintel, 0, WALL_HEIGHT);
    shade.addColorStop(0, '#211b16db');
    shade.addColorStop(.35, '#28201ab0');
    shade.addColorStop(1, '#2f251b25');
    g.fillStyle = shade;
    g.fillRect(jamb, lintel, width - 2 * jamb, WALL_HEIGHT - lintel);
    g.fillStyle = '#251b16a8';
    g.fillRect(jamb, lintel, width - 2 * jamb, 1);
    g.fillRect(jamb, lintel, .8, WALL_HEIGHT - lintel);
    g.fillRect(width - jamb - .8, lintel, .8, WALL_HEIGHT - lintel);
  }

  function doorLeaf(timber, side, frame) {
    const ax = 17, ay = DOOR_HEIGHT, { image, g } = canvas(ax * 2, ay + T);
    const vertical = VERTICAL.has(side), inward = side === 'west' || side === 'north' ? 1 : -1;
    const swing = frame * Math.PI / 16, close = Math.cos(swing), open = Math.sin(swing);
    const hinge = vertical ? ax : ax - T / 2;
    const dx = vertical ? inward * (2.7 * close + 14.8 * open) : T * close + .85 * open;
    const dy = vertical ? T * close : inward * 10 * open;
    // Keep the horizontal leaf within its jambs and lintel. The near-vertical
    // side projection folds into its own threshold tile as the leaf swings.
    g.beginPath();
    if (vertical) g.rect(inward > 0 ? ax : ax - T, 0, T, ay + T);
    else g.rect(ax - T / 2, 0, T, ay);
    g.clip();
    g.transform(dx / T, dy / T, 0, 1, hinge, 0);

    g.fillStyle = timber;
    g.fillRect(0, 0, T, ay);
    const wood = g.createLinearGradient(0, 0, T, ay);
    wood.addColorStop(0, '#35221984');
    wood.addColorStop(.44, '#2c1b1470');
    wood.addColorStop(.76, '#2f211745');
    wood.addColorStop(1, '#20181280');
    g.fillStyle = wood;
    g.fillRect(0, 0, T, ay);
    for (let i = 0; i < 5; i++) {
      const x = i * T / 5;
      g.fillStyle = i % 2 ? '#241a1833' : '#ce9e7330';
      g.fillRect(x, 0, T / 5, ay);
      g.fillStyle = '#271e1980';
      g.fillRect(x, 0, .45, ay);
      g.fillStyle = '#e1b48838';
      g.fillRect(x + .55, 1, .45, ay - 2);
      g.fillStyle = '#2f201746';
      g.fillRect(x + 1.7, 3 + i * 4 % 13, .35, 7 + i % 3 * 2);
      g.fillRect(x + 2.4, 21 + i * 3 % 8, .35, 3.5);
    }
    g.fillStyle = '#211b185e';
    g.fillRect(0, 0, T, 1.1);
    g.fillRect(0, ay - 1, T, 1);
    g.fillRect(T - .85, 0, .85, ay);
    for (const y of [7, 24]) {
      g.fillStyle = '#312f2c';
      g.fillRect(0, y, 7.6, 1.7);
      g.fillStyle = '#8f887044';
      g.fillRect(.5, y, 6.6, .4);
      g.fillStyle = '#8a7964';
      g.fillRect(1.3, y + .55, .65, .65);
      g.fillRect(5.9, y + .55, .65, .65);
    }
    g.fillStyle = '#302922';
    g.fillRect(12, 15.5, 1.95, 3.8);
    g.fillStyle = '#9c815c';
    g.fillRect(12.35, 16.2, 1.15, .9);
    return { c: image, ax, ay };
  }

  function renderWalls(plan, kit) {
    const walls = [], position = (image, x, y, sortY, front) => walls.push({ image, x, y, sortY, front });
    const exterior = new Set(plan.edges.map(e => e.y * plan.w + e.x));
    const segments = runs(plan.edges, edge => plan.tiles[edge.y * plan.w + edge.x]);
    const openings = new Map();
    for (const door of plan.doors) {
      if (!VERTICAL.has(door.side)) continue;
      const key = `${door.side}:${door.x + (door.facing.x > 0 ? 1 : 0)}`;
      if (!openings.has(key)) openings.set(key, []);
      openings.get(key).push(door.y);
    }

    for (const { first, last, side, vertical, line, kind } of segments) {
      const front = side !== 'north';
      if (!vertical) {
        const bottom = line * T;
        if (kind === Buildings.DOOR) {
          for (let x = first; x < last; x++) {
            const { image, g } = canvas(T + 6, WALL_HEIGHT);
            doorway(g, kit.face(4), T + 6);
            position(image, x * T - 3, bottom - WALL_HEIGHT, bottom, front);
          }
          continue;
        }
        span(first, last, 3, (start, length) => {
          const width = length * T, { image, g } = canvas(width, WALL_HEIGHT);
          const idx = length >= 2 && (start + line) % 3 !== 0 ? 1 + ((start + line) % 3) : 0;
          g.fillStyle = '#534333'; g.fillRect(0, 2, width, WALL_HEIGHT - 3);
          wallPanel(g, kit.face(idx), 0, width, WALL_HEIGHT);
          if(idx>=1&&idx<=3)windowCap(g,width,idx===2?2:1);
          position(image, start * T, bottom - WALL_HEIGHT, bottom, front);
        });
        continue;
      }

      const left = line * T - 3, gaps = openings.get(`${side}:${line}`) || [];
      for (let y = first; y < last; y++) {
        const top = y * T - WALL_HEIGHT;
        if (kind === Buildings.DOOR) {
          const { image, g } = canvas(10, DOOR_HEIGHT + T + 3);
          const east = side === 'east', outside = east ? 2 : 1;
          // Project the jambs along the full tile. Their feet, and the leaf's
          // feet, remain at the actual north/south ends of this threshold.
          g.fillStyle = '#302c29'; g.fillRect(outside, 0, 6, T + 3);
          draw(g, kit.cap(east ? 12 : 13), outside, 0, 6, T + 3);
          for (const [index, foot] of [DOOR_HEIGHT, DOOR_HEIGHT + T].entries()) {
            const post = 3 + index * (east ? -2.7 : 2.7);
            g.fillStyle = '#514333'; g.fillRect(post, foot - DOOR_HEIGHT, 2.5, DOOR_HEIGHT);
            g.fillStyle = '#a38c6b'; g.fillRect(post + .4, foot - DOOR_HEIGHT, .65, DOOR_HEIGHT);
          }
          position(image, line * T - 4, y * T - DOOR_HEIGHT, (y + 1) * T + .4, front);
          continue;
        }
        const { image, g } = canvas(6, WALL_HEIGHT + T);
        g.beginPath();
        let from = 0;
        for (const gap of gaps) {
          const start = gap * T - top, end = start + T;
          if (end <= from || start >= WALL_HEIGHT + T) continue;
          if (start > from) g.rect(0, from, 6, start - from);
          from = end;
        }
        if (from < WALL_HEIGHT + T) g.rect(0, from, 6, WALL_HEIGHT + T - from);
        g.clip();
        wallPanel(g, kit.face(14), 0, 6, WALL_HEIGHT + T);
        draw(g, kit.cap(1), 0, 0, 6, T);
        position(image, left, top, (y + 1) * T - .25, front);
      }
    }

    const corners = new Map();
    for (const edge of plan.edges) {
      for (const [x, y] of [[edge.x0, edge.y0], [edge.x1, edge.y1]]) {
        const key = `${x}:${y}`;
        if (!corners.has(key)) corners.set(key, { x, y, sides: new Set() });
        corners.get(key).sides.add(edge.side);
      }
    }
    for (const { x, y, sides } of corners.values()) {
      if (sides.size !== 2) continue;
      const { image, g } = canvas(6, WALL_HEIGHT);
      wallPanel(g, kit.face(13), 0, 6, WALL_HEIGHT);
      position(image, x * T - 3, y * T - WALL_HEIGHT, y * T + .25, !sides.has('north'));
    }

    for (const { x, y } of plan.walls) {
      if (exterior.has(y * plan.w + x)) continue;
      const { image, g } = canvas(T, 16);
      wallPanel(g, kit.face(0), 0, T, 16);
      draw(g, kit.cap(0), 0, 0, T, 6);
      position(image, x * T, y * T, (y + 1) * T, true);
    }
    return walls;
  }

  function create(plan, { piece, r = 1, roofFamily = 1, furniture = [] }) {
    const kit = {
      face: i => piece(`wf${r}_${i}`) || piece(`wf1_${i}`),
      cap: i => piece(`wc${r}_${i}`) || piece(`wc1_${i}`),
      roof: i => piece(`wr${roofFamily}_${i}`) || piece(`wr1_${i}`),
      floor: piece(`floor${r}`) || piece('floor1'),
      court: piece('plaza'),
    };
    const roofEdges = runs(plan.roofEdges);
    const roofLift = (x, y) => T * ROOF_PITCH * roofInset(roofEdges, x / T, y / T);
    const floor = renderFloor(plan, kit), roof = renderRoof(plan, kit, roofEdges, roofLift), walls = renderWalls(plan, kit);
    const fittings = [];
    for (const { p, x, y } of furniture) {
      const art = piece(p) || piece(p.replace(/^f\d+_/, 'f1_'));
      if (!art || !Number.isFinite(x) || !Number.isFinite(y)) continue;
      const w = art.width / K, h = art.height / K, feet = y * T;
      const { image, g } = canvas(w, h);
      draw(g, art, 0, 0, w, h);
      // The training mats lie on the floor under the sparring students.
      fittings.push({ image, x: x * T - w / 2, y: feet - h, sortY: p === 'venue_training_mat' ? 0 : feet, front: false });
    }
    const left = Math.min(0, ...walls.map(wall => wall.x), ...fittings.map(item => item.x));
    const top = Math.min(-WALL_HEIGHT, ...walls.map(wall => wall.y), ...fittings.map(item => item.y));
    const right = Math.max(plan.w * T, ...walls.map(wall => wall.x + wall.image.width / K), ...fittings.map(item => item.x + item.image.width / K));
    const bottom = Math.max(plan.h * T, ...walls.map(wall => wall.y + wall.image.height / K), ...fittings.map(item => item.y + item.image.height / K));
    const bounds = { x: left, y: top, w: right - left, h: bottom - top };
    return { floor, roof, roofLift, walls, furniture: fittings, wallHeight: WALL_HEIGHT, bounds };
  }

  return { create, doorLeaf };
})();

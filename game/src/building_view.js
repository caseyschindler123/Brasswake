// Build the reusable canvas layers from the same tile plan that owns collision.
const BuildingView = (() => {
  const T = 16, K = 3, WALL_HEIGHT = 40;
  const VERTICAL = new Set(['west', 'east']);
  const EAVES = { north: 5, east: 7, south: 4, west: 6 };

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

  function roofRuns(plan) {
    const { w, h, roof } = plan, rows = [], cols = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w;) {
        if (!roof[y * w + x]) { x++; continue; }
        const start = x++;
        while (x < w && roof[y * w + x]) x++;
        const limits = [start, x];
        for (let i = start; i < x; i++) rows[y * w + i] = limits;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h;) {
        if (!roof[y * w + x]) { y++; continue; }
        const start = y++;
        while (y < h && roof[y * w + x]) y++;
        const limits = [start, y];
        for (let i = start; i < y; i++) cols[i * w + x] = limits;
      }
    }
    return { rows, cols };
  }

  function roofPlanes(plan, g, kit, w, h) {
    const { rows, cols } = roofRuns(plan), planes = Array.from({ length: 4 }, () => new Path2D());
    const ridges = new Map();
    const triangles = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]];
    const samples = [[.5, .17], [.83, .5], [.5, .83], [.17, .5]];
    for (let y = 0; y < plan.h; y++) {
      for (let x = 0; x < plan.w; x++) {
        const i = y * plan.w + x;
        if (!plan.roof[i]) continue;
        const [l, r] = rows[i], [n, s] = cols[i];
        for (let f = 0; f < 4; f++) {
          const [dx, dy] = samples[f];
          const distances = [y + dy - n, r - x - dx, s - y - dy, x + dx - l];
          const p = planes[distances.indexOf(Math.min(...distances))];
          const [ax, ay, bx, by] = triangles[f];
          p.moveTo((x + ax) * T, (y + ay) * T);
          p.lineTo((x + bx) * T, (y + by) * T);
          p.lineTo((x + .5) * T, (y + .5) * T);
          p.closePath();
        }
        const mx = (l + r) / 2, my = (n + s) / 2;
        if (y <= my && my < y + 1 && Math.min(x + .5 - l, r - x - .5) >= (s - n) / 2) {
          const key = `h:${my}`;
          if (!ridges.has(key)) ridges.set(key, []);
          ridges.get(key).push(x);
        }
        if (x <= mx && mx < x + 1 && Math.min(y + .5 - n, s - y - .5) > (r - l) / 2) {
          const key = `v:${mx}`;
          if (!ridges.has(key)) ridges.set(key, []);
          ridges.get(key).push(y);
        }
      }
    }
    repeat(g, kit.roof(0), w, h, '#9c4c2c');
    const tint = ['#32181147', '#4d251a22', '#fbc69518', '#3b23143b'];
    for (let face = 0; face < planes.length; face++) {
      g.save();
      g.clip(planes[face]);
      if (face === 1 || face === 3) {
        g.save();
        g.translate(w, 0); g.rotate(Math.PI / 2);
        repeat(g, kit.roof(1), h, w, '#9c4c2c');
        g.restore();
      }
      g.fillStyle = tint[face]; g.fillRect(0, 0, w, h);
      g.restore();
    }
    return ridges;
  }

  function renderRoof(plan, kit) {
    const w = plan.w * T, h = plan.h * T, { image, g } = canvas(w, h);
    tilePath(plan, i => !!plan.roof[i], g);
    g.clip();
    const ridges = roofPlanes(plan, g, kit, w, h);
    for (const { first, last, side, vertical, line } of runs(plan.roofEdges)) {
      const shift = side === 'south' || side === 'east' ? -5 : 0;
      span(first * T, last * T, 44, (start, length) => {
        const origin = line * T + shift;
        g.fillStyle = '#48281da0';
        g.fillRect(vertical ? origin : start, vertical ? start : origin, vertical ? 5 : length, vertical ? length : 5);
        draw(g, kit.roof(EAVES[side]), vertical ? origin : start, vertical ? start : origin,
          vertical ? 5 : length, vertical ? length : 5);
      });
    }
    const covered = (x, y) => x >= 0 && y >= 0 && x < plan.w && y < plan.h && !!plan.roof[y * plan.w + x];
    const corners = [[-1, -1, 8, 12], [1, -1, 9, 13], [-1, 1, 10, 14], [1, 1, 11, 15]];
    for (let y = 0; y < plan.h; y++) {
      for (let x = 0; x < plan.w; x++) {
        if (!covered(x, y)) continue;
        for (const [dx, dy, hip, valley] of corners) {
          const a = covered(x + dx, y), b = covered(x, y + dy);
          if (!a && !b) draw(g, kit.roof(hip), x * T + (dx > 0 ? -3 : 0), y * T + (dy > 0 ? -3 : 0), 19, 19);
          if (a && b && !covered(x + dx, y + dy)) {
            draw(g, kit.roof(valley), x * T + (dx < 0 ? -7 : 5), y * T + (dy < 0 ? -7 : 5), 18, 18);
          }
        }
      }
    }
    for (const [key, positions] of ridges) {
      const [axis, line] = key.split(':'), vertical = axis === 'v';
      const across = +line * T - 2.5;
      const bands = [];
      for (const pos of positions.sort((a, b) => a - b)) {
        const tail = bands[bands.length - 1];
        if (tail && tail.end === pos) tail.end++;
        else bands.push({ start: pos, end: pos + 1 });
      }
      for (const band of bands) span(band.start * T, band.end * T, 42, (start, length) => {
        draw(g, kit.roof(vertical ? 3 : 2), vertical ? across : start, vertical ? start : across,
          vertical ? 5 : length, vertical ? length : 5);
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
    const jamb = 3, lintel = 7;
    // A transparent opening stays one tile wide even if a regional painted frame is narrower.
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
          const { image, g } = canvas(10, 33 + T + 3);
          const east = side === 'east', outside = east ? 2 : 1;
          // Project the jambs along the full tile. Their feet, and the leaf's
          // feet, remain at the actual north/south ends of this threshold.
          g.fillStyle = '#302c29'; g.fillRect(outside, 0, 6, T + 3);
          draw(g, kit.cap(east ? 12 : 13), outside, 0, 6, T + 3);
          for (const [index,foot] of [33, 33 + T].entries()) {
            const post = east ? (index ? 7 : 0) : (index ? 0 : 7);
            g.fillStyle = '#514333'; g.fillRect(post, foot - 33, 2.5, 33);
            g.fillStyle = '#c4ad87'; g.fillRect(post, foot - 33, .8, 33);
          }
          position(image, line * T - 4, y * T - 33, (y + 1) * T + .4, front);
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
    const floor = renderFloor(plan, kit), roof = renderRoof(plan, kit), walls = renderWalls(plan, kit);
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
    return { floor, roof, walls, furniture: fittings, wallHeight: WALL_HEIGHT, bounds };
  }

  return { create };
})();

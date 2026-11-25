// Pure tile geometry for the modular building renderer and surface movement.
const Buildings = (() => {
  const VOID = 0, WALL = 1, FLOOR = 2, DOOR = 3, COURT = 4;
  const MAX_SIDE = 64;
  const SIDES = [
    { side: 'north', dx: 0, dy: -1, line: [0, 0, 1, 0] },
    { side: 'east', dx: 1, dy: 0, line: [1, 0, 1, 1] },
    { side: 'south', dx: 0, dy: 1, line: [1, 1, 0, 1] },
    { side: 'west', dx: -1, dy: 0, line: [0, 1, 0, 0] },
  ];

  function tileAt(grid, w, h, x, y) {
    return x >= 0 && y >= 0 && x < w && y < h ? grid[y * w + x] : VOID;
  }

  function contains(plan, x, y, roofOnly = false) {
    return Number.isInteger(x) && Number.isInteger(y)
      && tileAt(roofOnly ? plan.roof : plan.tiles, plan.w, plan.h, x, y) !== VOID;
  }

  function walkable(plan, x, y) {
    return Number.isInteger(x) && Number.isInteger(y)
      && tileAt(plan.tiles, plan.w, plan.h, x, y) >= FLOOR;
  }

  function footprint(w, h, shape, diagram) {
    const mask = new Uint8Array(w * h);
    if (diagram !== undefined) {
      // In authored diagrams space is exterior, . is covered, # adds a partition, and o is open court.
      if (!Array.isArray(diagram) || diagram.length !== h) throw new TypeError('Invalid building diagram height');
      const marks = { ' ': VOID, '.': FLOOR, '#': WALL, o: COURT };
      for (let y = 0; y < h; y++) {
        const row = diagram[y];
        if (typeof row !== 'string' || row.length !== w || /[^ .#o]/.test(row)) {
          throw new TypeError(`Invalid building diagram row ${y}`);
        }
        for (let x = 0; x < w; x++) mask[y * w + x] = marks[row[x]];
      }
      return mask;
    }

    const armWidth = Math.ceil(w / 2), notchHeight = Math.floor(h / 2);
    const ringX = Math.max(3, Math.floor(w / 3)), ringY = Math.max(3, Math.floor(h / 3));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (shape === 'L' && x >= armWidth && y < notchHeight) continue;
        const court = shape === 'courtyard' && x >= ringX && x < w - ringX && y >= ringY && y < h - ringY;
        mask[y * w + x] = court ? COURT : FLOOR;
      }
    }
    return mask;
  }

  function reachable(grid, w, h, seeds, passable) {
    const seen = new Uint8Array(grid.length), queue = [];
    function add(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = y * w + x;
      if (seen[i] || !passable(grid[i])) return;
      seen[i] = 1;
      queue.push(i);
    }
    for (const { x, y } of seeds) add(x, y);
    for (let i = 0; i < queue.length; i++) {
      const x = queue[i] % w, y = Math.floor(queue[i] / w);
      for (const { dx, dy } of SIDES) add(x + dx, y + dy);
    }
    return { seen, count: queue.length };
  }

  function tilesFor(mask, w, h, authored) {
    const tiles = mask.slice(), sample = (x, y) => tileAt(mask, w, h, x, y);
    if (authored) {
      const border = [];
      for (let x = 0; x < w; x++) border.push({ x, y: 0 }, { x, y: h - 1 });
      for (let y = 1; y < h - 1; y++) border.push({ x: 0, y }, { x: w - 1, y });
      const outside = reachable(mask, w, h, border, t => t === VOID).seen;
      if (mask.some((t, i) => t === VOID && !outside[i])) throw new Error('Enclosed void must be marked as courtyard');
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (mask[i] < FLOOR) continue;
        // A concave corner needs a wall even when its only exposed neighbor is diagonal.
        let exposed = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) exposed = exposed || sample(x + dx, y + dy) === VOID;
        }
        if (exposed && mask[i] === COURT) throw new Error('Courtyard must be enclosed');
        if (exposed) tiles[i] = WALL;
      }
    }
    return tiles;
  }

  function doorsFor(specs, shell, w, h) {
    if (!Array.isArray(specs) || specs.length > 2 * (w + h)) {
      throw new TypeError('Building needs a valid entrance list');
    }
    const sample = (x, y) => tileAt(shell, w, h, x, y), used = new Set();
    return Array.from(specs, spec => {
      const name = typeof spec === 'string' ? spec : spec && spec.side;
      const dir = SIDES.find(d => d.side === name || d.side[0] === name);
      if (!dir) throw new TypeError(`Invalid building entrance side: ${name}`);
      const { side, dx, dy } = dir, length = dx ? h : w;
      const given = typeof spec === 'object' ? spec.offset : undefined;
      if (given !== undefined && (!Number.isInteger(given) || given < 0 || given >= length)) {
        throw new RangeError(`Invalid ${side} entrance offset`);
      }

      function at(offset) {
        let x = dx ? (dx < 0 ? 0 : w - 1) : offset;
        let y = dy ? (dy < 0 ? 0 : h - 1) : offset;
        while (x >= 0 && y >= 0 && x < w && y < h && sample(x, y) === VOID) {
          x -= dx;
          y -= dy;
        }
        const inside = { x: x - dx, y: y - dy }, outside = { x: x + dx, y: y + dy };
        if (sample(x, y) !== WALL || sample(inside.x, inside.y) !== FLOOR || used.has(y * w + x)) return null;
        // Both jambs must be on the same straight run, including the exterior cells beyond them.
        for (const sign of [-1, 1]) {
          const jx = x + sign * dy, jy = y + sign * dx;
          if (sample(jx, jy) !== WALL || sample(jx + dx, jy + dy) !== VOID) return null;
        }
        return { x, y, side, offset, inside, outside, facing: { x: dx, y: dy } };
      }

      let door;
      if (given === undefined) {
        const centre = Math.floor(length / 2);
        door = at(centre);
        for (let d = 1; !door && d <= centre; d++) {
          if (centre - d >= 0) door = at(centre - d);
          if (!door && centre + d < length) door = at(centre + d);
        }
      } else {
        door = at(given);
      }
      if (!door) throw new Error(`No straight wall and walkable landing for ${side} entrance`);
      used.add(door.y * w + door.x);
      return door;
    });
  }

  function surfaces(tiles, w, h) {
    const roof = new Uint8Array(tiles.length), walls = [], edges = [], roofEdges = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, tile = tiles[i];
        if (tile === VOID) continue;
        if (tile === WALL) walls.push({ x, y });
        if (tile !== COURT) roof[i] = 1;
        for (const { side, dx, dy, line: [ax, ay, bx, by] } of SIDES) {
          const next = tileAt(tiles, w, h, x + dx, y + dy);
          if (next !== VOID && next !== COURT) continue;
          const edge = { x, y, side, x0: x + ax, y0: y + ay, x1: x + bx, y1: y + by };
          if (next === VOID) edges.push(edge);
          if (roof[i]) roofEdges.push(edge);
        }
      }
    }
    return { roof, walls, edges, roofEdges };
  }

  // Return the world origin and size, with every tile, door, landing and edge described locally.
  // tiles and roof are row-major masks. walls lists all blocking tiles. edges traces the exterior;
  // roofEdges adds the roof's courtyard boundaries. Segment endpoints are tile-grid coordinates.
  // Doors face outwards. An explicitly empty door list describes a sealed shell.
  function compile(spec) {
    if (!spec || typeof spec !== 'object') throw new TypeError('Building specification required');
    const { id, x = 0, y = 0, w, h, shape = 'rect', diagram, doors: requestedDoors = ['south'] } = spec;
    if (typeof id !== 'string' || !id.trim() || !Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
      throw new TypeError('Building needs an id and integer origin');
    }
    if (!['rect', 'L', 'courtyard'].includes(shape)) throw new TypeError(`Invalid building shape: ${shape}`);
    const min = { rect: 4, L: 8, courtyard: 11 }[shape];
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < min || h < min || w > MAX_SIDE || h > MAX_SIDE) {
      throw new RangeError(`Building dimensions must be between ${min} and ${MAX_SIDE}`);
    }
    if (!Number.isSafeInteger(x - 1) || !Number.isSafeInteger(y - 1)
        || !Number.isSafeInteger(x + w) || !Number.isSafeInteger(y + h)) {
      throw new RangeError('Building landings exceed safe coordinates');
    }

    const mask = footprint(w, h, shape, diagram), tiles = tilesFor(mask, w, h, diagram !== undefined);
    const doors = doorsFor(requestedDoors, tiles, w, h);
    for (const door of doors) tiles[door.y * w + door.x] = DOOR;
    if (doors.length) {
      const passable = t => t >= FLOOR;
      const { count } = reachable(tiles, w, h, [doors[0].inside], passable);
      if (count !== tiles.reduce((size, t) => size + Number(passable(t)), 0)) {
        throw new Error('Building floor and entrances must be connected');
      }
    }
    return { id, x, y, w, h, shape, tiles, doors, ...surfaces(tiles, w, h) };
  }

  // Owned houses keep their existing solid footprint and interaction panel.
  // Their sealed visual shell may be smaller than a walk-in building.
  function facade({id,w,h,shape='rect'}) {
    if(typeof id!=='string'||!id.trim()||!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>MAX_SIDE||h>MAX_SIDE)
      throw new TypeError('Invalid sealed facade');
    if(!['rect','L'].includes(shape))throw new TypeError('Invalid sealed facade shape');
    const tiles=tilesFor(footprint(w,h,shape),w,h,false);
    return {id,x:0,y:0,w,h,shape,visualOnly:true,tiles,doors:[],...surfaces(tiles,w,h)};
  }

  return { compile, facade, contains, walkable, VOID, WALL, FLOOR, DOOR, COURT };
})();

if (typeof module !== 'undefined') module.exports = Buildings;

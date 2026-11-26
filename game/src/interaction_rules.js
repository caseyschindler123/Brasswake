/* Contact in the same continuous tile coordinates as manual movement. */
const InteractionRules = (() => {
  const reach = 1.35;
  const cell = Math.round;
  const epsilon = 1e-9;

  function faces(entity) {
    if (entity.kind === 'dgate') return entity.cells;
    if (entity.kind === 'dtravel' && entity.support) {
      const { x, y, w, h } = entity.support;
      return Array.from({ length: w }, (_, i) => [x + i, y + h - 1]);
    }
    if (entity.kind === 'fish') return [[entity.x, entity.y]];
    return undefined;
  }

  function clearContact(ax, ay, bx, by, blocked) {
    let x = cell(ax), y = cell(ay);
    const endX = cell(bx), endY = cell(by);
    const dx = bx - ax, dy = by - ay;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    // Crossing from one diagonal cell to another requires both sides of
    // that corner to be open, even when the feet are a little off centre.
    if (Math.abs(x - endX) === 1 && Math.abs(y - endY) === 1 &&
        (blocked(endX, y, false) || blocked(x, endY, false))) return false;
    while (x !== endX || y !== endY) {
      const crossX = x === endX ? Infinity : (x + sx * .5 - ax) / dx;
      const crossY = y === endY ? Infinity : (y + sy * .5 - ay) / dy;
      if (Math.abs(crossX - crossY) <= epsilon) {
        if (blocked(x + sx, y, false) || blocked(x, y + sy, false)) return false;
        x += sx;
        y += sy;
      } else if (crossX < crossY) x += sx;
      else y += sy;
      if ((x !== endX || y !== endY) && blocked(x, y, false)) return false;
    }
    return !blocked(endX, endY, true);
  }

  // Contact normally uses the visible feet, but authored fixtures may
  // expose several different faces. Only the chosen endpoint is exempt
  // from fixture collision. Terrain and other actors can obstruct the way.
  function distance(player, entity, map) {
    let nearest = Infinity;
    const obstructs = (x, y, fixture) => {
      if (x < 0 || y < 0 || x >= map.w || y >= map.h) return true;
      const i = y * map.w + x, occupant = map.occ.get(i);
      const fixtureSurface = fixture && (entity.kind !== 'fish' || map.t[i] === 4);
      return (!fixtureSurface && !!map.solid[i]) || (!!occupant && occupant !== entity);
    };
    const check = (x, y, fixture) => {
      const d = Math.hypot(x - player.fx, y - player.fy);
      if (d > reach || d >= nearest) return;
      if (clearContact(player.fx, player.fy, x, y,
        (a, b, endpoint) => obstructs(a, b, endpoint && fixture))) nearest = d;
    };
    check(entity.fx, entity.fy, false);
    for (const [x, y] of faces(entity) || []) check(x, y, true);
    return nearest;
  }

  return { distance, faces, reach };
})();
if (typeof module !== 'undefined') module.exports = InteractionRules;

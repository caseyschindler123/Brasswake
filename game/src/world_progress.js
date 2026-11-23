// World revision is independent of the character and account data formats.
const WorldProgress = ((geography) => {
  const revision = 3;
  const legacySize = [576, 1008];
  // Town anchors from the rectangular world used by revision 2.
  const legacyTowns = [null, [100, 892], [448, 872], [416, 642], [154, 618],
    [134, 388], [448, 368], [420, 138], [144, 126]];

  const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const current = version => Number.isInteger(version) && version >= revision;
  const validRegion = r => Number.isInteger(r) && r >= 1 && r < legacyTowns.length;
  const legacyPoint = p => Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1]) &&
    p[0] >= 0 && p[0] < legacySize[0] && p[1] >= 0 && p[1] < legacySize[1];

  function nearestLegacyTown(point, fallback) {
    if (!legacyPoint(point)) return validRegion(fallback) ? fallback : 1;
    let best = Infinity, region = 1;
    for (let r = 1; r < legacyTowns.length; r++) {
      const [tx, ty] = legacyTowns[r];
      const distance = (point[0] - tx) ** 2 + (point[1] - ty) ** 2;
      if (distance < best || (distance === best && r === fallback)) {
        best = distance;
        region = r;
      }
    }
    return region;
  }

  function translate(point, region) {
    if (!legacyPoint(point)) return null;
    const [oldX, oldY] = legacyTowns[region], [x, y] = geography.towns[region];
    return [point[0] + x - oldX, point[1] + y - oldY];
  }

  // Prefer an exact translated offset, then search bounded rings around it.
  // The scene checks its actual ground, collision, and dynamic occupancy.
  function near(point, usable, radius) {
    if (!point) return null;
    const [x, y] = point;
    if (usable(x, y)) return point;
    for (let distance = 1; distance <= radius; distance++) {
      for (let dy = -distance; dy <= distance; dy++) {
        for (let dx = -distance; dx <= distance; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === distance && usable(x + dx, y + dy)) return [x + dx, y + dy];
        }
      }
    }
    return null;
  }

  function surfacePoint(point, region, dx = 0, dy = 3) {
    const [x, y] = geography.towns[region];
    const usable = (tx, ty) => geography.region(tx, ty) === region && geography.land(tx, ty) &&
      geography.land(tx - 1, ty) && geography.land(tx + 1, ty) &&
      geography.land(tx, ty - 1) && geography.land(tx, ty + 1);
    return near(translate(point, region), usable, 24) || [x + dx, y + dy];
  }

  // Update only the overworld fields in place. A null position still means
  // first arrival to the game, and floor-local positions use another grid.
  function migrateCharacter(character) {
    if (!record(character) || current(character.wv)) return character;
    const region = validRegion(character.region) ? character.region : nearestLegacyTown(character.pos);
    character.region = region;
    if (character.pos != null) character.pos = surfacePoint(character.pos, region);
    const dungeon = character.dungeon;
    if (record(dungeon)) dungeon.back = surfacePoint(dungeon.back, validRegion(dungeon.r) ? dungeon.r : region);

    const death = character.deathPending;
    if (record(death)) {
      if (!validRegion(death.r)) death.r = nearestLegacyTown(death.at, region);
      death.at = surfacePoint(death.at, death.r, -13, 10);
    } else if (death != null) character.deathPending = null;

    const body = character.remains;
    if (record(body)) {
      const point = [body.x, body.y];
      // Old surface corpses carry no region ID. Use the body location because
      // the player may have moved or fallen again since dropping it.
      const owner = nearestLegacyTown(point, record(death) ? death.r : region);
      [body.x, body.y] = surfacePoint(point, owner);
    } else if (body != null) character.remains = null;
    character.wv = revision;
    return character;
  }

  function relocateHome(home) {
    if (!record(home)) return;
    const point = [home.x, home.y], region = validRegion(home.r) ? home.r : nearestLegacyTown(point);
    const dimension = n => Number.isInteger(n) && n > 0 && n <= 8 ? n : 1;
    const w = dimension(home.w), h = dimension(home.h);
    const usable = (x, y) => {
      if (geography.region(x, y) !== region) return false;
      for (let dy = -1; dy <= h + 1; dy++) {
        for (let dx = -1; dx <= w; dx++) {
          if (!geography.land(x + dx, y + dy) || geography.inTown(x + dx, y + dy)) return false;
        }
      }
      return true;
    };
    const [x0, , x1, y1] = geography.city(region);
    const farmEdge = [Math.floor((x0 + x1) / 2), y1 + 5];
    const candidate = near(translate(point, region), usable, 24) || near(farmEdge, usable, 24) || farmEdge;
    [home.x, home.y] = candidate;
    home.r = region;
  }

  // The account marker covers the shared homes. Slots have individual markers
  // so a partly migrated account can still carry older, inactive characters.
  function migrateAccount(account) {
    if (!record(account)) return account;
    if (Array.isArray(account.slots)) for (const character of account.slots) migrateCharacter(character);
    if (current(account.wv)) return account;
    if (Array.isArray(account.homes)) for (const home of account.homes) relocateHome(home);
    account.wv = revision;
    return account;
  }

  function reconcileErrands(character, sites) {
    if (!record(character) || !record(character.er) || !record(character.er.a) || !Array.isArray(sites)) return false;
    const byId = new Map(sites.map(site => [site.id, site]));
    const bearing = (a, b) => ['east','south-east','south','south-west','west','north-west','north','north-east'][
      ((Math.round(Math.atan2(b.y - a.y, b.x - a.x) / Math.PI * 4) % 8) + 8) % 8];
    let changed = false;
    for (const errand of Object.values(character.er.a)) {
      if (!record(errand)) continue;
      const giver = byId.get(errand.id), target = byId.get(errand.type === 'deliver' ? errand.to : errand.at);
      if (!giver || !target || !['deliver','find'].includes(errand.type)) continue;
      const who = errand.type === 'deliver' ? target.name : /^(a|an|the) /i.test(target.name)
        ? target.name[0].toLowerCase() + target.name.slice(1) : 'the ' + target.name.toLowerCase();
      for (const [key, next] of [['who',who], ['where',bearing(giver,target)], ['from',giver.name]]) {
        const prior = errand[key]; if (prior === next) continue;
        if (typeof prior === 'string' && prior) {
          const pattern = new RegExp('\\b' + prior.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
          for (const text of ['what','line']) if (typeof errand[text] === 'string') errand[text] = errand[text].replace(pattern, () => next);
        }
        errand[key] = next; changed = true;
      }
    }
    return changed;
  }

  return { revision, migrateCharacter, migrateAccount, reconcileErrands };
})(typeof module === 'undefined' ? Geography : require('./geography'));

if (typeof module !== 'undefined') module.exports = WorldProgress;

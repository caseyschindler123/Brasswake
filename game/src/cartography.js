/* Surface exploration and map entitlements, independent of Scene and the economy UI. */
const Cartography = (() => {
  const VERSION = 1;
  const width = 768, height = 1152, cellSize = 4, radius = 14;
  const cols = width / cellSize, rows = height / cellSize;
  const groups = cols * rows / 6;
  const digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const regionCount = 8, atlasPrice = 30000;
  const publicKinds = new Set(['town', 'stairs', 'poi', 'fish', 'ferry']);
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const inBounds = (x, y) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x < width && y >= 0 && y < height;
  const validRegion = r => Number.isInteger(r) && r >= 1 && r <= regionCount;
  const stableId = id => typeof id === 'string' && id.length <= 64 && /^[A-Za-z]/.test(id) && !/[^A-Za-z0-9_:-]/.test(id);
  const validMask = mask => mask instanceof Uint8Array && mask.length === groups;

  const create = () => ({ v: VERSION, explored: '', maps: {}, waypoint: null });
  const createMask = () => new Uint8Array(groups);

  function normalizeExplored(saved) {
    if (typeof saved !== 'string' || saved.length > groups || /[^A-Za-z0-9_-]/.test(saved)) return '';
    let end = saved.length;
    while (end && saved[end - 1] === digits[0]) end--;
    return saved.slice(0, end);
  }

  function decode(saved) {
    const mask = createMask(), packed = normalizeExplored(saved);
    for (let i = 0; i < packed.length; i++) mask[i] = digits.indexOf(packed[i]);
    return mask;
  }

  function encode(mask) {
    if (!validMask(mask)) return '';
    let end = mask.length;
    while (end && mask[end - 1] === 0) end--;
    let packed = '';
    for (let i = 0; i < end; i++) {
      if (mask[i] >= digits.length) return '';
      packed += digits[mask[i]];
    }
    return packed;
  }

  function exploredAt(mask, x, y) {
    if (!inBounds(x, y) || !validMask(mask)) return false;
    const index = Math.floor(y / cellSize) * cols + Math.floor(x / cellSize);
    return !!(mask[Math.floor(index / 6)] & (1 << (index % 6)));
  }

  function reveal(mask, x, y, distance = radius) {
    if (!inBounds(x, y) || !validMask(mask) || !Number.isFinite(distance) || distance <= 0) return false;
    const reach = Math.min(radius, distance), squared = reach * reach;
    const left = Math.max(0, Math.floor((x - reach) / cellSize));
    const right = Math.min(cols - 1, Math.floor((x + reach) / cellSize));
    const top = Math.max(0, Math.floor((y - reach) / cellSize));
    const bottom = Math.min(rows - 1, Math.floor((y + reach) / cellSize));
    const offset = (cellSize - 1) / 2;
    let changed = false;
    // Each cell is charted as a unit when its centre is within the walking radius.
    for (let row = top; row <= bottom; row++) {
      const dy = row * cellSize + offset - y;
      for (let col = left; col <= right; col++) {
        const dx = col * cellSize + offset - x;
        if (dx * dx + dy * dy > squared) continue;
        const index = row * cols + col, group = Math.floor(index / 6), bit = 1 << (index % 6);
        if (mask[group] & bit) continue;
        mask[group] |= bit;
        changed = true;
      }
    }
    return changed;
  }

  function normalizeWaypoint(value) {
    return value && stableId(value.id) ? { id: value.id } : null;
  }

  function ownsMap(state, r) {
    const maps = state && state.v === VERSION && state.maps;
    return !!(validRegion(r) && maps && typeof maps === 'object' && !Array.isArray(maps) && own(maps, r) && maps[r] === true);
  }

  function normalize(value) {
    const state = create();
    if (!value || value.v !== VERSION) return state;
    state.explored = normalizeExplored(value.explored);
    state.waypoint = normalizeWaypoint(value.waypoint);
    for (let r = 1; r <= regionCount; r++) {
      if (ownsMap(value, r)) state.maps[r] = true;
    }
    return state;
  }

  function allMaps(state) {
    for (let r = 1; r <= regionCount; r++) {
      if (!ownsMap(state, r)) return false;
    }
    return true;
  }

  const price = r => validRegion(r) ? 600 + 300 * (r - 1) : null;
  const quotation = (cost, reason = null) => ({ ok: reason === null, cost, reason });
  const canAfford = (gold, cost) => Number.isFinite(gold) && gold >= cost;

  function quoteMap(state, r, gold, shopRegion) {
    const cost = price(r);
    if (cost === null) return quotation(cost, 'region');
    if (shopRegion !== r) return quotation(cost, 'shop');
    if (ownsMap(state, r)) return quotation(cost, 'owned');
    return quotation(cost, canAfford(gold, cost) ? null : 'gold');
  }

  function quoteAtlas(state, gold, shopRegion, atlasOwned) {
    if (shopRegion !== regionCount) return quotation(atlasPrice, 'shop');
    if (atlasOwned) return quotation(atlasPrice, 'owned');
    if (!allMaps(state)) return quotation(atlasPrice, 'maps');
    return quotation(atlasPrice, canAfford(gold, atlasPrice) ? null : 'gold');
  }

  function isPublicDestination(dest) {
    return !!(dest && stableId(dest.id) && publicKinds.has(dest.kind) && !dest.secret && validRegion(dest.r) &&
      Number.isInteger(dest.x) && Number.isInteger(dest.y) && inBounds(dest.x, dest.y));
  }

  function canTravel(state, dest, context) {
    if (!context || context.surface !== true || context.blocked || !isPublicDestination(dest)) return false;
    if (context.mode === 'regional') return context.region === dest.r && ownsMap(state, dest.r);
    return context.mode === 'atlas' && stableId(context.houseId) && context.houseId === context.installedHouseId && allMaps(state);
  }

  return { VERSION, width, height, cellSize, radius, create, createMask, decode, encode, reveal, exploredAt,
    normalize, normalizeWaypoint, ownsMap, allMaps, price, atlasPrice, quoteMap, quoteAtlas, isPublicDestination, canTravel };
})();
if (typeof module !== 'undefined') module.exports = Cartography;

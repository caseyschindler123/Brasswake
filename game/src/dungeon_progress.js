/* Persistent dungeon rules; deliberately independent of drawing and DOM. */
const DungeonProgress = (() => {
  const VERSION = 1, RESPAWN = 300000, IMPORTANT_RESPAWN = 900000;
  const SEEN_PREFIX = 'b1:', SEEN_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  // Imported saves cannot allocate a discovery map larger than 512 × 512 cells.
  const MAX_SEEN_CELLS = 512 * 512;

  function packSeen(cells) {
    let end = Math.min(cells.length, MAX_SEEN_CELLS);
    while (end > 0 && !cells[end - 1]) end--;
    let packed = SEEN_PREFIX;
    for (let base = 0; base < end; base += 6) {
      let bits = 0;
      for (let i = base; i < Math.min(base + 6, end); i++) {
        if (cells[i]) bits |= 1 << (i - base);
      }
      packed += SEEN_DIGITS[bits];
    }
    return packed;
  }

  function unpackSeen(saved, size) {
    const length = Number.isSafeInteger(size) && size > 0 ? Math.min(size, MAX_SEEN_CELLS) : 0;
    const cells = new Uint8Array(length);
    if (Array.isArray(saved)) {
      const limit = Math.min(saved.length, MAX_SEEN_CELLS);
      for (let i = 0; i < limit; i++) {
        const index = saved[i];
        if (Number.isInteger(index) && index >= 0 && index < length) cells[index] = 1;
      }
    } else if (typeof saved === 'string' && saved.startsWith(SEEN_PREFIX)) {
      const end = Math.min(saved.length, SEEN_PREFIX.length + Math.ceil(length / 6));
      for (let i = SEEN_PREFIX.length, base = 0; i < end; i++, base += 6) {
        const bits = SEEN_DIGITS.indexOf(saved[i]);
        if (bits < 0) return cells.fill(0);
        for (let bit = 0; bit < 6 && base + bit < length; bit++) cells[base + bit] = (bits >>> bit) & 1;
      }
    }
    return cells;
  }

  function compact(character, now = Date.now()) {
    const regions = character && character.dungeons;
    if (!regions || typeof regions !== 'object') return character;
    for (const progress of Object.values(regions)) {
      if (!progress || typeof progress !== 'object') continue;
      if (progress.seen && typeof progress.seen === 'object') {
        for (const [floor, saved] of Object.entries(progress.seen)) {
          if (!Array.isArray(saved)) continue;
          let size = 0;
          const limit = Math.min(saved.length, MAX_SEEN_CELLS);
          for (let i = 0; i < limit; i++) {
            const index = saved[i];
            if (Number.isInteger(index) && index >= 0 && index < MAX_SEEN_CELLS) size = Math.max(size, index + 1);
          }
          progress.seen[floor] = packSeen(unpackSeen(saved, size));
        }
      }
      if (progress.bodies && typeof progress.bodies === 'object') {
        for (const [id, body] of Object.entries(progress.bodies)) {
          if (!body || !Number.isFinite(body.until) || body.until <= now) delete progress.bodies[id];
        }
      }
    }
    return character;
  }

  function ensure(s, r, day) {
    if (!s.dungeons || typeof s.dungeons !== 'object') s.dungeons = {};
    let p = s.dungeons[r];
    if (!p || p.v !== VERSION) p = s.dungeons[r] = { v: VERSION, day, seen: {}, gates: {}, lore: {}, kills: {}, seals: {}, claimed: {}, keeper: false };
    for (const k of ['seen', 'gates', 'lore', 'kills', 'seals', 'claimed']) if (!p[k] || typeof p[k] !== 'object') p[k] = {};
    if (p.day !== day) { p.day = day; p.seals = {}; p.claimed = {}; p.keeper = false; }
    return p;
  }
  function alive(p, e, now) { return !p.kills[e.id] || now - p.kills[e.id] >= (e.lieutenant || e.kind === 'keeper' ? IMPORTANT_RESPAWN : RESPAWN); }
  function defeat(p, e, now) { p.kills[e.id] = now; if (e.lieutenant) p.seals[e.floor] = true; if (e.kind === 'keeper') p.keeper = true; }
  function missing(p, floors) { return Array.from({ length: floors - 1 }, (_, i) => i).filter(i => !p.seals[i]); }
  function canVault(p, floors) { return p.keeper && missing(p, floors).length === 0; }
  function claim(p, id) { if (p.claimed[id]) return false; p.claimed[id] = true; return true; }
  function validPosition(layout, point, progress = { gates:{}, kills:{} }, now = Date.now()) {
    if (!point || !Number.isInteger(point[0]) || !Number.isInteger(point[1])) return false;
    const [x,y] = point;
    if (!(x >= 0 && y >= 0 && x < layout.w && y < layout.h && (layout.tiles[y * layout.w + x] === 1 || layout.tiles[y * layout.w + x] === 4))) return false;
    return !layout.entities.some(e => {
      if (e.kind === 'dgate' || e.kind === 'dsecret') return !progress.gates[e.target||e.gate||e.id] && (e.x===x&&e.y===y || (e.cells||[]).some(c=>c[0]===x&&c[1]===y));
      if ((e.kind==='dmon'||e.kind==='keeper')&&!alive(progress,e,now)) return false;
      return e.x===x&&e.y===y;
    });
  }
  return { VERSION, RESPAWN, IMPORTANT_RESPAWN, packSeen, unpackSeen, compact, ensure, alive, defeat, missing, canVault, claim, validPosition };
})();
if (typeof module !== 'undefined') module.exports = DungeonProgress;

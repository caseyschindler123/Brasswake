/* Persistent dungeon rules; deliberately independent of drawing and DOM. */
const DungeonProgress = (() => {
  const VERSION = 1, RESPAWN = 300000, IMPORTANT_RESPAWN = 900000;
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
  return { VERSION, RESPAWN, IMPORTANT_RESPAWN, ensure, alive, defeat, missing, canVault, claim, validPosition };
})();
if (typeof module !== 'undefined') module.exports = DungeonProgress;

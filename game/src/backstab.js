/* Backstab eligibility and short-lived wounds for living enemies. */
const Backstab = (() => {
  const MIN_STEALTH = 10;
  const STAMINA = 8;
  const THRUSTS = 2;
  const MEMORY_MS = 120000;
  const MAX_DISTANCE = 1.6;
  const diagonal = Math.SQRT1_2;
  const facing = [
    [0, 1], [-diagonal, diagonal], [-1, 0], [-diagonal, -diagonal],
    [0, -1], [diagonal, -diagonal], [1, 0], [diagonal, diagonal],
  ];

  function factor(stealth) {
    const bounded = Math.max(0, Math.min(120, stealth));
    return 2.5 + (Number.isNaN(bounded) ? 0 : bounded) / 120;
  }

  function rear(dx, dy, direction) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy) ||
        !Number.isInteger(direction) || direction < 0 || direction >= facing.length) return false;
    const distance = Math.hypot(dx, dy);
    if (!distance || !Number.isFinite(distance)) return false;
    const [x, y] = facing[direction];
    return (dx / distance) * x + (dy / distance) * y <= -0.5;
  }

  function readiness({ weapon, shadow, arms, stealth, stamina, hidden, approached, rear, distance, visible }) {
    if (weapon !== 'fencing') return 'weapon';
    if (!shadow || !arms) return 'books';
    if (!Number.isFinite(stealth) || stealth < MIN_STEALTH) return 'stealth';
    if (!Number.isFinite(stamina) || stamina < STAMINA) return 'stamina';
    if (!hidden) return 'hidden';
    if (!approached) return 'approach';
    if (!rear) return 'rear';
    if (!Number.isFinite(distance) || distance <= 0 || distance > MAX_DISTANCE) return 'distance';
    return visible ? null : 'sight';
  }

  const memory = () => new WeakMap();
  const forget = (wounds, entity) => wounds.delete(entity);
  const live = entity => entity && typeof entity === 'object' && !entity.dead && !entity.dying;

  function remember(wounds, entity, owner, encounter, now) {
    const { kind, hp, max, round } = encounter ?? {};
    if (!live(entity) || owner == null || typeof kind !== 'string' || !kind ||
        !Number.isFinite(max) || !Number.isFinite(hp) || hp <= 0 || hp >= max ||
        !Number.isInteger(round) || round < 0 || !Number.isFinite(now)) {
      forget(wounds, entity);
      return;
    }
    wounds.set(entity, { owner, kind, hp, max, round, at: now });
  }

  function recall(wounds, entity, owner, kind, max, now) {
    const entry = wounds.get(entity);
    if (!entry) return null;
    const elapsed = now - entry.at;
    if (!live(entity) || entry.owner !== owner || entry.kind !== kind || entry.max !== max ||
        !Number.isFinite(now) || elapsed < 0 || elapsed > MEMORY_MS) {
      forget(wounds, entity);
      return null;
    }
    return { hp: entry.hp, max: entry.max, round: entry.round };
  }

  // Short, bounded return paths keep a guardian from sticking behind a pillar.
  function returnStep(start, anchor, free, limit = 512) {
    if(start[0]===anchor[0]&&start[1]===anchor[1])return null;
    const queue=[{at:start,first:null}],seen=new Set([start.join(',')]);
    for(let i=0;i<queue.length&&i<limit;i++) {
      const {at,first}=queue[i];
      const next=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[at[0]+dx,at[1]+dy]);
      next.sort((a,b)=>Math.abs(a[0]-anchor[0])+Math.abs(a[1]-anchor[1])-Math.abs(b[0]-anchor[0])-Math.abs(b[1]-anchor[1]));
      for(const p of next){const key=p.join(',');if(seen.has(key)||Math.abs(p[0]-anchor[0])+Math.abs(p[1]-anchor[1])>20||!free(...p))continue;const step=first||p;if(p[0]===anchor[0]&&p[1]===anchor[1])return step;seen.add(key);queue.push({at:p,first:step});}
    }return null;
  }

  return { MIN_STEALTH, STAMINA, THRUSTS, MEMORY_MS, factor, rear, readiness, memory, remember, recall, forget, returnStep };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Backstab;

/* Bounded surface routing. The companion never occupies the player's destination. */
const Companion = (() => {
  function route(start, target, free, limit = 4096) {
    const queue = [start], seen = new Set([start.join(',')]), parent = new Map();
    for (let i = 0; i < queue.length && i < limit; i++) {
      const at = queue[i];
      if (Math.abs(at[0]-target[0])+Math.abs(at[1]-target[1]) <= 2) {
        const path = []; let p = at;
        while (parent.has(p.join(','))) { path.push(p); p = parent.get(p.join(',')); }
        return path.reverse();
      }
      const choices = [[1,0],[-1,0],[0,1],[0,-1]].map(d=>[at[0]+d[0],at[1]+d[1]]);
      choices.sort((a,b)=>Math.abs(a[0]-target[0])+Math.abs(a[1]-target[1])-Math.abs(b[0]-target[0])-Math.abs(b[1]-target[1]));
      for (const p of choices) { const k=p.join(','); if (seen.has(k) || !free(p[0],p[1]) || (p[0]===target[0] && p[1]===target[1])) continue; seen.add(k); parent.set(k,at); queue.push(p); }
    }
    return [];
  }
  return { route };
})();
if (typeof module !== 'undefined') module.exports = Companion;

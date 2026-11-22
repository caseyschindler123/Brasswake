E = lambda js: pg.evaluate(js)
print(E("""(() => { const m = Scene.debug().map; const by = {}; for (const t of m.terr) { const k = t.r; by[k] = by[k] || {terr:0, n:0, lair:0}; by[k].terr++; by[k].n += t.n; if (t.lair) by[k].lair += t.n; }
 const mons = m.ents.filter(e => e.kind === 'mon'); const sz = {}; mons.forEach(e => { const nm = (e.inst && e.inst.tpl) || e.name; sz[nm] = sz[nm] || 0; sz[nm]++; });
 return JSON.stringify({w: m.w, h: m.h, by, mons: mons.length, kinds: Object.keys(sz).length}); })()"""))

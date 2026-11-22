# walk-in rooms: Tallyport's tavern, shop and bank fade out when the hero is inside, and the keepers stand indoors
E = lambda js: pg.evaluate(js)
miss = set(); pg.on('response', lambda r: miss.add(r.url.split('/art/')[-1]) if r.status == 404 and '/art/' in r.url else None)
E("window.__bwFast = false")
info = E("""(() => { const m = Scene.debug().map; return JSON.stringify(m.blds.filter(b => b.enter).map(b => ({ slot: b.slot, x: b.x, y: b.y, w: b.w, h: b.h, door: b.room.door }))); })()""")
print('ROOMS', info)
import json
rooms = json.loads(info)
keep = E("""(() => { const m = Scene.debug().map; return JSON.stringify(m.ents.filter(e => e.r === 1 && /^(tavern|banker|shopkeep)$/.test(e.kind)).map(e => [e.kind, e.x, e.y])); })()""")
print('KEEPERS', keep)
for rm in rooms:
    dx, dy = rm['x'] + rm['door'], rm['y'] + rm['h']
    E("Scene.load([%d, %d], 1)" % (dx, dy + 1)); pg.wait_for_timeout(1800)
    pg.screenshot(path='/home/claude/game/shots/rm_%s_out.png' % rm['slot'])
    E("Scene.load([%d, %d], 1)" % (dx, dy - 2)); pg.wait_for_timeout(1800)
    pg.screenshot(path='/home/claude/game/shots/rm_%s_in.png' % rm['slot'])
    # can the hero walk from outside the door to beside the keeper?
    ok = E("""(() => { const m = Scene.debug().map, k = m.ents.find(e => e.r === 1 && e.kind === %s); if (!k) return 'no keeper'; const seen = new Set(), q = [[%d, %d]]; seen.add(q[0] + ''); while (q.length) { const [x, y] = q.shift(); if (Math.abs(x - k.x) + Math.abs(y - k.y) === 1) return 'reachable'; for (const [a, b] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + a, ny = y + b, key = nx + ',' + ny; if (seen.has(key) || m.solid[ny * m.w + nx]) continue; seen.add(key); q.push([nx, ny]); } if (seen.size > 4000) break; } return 'NOT reachable'; })()""" % ({'tavern': "'tavern'", 'shop': "'shopkeep'", 'bank': "'banker'"}[rm['slot']], dx, dy + 1))
    print(rm['slot'], 'keeper', ok)
print('MISSING ART', sorted(miss)[:60])

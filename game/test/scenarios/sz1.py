E = lambda js: pg.evaluate(js)
E("window.__bwFast = false"); pg.wait_for_timeout(1200)
# walk to the Green (gulls) near town 1
print(E("""(() => { const m = Scene.debug().map; const g = m.terr.find(t => t.name === 'The Green'); return JSON.stringify(g && [g.x, g.y]); })()"""))
E("""(() => { const m = Scene.debug().map; const g = m.terr.find(t => t.name === 'The Green'); Scene.load([g.x, g.y + 2], 1); })()"""); pg.wait_for_timeout(2500)
pg.screenshot(path='/home/claude/game/shots/sz_green.png')
# a spot with mixed creatures: find a terr for wolves (b403) in region 4 and deer (a2)
for tpl in ('b403','a2','l14','b501'):
    E("""(() => { const m = Scene.debug().map; const g = m.terr.find(t => t.tpl === '%s'); if (g) Scene.load([g.x, g.y + 2], g.r); })()""" % tpl); pg.wait_for_timeout(2200)
    pg.screenshot(path='/home/claude/game/shots/sz_%s.png' % tpl)

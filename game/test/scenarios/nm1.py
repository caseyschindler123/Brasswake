E = lambda js: pg.evaluate(js)
E("__bw.ACT.tab({ t: 'map' })"); pg.wait_for_timeout(1200)
pg.screenshot(path='/home/claude/game/shots/nm_map.png')
print(E("[...document.querySelectorAll('.pin')].map(p => p.textContent.trim()).join(' | ')"))

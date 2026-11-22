E = lambda js: pg.evaluate(js)
E("window.__bwFast = false"); pg.wait_for_timeout(1500)
print(E("""(() => { const S = __bw.S, mk = __bw.makeItem; S.path = 'thief'; S.look = 1; S.app = null; const its = [mk('epic',4,'weapon','fencing'), mk('rare',4,'head'), mk('rare',4,'hands'), mk('uncommon',4,'feet'), mk('rare',4,'cloak'), mk('rare',4,'armor')];
  its[2].name = 'Superior Thief’s Gloves'; its[2].stats.deft = 12; its[1].name = 'Superior Cloth Hood'; its[5].name = 'Superior Leather Jerkin';
  S.inv = its; S.eq = {}; its.forEach(it => S.eq[it.slot] = it.id); S.dyeU = ['iri', 'ember', 'void']; S.app = null; const L = __bw.S.app; return its.map(i => i.slot + ':' + i.name + ':' + i.ic + ':' + JSON.stringify(i.stats)).join(' | '); })()"""))
for k in range(30):
    it = E("(() => { const it = __bw.makeItem(['common','rare','epic'][%d %% 3], %d, %s); return [it.slot, it.name, it.ic, it.v]; })()" % (k, 1 + k % 8, "'weapon'" if k < 15 else "null"))
    print(it, end='  ')
print()
E("__bw.ACT.lookset({k:'dye', v:'ember'})"); E("__bw.ACT.closesheet()"); pg.wait_for_timeout(2500); E("Scene.refresh()"); pg.wait_for_timeout(800)
print(E("JSON.stringify(__bw.HOST.app())"))
pg.screenshot(path='/home/claude/game/shots/b3_world.png')
E("__bw.ACT.lookset({k:'dye', v:'iri'})"); E("__bw.ACT.closesheet()"); pg.wait_for_timeout(1500); pg.screenshot(path='/home/claude/game/shots/b3_iri.png')
E("__bw.ACT.tab({t:'hero'})"); pg.wait_for_timeout(1500); pg.screenshot(path='/home/claude/game/shots/b3_hero.png')
E("document.querySelector('.grid.doll').scrollIntoView()"); pg.wait_for_timeout(500); pg.screenshot(path='/home/claude/game/shots/b3_slots.png')
E("__bw.ACT.looks()"); pg.wait_for_timeout(1200); E("document.querySelector('#sheet h3:last-of-type') && document.querySelectorAll('#sheet h3')[6].scrollIntoView()"); pg.wait_for_timeout(400); pg.screenshot(path='/home/claude/game/shots/b3_looks.png')
